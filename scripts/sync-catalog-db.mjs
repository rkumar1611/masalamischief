// Copies the built catalogue (assets/catalog/list-<lang>.json) into our D1 database through /api/catalog-sync,
// sending only the titles that are new or changed, and keeping each title's app history (when it arrived on
// or left an app). Run after each catalogue build by .github/workflows/weekly-catalog.yml with the
// ADMIN_PASSWORD repository secret (same value as in Cloudflare). Plain Node 20+, no dependencies.
// Cloudflare's free D1 plan allows 100,000 row writes a day, so one run sends at most MAX_ROWS titles; the
// first run (everything is new) simply carries on over the next days.
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SITE = process.env.SITE || "https://masalamischief.in";
const PASSWORD = process.env.ADMIN_PASSWORD;
const DIR = new URL("../assets/catalog/", import.meta.url);
const BATCH = 25;
const MAX_ROWS = 20000;
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

  const todo = rows.slice(0, MAX_ROWS);
  let sent = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    await call("/api/catalog-sync", { method: "POST", body: JSON.stringify({ rows: todo.slice(i, i + BATCH), seed }) });
    sent += Math.min(BATCH, todo.length - i);
  }
  console.log(`Catalogue database: ${sent} titles saved${rows.length > sent ? `, ${rows.length - sent} left for the next run` : ""}.`);
}

main().catch((e) => { console.error(`Catalogue database: ${e.message}`); process.exit(1); });
