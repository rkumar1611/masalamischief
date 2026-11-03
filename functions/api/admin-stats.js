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
    one(ensureCatalogSchema, `SELECT (SELECT COUNT(*) FROM catalog_titles) AS titles, (SELECT MAX(updated) FROM catalog_titles) AS updated,
      (SELECT COUNT(*) FROM catalog_apps WHERE first_seen >= '${week}') AS arrived,
      (SELECT COUNT(*) FROM catalog_apps WHERE active = 0 AND last_seen >= '${week}') AS left`),
  ]);
  return json({ reviews, fixes, push, users, catalog, secrets: { accounts: accountsOn(env), github: Boolean(env.GITHUB_TOKEN), turnstile: Boolean(env.TURNSTILE_SECRET), reviewsAutoPublish: env.REVIEWS_AUTOPUBLISH === "1" } });
}
