// Builds the "Films & series" catalogue from TMDB: the best-known films and series in each of our
// languages, with poster, genres, runtime (or seasons), Indian certificate, TMDB rating, a short summary
// and which apps stream them in India. Run weekly by .github/workflows/weekly-catalog.yml with the TMDB_TOKEN repository secret.
//
// Writes, per language:
//   assets/catalog/list-<lang>.json  compact list (Movies & series page, search, sitemap)
//   assets/catalog/<lang>.json       full details, for each title's page
// plus assets/catalog/manifest.json listing the languages and counts.
// Plain Node 20, no dependencies.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { EXTRA_APPEND, VIDEO_LANGS, extrasOf } from "./tmdb-extras.mjs";

const OUT = new URL("../assets/catalog/", import.meta.url);
const TOKEN = process.env.TMDB_TOKEN;
// How many films and series to take per language (best-known first, plus recent hits).
// Korean skips animation so it's dramas and films; anime is handled separately below.
const PLAN = {
  hi: { movies: 1000, tv: 150 }, ta: { movies: 1000, tv: 150 }, te: { movies: 1000, tv: 150 },
  ml: { movies: 1000, tv: 150 }, kn: { movies: 1000, tv: 150 },
  mr: { movies: 400, tv: 80 }, bn: { movies: 400, tv: 80 }, pa: { movies: 300, tv: 50 },
  en: { movies: 400, tv: 300 },
  ko: { movies: 300, tv: 300, noAnimation: true },
};
const LANGS = Object.keys(PLAN);
const RECENT = 100;        // of each language's films, up to this many recent popular ones
const TV_SKIP_GENRES = "10763,10764,10766,10767"; // News, Reality, Soap, Talk
const MAX_EPISODES = 300;  // longer than this is almost always a daily soap (not applied to anime)
// Anime: Japanese-language animation, stored under the code "ja" and shown as "Anime".
const ANIME = "ja";
const ANIME_MOVIES = 200;
const ANIME_TV = 300;
const ANIMATION = "16";    // TMDB genre id, same for films and TV
const OUT_LANGS = [...LANGS, ANIME];
const WORKERS = 8;
// "Trending this week" on the homepage: the most popular new films (last few months) per main language.
const TREND_LANGS = ["hi", "ta", "te", "ml", "kn", "en"];
const TREND_DAYS = 120;
const TREND_PER_LANG = 4;
const PEOPLE_SHARDS = 64;  // must match the site (assets/app.js)
const DAILY_DAYS = 45;     // the daily run looks for titles released in this many days
// Upcoming releases page: next few months, most-awaited first in each language.
const UPCOMING_LANGS = ["hi", "ta", "te", "ml", "kn", "mr", "bn", "pa", "en", "ko"];
const UPCOMING_DAYS = 120;
const UPCOMING_PER_LANG = 12;

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
    ...(d.release_date ? { rd: d.release_date } : {}),
    g: (d.genres || []).map((g) => g.name),
    r: d.runtime || null,
    v: Math.round((d.vote_average || 0) * 10) / 10,
    n: d.vote_count || 0,
    p: d.poster_path,
    ...(d.backdrop_path ? { b: d.backdrop_path } : {}),
    ...(cert ? { c: cert } : {}),
    ...(d.external_ids?.imdb_id ? { im: d.external_ids.imdb_id } : {}),
    w: apps,
    ov: shorten(d.overview),
    ...extrasOf(d, "movie"),
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
    ...(d.first_air_date ? { rd: d.first_air_date } : {}),
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
    ...(d.external_ids?.imdb_id ? { im: d.external_ids.imdb_id } : {}),
    w: appsOf(d),
    ov: shorten(d.overview),
    ...extrasOf(d, "tv"),
  };
}

