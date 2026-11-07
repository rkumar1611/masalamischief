// GET /api/admin-stats (admin only: "Authorization: Bearer <ADMIN_PASSWORD>"): the numbers on the /admin
// home tab. Anything that isn't set up yet comes back as null, so the page never breaks.
import { json, isAdmin, ensureSchema } from "../../lib/community.js";
import { ensureFixesSchema } from "../../lib/fixes.js";
import { ensurePushSchema } from "../../lib/push.js";
import { ensureCatalogSchema } from "../../lib/catalog-db.js";
import { ensureAccountSchema, accountsOn } from "../../lib/account.js";

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  if (!env.DB) return json({ error: "The database isn't connected." }, 503);
  const one = async (setup, sql) => { try { await setup(env.DB); return await env.DB.prepare(sql).first(); } catch { return null; } };
  const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const [reviews, fixes, push, users, catalog] = await Promise.all([
    one(ensureSchema, `SELECT SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN approved = 1 AND hidden = 0 AND staff = 0 THEN 1 ELSE 0 END) AS live,
      SUM(CASE WHEN reports > 0 THEN 1 ELSE 0 END) AS reported FROM reviews`),
    one(ensureFixesSchema, "SELECT COUNT(*) AS open FROM fixes WHERE status = 'open'"),
    one(ensurePushSchema, `SELECT COUNT(*) AS total, SUM(CASE WHEN weekly = 1 THEN 1 ELSE 0 END) AS weekly,
      SUM(CASE WHEN titles <> '' THEN 1 ELSE 0 END) AS waiting FROM push_subs`),
    accountsOn(env) ? one(ensureAccountSchema, "SELECT COUNT(*) AS total FROM users") : null,
    // Our own copy of the catalogue (lib/catalog-db.js): arrivals and departures only count once real dates are recorded.
    // Cheap on purpose (D1's free plan allows 5 million rows read a day, and a count over the whole catalogue reads every row):
    // MAX(rowid) is the number of titles (they're never deleted), and the rest comes from the few daily rows catalogue syncs keep.
    one(ensureCatalogSchema, `SELECT (SELECT MAX(rowid) FROM catalog_titles) AS titles, (SELECT MAX(day) FROM catalog_daily) AS updated,
      (SELECT COALESCE(SUM(fresh), 0) FROM catalog_daily WHERE day >= '${week}') AS fresh,
      (SELECT COALESCE(SUM(arrived), 0) FROM catalog_daily WHERE day >= '${week}') AS arrived,
      (SELECT COALESCE(SUM(gone), 0) FROM catalog_daily WHERE day >= '${week}') AS gone`),
  ]);
  // The last roundup and "now on OTT" runs (lib/push.js logAlertRun), for the Alerts tab.
  let alerts = null;
  try {
    const { results } = await env.DB.prepare(`SELECT p.kind, p.day, p.sent, p.removed, p.skipped, p.note, p.at FROM push_runs p
      JOIN (SELECT kind, MAX(at) AS at FROM push_runs GROUP BY kind) m ON m.kind = p.kind AND m.at = p.at`).all();
    alerts = Object.fromEntries(results.map((r) => [r.kind, r]));
  } catch (e) { alerts = { error: String(e.message || e).slice(0, 200) }; }
  return json({ reviews, fixes, push, users, catalog, alerts, secrets: { accounts: accountsOn(env), github: Boolean(env.GITHUB_TOKEN), turnstile: Boolean(env.TURNSTILE_SECRET), reviewsAutoPublish: env.REVIEWS_AUTOPUBLISH === "1" } });
}
