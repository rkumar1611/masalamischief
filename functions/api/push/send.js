// POST /api/push/send?after=<n> (admin only) → sends this week's "New on OTT" alert to the next batch of
// browsers, oldest first. Returns { sent, removed, next } — call again with after=next until next is null.
// Run every Friday by .github/workflows/ott-alerts.yml (scripts/send-alerts.mjs). Batches stay small so
// each call fits Cloudflare's free-plan limits.
import "../../../assets/data.js";
import { json, notReady, isAdmin } from "../../../lib/community.js";
import { ensurePushSchema, vapidKeys, sendPush, weeklyMessage } from "../../../lib/push.js";

const BATCH = 20;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  const newOnOtt = globalThis.MM_DATA.NEW_ON_OTT;
  if (!weeklyMessage(newOnOtt)) return json({ sent: 0, removed: 0, next: null, note: "Nothing new this week." });

  await ensurePushSchema(env.DB);
  const after = Math.max(0, Math.round(+new URL(request.url).searchParams.get("after") || 0));
  const { results } = await env.DB.prepare("SELECT rowid AS id, endpoint, p256dh, auth, langs, apps FROM push_subs WHERE rowid > ? ORDER BY rowid LIMIT ?")
    .bind(after, BATCH).all();
  const keys = await vapidKeys(env.DB);
  let sent = 0;
  let removed = 0;
  let skipped = 0;
  for (const sub of results) {
    // Each browser gets only its languages and apps; nothing that fits this week means no message.
    const message = weeklyMessage(newOnOtt, sub);
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
