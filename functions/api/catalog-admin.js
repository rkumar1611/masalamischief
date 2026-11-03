// /api/catalog-admin (admin only), behind /admin → Titles: look a title up in our own catalogue database and
// correct which apps it streams on.
//   GET  ?q=<words or key like "ml-657644">  → { titles: [{ key, title, year, lang, kind, rating, apps, found, override, history }] }
//   POST { key, apps: [...] | null, note }   → saves the corrected app list (null removes the correction)
import { json, notReady, isAdmin } from "../../lib/community.js";
import { ensureCatalogSchema } from "../../lib/catalog-db.js";

const KEY = /^[a-z]{2,3}-(tv)?\d+$/;
// The app names the catalogue uses (APP_RULES in scripts/build-catalog.mjs).
const APPS = ["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "Sun NXT", "aha", "ManoramaMAX", "MX Player", "Lionsgate Play", "Crunchyroll", "Apple TV"];

export async function onRequestGet({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  await ensureCatalogSchema(env.DB);
  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return json({ titles: [] });
  const { results } = KEY.test(q.toLowerCase())
    ? await env.DB.prepare("SELECT * FROM catalog_titles WHERE key = ?").bind(q.toLowerCase()).all()
    : await env.DB.prepare("SELECT * FROM catalog_titles WHERE title LIKE ? ESCAPE '\\' ORDER BY votes DESC LIMIT 15")
      .bind(`%${q.replace(/[\\%_]/g, "\\$&")}%`).all();
  if (!results.length) return json({ titles: [] });
  const keys = results.map((r) => r.key);
  const marks = keys.map(() => "?").join(",");
  const [{ results: over }, { results: hist }] = await Promise.all([
    env.DB.prepare(`SELECT key, apps, note, updated FROM catalog_overrides WHERE key IN (${marks})`).bind(...keys).all(),
    env.DB.prepare(`SELECT key, app, first_seen, last_seen, active FROM catalog_apps WHERE key IN (${marks})`).bind(...keys).all(),
  ]);
  return json({
    apps: APPS,
    titles: results.map((r) => {
      const o = over.find((x) => x.key === r.key);
      return {
        key: r.key, title: r.title, year: r.year, lang: r.lang, kind: r.kind, rating: r.rating, apps: JSON.parse(r.apps || "[]"),
        override: o ? { apps: JSON.parse(o.apps), note: o.note, updated: o.updated } : null,
        history: hist.filter((h) => h.key === r.key).map(({ app, first_seen, last_seen, active }) => ({ app, first_seen, last_seen, active })),
      };
    }),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const key = String(body.key || "");
  if (!KEY.test(key)) return json({ error: "Unknown title." }, 400);
  await ensureCatalogSchema(env.DB);
  if (!(await env.DB.prepare("SELECT 1 AS ok FROM catalog_titles WHERE key = ?").bind(key).first())) return json({ error: "That title isn't in the database." }, 404);
  if (body.apps === null) {
    await env.DB.prepare("DELETE FROM catalog_overrides WHERE key = ?").bind(key).run();
    return json({ ok: true, override: null });
  }
  const allowed = new Set(APPS);
  if (!Array.isArray(body.apps) || body.apps.some((a) => !allowed.has(a))) return json({ error: "Unknown app." }, 400);
  const apps = [...new Set(body.apps)];
  const note = String(body.note || "").slice(0, 200);
  await env.DB.prepare(`INSERT INTO catalog_overrides (key, apps, note, updated) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET apps = excluded.apps, note = excluded.note, updated = excluded.updated`)
    .bind(key, JSON.stringify(apps), note, new Date().toISOString().slice(0, 10)).run();
  return json({ ok: true, override: { apps, note } });
}
