// Wrong-info reports ("Wrong app? Tell us" on film and review pages) and the corrections made from them.
// Visitors' reports wait in D1 (table fixes) until checked in /admin. Applying one writes
// assets/catalog/overrides.json on GitHub (lib/github.js), which the site lays over the catalogue:
//   { updated: "YYYY-MM-DD", titles: { "<lang>-<id>" | "r:<review id>": { add: [app], remove: [app], date } } }
// A correction lasts OVERRIDE_DAYS; by then the weekly app check has normally caught up. assets/app.js
// withOverride() repeats overrideApps() for the pages; keep them alike.

export const OVERRIDES_PATH = "assets/catalog/overrides.json";
export const OVERRIDE_DAYS = 90;

// What a visitor can report. Only the first two change the site when applied; the rest are notes for us.
export const KINDS = {
  gone: "Not on this app any more",
  also: "Also streaming on another app",
  details: "Wrong details (year, cast, language…)",
  other: "Something else",
};
export const APP_KINDS = new Set(["gone", "also"]);

// The apps a report can name (as on the site's buttons).
export const APPS = ["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "Sun NXT", "aha", "ManoramaMAX",
  "Lionsgate Play", "Crunchyroll", "Apple TV", "MX Player", "Hoichoi", "ETV Win", "Chaupal"];

let schemaReady = false;
export async function ensureFixesSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS fixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target TEXT NOT NULL,
      name TEXT,
      kind TEXT NOT NULL,
      app TEXT,
      note TEXT,
      count INTEGER NOT NULL DEFAULT 1,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL,
      ip_hash TEXT,
      status TEXT NOT NULL DEFAULT 'open'
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS fixes_status ON fixes (status, updated)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fixes_target ON fixes (target, kind, app, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fixes_ip ON fixes (ip_hash, created)"),
  ]);
  schemaReady = true;
}

// "c:ml-123" → "ml-123" (the catalogue's key); "r:<id>" stays as it is.
export const overrideKey = (target) => target.replace(/^c:/, "");

// The apps a title is on once a correction is laid over them.
export function overrideApps(apps, ov, today = new Date().toISOString().slice(0, 10)) {
  if (!ov || !ov.date || (Date.parse(today) - Date.parse(ov.date)) / 864e5 > OVERRIDE_DAYS) return apps || [];
  const out = (apps || []).filter((a) => !(ov.remove || []).includes(a));
  for (const a of ov.add || []) if (!out.includes(a)) out.push(a);
  return out;
}

// overrides.json with one report's correction added (and corrections past OVERRIDE_DAYS dropped).
export function withCorrection(text, key, kind, app, today = new Date().toISOString().slice(0, 10)) {
  let data;
  try { data = JSON.parse(text || "{}"); } catch { data = {}; }
  const titles = data.titles || {};
  for (const [k, ov] of Object.entries(titles)) if ((Date.parse(today) - Date.parse(ov.date)) / 864e5 > OVERRIDE_DAYS) delete titles[k];
  const ov = titles[key] || { add: [], remove: [] };
  const [into, outOf] = kind === "gone" ? ["remove", "add"] : ["add", "remove"];
  ov[outOf] = (ov[outOf] || []).filter((a) => a !== app);
  ov[into] = [...new Set([...(ov[into] || []), app])];
  ov.date = today;
  titles[key] = ov;
  return `${JSON.stringify({ updated: today, titles }, null, 1)}\n`;
}
