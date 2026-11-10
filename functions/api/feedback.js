// /api/feedback
//   POST {kind, message, contact?, page?, token, website?} → a visitor's feedback (Turnstile spam check; "website" is a
//        hidden box only bots fill in). It waits in /admin → Feedback; nothing is shown on the site.
//   With "Authorization: Bearer <ADMIN_PASSWORD>":
//   GET  ?filter=open|done → the messages, newest first, plus how many are open
//   POST {action: "done"|"reopen"|"delete", id} / {action: "clear"} (deletes every Done message)
// At most 3 messages an hour and 8 a day from the same (scrambled) IP.
import { json, ipHash, verifyTurnstile, clean, isAdmin } from "../../lib/community.js";
import { ensureFeedbackSchema, FEEDBACK_KINDS } from "../../lib/feedback.js";

const HOUR = 3600 * 1000;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  if (!env.DB) return json({ error: "The database isn't connected." }, 503);
  await ensureFeedbackSchema(env.DB);
  const status = new URL(request.url).searchParams.get("filter") === "done" ? "done" : "open";
  const { results } = await env.DB.prepare(
    "SELECT id, kind, message, contact, page, created, status FROM feedback WHERE status = ? ORDER BY created DESC LIMIT 200"
  ).bind(status).all();
  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE status = 'open'").first();
  return json({ feedback: results, open: open ? open.n : 0 });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Feedback isn't switched on yet." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  // Admin: tidy up.
  if (input.action) {
    if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
    await ensureFeedbackSchema(env.DB);
    if (input.action === "clear") {
      const res = await env.DB.prepare("DELETE FROM feedback WHERE status = 'done'").run();
      return json({ ok: true, deleted: res.meta ? res.meta.changes : 0 });
    }
    const id = Math.round(+input.id);
    if (!(id > 0)) return json({ error: "Bad request." }, 400);
    if (input.action === "delete") { await env.DB.prepare("DELETE FROM feedback WHERE id = ?").bind(id).run(); return json({ ok: true }); }
    const status = { done: "done", reopen: "open" }[input.action];
    if (!status) return json({ error: "Bad request." }, 400);
    await env.DB.prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(status, id).run();
    return json({ ok: true });
  }

  // Visitor.
  if (!env.TURNSTILE_SECRET) return json({ error: "Feedback isn't switched on yet." }, 503);
  if (input.website) return json({ ok: true }); // a bot filled the hidden box: pretend it worked
  const kind = FEEDBACK_KINDS[input.kind] ? input.kind : "";
  const message = clean(input.message, 1000, true);
  const contact = clean(input.contact, 100);
  const page = /^\/[\w\-./?=&%]{0,150}$/.test(String(input.page || "")) ? String(input.page) : ""; // where they came from: a path on this site only
  if (!kind) return json({ error: "Please pick what this is about." }, 400);
  if (message.length < 5) return json({ error: "Please write a few words." }, 400);
  if ((message.match(/https?:\/\/|www\./gi) || []).length > 2) return json({ error: "Please keep links to one or two." }, 400);
  if (!(await verifyTurnstile(input.token, request, env))) return json({ error: "Couldn't verify you're human. Please try again." }, 403);

  await ensureFeedbackSchema(env.DB);
  const who = await ipHash(request, env);
  const now = Date.now();
  const hour = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE ip_hash = ? AND created > ?").bind(who, now - HOUR).first();
  if (hour && hour.n >= 3) return json({ error: "Thanks, we've got a few from you already. Please try again in an hour." }, 429);
  const day = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE ip_hash = ? AND created > ?").bind(who, now - 24 * HOUR).first();
  if (day && day.n >= 8) return json({ error: "Thanks, that's plenty for today." }, 429);

  await env.DB.prepare("INSERT INTO feedback (kind, message, contact, page, created, ip_hash) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(kind, message, contact || null, page || null, now, who).run();
  return json({ ok: true });
}
