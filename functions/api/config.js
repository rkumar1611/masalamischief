// GET /api/config → what the review box needs to know: whether reviews are switched on, and the public
// Turnstile site key. (The site key is public by design; the secret never leaves Cloudflare.)
import { json } from "../../lib/community.js";

export function onRequestGet({ env }) {
  return json({ reviews: Boolean(env.DB && env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY), sitekey: env.TURNSTILE_SITEKEY || "" });
}
