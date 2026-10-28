// GET /api/reviews/top → for the homepage: the titles visitors rated best (approved, visible reviews only)
// and a few of the latest written reviews. Cached for 5 minutes.
import { notReady, ensureSchema } from "../../../lib/community.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return notReady();
  await ensureSchema(env.DB);
  const { results: top } = await env.DB.prepare(
    `SELECT title, COUNT(*) AS count, AVG(masala) AS masala, AVG(score) AS score
     FROM reviews WHERE approved = 1 AND hidden = 0
     GROUP BY title ORDER BY COALESCE(AVG(score), AVG(masala) * 2) DESC, COUNT(*) DESC LIMIT 8`
  ).all();
  const { results: latest } = await env.DB.prepare(
    `SELECT title, name, masala, score, body, created FROM reviews
     WHERE approved = 1 AND hidden = 0 AND body IS NOT NULL ORDER BY created DESC LIMIT 4`
  ).all();
  return new Response(JSON.stringify({ top, latest }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
