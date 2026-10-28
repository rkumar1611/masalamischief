// Fills IMAGES in assets/data.js with TMDB poster and still paths for any film that doesn't have them yet.
// Run by the daily GitHub workflow with the TMDB_TOKEN repository secret (TMDB "API Read Access Token").
// The token is only used here, on GitHub; the website just loads the public image paths.
//
// Each entry records which TMDB film it matched ("match"), so a wrong match is easy to spot in the commit.
// To fix one, edit its tmdb/poster/backdrop by hand (existing entries are never touched), or delete the
// entry to let the next run look it up again.

import { readFileSync, writeFileSync } from "node:fs";
import { bumpVersion } from "./bump-version.mjs";

const DATA = new URL("../assets/data.js", import.meta.url);
const TOKEN = process.env.TMDB_TOKEN;
const LANG_CODES = { Hindi: "hi", Tamil: "ta", Telugu: "te", Malayalam: "ml", Kannada: "kn", English: "en" };
const BLOCK_RE = /const IMAGES = (?:\{\}|\{\n[\s\S]*?\n\});/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function tmdb(path, params = {}) {
  const url = `https://api.themoviedb.org/3${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" } });
    if (res.status === 429) { await sleep(3000); continue; }
    if (res.status === 401) throw new Error("TMDB rejected the token. Check the TMDB_TOKEN secret is the API Read Access Token.");
    if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
    return res.json();
  }
  throw new Error(`TMDB rate-limited: ${path}`);
}

// Best TMDB match for one of our films: same original language, year within one, exact title preferred.
async function findMovie(m) {
  const lang = LANG_CODES[m.lang];
  const pick = (results) => {
    const ok = results.filter((r) => r.original_language === lang &&
      Math.abs((+(r.release_date || "").slice(0, 4) || 0) - m.year) <= 1);
    return ok.find((r) => norm(r.title) === norm(m.title) || norm(r.original_title) === norm(m.title)) || ok[0];
  };
  const base = { query: m.title, include_adult: "false", language: "en-US" };
  let hit = pick((await tmdb("/search/movie", { ...base, primary_release_year: m.year })).results);
  if (!hit) hit = pick((await tmdb("/search/movie", base)).results);
  return hit;
}

// A still without text on it looks best behind our own title; fall back to the default backdrop.
async function bestBackdrop(id, fallback) {
  const { backdrops = [] } = await tmdb(`/movie/${id}/images`, { include_image_language: "null,en" });
  const clean = backdrops.filter((b) => b.iso_639_1 === null).sort((a, b) => b.vote_average - a.vote_average)[0];
  return (clean && clean.file_path) || fallback;
}

async function main() {
  if (!TOKEN) { console.log("No TMDB_TOKEN set; skipping images."); return; }
  const src = readFileSync(DATA, "utf8");
  if (!BLOCK_RE.test(src)) throw new Error("Couldn't find the IMAGES block in assets/data.js.");
  const { MOVIES, IMAGES } = new Function(`${src}; return { MOVIES, IMAGES };`)();

  const images = { ...IMAGES };
  let added = 0;
  for (const m of MOVIES) {
    if (images[m.id]) continue;
    try {
      const hit = await findMovie(m);
      if (!hit || (!hit.poster_path && !hit.backdrop_path)) { console.log(`no match: ${m.title} (${m.year})`); continue; }
      const backdrop = hit.backdrop_path ? await bestBackdrop(hit.id, hit.backdrop_path) : null;
      images[m.id] = {
        tmdb: hit.id,
        ...(hit.poster_path ? { poster: hit.poster_path } : {}),
        ...(backdrop ? { backdrop } : {}),
        match: `${hit.title} (${(hit.release_date || "").slice(0, 4)})`,
      };
      added++;
      console.log(`matched ${m.title} (${m.year}) → ${images[m.id].match}`);
    } catch (e) {
      if (/rejected the token/.test(e.message)) throw e;
      console.log(`skip ${m.title}: ${e.message}`);
    }
    await sleep(250);
  }
  if (!added) { console.log("No new images."); return; }

  // Same order as MOVIES, one line per film.
  const order = MOVIES.map((m) => m.id).filter((id) => images[id]);
  const extra = Object.keys(images).filter((id) => !order.includes(id));
  const lines = [...order, ...extra].map((id) => `  ${JSON.stringify(id)}: ` +
    JSON.stringify(images[id]).replace(/"(\w+)":/g, "$1: ").replace(/,(\w+: )/g, ", $1").replace(/^\{/, "{ ").replace(/\}$/, " }") + ",");
  writeFileSync(DATA, src.replace(BLOCK_RE, `const IMAGES = {\n${lines.join("\n")}\n};`));
  const v = bumpVersion();
  console.log(`Added images for ${added} films, assets v=${v}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
