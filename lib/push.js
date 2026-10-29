// Weekly "New on OTT" alerts (Web Push), used by functions/api/push/*. Runs on Cloudflare only.
// Uses the same D1 database as audience reviews (the DB binding); the tables are created automatically:
//   push_subs  one row per browser that turned alerts on (its push address and keys, nothing personal)
//   push_keys  the site's own VAPID key pair, made on first use, so there's no secret to set up
// Messages are encrypted for each browser (RFC 8291, aes128gcm) and signed with the VAPID key (RFC 8292).

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};

// Only the big browsers' push services, so the list can't be used to send requests anywhere else.
const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)$/;
export function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname) && s.endpoint.length < 1000 &&
      unb64u(s.keys.p256dh).length === 65 && unb64u(s.keys.auth).length === 16;
  } catch { return false; }
}

let ready = false;
export async function ensurePushSchema(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS push_subs (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created INTEGER NOT NULL
    )`),
    db.prepare("CREATE TABLE IF NOT EXISTS push_keys (id INTEGER PRIMARY KEY CHECK (id = 1), pub TEXT NOT NULL, priv TEXT NOT NULL)"),
  ]);
  // Added later: which languages and apps this browser wants to hear about ("" = all), comma-separated.
  for (const col of ["langs", "apps"]) {
    try { await db.prepare(`ALTER TABLE push_subs ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`).run(); } catch { /* already there */ }
  }
  ready = true;
}

// Alert choices from the page: only names from our own lists, so nothing else gets stored.
export const ALERT_LANGS = ["Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "English", "Marathi", "Bengali", "Punjabi", "Korean"];
export const ALERT_APPS = ["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "Sun NXT", "aha", "ManoramaMAX"];
export const cleanChoice = (list, allowed) => (Array.isArray(list) ? [...new Set(list.filter((x) => allowed.includes(x)))].join(",") : "");

// The site's VAPID keys: { pub: base64url of the raw public key (what browsers subscribe with), priv: CryptoKey }.
export async function vapidKeys(db) {
  await ensurePushSchema(db);
  let row = await db.prepare("SELECT pub, priv FROM push_keys WHERE id = 1").first();
  if (!row) {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pub = b64u(await crypto.subtle.exportKey("raw", pair.publicKey));
    const priv = JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey));
    await db.prepare("INSERT OR IGNORE INTO push_keys (id, pub, priv) VALUES (1, ?, ?)").bind(pub, priv).run();
    row = await db.prepare("SELECT pub, priv FROM push_keys WHERE id = 1").first();
  }
  const priv = await crypto.subtle.importKey("jwk", JSON.parse(row.priv), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { pub: row.pub, priv };
}

async function vapidAuth(endpoint, keys) {
  const header = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://masalamischief.in",
  })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.priv, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${keys.pub}`;
}

const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits(
  { name: "HKDF", hash: "SHA-256", salt, info },
  await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), bytes * 8));

// RFC 8291: the message encrypted for one browser, as the aes128gcm body.
export async function encrypt(sub, payload) {
  const uaPublic = unb64u(sub.p256dh);
  const authSecret = unb64u(sub.auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const head = new Uint8Array(21);
  new DataView(head.buffer).setUint32(16, 4096);
  head.set(salt, 0);
  head[20] = asPublic.length;
  return concat(head, asPublic, sealed);
}

// Sends one message; returns the push service's status (404/410 mean the browser turned alerts off).
export async function sendPush(sub, message, keys) {
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      authorization: await vapidAuth(sub.endpoint, keys),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(3 * 86400),
      urgency: "normal",
    },
    body: await encrypt(sub, JSON.stringify(message)),
  });
  return res.status;
}

// This week's message, from the "New on OTT this week" strip (NEW_ON_OTT in assets/data.js), with only
// the languages and apps this browser chose (comma-separated; "" = all). null when nothing fits.
export function weeklyMessage(newOnOtt, choice = {}) {
  const langs = (choice.langs || "").split(",").filter(Boolean);
  const apps = (choice.apps || "").split(",").filter(Boolean);
  const items = ((newOnOtt && newOnOtt.items) || [])
    .filter((i) => (!langs.length || langs.includes(i.lang)) && (!apps.length || apps.includes(i.app)));
  if (!items.length) return null;
  const shown = items.slice(0, 3).map((i) => `${i.title} (${i.app})`);
  const more = items.length - shown.length;
  return {
    title: `🍿 ${items.length} new on ${apps.length === 1 ? apps[0] : "OTT"} this week${langs.length && langs.length <= 2 ? ` in ${langs.map((l) => (l === "English" ? "Hollywood" : l)).join(" & ")}` : ""}`,
    body: `${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""}. Tap to see what's worth watching.`,
    url: "/?source=alert#new-ott-section",
    tag: `ott-${newOnOtt.checked}`,
  };
}
