// GET /api/config → what the pages need to know: whether reviews are switched on and the public Turnstile
// site key, and whether visitor accounts (Sign in with Google) are on, with Google's public client ID.
// (Both are public by design; the secrets never leave Cloudflare.)
import { json } from "../../lib/community.js";
import { accountsOn } from "../../lib/account.js";

export function onRequestGet({ env }) {
  return json({
    reviews: Boolean(env.DB && env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY), sitekey: env.TURNSTILE_SITEKEY || "",
    accounts: accountsOn(env), googleClientId: accountsOn(env) ? env.GOOGLE_CLIENT_ID : "",
  });
}
