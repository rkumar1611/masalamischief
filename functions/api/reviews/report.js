// POST /api/reviews/report {id} → counts a report; 3 reports hide the review until you check it.
import { json, notReady, ensureSchema, ipHash } from "../../../lib/community.js";

const reported = new Map(); // light, per-instance guard against one visitor spamming reports

export async function onRequestPost({ request, env }) {
  if (!env.DB) return notReady();
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const id = Math.round(+input.id);
  if (!(id > 0)) return json({ error: "Bad request." }, 400);

  const key = `${await ipHash(request, env)}:${id}`;
  if (reported.has(key)) return json({ ok: true });
  reported.set(key, true);
  if (reported.size > 5000) reported.clear();

  await ensureSchema(env.DB);
  await env.DB.prepare("UPDATE reviews SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= 3 THEN 1 ELSE hidden END WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
