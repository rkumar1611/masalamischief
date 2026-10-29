// GET /api/push/key → { key }: the site's public VAPID key, which browsers need to turn alerts on.
import { json, notReady } from "../../../lib/community.js";
import { vapidKeys } from "../../../lib/push.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return notReady();
  return json({ key: (await vapidKeys(env.DB)).pub });
}
