// /api/account/<action>: sign-in with Google and the synced watchlist (see lib/account.js).
//   POST login   {credential}     → checks the Google token, sets the session cookie → { name }
//   GET  me                       → { user: { name } | null }
//   GET  data                     → { data, updated } for the signed-in user
//   PUT  data    {data}           → saves the lists (last save wins) → { updated }
//   POST logout                   → clears the cookie
//   POST delete                   → deletes the account and its saved lists, then signs out
import { json } from "../../../lib/community.js";
import { accountsOn, ensureAccountSchema, verifyGoogle, sessionCookie, clearCookie, sessionUser, cleanData } from "../../../lib/account.js";

const withCookie = (res, cookie) => { res.headers.append("set-cookie", cookie); return res; };

export async function onRequest({ request, env, params }) {
  if (!accountsOn(env)) return json({ error: "Accounts aren't switched on yet." }, 503);
  await ensureAccountSchema(env.DB);
  const action = params.action;
  const method = request.method;

  if (action === "login" && method === "POST") {
    let input;
    try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
    const who = await verifyGoogle(input.credential, env);
    if (!who) return json({ error: "Google sign-in didn't check out. Please try again." }, 401);
    const now = Date.now();
    await env.DB.prepare("INSERT INTO users (id, name, created, last) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, last = excluded.last")
      .bind(who.id, who.name, now, now).run();
    return withCookie(json({ ok: true, name: who.name }), await sessionCookie(who.id, env));
  }

  const id = await sessionUser(request, env);
  if (action === "logout" && method === "POST") return withCookie(json({ ok: true }), clearCookie());
  if (!id) return json(action === "me" ? { user: null } : { error: "Please sign in." }, action === "me" ? 200 : 401);

  if (action === "me" && method === "GET") {
    const u = await env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(id).first();
    return u ? json({ user: { name: u.name } }) : withCookie(json({ user: null }), clearCookie());
  }
  if (action === "data" && method === "GET") {
    const row = await env.DB.prepare("SELECT data, updated FROM user_data WHERE user_id = ?").bind(id).first();
    return json(row ? { data: cleanData(JSON.parse(row.data)), updated: row.updated } : { data: null, updated: 0 });
  }
  if (action === "data" && method === "PUT") {
    let input;
    try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
    const data = cleanData(input.data);
    const updated = Date.now();
    await env.DB.prepare("INSERT INTO user_data (user_id, data, updated) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated")
      .bind(id, JSON.stringify(data), updated).run();
    return json({ ok: true, updated });
  }
  if (action === "delete" && method === "POST") {
    await env.DB.batch([env.DB.prepare("DELETE FROM user_data WHERE user_id = ?").bind(id), env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id)]);
    return withCookie(json({ ok: true }), clearCookie());
  }
  return json({ error: "Not found." }, 404);
}
