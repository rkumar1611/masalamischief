// /api/reviews
//   GET  ?t=<title>  → audience scores and the latest visible reviews for one title
//   POST {t, name, masala, score, body, adult, token} → save a visitor review (waits for approval in /admin)
// Spam protection: Cloudflare Turnstile, no links in reviews, at most 5 posts an hour and one review
// per title per day from the same (scrambled) IP. Reviews with 3 reports are hidden automatically.
import { json, notReady, validTitle, ensureSchema, ipHash, verifyTurnstile, clean, autoPublish } from "../../../lib/community.js";

const HOUR = 3600 * 1000;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return notReady();
  const t = new URL(request.url).searchParams.get("t");
  if (!validTitle(t)) return json({ error: "Unknown title." }, 400);
  await ensureSchema(env.DB);
  const summary = await env.DB.prepare(
    "SELECT COUNT(*) AS count, AVG(masala) AS masala, AVG(score) AS score, COUNT(masala) AS masalaCount, COUNT(score) AS scoreCount FROM reviews WHERE title = ? AND approved = 1 AND hidden = 0"
  ).bind(t).first();
  const { results } = await env.DB.prepare(
    "SELECT id, name, masala, score, body, created FROM reviews WHERE title = ? AND approved = 1 AND hidden = 0 ORDER BY created DESC LIMIT 30"
  ).bind(t).all();
  return json({ summary, reviews: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.TURNSTILE_SECRET) return notReady();
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const t = input.t;
  const name = clean(input.name, 40);
  const body = clean(input.body, 1000, true);
  const masala = input.masala == null || input.masala === "" ? null : Math.round(+input.masala);
  const score = input.score == null || input.score === "" ? null : Math.round(+input.score);

  if (!validTitle(t)) return json({ error: "Unknown title." }, 400);
  if (input.adult !== true) return json({ error: "Please confirm you're 18 or over." }, 400);
  if (name.length < 2) return json({ error: "Please add a display name." }, 400);
  if (masala !== null && !(masala >= 1 && masala <= 5)) return json({ error: "Masala Meter is 1 to 5." }, 400);
  if (score !== null && !(score >= 1 && score <= 10)) return json({ error: "Score is 1 to 10." }, 400);
  if (masala === null && score === null && !body) return json({ error: "Add a rating or a few words." }, 400);
  if (/https?:\/\/|www\.|\.(com|in|net|xyz|ru)\b/i.test(`${name} ${body}`)) return json({ error: "Links aren't allowed in reviews." }, 400);
  if (!(await verifyTurnstile(input.token, request, env))) return json({ error: "Couldn't verify you're human. Please try again." }, 403);

  await ensureSchema(env.DB);
  const who = await ipHash(request, env);
  const now = Date.now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM reviews WHERE ip_hash = ? AND created > ?").bind(who, now - HOUR).first();
  if (recent.n >= 5) return json({ error: "That's a lot of reviews! Please try again in an hour." }, 429);
  const same = await env.DB.prepare("SELECT COUNT(*) AS n FROM reviews WHERE ip_hash = ? AND title = ? AND created > ?").bind(who, t, now - 24 * HOUR).first();
  if (same.n >= 1) return json({ error: "You've already reviewed this one today." }, 429);

  const res = await env.DB.prepare(
    "INSERT INTO reviews (title, name, masala, score, body, created, ip_hash, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(t, name, masala, score, body || null, now, who, autoPublish(env) ? 1 : 0).run();
  return json({ ok: true, id: res.meta.last_row_id, published: autoPublish(env) });
}
