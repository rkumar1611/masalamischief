// POST /api/push/subscribe {endpoint, keys} → saves this browser for the weekly alert and sends a
// "you're in" message straight away, so people know it worked.
// POST /api/push/subscribe {endpoint, off: true} → turns the alerts off for that browser.
import { json, notReady } from "../../../lib/community.js";
import { ensurePushSchema, validSubscription, vapidKeys, sendPush } from "../../../lib/push.js";

const MAX_SUBS = 50000;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return notReady();
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  await ensurePushSchema(env.DB);

  if (input && input.off) {
    if (typeof input.endpoint !== "string") return json({ error: "Bad request." }, 400);
    await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(input.endpoint).run();
    return json({ ok: true });
  }
  if (!input || !validSubscription(input)) return json({ error: "Bad request." }, 400);

  const known = await env.DB.prepare("SELECT 1 FROM push_subs WHERE endpoint = ?").bind(input.endpoint).first();
  if (!known) {
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subs").first();
    if (n >= MAX_SUBS) return json({ error: "Alerts are full right now. Try again later." }, 503);
  }
  const sub = { endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth };
  await env.DB.prepare("INSERT OR REPLACE INTO push_subs (endpoint, p256dh, auth, created) VALUES (?, ?, ?, ?)")
    .bind(sub.endpoint, sub.p256dh, sub.auth, Date.now()).run();

  if (!known) {
    const status = await sendPush(sub, {
      title: "🍿 Alerts are on",
      body: "Every Friday we'll tell you what's new on Netflix, Prime, JioHotstar and the rest.",
      url: "/?source=alert#new-ott-section",
      tag: "welcome",
    }, await vapidKeys(env.DB)).catch(() => 0);
    return json({ ok: true, welcome: status >= 200 && status < 300 });
  }
  return json({ ok: true });
}
