// Builds the "Films & series" catalogue from TMDB: the best-known films and series in each of our
// languages, with poster, genres, runtime (or seasons), Indian certificate, TMDB rating, a short summary
// and which apps stream them in India. Run weekly by .github/workflows/weekly-catalog.yml with the TMDB_TOKEN repository secret.
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
const TV_PER_LANG = 150;   // series per Indian language
const TV_EN = 300;         // English series
const TV_SKIP_GENRES = "10763,10764,10766,10767"; // News, Reality, Soap, Talk
const MAX_EPISODES = 300;  // longer than this is almost always a daily soap (not applied to anime)
// Anime: Japanese-language animation, stored under the code "ja" and shown as "Anime".
const ANIME = "ja";
const ANIME_MOVIES = 200;
const ANIME_TV = 300;
const ANIMATION = "16";    // TMDB genre id, same for films and TV
const OUT_LANGS = [...LANGS, ANIME];
const WORKERS = 8;

// TMDB provider names (India) → our app names. Anything else is left out.
const APP_RULES = [
  [/netflix/i, "Netflix"], [/prime video/i, "Prime Video"], [/hotstar|jiocinema/i, "JioHotstar"],
  [/zee5/i, "ZEE5"], [/sony ?liv/i, "SonyLIV"], [/sun ?nxt/i, "Sun NXT"], [/^aha/i, "aha"],
  [/manorama/i, "ManoramaMAX"], [/mx ?player/i, "MX Player"], [/lionsgate/i, "Lionsgate Play"],
  [/crunchyroll/i, "Crunchyroll"],
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

async function discover(kind, lang, params, pages) {
  const ids = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb(`/discover/${kind}`, { with_original_language: lang, include_adult: "false", page, ...params });
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

const appsOf = (d) => [...new Set((d["watch/providers"]?.results?.IN?.flatrate || [])
  .map((p) => (APP_RULES.find(([re]) => re.test(p.provider_name)) || [])[1]).filter(Boolean))];

function toFilm(d, lang) {
  const apps = appsOf(d);
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

// Series get id "tv<tmdb id>" (TMDB film and series ids can clash) and k: "tv".
function toSeries(d, lang) {
  const cert = (d.content_ratings?.results || []).find((r) => r.iso_3166_1 === "IN")?.rating || "";
  const first = +(d.first_air_date || "").slice(0, 4) || null;
  const last = +(d.last_air_date || "").slice(0, 4) || null;
  const ended = /Ended|Canceled/.test(d.status || "");
  return {
    id: `tv${d.id}`,
    k: "tv",
    l: lang,
    t: d.name,
    ...(d.original_name && d.original_name !== d.name ? { o: d.original_name } : {}),
    y: first,
    ...(ended && last && last !== first ? { ye: last } : {}),
    ...(ended ? { end: 1 } : {}),
    s: d.number_of_seasons || null,
    g: (d.genres || []).map((g) => g.name),
    r: (d.episode_run_time || [])[0] || null,
    v: Math.round((d.vote_average || 0) * 10) / 10,
    n: d.vote_count || 0,
    p: d.poster_path,
    ...(d.backdrop_path ? { b: d.backdrop_path } : {}),
    ...(cert ? { c: cert } : {}),
    w: appsOf(d),
    ov: shorten(d.overview),
  };
}

// Fetch details a few at a time.
async function details(picks, kind, append, toItem, keep = () => true) {
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (next < picks.length) {
      const [id, lang] = picks[next++];
      const d = await tmdb(`/${kind}/${id}`, { append_to_response: append });
      if (d && d.poster_path && keep(d, lang)) out.push(toItem(d, lang));
      await sleep(60);
    }
  }));
  return out;
}

