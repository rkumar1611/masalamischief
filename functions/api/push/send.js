// POST /api/push/send?after=<n> (admin only) → sends this week's "New on OTT" alert to the next batch of
// browsers, oldest first. Returns { sent, removed, next } — call again with after=next until next is null.
// Run every Friday by .github/workflows/ott-alerts.yml (scripts/send-alerts.mjs). Batches stay small so
// each call fits Cloudflare's free-plan limits.
import "../../../assets/data.js";
import { json, notReady, isAdmin } from "../../../lib/community.js";
import { ensurePushSchema, vapidKeys, sendPush, weeklyMessage, seasonMessage, landedMessage } from "../../../lib/push.js";
import { asset } from "../../../lib/lists.js";

const BATCH = 20;

// ?kind=landed: tells browsers waiting for a film ("Tell me when it's on OTT") that it's out on an app
// (landed.json, built daily). Each film is announced to a browser once.
async function sendLanded(context, after) {
  const { env } = context;
  const landed = await asset(context, "/assets/catalog/landed.json");
  if (!landed || !landed.items.length) return json({ sent: 0, removed: 0, next: null, note: "Nothing landed." });
  await ensurePushSchema(env.DB);
  const { results } = await env.DB.prepare("SELECT rowid AS id, endpoint, p256dh, auth, titles FROM push_subs WHERE titles <> '' AND rowid > ? ORDER BY rowid LIMIT ?")
    .bind(after, BATCH).all();
  const keys = await vapidKeys(env.DB);
  let sent = 0;
  let removed = 0;
  for (const sub of results) {
    const { results: told } = await env.DB.prepare("SELECT k FROM push_landed_sent WHERE endpoint = ?").bind(sub.endpoint).all();
    const hit = landedMessage(landed, sub.titles, told.map((r) => r.k));
    if (!hit) continue;
    const status = await sendPush(sub, hit.message, keys).catch(() => 0);
    if (status >= 200 && status < 300) {
      sent++;
      await env.DB.batch(hit.keys.map((k) => env.DB.prepare("INSERT OR IGNORE INTO push_landed_sent (endpoint, k, sent) VALUES (?, ?, ?)").bind(sub.endpoint, k, Date.now())));
    } else if (status === 404 || status === 410) {
      await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(sub.endpoint).run();
      await env.DB.prepare("DELETE FROM push_landed_sent WHERE endpoint = ?").bind(sub.endpoint).run();
      removed++;
    }
  }
  const last = results.length === BATCH ? results[results.length - 1].id : null;
  if (last === null) await env.DB.prepare("DELETE FROM push_landed_sent WHERE sent < ?").bind(Date.now() - 60 * 864e5).run(); // tidy up
  return json({ sent, removed, next: last });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  if (new URL(request.url).searchParams.get("kind") === "landed") {
    return sendLanded(context, Math.max(0, Math.round(+new URL(request.url).searchParams.get("after") || 0)));
  }
  const newOnOtt = globalThis.MM_DATA.NEW_ON_OTT;
  // Series that got a new season in the last few weeks (built by scripts/build-catalog.mjs).
  const newSeasons = await asset(context, "/assets/catalog/new-seasons.json");
  if (!weeklyMessage(newOnOtt) && !(newSeasons && newSeasons.items.length)) return json({ sent: 0, removed: 0, next: null, note: "Nothing new this week." });

  await ensurePushSchema(env.DB);
  const after = Math.max(0, Math.round(+new URL(request.url).searchParams.get("after") || 0));
  const { results } = await env.DB.prepare("SELECT rowid AS id, endpoint, p256dh, auth, langs, apps, series FROM push_subs WHERE weekly = 1 AND rowid > ? ORDER BY rowid LIMIT ?")
    .bind(after, BATCH).all();
  const keys = await vapidKeys(env.DB);
  let sent = 0;
  let removed = 0;
  let skipped = 0;
  for (const sub of results) {
    // Each browser gets only its languages and apps; nothing that fits this week means no message.
    // A new season of a series they saved comes first (with this week's count); otherwise the usual alert.
    const message = seasonMessage(newSeasons, sub.series, newOnOtt, sub) || weeklyMessage(newOnOtt, sub);
    if (!message) { skipped++; continue; }
    const status = await sendPush(sub, message, keys).catch(() => 0);
    if (status >= 200 && status < 300) sent++;
    else if (status === 404 || status === 410) {
      // That browser turned alerts off or the app was removed.
      await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(sub.endpoint).run();
      removed++;
    }
  }
  return json({ sent, removed, skipped, next: results.length === BATCH ? results[results.length - 1].id : null });
}
