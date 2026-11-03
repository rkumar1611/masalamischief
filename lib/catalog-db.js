// Our own copy of the movie catalogue, in the D1 database (the DB binding), so we keep what the daily TMDB /
// JustWatch builds only ever overwrite: which titles we have, and when each one arrived on or left an app.
// The site still reads the JSON files in assets/catalog/; this is the long-term record, filled after each
// catalogue run by scripts/sync-catalog-db.mjs through /api/catalog-sync. Tables are created automatically.
//   catalog_titles  one row per title: key "<lang>-<tmdb id>" (series "<lang>-tv<id>"), details, apps (JSON)
//   catalog_apps    one row per title and app: first_seen (NULL if it was already there when we started
//                   recording), last_seen, active (1 while it streams there)
export async function ensureCatalogSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS catalog_titles (
      key TEXT PRIMARY KEY, lang TEXT NOT NULL, kind TEXT NOT NULL, tmdb_id INTEGER NOT NULL, title TEXT NOT NULL,
      year INTEGER, seasons INTEGER, genres TEXT NOT NULL DEFAULT '[]', runtime INTEGER, rating REAL, votes INTEGER,
      poster TEXT, cert TEXT, apps TEXT NOT NULL DEFAULT '[]', hash TEXT NOT NULL, first_seen TEXT, updated TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS catalog_apps (
      key TEXT NOT NULL, app TEXT NOT NULL, first_seen TEXT, last_seen TEXT NOT NULL, active INTEGER NOT NULL,
      PRIMARY KEY (key, app))`),
  ]);
}

const today = () => new Date().toISOString().slice(0, 10);
const clean = (s, max) => (typeof s === "string" ? s.slice(0, max) : null);
const num = (n) => (Number.isFinite(+n) && n !== null && n !== "" ? +n : null);

// rows: [{ k, l, kind, id, t, y, s, g, r, v, n, p, c, w, h }] (at most 40). `seed` means the database was empty,
// so the arrival dates would be today's date rather than real ones and are left blank.
export async function saveTitles(db, rows, seed) {
  await ensureCatalogSchema(db);
  const day = today();
  const keys = rows.map((r) => r.k);
  const { results: have } = await db.prepare(`SELECT key, app FROM catalog_apps WHERE active = 1 AND key IN (${keys.map(() => "?").join(",")})`).bind(...keys).all();
  const was = new Map();
  for (const h of have) (was.get(h.key) || was.set(h.key, new Set()).get(h.key)).add(h.app);

  const stmts = [];
  for (const r of rows) {
    const apps = Array.isArray(r.w) ? r.w.filter((a) => typeof a === "string").map((a) => a.slice(0, 40)).slice(0, 30) : [];
    stmts.push(db.prepare(`INSERT INTO catalog_titles (key, lang, kind, tmdb_id, title, year, seasons, genres, runtime, rating, votes, poster, cert, apps, hash, first_seen, updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET title = excluded.title, year = excluded.year, seasons = excluded.seasons, genres = excluded.genres,
        runtime = excluded.runtime, rating = excluded.rating, votes = excluded.votes, poster = excluded.poster, cert = excluded.cert,
        apps = excluded.apps, hash = excluded.hash, updated = excluded.updated`)
      .bind(clean(r.k, 40), clean(r.l, 8), r.kind === "tv" ? "tv" : "movie", num(r.id), clean(r.t, 300) || "", num(r.y), num(r.s),
        JSON.stringify((r.g || []).slice(0, 8).map((g) => String(g).slice(0, 40))), num(r.r), num(r.v), num(r.n), clean(r.p, 80), clean(r.c, 20),
        JSON.stringify(apps), clean(r.h, 40), seed ? null : day, day));
    const before = was.get(r.k) || new Set();
    for (const a of apps) {
      if (before.has(a)) continue;
      stmts.push(db.prepare(`INSERT INTO catalog_apps (key, app, first_seen, last_seen, active) VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(key, app) DO UPDATE SET active = 1, last_seen = excluded.last_seen`).bind(r.k, a, seed ? null : day, day));
    }
    for (const a of before) {
      if (!apps.includes(a)) stmts.push(db.prepare("UPDATE catalog_apps SET active = 0, last_seen = ? WHERE key = ? AND app = ?").bind(day, r.k, a));
    }
  }
  await db.batch(stmts);
  return stmts.length;
}
