// Wrong-info reports for /admin ("Authorization: Bearer <ADMIN_PASSWORD>").
// GET ?filter=open|done|ignored → the reports, most-reported first.
// POST {action: "apply"|"done"|"ignore"|"reopen", id}: "apply" saves the app correction to
// assets/catalog/overrides.json on GitHub (needs GITHUB_TOKEN, as /write) and marks it done; the site
// shows it within a couple of minutes. "done" marks it fixed without changing anything (details, other).
import { json, isAdmin } from "../../lib/community.js";
import { ensureFixesSchema, APP_KINDS, OVERRIDES_PATH, overrideKey, withCorrection } from "../../lib/fixes.js";
import { github } from "../../lib/github.js";

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  if (!env.DB) return json({ error: "The database isn't connected." }, 503);
  await ensureFixesSchema(env.DB);
  const filter = new URL(request.url).searchParams.get("filter");
  const status = ["open", "done", "ignored"].includes(filter) ? filter : "open";
  const { results } = await env.DB.prepare(
    `SELECT id, target, name, kind, app, note, count, created, updated, status FROM fixes WHERE status = ?
     ORDER BY ${status === "open" ? "count DESC, updated DESC" : "updated DESC"} LIMIT 200`
  ).bind(status).all();
  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM fixes WHERE status = 'open'").first();
  return json({ fixes: results, open: open ? open.n : 0 });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  if (!env.DB) return json({ error: "The database isn't connected." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const id = Math.round(+input.id);
  const status = { apply: "done", done: "done", ignore: "ignored", reopen: "open" }[input.action];
  if (!(id > 0) || !status) return json({ error: "Bad request." }, 400);
  await ensureFixesSchema(env.DB);
  const fix = await env.DB.prepare("SELECT * FROM fixes WHERE id = ?").bind(id).first();
  if (!fix) return json({ error: "That report is gone." }, 404);

  if (input.action === "apply") {
    if (!APP_KINDS.has(fix.kind) || !fix.app) return json({ error: "Only app reports can be applied; mark this one done once you've fixed it." }, 400);
    try {
      const gh = github(env);
      const head = await gh.head();
      const before = await gh.read(OVERRIDES_PATH, head.sha);
      const after = withCorrection(before, overrideKey(fix.target), fix.kind, fix.app);
      await gh.commit(head, { [OVERRIDES_PATH]: after },
        `Correction: ${fix.name || fix.target} ${fix.kind === "gone" ? "no longer on" : "also on"} ${fix.app} (from a report)`);
    } catch (e) {
      return json({ error: `Couldn't save: ${e.message}. Nothing was changed; try again in a minute.` }, 502);
    }
  }
  await env.DB.prepare("UPDATE fixes SET status = ?, updated = ? WHERE id = ?").bind(status, Date.now(), id).run();
  return json({ ok: true });
}
