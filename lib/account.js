// Visitor accounts: "Sign in with Google" so a watchlist, ratings and film alerts follow people across
// phones (functions/api/account/[action].js). Runs on Cloudflare only. Needs, in Cloudflare Pages →
// Settings → Variables: GOOGLE_CLIENT_ID (public; from Google Cloud → Credentials → OAuth client ID, type Web)
// and the DB binding. SESSION_SECRET is optional (a random string); without it the admin password is used
// to sign sessions. We keep only Google's account id, the display name and the synced lists: no email, no photo.

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const SESSION_DAYS = 30;
export const COOKIE = "mm_session";

let ready = false;
export async function ensureAccountSchema(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, created INTEGER NOT NULL, last INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS user_data (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)"),
  ]);
  ready = true;
}

export const accountsOn = (env) => Boolean(env.DB && env.GOOGLE_CLIENT_ID && (env.SESSION_SECRET || env.ADMIN_PASSWORD));

// Checks a Google sign-in token (the "credential" the Google button gives the page) with Google itself and
// returns { id, name } for our site's client ID, or null.
export async function verifyGoogle(credential, env) {
  if (typeof credential !== "string" || credential.length > 4096) return null;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`).catch(() => null);
  if (!res || !res.ok) return null;
  const t = await res.json().catch(() => null);
  if (!t || t.aud !== env.GOOGLE_CLIENT_ID || !/^(https:\/\/)?accounts\.google\.com$/.test(t.iss || "") || !(+t.exp > Date.now() / 1000) || !t.sub) return null;
  return { id: `g:${String(t.sub).slice(0, 40)}`, name: String(t.given_name || t.name || "Friend").replace(/[\u0000-\u001f<>]/g, "").slice(0, 40) };
}

const sign = async (text, env) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(`${env.SESSION_SECRET || env.ADMIN_PASSWORD}|mm-session`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
};
// The cookie value: "<user id>.<expiry seconds>.<signature>".
export async function sessionCookie(userId, env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const body = `${btoa(userId)}.${exp}`;
  return `${COOKIE}=${body}.${await sign(body, env)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// The signed-in user's id from the request's cookie, or null.
export async function sessionUser(request, env) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const parts = m ? m[1].split(".") : [];
  if (parts.length !== 3 || !(+parts[1] > Date.now() / 1000)) return null;
  if ((await sign(`${parts[0]}.${parts[1]}`, env)) !== parts[2]) return null;
  try { return atob(parts[0]); } catch { return null; }
}

// What gets synced: only these lists, in this shape, so nothing else can be stored.
const WATCH_ID = /^(_[a-z]{2}-(tv)?\d{1,9}|[a-z0-9-]{1,60})$/;
const FILM_KEY = /^[a-z]{2}-\d{1,9}$/;
const str = (s, n) => String(s ?? "").slice(0, n);
export function cleanData(d) {
  d = d && typeof d === "object" ? d : {};
  const list = (a, re, max) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === "string" && re.test(x)))].slice(-max) : []);
  const watchlist = list(d.watchlist, WATCH_ID, 300);
  const info = {};
  for (const id of watchlist) {
    const x = d.watchlistInfo && d.watchlistInfo[id];
    if (/^_/.test(id) && x && typeof x === "object") {
      info[id] = { t: str(x.t, 120), l: str(x.l, 3), id: typeof x.id === "number" ? x.id : str(x.id, 14), ...(x.k === "tv" ? { k: "tv" } : {}), y: +x.y || null, p: str(x.p, 60), v: +x.v || 0,
        w: (Array.isArray(x.w) ? x.w : []).slice(0, 6).map((a) => str(a, 20)) };
    }
  }
  const ratings = {};
  for (const [id, n] of Object.entries(d.ratings && typeof d.ratings === "object" ? d.ratings : {}).slice(0, 300)) {
    if (/^[a-z0-9-]{1,60}$/.test(id) && n >= 1 && n <= 5) ratings[id] = Math.round(n);
  }
  const names = (a, max) => (Array.isArray(a) ? [...new Set(a.map((x) => str(x, 20)))].slice(0, max) : []);
  const c = d.alertChoice && typeof d.alertChoice === "object" ? d.alertChoice : {};
  return { watchlist, watchlistInfo: info, ratings, landWatch: list(d.landWatch, FILM_KEY, 100), alertChoice: { langs: names(c.langs, 12), apps: names(c.apps, 12) } };
}