// Fetch details a few at a time.
async function details(picks, kind, append, toItem, keep = () => true) {
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (next < picks.length) {
      const [id, lang] = picks[next++];
      const d = await tmdb(`/${kind}/${id}`, { append_to_response: `${append},${EXTRA_APPEND}`, include_video_language: VIDEO_LANGS });
      if (d && d.poster_path && keep(d, lang)) out.push(toItem(d, lang));
      await sleep(60);
    }
  }));
  return out;
}

async function main() {
  if (!TOKEN) { console.log("No TMDB_TOKEN set; skipping catalogue."); return; }
  if (process.env.CATALOG_MODE === "daily") return daily();
  const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const trendSince = new Date(Date.now() - TREND_DAYS * 864e5).toISOString().slice(0, 10);

  const moviePicks = [];
  const tvPicks = [];
  const trendIds = {};
  for (const lang of LANGS) {
    const plan = PLAN[lang];
    const movieParams = plan.noAnimation ? { without_genres: ANIMATION } : {};
    // Trending picks go first so the per-language cap never drops them.
    const trend = TREND_LANGS.includes(lang)
      ? (await discover("movie", lang, { ...movieParams, sort_by: "popularity.desc", "primary_release_date.gte": trendSince, "primary_release_date.lte": today, "vote_count.gte": 3 }, 1)).slice(0, TREND_PER_LANG + 2)
      : [];
    trendIds[lang] = trend;
    const recent = await discover("movie", lang, { ...movieParams, sort_by: "popularity.desc", "primary_release_date.gte": since, "vote_count.gte": lang === "en" ? 200 : 10 }, Math.ceil(RECENT / 20));
    const classic = await discover("movie", lang, { ...movieParams, sort_by: "vote_count.desc" }, Math.ceil(plan.movies / 20) + 2);
    const ids = [...new Set([...trend, ...recent.slice(0, RECENT), ...classic])].slice(0, plan.movies);
    moviePicks.push(...ids.map((id) => [id, lang]));

    const tvTarget = plan.tv;
    const tvParams = { without_genres: TV_SKIP_GENRES + (plan.noAnimation ? `,${ANIMATION}` : "") };
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
  const tvLimit = (lang) => (lang === ANIME ? ANIME_TV : PLAN[lang].tv);
  const keptSeries = OUT_LANGS.flatMap((lang) => series.filter((s) => s.l === lang).slice(0, tvLimit(lang)));
  if (films.length < LANGS.length * 50) throw new Error(`Only ${films.length} films came back; not writing a broken catalogue.`);

  writeCatalogue([...films, ...keptSeries], trendIds, { full: true });
  await writeUpcoming();
  console.log(`Catalogue: ${films.length} films and ${keptSeries.length} series.`);
}

// Daily run (CATALOG_MODE=daily): a few minutes instead of half an hour. Adds films and series released
// in the last DAILY_DAYS days that aren't in the catalogue yet, refreshes the trending films (so "where to
// watch" is current), and rebuilds Trending. Nothing is removed; the Sunday rebuild trims and re-ranks.
async function daily() {
  const today = new Date().toISOString().slice(0, 10);
  const newSince = new Date(Date.now() - DAILY_DAYS * 864e5).toISOString().slice(0, 10);
  const trendSince = new Date(Date.now() - TREND_DAYS * 864e5).toISOString().slice(0, 10);

  const existing = [];
  for (const lang of OUT_LANGS) {
    const file = new URL(`${lang}.json`, OUT);
    if (existsSync(file)) existing.push(...Object.values(JSON.parse(readFileSync(file, "utf8")).films));
  }
  if (existing.length < LANGS.length * 50) { console.log("No catalogue yet; the weekly run builds it first."); return; }
  const have = new Set(existing.map((f) => `${f.l}-${f.id}`));

  const moviePicks = [];
  const tvPicks = [];
  const trendIds = {};
  const queue = (list, picks, lang, refresh = false) => list.forEach((id) => {
    const key = `${lang}-${picks === tvPicks ? `tv${id}` : id}`;
    if ((refresh || !have.has(key)) && !picks.some(([x, l]) => x === id && l === lang)) picks.push([id, lang]);
  });
  for (const lang of [...LANGS, ANIME]) {
    const plan = PLAN[lang] || {};
    const base = lang === ANIME ? { with_genres: ANIMATION } : plan.noAnimation ? { without_genres: ANIMATION } : {};
    const tvBase = lang === ANIME ? base : { without_genres: TV_SKIP_GENRES + (plan.noAnimation ? `,${ANIMATION}` : "") };
    if (TREND_LANGS.includes(lang)) {
      trendIds[lang] = (await discover("movie", lang, { ...base, sort_by: "popularity.desc", "primary_release_date.gte": trendSince, "primary_release_date.lte": today, "vote_count.gte": 3 }, 1)).slice(0, TREND_PER_LANG + 2);
      queue(trendIds[lang], moviePicks, lang, true);
    }
    queue(await discover("movie", lang, { ...base, sort_by: "popularity.desc", "primary_release_date.gte": newSince, "primary_release_date.lte": today }, 2), moviePicks, lang);
    queue(await discover("tv", lang, { ...tvBase, sort_by: "popularity.desc", "first_air_date.gte": newSince, "first_air_date.lte": today }, 1), tvPicks, lang);
  }
  console.log(`Daily: ${moviePicks.length} films and ${tvPicks.length} series to fetch.`);

  const films = await details(moviePicks, "movie", "watch/providers,release_dates", toFilm);
  const series = await details(tvPicks, "tv", "watch/providers,content_ratings", toSeries,
    (d, lang) => lang === ANIME || (d.number_of_episodes || 0) <= MAX_EPISODES);
  const fresh = new Map([...films, ...series].map((f) => [`${f.l}-${f.id}`, f]));
  const added = [...fresh.keys()].filter((k) => !have.has(k));
  console.log(`New titles: ${added.length}${added.length ? ` (${added.slice(0, 20).join(", ")}${added.length > 20 ? "…" : ""})` : ""}.`);
  writeCatalogue([...existing.filter((f) => !fresh.has(`${f.l}-${f.id}`)), ...fresh.values()], trendIds, { full: false });
  await writeUpcoming();
}

// Writes the per-language files, people index and trending list from every title. With full: false
// (the daily run), a language's files are only rewritten when its titles changed, so unchanged files
// keep their date and there's nothing to commit for them.
function writeCatalogue(titles, trendIds, { full }) {
  // Per language: list-<lang>.json (compact, for browsing, search and the sitemap) and <lang>.json
  // (full details, for each title's page). manifest.json says which languages exist.
  const all = [...titles].sort((a, b) => b.n - a.n);
  mkdirSync(OUT, { recursive: true });
  const built = new Date().toISOString().slice(0, 10);
  const counts = {};
  const changed = [];
  for (const lang of OUT_LANGS) {
    const mine = all.filter((f) => f.l === lang);
    if (!mine.length) continue;
    counts[lang] = mine.length;
    const films = Object.fromEntries(mine.map((f) => [f.id, f]));
    const fullFile = new URL(`${lang}.json`, OUT);
    if (!full && existsSync(fullFile) && JSON.stringify(JSON.parse(readFileSync(fullFile, "utf8")).films) === JSON.stringify(films)) continue;
    changed.push(lang);
    writeFileSync(new URL(`list-${lang}.json`, OUT), JSON.stringify({ built, films: mine.map(({ ov, b, o, im, tr, cast, dir, wd, ...rest }) => rest) }));
    writeFileSync(fullFile, JSON.stringify({ built, films }));
  }
  if (full || changed.length) writeFileSync(new URL("manifest.json", OUT), JSON.stringify({ built, count: all.length, langs: counts }));
  console.log(`Languages written: ${changed.join(", ") || "none"}.`);

  // Actor pages: people/<n>.json, where n = person id % PEOPLE_SHARDS, so a page loads one small file.
  // Each person: [name, photo path, ["<lang>-<id>", ...] titles they lead or direct].
  const people = {};
  for (const f of all) {
    for (const [pid, name, , photo] of [...(f.cast || []), ...(f.dir || []).map(([i, n, ph]) => [i, n, "", ph])]) {
      const p = (people[pid] = people[pid] || [name, "", []]);
      if (photo && !p[1]) p[1] = photo;
      const key = `${f.l}-${f.id}`;
      if (!p[2].includes(key)) p[2].push(key);
    }
  }
  mkdirSync(new URL("people/", OUT), { recursive: true });
  const shards = Array.from({ length: PEOPLE_SHARDS }, () => ({}));
  for (const [pid, p] of Object.entries(people)) shards[pid % PEOPLE_SHARDS][pid] = p;
  shards.forEach((s, i) => writeIfChanged(new URL(`people/${i}.json`, OUT), JSON.stringify(s)));
  console.log(`People: ${Object.keys(people).length}.`);

  // trending.json: [{l, id}] taking turns between languages, only titles that made it into the catalogue.
  const have = new Set(all.filter((f) => f.k !== "tv").map((f) => `${f.l}-${f.id}`));
  const perLang = TREND_LANGS.map((l) => (trendIds[l] || []).filter((id) => have.has(`${l}-${id}`)).slice(0, TREND_PER_LANG));
  const trending = [];
  for (let i = 0; i < TREND_PER_LANG; i++) perLang.forEach((ids, j) => ids[i] && trending.push({ l: TREND_LANGS[j], id: ids[i] }));
  const trendFile = new URL("trending.json", OUT);
  const oldTrend = existsSync(trendFile) ? JSON.parse(readFileSync(trendFile, "utf8")).items : null;
  if (JSON.stringify(oldTrend) !== JSON.stringify(trending)) writeFileSync(trendFile, JSON.stringify({ built, items: trending }));
  console.log(`Trending: ${trending.length} films.`);
  writeLists(all);
  rmSync(new URL("index.json", OUT), { force: true }); // replaced by the per-language lists
  console.log(`Total: ${all.length} titles.`, counts);
}

// Ready-made lists for the traffic pages, so each page loads one small file (assets/catalog/lists/):
//   ott.json        newest titles on each streaming app ("New on Netflix")
//   best-<lang>.json best movies/series per language, by genre and by year (weighted TMDB rating)
//   index.json      which lists exist, for the hub page and the sitemap
const LIST_SIZE = 30;
const OTT_SIZE = 60;
const LIST_MIN = 12;       // a list needs this many titles to get its own page
const FIRST_YEAR = 2010;

// TMDB rating pulled towards the average when few people voted (same as the site's weightedRank).
function weightedRank(arr, minVotes = 3) {
  const voted = arr.filter((f) => f.n > 0);
  if (!voted.length) return [];
  const C = voted.reduce((s, f) => s + f.v, 0) / voted.length;
  const ns = voted.map((f) => f.n).sort((a, b) => a - b);
  const m = Math.max(20, ns[Math.floor(ns.length / 2)]);
  const score = (f) => (f.n / (f.n + m)) * f.v + (m / (f.n + m)) * C;
  return voted.filter((f) => f.n >= minVotes).sort((a, b) => score(b) - score(a));
}

const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const compact = ({ ov, b, o, im, tr, cast, dir, wd, ...rest }) => rest;

function writeLists(all) {
  const dir = new URL("lists/", OUT);
  mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const released = all.filter((f) => !f.rd || f.rd <= today);
  const index = { ott: [], best: {} };

  // New on each app: newest releases first (TMDB doesn't say when a title arrived on the app).
  const ott = {};
  const apps = [...new Set(APP_RULES.map(([, name]) => name))];
  for (const app of apps) {
    const on = released.filter((f) => (f.w || []).includes(app))
      .sort((a, b) => (b.rd || `${b.y}`).localeCompare(a.rd || `${a.y}`) || b.n - a.n);
    if (on.length < LIST_MIN) continue;
    ott[slugOf(app)] = { name: app, count: on.length, items: on.slice(0, OTT_SIZE).map(compact) };
    index.ott.push([slugOf(app), app, on.length]);
  }
  writeIfChanged(new URL("ott.json", dir), JSON.stringify(ott));

  for (const lang of OUT_LANGS) {
    const mine = released.filter((f) => f.l === lang);
    if (!mine.length) continue;
    const out = { all: {}, genres: {}, years: {} };
    const info = { kinds: [], genres: [], years: [] };
    for (const kind of ["movie", "tv"]) {
      const ranked = weightedRank(mine.filter((f) => (kind === "tv" ? f.k === "tv" : f.k !== "tv")));
      if (ranked.length >= LIST_MIN) { out.all[kind] = ranked.slice(0, LIST_SIZE).map(compact); info.kinds.push(kind); }
      const genres = [...new Set(ranked.flatMap((f) => f.g || []))];
      for (const g of genres) {
        const list = ranked.filter((f) => (f.g || []).includes(g));
        if (list.length < LIST_MIN) continue;
        const s = slugOf(g);
        (out.genres[s] = out.genres[s] || { name: g })[kind] = list.slice(0, LIST_SIZE).map(compact);
        const row = info.genres.find((r) => r[0] === s) || (info.genres.push([s, g, 0, 0]), info.genres[info.genres.length - 1]);
        row[kind === "tv" ? 3 : 2] = list.length;
      }
      if (kind === "movie") {
        for (let y = new Date().getFullYear(); y >= FIRST_YEAR; y--) {
          const list = ranked.filter((f) => f.y === y);
          if (list.length < LIST_MIN) continue;
          out.years[y] = list.slice(0, LIST_SIZE).map(compact);
          info.years.push([y, list.length]);
        }
      }
    }
    info.genres.sort((a, b) => b[2] + b[3] - (a[2] + a[3]));
    writeIfChanged(new URL(`best-${lang}.json`, dir), JSON.stringify(out));
    index.best[lang] = info;
  }
  writeIfChanged(new URL("index.json", dir), JSON.stringify(index));
  console.log(`Lists: ${index.ott.length} apps, ${Object.values(index.best).reduce((s, b) => s + b.genres.length + b.years.length + b.kinds.length, 0)} best-of lists.`);
}

// upcoming.json: the most-awaited films releasing in the next UPCOMING_DAYS days, per language, with
// trailer and lead cast, for the Upcoming releases page. Rebuilt on every run (daily and Sunday).
async function writeUpcoming() {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const picks = [];
  for (const lang of UPCOMING_LANGS) {
    const params = { sort_by: "popularity.desc", "primary_release_date.gte": day(1), "primary_release_date.lte": day(UPCOMING_DAYS), ...(PLAN[lang]?.noAnimation ? { without_genres: ANIMATION } : {}) };
    picks.push(...(await discover("movie", lang, params, 1)).slice(0, UPCOMING_PER_LANG).map((id) => [id, lang]));
  }
  const films = await details(picks, "movie", "release_dates", (d, lang) => {
    const f = toFilm(d, lang);
    return { l: f.l, id: f.id, t: f.t, ...(f.o ? { o: f.o } : {}), d: d.release_date, p: f.p, ...(f.b ? { b: f.b } : {}), g: f.g,
      ov: shorten(d.overview, 200), ...(f.tr ? { tr: f.tr } : {}), cast: (f.cast || []).slice(0, 3).map((c) => [c[0], c[1]]) };
  });
  films.sort((a, b) => a.d.localeCompare(b.d) || a.t.localeCompare(b.t));
  writeIfChanged(new URL("upcoming.json", OUT), JSON.stringify({ items: films }));
  console.log(`Upcoming: ${films.length} films.`);
}

function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, "utf8") === text) return;
  writeFileSync(file, text);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