async function main() {
  if (!TOKEN) { console.log("No TMDB_TOKEN set; skipping catalogue."); return; }
  const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10);

  const moviePicks = [];
  const tvPicks = [];
  for (const lang of LANGS) {
    const recent = await discover("movie", lang, { sort_by: "popularity.desc", "primary_release_date.gte": since, "vote_count.gte": lang === "en" ? 200 : 10 }, Math.ceil(RECENT / 20));
    const classic = await discover("movie", lang, { sort_by: "vote_count.desc" }, Math.ceil(PER_LANG / 20) + 2);
    const ids = [...new Set([...recent.slice(0, RECENT), ...classic])].slice(0, PER_LANG);
    moviePicks.push(...ids.map((id) => [id, lang]));

    const tvTarget = lang === "en" ? TV_EN : TV_PER_LANG;
    const tvParams = { without_genres: TV_SKIP_GENRES };
    const tvRecent = await discover("tv", lang, { ...tvParams, sort_by: "popularity.desc", "first_air_date.gte": since, "vote_count.gte": lang === "en" ? 100 : 5 }, 2);
    const tvClassic = await discover("tv", lang, { ...tvParams, sort_by: "vote_count.desc" }, Math.ceil(tvTarget / 20) + 2);
    // Ask for a few extra, since some get dropped below as daily soaps.
    const tvIds = [...new Set([...tvRecent.slice(0, 30), ...tvClassic])].slice(0, Math.round(tvTarget * 1.3));
    tvPicks.push(...tvIds.map((id) => [id, lang]));
    console.log(`${lang}: ${ids.length} films, ${tvIds.length} series candidates`);
  }

  // Anime: Japanese animation only (so no Japanese live-action), films and series.
  const anime = { with_genres: ANIMATION };
  const animeMovies = [...new Set([
    ...(await discover("movie", ANIME, { ...anime, sort_by: "popularity.desc", "primary_release_date.gte": since, "vote_count.gte": 50 }, 2)).slice(0, 30),
    ...(await discover("movie", ANIME, { ...anime, sort_by: "vote_count.desc" }, Math.ceil(ANIME_MOVIES / 20) + 1)),
  ])].slice(0, ANIME_MOVIES);
  const animeSeries = [...new Set([
    ...(await discover("tv", ANIME, { ...anime, sort_by: "popularity.desc", "first_air_date.gte": since, "vote_count.gte": 50 }, 3)).slice(0, 50),
    ...(await discover("tv", ANIME, { ...anime, sort_by: "vote_count.desc" }, Math.ceil(ANIME_TV / 20) + 1)),
  ])].slice(0, ANIME_TV);
  moviePicks.push(...animeMovies.map((id) => [id, ANIME]));
  tvPicks.push(...animeSeries.map((id) => [id, ANIME]));
  console.log(`anime: ${animeMovies.length} films, ${animeSeries.length} series`);

  const films = await details(moviePicks, "movie", "watch/providers,release_dates", toFilm);
  // Long-running daily soaps swamp Indian TV on TMDB; keep web and prime-time series. Long-running
  // anime (One Piece, Detective Conan) is the real thing, so the episode limit doesn't apply there.
  const series = (await details(tvPicks, "tv", "watch/providers,content_ratings", toSeries,
    (d, lang) => lang === ANIME || (d.number_of_episodes || 0) <= MAX_EPISODES))
    .sort((a, b) => b.n - a.n);
  const tvLimit = (lang) => (lang === ANIME ? ANIME_TV : lang === "en" ? TV_EN : TV_PER_LANG);
  const keptSeries = OUT_LANGS.flatMap((lang) => series.filter((s) => s.l === lang).slice(0, tvLimit(lang)));
  if (films.length < LANGS.length * 50) throw new Error(`Only ${films.length} films came back; not writing a broken catalogue.`);

  const all = [...films, ...keptSeries].sort((a, b) => b.n - a.n);
  mkdirSync(OUT, { recursive: true });
  const built = new Date().toISOString().slice(0, 10);
  const index = all.map(({ ov, b, o, ...rest }) => rest);
  writeFileSync(new URL("index.json", OUT), JSON.stringify({ built, count: all.length, films: index }));
  for (const lang of OUT_LANGS) {
    const byId = Object.fromEntries(all.filter((f) => f.l === lang).map((f) => [f.id, f]));
    writeFileSync(new URL(`${lang}.json`, OUT), JSON.stringify({ built, films: byId }));
  }
  console.log(`Catalogue: ${films.length} films and ${keptSeries.length} series, built ${built}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
