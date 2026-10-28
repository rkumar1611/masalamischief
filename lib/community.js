// Shared code for visitor ratings and reviews (functions/api/...). Runs on Cloudflare only.
// Needs, in Cloudflare Pages → Settings:
//   DB                 a D1 database binding (the table is created automatically)
//   TURNSTILE_SITEKEY  Turnstile site key (public)
//   TURNSTILE_SECRET   Turnstile secret key
//   ADMIN_PASSWORD     password for /admin
//   REVIEWS_AUTOPUBLISH  optional: set to "1" to publish reviews without approval
// No secrets live in this file.
//
// A review shows on the site when approved = 1 and hidden = 0. New reviews wait for approval in /admin
// (unless REVIEWS_AUTOPUBLISH is "1"); 3 reports hide a review again until it's checked.

export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

export const notReady = () => json({ error: "Reviews aren't switched on yet." }, 503);

// Which title a review belongs to: "r:<our review id>" or "c:<lang>-<tmdb id>" / "c:<lang>-tv<tmdb id>".
export const validTitle = (t) => typeof t === "string" && /^(r:[a-z0-9-]{1,60}|c:[a-z]{2}-(tv)?\d{1,9})$/.test(t);

let schemaReady = false;
export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      name TEXT NOT NULL,
      masala INTEGER,
      score INTEGER,
      body TEXT,
      created INTEGER NOT NULL,
      ip_hash TEXT,
      reports INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS reviews_title ON reviews (title, approved, hidden, created)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reviews_ip ON reviews (ip_hash, created)"),
  ]);
  schemaReady = true;
}

// The visitor's IP, scrambled with a secret so it can only be used to spot repeat posters.
export async function ipHash(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const data = new TextEncoder().encode(`${ip}|${env.ADMIN_PASSWORD || "masala"}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token || "");
  form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

export const autoPublish = (env) => env.REVIEWS_AUTOPUBLISH === "1";

// Visitors' average score (out of 10) for one title, for Google's rating stars, or null if none yet.
// Used by the page functions (functions/review.js, film.js); never throws.
export async function audienceRating(env, title) {
  if (!env.DB) return null;
  try {
    const r = await env.DB.prepare(
      "SELECT COUNT(score) AS n, AVG(score) AS avg FROM reviews WHERE title = ? AND approved = 1 AND hidden = 0"
    ).bind(title).first();
    return r && r.n > 0 ? { n: r.n, avg: Math.round(r.avg * 10) / 10 } : null;
  } catch { return null; }
}

export function isAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  return Boolean(env.ADMIN_PASSWORD) && auth === `Bearer ${env.ADMIN_PASSWORD}`;
}

// Strip control characters and squeeze whitespace; keep line breaks in review text.
export const clean = (s, max, keepLines = false) => String(s || "")
  .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
  .replace(keepLines ? /[ \t]+/g : /\s+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim()
  .slice(0, max);
