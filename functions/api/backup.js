// GET /api/backup ("Authorization: Bearer <ADMIN_PASSWORD>") → one JSON file with what only our database holds and
// can't be rebuilt: readers' reviews, wrong-info reports, feedback and our catalogue corrections. /admin → Home → Backup
// downloads it. Left out on purpose: alert sign-ups and visitor accounts (personal, and people can simply turn alerts
// on again), and the catalogue copy (rebuilt from the site's files). The scrambled IP column isn't included either.
// These tables are small, so this reads a few thousand rows at most.
import { json, isAdmin } from "../../lib/community.js";

const TABLES = {
  reviews: "SELECT id, title, name, masala, score, body, created, reports, hidden, approved, staff FROM reviews ORDER BY id",
  fixes: "SELECT id, target, name, kind, app, note, count, created, updated, status FROM fixes ORDER BY id",
  feedback: "SELECT id, kind, message, contact, page, created, status FROM feedback ORDER BY id",
  catalog_overrides: "SELECT * FROM catalog_overrides",
};

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  if (!env.DB) return json({ error: "The database isn't connected." }, 503);
  const out = { site: "masalamischief.in", made: new Date().toISOString(), tables: {}, missing: [] };
  for (const [name, sql] of Object.entries(TABLES)) {
    try {
      const { results } = await env.DB.prepare(sql).all();
      out.tables[name] = results;
    } catch (e) {
      // A table that doesn't exist yet (nothing was ever saved in it) or the daily limit: say which, keep the rest.
      out.missing.push({ table: name, why: String(e.message || e).slice(0, 160) });
    }
  }
  return new Response(JSON.stringify(out, null, 1), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-disposition": "attachment; filename=masala-mischief-backup.json" },
  });
}
