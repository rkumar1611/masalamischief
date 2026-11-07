// Copies the built catalogue (assets/catalog/list-<lang>.json) into our D1 database through /api/catalog-sync,
// sending only the titles that are new or changed, and keeping each title's app history (when it arrived on
// or left an app). Run after each catalogue build by .github/workflows/weekly-catalog.yml with the
// ADMIN_PASSWORD repository secret (same value as in Cloudflare). Plain Node 20+, no dependencies.
// Cloudflare's free D1 plan allows 100,000 row writes a day, shared with the site's reviews, accounts and alerts, so one run
// sends at most MAX_ROWS titles; a big backlog simply carries on over the next runs.
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SITE = process.env.SITE || "https://masalamischief.in";
const PASSWORD = process.env.ADMIN_PASSWORD;
const DIR = new URL("../assets/catalog/", import.meta.url);
const BATCH = 25;
const MAX_ROWS = 8000; // each title is about 4 row writes (rows plus their keys); the site's own reviews and accounts share the same 100,000 a day
const headers = { authorization: `Bearer ${PASSWORD}`, "content-type": "application/json" };

async function call(path, options) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${SITE}${path}`, { ...options, headers });
    if (res.ok) return res.json();
    if (res.status === 401 || res.status === 404 || res.status === 503) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`${path} kept failing`);
}

async function main() {
  if (!PASSWORD) throw new Error("No ADMIN_PASSWORD set.");

  const saved = new Map();
  let after = "";
  let total = 0;
  do {
    const out = await call(`/api/catalog-sync?after=${encodeURIComponent(after)}`);
    for (const [k, h] of out.hashes) saved.set(k, h);
    if (out.total !== undefined) total = out.total;
    after = out.next || "";
  } while (after);

  const rows = [];
  let all = 0;
  for (const file of readdirSync(DIR).filter((f) => /^list-[a-z]{2,3}\.json$/.test(f))) {
    const lang = file.slice(5, -5);
    for (const f of JSON.parse(readFileSync(new URL(file, DIR), "utf8")).films) {
      const row = { k: `${lang}-${f.id}`, l: lang, kind: f.k === "tv" ? "tv" : "movie", id: +String(f.id).replace(/^tv/, ""), t: f.t, y: f.y, s: f.sa || f.s, g: f.g, r: f.r, v: f.v, n: f.n, p: f.p, c: f.c, w: f.w || [] };
      row.h = createHash("sha1").update(JSON.stringify([row.t, row.y, row.s, row.g, row.r, row.v, row.p, row.c, row.w]) /* not the vote count: it moves every day */).digest("hex").slice(0, 16);
      all++;
      if (saved.get(row.k) !== row.h) rows.push(row);
    }
  }
  // Until most of the catalogue is saved, "new here" does not mean "new on the app", so arrival dates stay blank.
  const seed = total < all * 0.9;
  console.log(`Catalogue database: ${total} of ${all} titles saved, ${rows.length} new or changed${seed ? " (filling up: arrival dates left blank)" : ""}.`);

  // Titles the database has never had: the daily build re-adds titles the weekly one trimmed, so only these are really new.
  const fresh = rows.filter((r) => !saved.has(r.k));
  if (!seed) console.log(`Catalogue database: ${fresh.length} titles never seen before${fresh.length ? ` (${fresh.slice(0, 12).map((r) => `${r.t}${r.y ? ` ${r.y}` : ""}`).join(", ")}${fresh.length > 12 ? ", …" : ""})` : ""}.`);

  const todo = rows.slice(0, MAX_ROWS);
  let sent = 0;
  try {
    for (let i = 0; i < todo.length; i += BATCH) {
      await call("/api/catalog-sync", { method: "POST", body: JSON.stringify({ rows: todo.slice(i, i + BATCH), seed }) });
      sent += Math.min(BATCH, todo.length - i);
    }
  } catch (e) {
    // For example out of free writes for today: stop quietly, the rest goes in the next run.
    console.log(`Catalogue database: stopped early (${e.message.slice(0, 160)}).`);
  }
  console.log(`Catalogue database: ${sent} titles saved${rows.length > sent ? `, ${rows.length - sent} left for the next run` : ""}.`);
  // Tells /admin the run finished, even when there was nothing to save ("database updated").
  await call("/api/catalog-sync", { method: "POST", body: JSON.stringify({ done: true }) }).catch((e) => console.log(`Catalogue database: couldn't note the run (${e.message.slice(0, 120)}).`));
}

main().catch((e) => { console.error(`Catalogue database: ${e.message}`); process.exit(1); });
