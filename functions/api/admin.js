// /api/admin (needs "Authorization: Bearer <ADMIN_PASSWORD>", used by /admin)
//   GET  ?filter=pending|reported|hidden|all  → latest 200 reviews of that kind
//   POST {action: "approve"|"hide"|"delete", id}
import { json, notReady, ensureSchema, isAdmin } from "../../lib/community.js";

const FILTERS = {
  pending: "WHERE approved = 0",
  reported: "WHERE reports > 0",
  hidden: "WHERE approved = 1 AND hidden = 1",
  all: "",
};

export async function onRequestGet({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  await ensureSchema(env.DB);
  const filter = new URL(request.url).searchParams.get("filter");
  const where = FILTERS[filter] ?? FILTERS.pending;
  const { results } = await env.DB.prepare(
    `SELECT id, title, name, masala, score, body, created, reports, hidden, approved FROM reviews ${where} ORDER BY created DESC LIMIT 200`
  ).all();
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS all_reviews,
       SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN approved = 1 AND hidden = 0 THEN 1 ELSE 0 END) AS live,
       SUM(CASE WHEN reports > 0 THEN 1 ELSE 0 END) AS reported
     FROM reviews`
  ).first();
  return json({ reviews: results, totals });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const id = Math.round(+input.id);
  if (!(id > 0)) return json({ error: "Bad request." }, 400);
  await ensureSchema(env.DB);
  if (input.action === "approve") await env.DB.prepare("UPDATE reviews SET approved = 1, hidden = 0, reports = 0 WHERE id = ?").bind(id).run();
  else if (input.action === "hide") await env.DB.prepare("UPDATE reviews SET hidden = 1 WHERE id = ?").bind(id).run();
  else if (input.action === "delete") await env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
  else return json({ error: "Unknown action." }, 400);
  return json({ ok: true });
}
