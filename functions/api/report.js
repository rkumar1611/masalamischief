// POST /api/report {target, name, kind, app?, note?} → a visitor's "wrong info" report for a title
// (target as lib/community.js validTitle: "c:<lang>-<id>" or "r:<review id>"). It waits in /admin;
// nothing on the site changes until it's applied there. The same report again only adds to its count.
import { json, ipHash, validTitle, clean } from "../../lib/community.js";
import { ensureFixesSchema, KINDS, APP_KINDS, APPS } from "../../lib/fixes.js";

const PER_DAY = 10; // reports one visitor can send in a day

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Reports aren't switched on yet." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const target = input.target;
  const kind = input.kind;
  const app = APP_KINDS.has(kind) ? input.app : null;
  const note = clean(input.note, 300);
  if (!validTitle(target) || !KINDS[kind]) return json({ error: "Bad request." }, 400);
  if (APP_KINDS.has(kind) && !APPS.includes(app)) return json({ error: "Please pick the app." }, 400);
  if (!APP_KINDS.has(kind) && note.length < 3) return json({ error: "Please tell us what's wrong." }, 400);

  const db = env.DB;
  await ensureFixesSchema(db);
  const ip = await ipHash(request, env);
  const now = Date.now();
  const recent = await db.prepare("SELECT COUNT(*) AS n FROM fixes WHERE ip_hash = ? AND created > ?").bind(ip, now - 864e5).first();
  if (recent && recent.n >= PER_DAY) return json({ error: "Thanks, that's plenty for today. We'll check them." }, 429);

  // The same app report on the same title, still open: count it (once per visitor) instead of adding a row.
  if (APP_KINDS.has(kind)) {
    const same = await db.prepare("SELECT id, ip_hash FROM fixes WHERE target = ? AND kind = ? AND app = ? AND status = 'open'").bind(target, kind, app).first();
    if (same) {
      if (same.ip_hash !== ip) {
        await db.prepare("UPDATE fixes SET count = count + 1, updated = ?, note = CASE WHEN ? <> '' AND (note IS NULL OR note = '') THEN ? ELSE note END WHERE id = ?")
          .bind(now, note, note, same.id).run();
      }
      return json({ ok: true });
    }
  }
  await db.prepare("INSERT INTO fixes (target, name, kind, app, note, created, updated, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(target, clean(input.name, 120), kind, app, note, now, now, ip).run();
  return json({ ok: true });
}
