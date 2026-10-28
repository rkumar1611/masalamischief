// Trailer, cast, director and Wikipedia link for each of our reviewed films, from TMDB, into
// assets/catalog/reviewed.json ({ "<our film id>": { tr, cast, dir, wd } }). Review pages and actor
// pages load it. Run by the daily GitHub workflow with the TMDB_TOKEN secret; the file is only
// rewritten when something changed, so most days there's nothing to commit. Catalogue titles get the
// same fields from build-catalog.mjs (weekly).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { EXTRA_APPEND, VIDEO_LANGS, extrasOf } from "./tmdb-extras.mjs";

const DATA = new URL("../assets/data.js", import.meta.url);
const OUT = new URL("../assets/catalog/reviewed.json", import.meta.url);
const TOKEN = process.env.TMDB_TOKEN;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params) {
  const url = `https://api.themoviedb.org/3${path}?${new URLSearchParams({ language: "en-US", ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" } });
    if (res.status === 429) { await sleep(3000); continue; }
    if (res.status === 401) throw new Error("TMDB rejected the token. Check the TMDB_TOKEN secret.");
    if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
    return res.json();
  }
  throw new Error(`TMDB rate-limited: ${path}`);
}

async function main() {
  if (!TOKEN) { console.log("No TMDB_TOKEN set; skipping extras."); return; }
  const { MOVIES, IMAGES } = new Function(`${readFileSync(DATA, "utf8")}; return { MOVIES, IMAGES };`)();
  const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const out = {};
  for (const m of MOVIES) {
    const id = IMAGES[m.id] && IMAGES[m.id].tmdb;
    if (!id) continue;
    try {
      const d = await tmdb(`/movie/${id}`, { append_to_response: EXTRA_APPEND, include_video_language: VIDEO_LANGS });
      out[m.id] = extrasOf(d, "movie");
    } catch (e) {
      if (/rejected the token/.test(e.message)) throw e;
      console.log(`skip ${m.title}: ${e.message}`);
      if (old[m.id]) out[m.id] = old[m.id]; // keep what we had
    }
    await sleep(120);
  }
  const text = JSON.stringify(out);
  if (existsSync(OUT) && readFileSync(OUT, "utf8") === text) { console.log("Extras unchanged."); return; }
  writeFileSync(OUT, text);
  console.log(`Extras for ${Object.keys(out).length} films (${Object.values(out).filter((x) => x.tr).length} with trailers).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
