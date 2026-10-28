// Builds the "All films" catalogue from TMDB: the best-known films in each of our languages, with
// poster, genres, runtime, Indian certificate, TMDB rating, a short summary and which apps stream them
// in India. Run weekly by .github/workflows/weekly-catalog.yml with the TMDB_TOKEN repository secret.
//
// Writes:
//   assets/catalog/index.json   compact list for the All films page (and the sitemap)
//   assets/catalog/<lang>.json  full details per language, for each film's page
// Plain Node 20, no dependencies.

import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../assets/catalog/", import.meta.url);
const TOKEN = process.env.TMDB_TOKEN;
const LANGS = ["hi", "ta", "te", "ml", "kn", "en"];
const PER_LANG = 400;      // films per language
const RECENT = 100;        // of which, up to this many recent popular ones
const WORKERS = 8;

// TMDB provider names (India) → our app names. Anything else is left out.
const APP_RULES = [
  [/netflix/i, "Netflix"], [/prime video/i, "Prime Video"], [/hotstar|jiocinema/i, "JioHotstar"],
  [/zee5/i, "ZEE5"], [/sony ?liv/i, "SonyLIV"], [/sun ?nxt/i, "Sun NXT"], [/^aha/i, "aha"],
  [/manorama/i, "ManoramaMAX"], [/mx ?player/i, "MX Player"], [/lionsgate/i, "Lionsgate Play"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params = {}) {
  const url = `https://api.themoviedb.org/3${path}?${new URLSearchParams({ language: "en-US", ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" } });
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (res.status === 401) throw new Error("TMDB rejected the token. Check the TMDB_TOKEN secret.");
    if (res.status === 404) return null;
    if (!res.ok) { await sleep(1000); continue; }
    return res.json();
  }
  throw new Error(`TMDB failed: ${path}`);
}

async function discover(lang, params, pages) {
  const ids = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb("/discover/movie", { with_original_language: lang, include_adult: "false", page, ...params });
    if (!data || !data.results.length) break;
    ids.push(...data.results.filter((r) => r.poster_path).map((r) => r.id));
    if (page >= data.total_pages) break;
  }
  return ids;
}

const shorten = (s, max = 320) => {
  if (!s || s.length <= max) return s || "";
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > 120 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…");
};

function toFilm(d, lang) {
  const providers = (d["watch/providers"]?.results?.IN?.flatrate || []).map((p) => p.provider_name);
  const apps = [...new Set(providers.map((n) => (APP_RULES.find(([re]) => re.test(n)) || [])[1]).filter(Boolean))];
  const cert = (d.release_dates?.results?.find((r) => r.iso_3166_1 === "IN")?.release_dates || [])
    .map((x) => x.certification).find(Boolean) || "";
  return {
    id: d.id,
    l: lang,
    t: d.title,
    ...(d.original_title && d.original_title !== d.title ? { o: d.original_title } : {}),
    y: +(d.release_date || "").slice(0, 4) || null,
    g: (d.genres || []).map((g) => g.name),
    r: d.runtime || null,
    v: Math.round((d.vote_average || 0) * 10) / 10,
    n: d.vote_count || 0,
    p: d.poster_path,
    ...(d.backdrop_path ? { b: d.backdrop_path } : {}),
    ...(cert ? { c: cert } : {}),
    w: apps,
    ov: shorten(d.overview),
  };
}

async function main() {
  if (!TOKEN) { console.log("No TMDB_TOKEN set; skipping catalogue."); return; }
  const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10);

  const picks = [];
  for (const lang of LANGS) {
    const recent = await discover(lang, { sort_by: "popularity.desc", "primary_release_date.gte": since, "vote_count.gte": lang === "en" ? 200 : 10 }, Math.ceil(RECENT / 20));
    const classic = await discover(lang, { sort_by: "vote_count.desc" }, Math.ceil(PER_LANG / 20) + 2);
    const ids = [...new Set([...recent.slice(0, RECENT), ...classic])].slice(0, PER_LANG);
    picks.push(...ids.map((id) => [id, lang]));
    console.log(`${lang}: ${ids.length} films`);
  }

  // Details for each film (genres, runtime, certificate, India streaming), a few at a time.
  const films = [];
  let next = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (next < picks.length) {
      const [id, lang] = picks[next++];
      const d = await tmdb(`/movie/${id}`, { append_to_response: "watch/providers,release_dates" });
      if (d && d.poster_path) films.push(toFilm(d, lang));
      await sleep(60);
    }
  }));
  if (films.length < LANGS.length * 50) throw new Error(`Only ${films.length} films came back; not writing a broken catalogue.`);

  films.sort((a, b) => b.n - a.n);
  mkdirSync(OUT, { recursive: true });
  const built = new Date().toISOString().slice(0, 10);
  const index = films.map(({ ov, b, o, n, ...rest }) => rest);
  writeFileSync(new URL("index.json", OUT), JSON.stringify({ built, count: films.length, films: index }));
  for (const lang of LANGS) {
    const byId = Object.fromEntries(films.filter((f) => f.l === lang).map((f) => [f.id, f]));
    writeFileSync(new URL(`${lang}.json`, OUT), JSON.stringify({ built, films: byId }));
  }
  console.log(`Catalogue: ${films.length} films, built ${built}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
