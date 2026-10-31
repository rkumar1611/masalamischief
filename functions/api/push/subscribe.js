// POST /api/push/subscribe {endpoint, keys} → saves this browser for the weekly alert and, the first
// time, sends a "you're in" message so people know it worked. Pages send it again on each visit
// (already saved: no message), so a save that failed midway gets fixed.
// POST /api/push/subscribe {endpoint, off: true} → turns the alerts off for that browser.
import { json, notReady } from "../../../lib/community.js";
import { ensurePushSchema, validSubscription, vapidKeys, sendPush, cleanChoice, cleanSeries, cleanTitles, ALERT_LANGS, ALERT_APPS } from "../../../lib/push.js";

const MAX_SUBS = 50000;

export async function onRequestPost({ request, env, waitUntil }) {
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
  // Languages and apps to hear about (the page sends its saved choice every time; none = everything).
  const langs = cleanChoice(input.langs, ALERT_LANGS);
  const apps = cleanChoice(input.apps, ALERT_APPS);
  const series = cleanSeries(input.series);
  const titles = cleanTitles(input.titles);
  // weekly: false = only "tell me when it's on OTT" (turned on from a film page); true/missing keeps the
  // Friday roundup (a new browser gets it unless the page says otherwise).
  const weekly = input.weekly === false ? 0 : 1;
  await env.DB.prepare(`INSERT INTO push_subs (endpoint, p256dh, auth, created, langs, apps, series, titles, weekly) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, langs = excluded.langs, apps = excluded.apps, series = excluded.series, titles = excluded.titles${
      typeof input.weekly === "boolean" ? ", weekly = excluded.weekly" : ""}`)
    .bind(sub.endpoint, sub.p256dh, sub.auth, Date.now(), langs, apps, series, titles, weekly).run();

  // The welcome message goes out after we've answered, so the button switches straight away.
  if (!known) {
    waitUntil((async () => sendPush(sub, weekly ? {
      title: "🍿 Alerts are on",
      body: "Every Friday we'll tell you what's new on Netflix, Prime, JioHotstar and the rest.",
      url: "/?source=alert#new-ott-section",
      tag: "welcome",
    } : {
      title: "🔔 We'll tell you",
      body: "As soon as the film you picked is out on an OTT app in India, you'll get a message here.",
      url: "/ott-this-week?source=alert",
      tag: "welcome",
    }, await vapidKeys(env.DB)))().catch(() => {}));
  }
  return json({ ok: true });
}
