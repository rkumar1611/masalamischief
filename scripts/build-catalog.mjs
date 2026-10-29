// Builds the "Movies & series" catalogue from TMDB: the best-known films and series in each of our
// languages (about 50,000 titles), with poster, genres, runtime (or seasons), Indian certificate, TMDB
// rating, a short summary, cast, trailer and which apps stream them in India.
// Run by .github/workflows/weekly-catalog.yml with the TMDB_TOKEN repository secret:
//   Sundays (full):  re-discovers every language, fetches new titles, refreshes recent titles and a
//                    quarter of the older ones (a different quarter each week), drops titles that fell out
//   other days (CATALOG_MODE=daily): adds new releases and refreshes the trending films
//
// Writes into assets/catalog/ (layout 2, see manifest.json):
//   manifest.json          languages, counts, layout version, shard counts
//   list-<lang>.json       compact list of one language (Movies & series page, Suggest, Group Pick)
//   popular.json           the best-known titles across all languages (the "All languages" views)
//   head-<lang>.json, head-all.json  the first page of those lists, shown while the full list loads
//   t/<lang>/<n>.json      full details, n = TMDB id % TITLE_SHARDS (title pages)
//   p/<n>.json             people: name, photo and their titles, n = person id % PEOPLE_SHARDS (actor pages)
//   s/<ab>.json            search index: titles with a word starting with those two letters (search)
//   trending.json, lists/*.json, upcoming.json, sitemaps/*.xml
// Plain Node 20+, no dependencies.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { EXTRA_APPEND, VIDEO_LANGS, extrasOf } from "./tmdb-extras.mjs";

const OUT = new URL("../assets/catalog/", import.meta.url);
const DATA = new URL("../assets/data.js", import.meta.url);
const SITE = "https://masalamischief.in";
const TOKEN = process.env.TMDB_TOKEN;
// How many films and series to take per language (best-known first, plus recent hits).
// Korean skips animation so it's dramas and films; anime is handled separately below.
const PLAN = {
  hi: { movies: 6000, tv: 600 }, ta: { movies: 5000, tv: 300 }, te: { movies: 5000, tv: 300 },
  ml: { movies: 5000, tv: 250 }, kn: { movies: 3000, tv: 150 },
  mr: { movies: 1500, tv: 100 }, bn: { movies: 2000, tv: 150 }, pa: { movies: 1000, tv: 60 },
  en: { movies: 8000, tv: 2000 },
  ko: { movies: 1500, tv: 1000, noAnimation: true },
};
const LANGS = Object.keys(PLAN);
const RECENT = 300;        // of each language's films, up to this many recent popular ones
const TV_SKIP_GENRES = "10763,10764,10766,10767"; // News, Reality, Soap, Talk
const MAX_EPISODES = 300;  // longer than this is almost always a daily soap (not applied to anime)
// Anime: Japanese-language animation, stored under the code "ja" and shown as "Anime".
const ANIME = "ja";
const ANIME_MOVIES = 1000;
const ANIME_TV = 1500;
const ANIMATION = "16";    // TMDB genre id, same for films and TV
const OUT_LANGS = [...LANGS, ANIME];
const WORKERS = 16;

// Storage (must match the site: assets/app.js, functions/film.js, functions/person.js).
const LAYOUT = 2;
const TITLE_SHARDS = 128;
const PEOPLE_SHARDS = 512;
const POPULAR_SIZE = 2500;
const HEAD_SIZE = 60;        // head-<lang>.json / head-all.json: one page of the Movies & series grid
// Weekly refresh: titles from the last RECENT_DAYS every week, older ones once every REFRESH_WEEKS.
const RECENT_DAYS = 730;
const REFRESH_WEEKS = 4;

// "Trending this week" on the homepage: the most popular new films (last few months) per main language.
const TREND_LANGS = ["hi", "ta", "te", "ml", "kn", "en"];
const TREND_DAYS = 120;
const TREND_PER_LANG = 4;
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
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const keyOf = (f) => `${f.l}-${f.id}`;
const numId = (id) => +String(id).replace(/^tv/, "");

async function tmdb(path, params = {}) {
  const url = `https://api.themoviedb.org/3${path}?${new URLSearchParams({ language: "en-US", ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    let res;
    try { res = await fetch(url, { headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" } }); }
    catch { await sleep(2000); continue; } // network blip
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
  for (let page = 1; page <= Math.min(pages, 500); page++) {
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

// Vote counts rounded to two figures above 100, so small weekly changes don't rewrite every file.
const votes = (n) => (n < 100 ? n : Number(n.toPrecision(2)));

const appsOf = (d) => [...new Set((d["watch/providers"]?.results?.IN?.flatrate || [])
  .map((p) => (APP_RULES.find(([re]) => re.test(p.provider_name)) || [])[1]).filter(Boolean))];

// Direct links to each title on the apps, from JustWatch India (TMDB only says which app has it).
// JustWatch package code → our app name. Every run sweeps each app's whole list, a slice of release
// years at a time (a query stops at 2,000 results), about 400 requests in all.
const JW_APPS = {
  nfx: "Netflix", prv: "Prime Video", jhs: "JioHotstar", zee: "ZEE5", snl: "SonyLIV", snx: "Sun NXT",
  aha: "aha", mrx: "ManoramaMAX", mxp: "MX Player", lgp: "Lionsgate Play", cru: "Crunchyroll",
};
const JW_SLICE = 1900;
const JW_WORKERS = 3;
const JW_COUNT = `query C($f: TitleFilter) { popularTitles(country: IN, first: 1, filter: $f) { totalCount } }`;
const JW_PAGE = `query P($f: TitleFilter, $after: String, $pkg: [String!]) {
  popularTitles(country: IN, first: 100, after: $after, filter: $f) {
    pageInfo { endCursor hasNextPage }
    edges { node { objectType content(country: IN, language: "en") { externalIds { tmdbId imdbId } }
      offers(country: IN, platform: WEB, filter: { packages: $pkg }) { monetizationType standardWebURL } } }
  }
}`;

// What happened to the last JustWatch request that failed (also saved in manifest.json as linksNote).
let jwProblem = "";
async function jw(query, variables) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch("https://apis.justwatch.com/graphql", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (compatible; MasalaMischiefBot/1.0; +https://masalamischief.in)" },
        body: JSON.stringify({ query, variables }),
      });
      const body = await res.text();
      if (res.ok) {
        const j = JSON.parse(body);
        if (j.data && Object.values(j.data).every(Boolean)) return j.data;
        jwProblem = `GraphQL: ${JSON.stringify(j.errors || j).slice(0, 200)}`;
      } else jwProblem = `HTTP ${res.status}: ${body.replace(/\s+/g, " ").slice(0, 200)}`;
    } catch (e) { jwProblem = `fetch: ${e.message}`; }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`JustWatch didn't answer (${jwProblem})`);
}

// The title's own page on the app: subscription offers first, then the shortest link (a season or the
// show rather than one episode). App home pages don't count.
function bestOffer(offers) {
  const urls = (offers || [])
    .map((o) => [o.monetizationType === "FLATRATE" ? 0 : 1, (o.standardWebURL || "").replace("://app.primevideo.com/", "://www.primevideo.com/")])
    .filter(([, u]) => { try { const x = new URL(u); return x.protocol === "https:" && x.pathname.length > 1 && !/offers|homepage/.test(x.pathname); } catch { return false; } })
    .sort((a, b) => a[0] - b[0] || a[1].length - b[1].length);
  const best = urls[0]?.[1];
  // Hotstar lists both /in/123 and /in/movies/name/123; the one with the name is its usual page.
  const id = best && new URL(best).pathname.split("/").pop();
  return (id && urls.map(([, u]) => u).find((u) => u.length > best.length && u.endsWith(`/${id}`))) || best;
}

// Map of TMDB id ("123", "tv123") and IMDb id ("tt…") → { app: url }, or null if JustWatch failed.
async function appLinks() {
  const links = new Map();
  const add = (key, app, url) => { if (key) (links.get(key) || links.set(key, {}).get(key))[app] ||= url; };
  const jobs = Object.keys(JW_APPS).flatMap((pkg) => ["MOVIE", "SHOW"].map((type) => [pkg, type]));
  const last = new Date().getUTCFullYear() + 1;
  let requests = 0;
  try {
    await Promise.all(Array.from({ length: JW_WORKERS }, async () => {
      while (jobs.length) {
        const [pkg, type] = jobs.shift();
        const slices = [[1900, last]];
        while (slices.length) {
          const [min, max] = slices.pop();
          const f = { packages: [pkg], objectTypes: [type], releaseYear: { min, max } };
          const count = (await jw(JW_COUNT, { f })).popularTitles.totalCount;
          requests++;
          if (!count) continue;
          if (count > JW_SLICE && min < max) {
            const mid = Math.floor((min + max) / 2);
            slices.push([min, mid], [mid + 1, max]);
            continue;
          }
          let after = null;
          for (let page = 0; page < 20; page++) {
            const p = (await jw(JW_PAGE, { f, after, pkg: [pkg] })).popularTitles;
            requests++;
            for (const { node } of p.edges) {
              const url = bestOffer(node.offers);
              if (!url) continue;
              const ids = node.content?.externalIds || {};
              if (ids.tmdbId) add(`${type === "SHOW" ? "tv" : ""}${ids.tmdbId}`, JW_APPS[pkg], url);
              add(ids.imdbId, JW_APPS[pkg], url);
            }
            if (!p.pageInfo.hasNextPage) break;
            after = p.pageInfo.endCursor;
            await sleep(200);
          }
        }
      }
    }));
  } catch (e) {
    jwProblem = e.message;
    console.log(`App links: ${e.message}; keeping the links we had.`);
    return null;
  }
  console.log(`App links: ${links.size} titles from ${requests} JustWatch requests.`);
  if (links.size > 1000) return links;
  jwProblem = `only ${links.size} titles from ${requests} requests`;
  return null;
}

// f.u = { app: direct link } for the apps in f.w that JustWatch has a page for (title pages only).
// Without fresh links (JustWatch down), each title keeps the links it had.
function attachLinks(titles, links, have) {
  let n = 0;
  for (const f of titles) {
    const old = { ...have.get(keyOf(f))?.u, ...f.u };
    const found = links ? { ...(f.im && links.get(f.im)), ...links.get(String(f.id)) } : old;
    const u = Object.fromEntries(f.w.filter((a) => found[a]).map((a) => [a, found[a]]));
    if (Object.keys(u).length) { f.u = u; n++; } else delete f.u;
  }
  linkCount = n;
  console.log(`Direct app links on ${n} titles.`);
}
let linkCount = 0;

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
    n: votes(d.vote_count || 0),
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
    n: votes(d.vote_count || 0),
    p: d.poster_path,
    ...(d.backdrop_path ? { b: d.backdrop_path } : {}),
    ...(cert ? { c: cert } : {}),
    ...(d.external_ids?.imdb_id ? { im: d.external_ids.imdb_id } : {}),
    w: appsOf(d),
    ov: shorten(d.overview),
    ...extrasOf(d, "tv"),
  };
}

// Fetch details a few at a time, with a progress line every 2,000.
async function details(picks, kind, append, toItem, keep = () => true) {
  const out = [];
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (next < picks.length) {
      const [id, lang] = picks[next++];
      const d = await tmdb(`/${kind}/${id}`, { append_to_response: `${append},${EXTRA_APPEND}`, include_video_language: VIDEO_LANGS });
      if (d && d.poster_path && keep(d, lang)) out.push(toItem(d, lang));
      if (++done % 2000 === 0) console.log(`  ${kind}: ${done}/${picks.length}`);
      await sleep(25);
    }
  }));
  return out;
}

const movieDetails = (picks) => details(picks, "movie", "watch/providers,release_dates", toFilm);
// Long-running daily soaps swamp Indian TV on TMDB; keep web and prime-time series. Long-running
// anime (One Piece, Detective Conan) is the real thing, so the episode limit doesn't apply there.
const seriesDetails = (picks) => details(picks, "tv", "watch/providers,content_ratings", toSeries,
  (d, lang) => lang === ANIME || (d.number_of_episodes || 0) <= MAX_EPISODES);

// Everything we already have, from the current files (layout 2) or the older one-file-per-language
// layout, so unchanged titles don't have to be fetched again.
function loadExisting() {
  const have = new Map();
  const add = (films) => Object.values(films).forEach((f) => have.set(keyOf(f), f));
  for (const lang of OUT_LANGS) {
    const dir = new URL(`t/${lang}/`, OUT);
    if (existsSync(dir)) {
      readdirSync(dir).filter((f) => f.endsWith(".json")).forEach((f) => add(JSON.parse(readFileSync(new URL(f, dir), "utf8")).films));
    } else if (existsSync(new URL(`${lang}.json`, OUT))) {
      add(JSON.parse(readFileSync(new URL(`${lang}.json`, OUT), "utf8")).films);
    }
  }
  return have;
}

// Recent titles every week; older ones when it's their turn (a quarter each week, by id).
function dueForRefresh(f) {
  if (!("rd" in f) && f.y) return true; // saved by an older build without release dates
  if (f.rd && f.rd >= day(-RECENT_DAYS)) return true;
  const week = Math.floor(Date.now() / (7 * 864e5));
  return numId(f.id) % REFRESH_WEEKS === week % REFRESH_WEEKS;
}

async function main() {
  if (!TOKEN) { console.log("No TMDB_TOKEN set; skipping catalogue."); return; }
  if (process.env.CATALOG_MODE === "daily") return daily();
  const since = day(-RECENT_DAYS);
  const today = day(0);
  const trendSince = day(-TREND_DAYS);
  const have = loadExisting();
  console.log(`Already have ${have.size} titles.`);

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
    const recent = await discover("movie", lang, { ...movieParams, sort_by: "popularity.desc", "primary_release_date.gte": since, "primary_release_date.lte": today, "vote_count.gte": lang === "en" ? 50 : 2 }, Math.ceil(RECENT / 20));
    const classic = await discover("movie", lang, { ...movieParams, sort_by: "vote_count.desc" }, Math.ceil(plan.movies / 20) + 2);
    const ids = [...new Set([...trend, ...recent.slice(0, RECENT), ...classic])].slice(0, plan.movies);
    moviePicks.push(...ids.map((id) => [id, lang]));

    const tvTarget = plan.tv;
    const tvParams = { without_genres: TV_SKIP_GENRES + (plan.noAnimation ? `,${ANIMATION}` : "") };
    const tvRecent = await discover("tv", lang, { ...tvParams, sort_by: "popularity.desc", "first_air_date.gte": since, "vote_count.gte": lang === "en" ? 50 : 2 }, 3);
    const tvClassic = await discover("tv", lang, { ...tvParams, sort_by: "vote_count.desc" }, Math.ceil(tvTarget / 20) + 2);
    // Ask for a few extra, since some get dropped below as daily soaps.
    const tvIds = [...new Set([...tvRecent.slice(0, 50), ...tvClassic])].slice(0, Math.round(tvTarget * 1.3));
    tvPicks.push(...tvIds.map((id) => [id, lang]));
    console.log(`${lang}: ${ids.length} films, ${tvIds.length} series candidates`);
  }

  // Anime: Japanese animation only (so no Japanese live-action), films and series.
  const anime = { with_genres: ANIMATION };
  const animeMovies = [...new Set([
    ...(await discover("movie", ANIME, { ...anime, sort_by: "popularity.desc", "primary_release_date.gte": since, "vote_count.gte": 20 }, 3)).slice(0, 60),
    ...(await discover("movie", ANIME, { ...anime, sort_by: "vote_count.desc" }, Math.ceil(ANIME_MOVIES / 20) + 1)),
  ])].slice(0, ANIME_MOVIES);
  const animeSeries = [...new Set([
    ...(await discover("tv", ANIME, { ...anime, sort_by: "popularity.desc", "first_air_date.gte": since, "vote_count.gte": 20 }, 4)).slice(0, 80),
    ...(await discover("tv", ANIME, { ...anime, sort_by: "vote_count.desc" }, Math.ceil(ANIME_TV / 20) + 1)),
  ])].slice(0, ANIME_TV);
  moviePicks.push(...animeMovies.map((id) => [id, ANIME]));
  tvPicks.push(...animeSeries.map((id) => [id, ANIME]));
  console.log(`anime: ${animeMovies.length} films, ${animeSeries.length} series`);

  // Reuse what we have unless it's new or due for a refresh.
  const split = (picks, prefix) => {
    const reuse = [];
    const fetch = [];
    for (const [id, lang] of picks) {
      const old = have.get(`${lang}-${prefix}${id}`);
      if (old && !dueForRefresh(old)) reuse.push(old); else fetch.push([id, lang]);
    }
    return { reuse, fetch };
  };
  const m = split(moviePicks, "");
  const t = split(tvPicks, "tv");
  console.log(`Fetching ${m.fetch.length} films and ${t.fetch.length} series; reusing ${m.reuse.length + t.reuse.length}.`);
  const films = [...m.reuse, ...(await movieDetails(m.fetch))];
  const series = [...t.reuse, ...(await seriesDetails(t.fetch))].sort((a, b) => b.n - a.n);
  const tvLimit = (lang) => (lang === ANIME ? ANIME_TV : PLAN[lang].tv);
  const keptSeries = OUT_LANGS.flatMap((lang) => series.filter((s) => s.l === lang).slice(0, tvLimit(lang)));
  if (films.length < Math.min(have.size * 0.8, 20000) || films.length < LANGS.length * 50) {
    throw new Error(`Only ${films.length} films came back; not writing a broken catalogue.`);
  }

  attachLinks([...films, ...keptSeries], await appLinks(), have);
  writeCatalogue([...films, ...keptSeries], trendIds);
  await writeUpcoming();
  console.log(`Catalogue: ${films.length} films and ${keptSeries.length} series.`);
}

// Daily run (CATALOG_MODE=daily): a few minutes. Adds films and series released in the last DAILY_DAYS
// days that aren't in the catalogue yet, refreshes the trending films (so "where to watch" is current),
// and rebuilds Trending. Nothing is removed; the Sunday run trims and re-ranks.
async function daily() {
  const today = day(0);
  const newSince = day(-DAILY_DAYS);
  const trendSince = day(-TREND_DAYS);
  const have = loadExisting();
  if (have.size < LANGS.length * 50) { console.log("No catalogue yet; the weekly run builds it first."); return; }

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
    queue(await discover("movie", lang, { ...base, sort_by: "popularity.desc", "primary_release_date.gte": newSince, "primary_release_date.lte": today }, 3), moviePicks, lang);
    queue(await discover("tv", lang, { ...tvBase, sort_by: "popularity.desc", "first_air_date.gte": newSince, "first_air_date.lte": today }, 1), tvPicks, lang);
  }
  console.log(`Daily: ${moviePicks.length} films and ${tvPicks.length} series to fetch.`);

  const fresh = new Map([...(await movieDetails(moviePicks)), ...(await seriesDetails(tvPicks))].map((f) => [keyOf(f), f]));
  const added = [...fresh.keys()].filter((k) => !have.has(k));
  console.log(`New titles: ${added.length}${added.length ? ` (${added.slice(0, 20).join(", ")}${added.length > 20 ? "…" : ""})` : ""}.`);
  const before = new Map(have);
  for (const [k, f] of fresh) have.set(k, f);
  attachLinks([...have.values()], await appLinks(), before);
  writeCatalogue([...have.values()], trendIds);
  await writeUpcoming();
}

const compact = ({ ov, b, o, im, tr, cast, dir, wd, u, ...rest }) => rest;
// Same as searchNorm() in assets/app.js: "K.G.F: Chapter 1" → "kgf chapter 1".
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.'’]/g, "").replace(/[^a-z0-9 ]/g, " ");
const STOPWORDS = new Set(["the", "a", "an", "of", "and"]);

// Writes every file from the full list of titles. Files are only rewritten when their content changed.
function writeCatalogue(titles, trendIds) {
  const all = [...titles].sort((a, b) => b.n - a.n);
  mkdirSync(OUT, { recursive: true });
  const built = day(0);
  const counts = {};

  for (const lang of OUT_LANGS) {
    const mine = all.filter((f) => f.l === lang);
    if (!mine.length) continue;
    counts[lang] = mine.length;
    // Without the language (the file says it) and release date (not used by the site), to keep it small.
    writeIfChanged(new URL(`list-${lang}.json`, OUT), JSON.stringify({ films: mine.map((f) => { const { l, rd, ...rest } = compact(f); return rest; }) }));
    // The first page of the Movies & series page (most popular first), shown while the full list loads.
    writeIfChanged(new URL(`head-${lang}.json`, OUT), JSON.stringify({ films: mine.slice(0, HEAD_SIZE).map(compact) }));
    // Full details in TITLE_SHARDS small files per language.
    const shards = Array.from({ length: TITLE_SHARDS }, () => ({}));
    mine.forEach((f) => { shards[numId(f.id) % TITLE_SHARDS][f.id] = f; });
    mkdirSync(new URL(`t/${lang}/`, OUT), { recursive: true });
    shards.forEach((s, i) => writeIfChanged(new URL(`t/${lang}/${i}.json`, OUT), JSON.stringify({ films: s })));
    rmSync(new URL(`${lang}.json`, OUT), { force: true }); // older layout
  }
  writeIfChanged(new URL("popular.json", OUT), JSON.stringify({ films: all.slice(0, POPULAR_SIZE).map(compact) }));
  writeIfChanged(new URL("head-all.json", OUT), JSON.stringify({ films: all.slice(0, HEAD_SIZE).map(compact) }));

  // Actor pages: p/<n>.json. Each person: [name, photo, [[lang, id, title, year, series?, poster, rating], ...]].
  const people = {};
  for (const f of all) {
    const crew = [...(f.cast || []), ...(f.dir || []).map(([i, nm, ph]) => [i, nm, "", ph])];
    for (const [pid, name, , photo] of crew) {
      const p = (people[pid] = people[pid] || [name, "", []]);
      if (photo && !p[1]) p[1] = photo;
      if (!p[2].some((x) => x[0] === f.l && x[1] === f.id)) p[2].push([f.l, f.id, f.t, f.y, f.k === "tv" ? 1 : 0, f.p || "", f.v]);
    }
  }
  const pShards = Array.from({ length: PEOPLE_SHARDS }, () => ({}));
  for (const [pid, p] of Object.entries(people)) pShards[pid % PEOPLE_SHARDS][pid] = p;
  mkdirSync(new URL("p/", OUT), { recursive: true });
  pShards.forEach((s, i) => writeIfChanged(new URL(`p/${i}.json`, OUT), JSON.stringify(s)));
  rmSync(new URL("people/", OUT), { recursive: true, force: true }); // older layout
  console.log(`People: ${Object.keys(people).length}.`);

  // Search: s/<ab>.json holds every title with a word starting with "ab": [lang, id, title, year, series?, poster, votes, rating].
  const search = {};
  for (const f of all) {
    const starts = new Set(norm(f.t).split(/\s+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w)).map((w) => w.slice(0, 2)));
    for (const c of starts) (search[c] = search[c] || []).push([f.l, f.id, f.t, f.y, f.k === "tv" ? 1 : 0, f.p || "", f.n, f.v]);
  }
  const sDir = new URL("s/", OUT);
  mkdirSync(sDir, { recursive: true });
  for (const c of Object.keys(search)) writeIfChanged(new URL(`${c}.json`, sDir), JSON.stringify(search[c]));
  readdirSync(sDir).filter((f) => !search[f.replace(".json", "")]).forEach((f) => rmSync(new URL(f, sDir)));

  // trending.json: the films themselves, taking turns between languages.
  const byKey = new Map(all.filter((f) => f.k !== "tv").map((f) => [keyOf(f), f]));
  const perLang = TREND_LANGS.map((l) => (trendIds[l] || []).map((id) => byKey.get(`${l}-${id}`)).filter(Boolean).slice(0, TREND_PER_LANG));
  const trending = [];
  for (let i = 0; i < TREND_PER_LANG; i++) perLang.forEach((list) => list[i] && trending.push(compact(list[i])));
  writeIfChanged(new URL("trending.json", OUT), JSON.stringify({ items: trending }));
  console.log(`Trending: ${trending.length} films.`);

  writeLists(all);
  writeSitemaps(all, people);
  writeIfChanged(new URL("manifest.json", OUT), JSON.stringify({ layout: LAYOUT, built, count: all.length, langs: counts, shards: { t: TITLE_SHARDS, p: PEOPLE_SHARDS }, links: linkCount, ...(jwProblem ? { linksNote: jwProblem } : {}) }));
  rmSync(new URL("index.json", OUT), { force: true }); // replaced by the per-language lists
  console.log(`Total: ${all.length} titles.`, counts);
}

// Ready-made lists for the traffic pages, so each page loads one small file (assets/catalog/lists/):
//   ott.json        newest titles on each streaming app ("New on Netflix")
//   best-<lang>.json best movies/series per language, by genre and by year (weighted TMDB rating)
//   best-<lang>-<app>.json the same per streaming app, by genre ("Best Hindi movies on Netflix")
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

function writeLists(all) {
  const dir = new URL("lists/", OUT);
  mkdirSync(dir, { recursive: true });
  const today = day(0);
  const released = all.filter((f) => !f.rd || f.rd <= today);
  const index = { ott: [], best: {} };
  const written = new Set();
  // previews.json: four posters per list, keyed by the list page's link, for the homepage tiles.
  const previews = {};
  const posters = (items) => items.filter((f) => f.p).slice(0, 4).map((f) => f.p);

  // New on each app: newest releases first (TMDB doesn't say when a title arrived on the app).
  const ott = {};
  const apps = [...new Set(APP_RULES.map(([, name]) => name))];
  for (const app of apps) {
    const on = released.filter((f) => (f.w || []).includes(app))
      .sort((a, b) => (b.rd || `${b.y}`).localeCompare(a.rd || `${a.y}`) || b.n - a.n);
    if (on.length < LIST_MIN) continue;
    ott[slugOf(app)] = { name: app, count: on.length, items: on.slice(0, OTT_SIZE).map(compact) };
    index.ott.push([slugOf(app), app, on.length]);
    previews[`ott.html?app=${slugOf(app)}`] = posters(on);
  }
  writeIfChanged(new URL("ott.json", dir), JSON.stringify(ott));

  for (const lang of OUT_LANGS) {
    const mine = released.filter((f) => f.l === lang);
    if (!mine.length) continue;
    const out = { all: {}, genres: {}, years: {} };
    const info = { kinds: [], genres: [], years: [] };
    for (const kind of ["movie", "tv"]) {
      const ranked = weightedRank(mine.filter((f) => (kind === "tv" ? f.k === "tv" : f.k !== "tv")));
      const tvq = kind === "tv" ? "&k=tv" : "";
      if (ranked.length >= LIST_MIN) {
        out.all[kind] = ranked.slice(0, LIST_SIZE).map(compact);
        info.kinds.push(kind);
        previews[`best.html?l=${lang}${tvq}`] = posters(ranked);
      }
      const genres = [...new Set(ranked.flatMap((f) => f.g || []))];
      for (const g of genres) {
        const list = ranked.filter((f) => (f.g || []).includes(g));
        if (list.length < LIST_MIN) continue;
        const s = slugOf(g);
        (out.genres[s] = out.genres[s] || { name: g })[kind] = list.slice(0, LIST_SIZE).map(compact);
        previews[`best.html?l=${lang}&g=${s}${tvq}`] = posters(list);
        const row = info.genres.find((r) => r[0] === s) || (info.genres.push([s, g, 0, 0]), info.genres[info.genres.length - 1]);
        row[kind === "tv" ? 3 : 2] = list.length;
      }
      if (kind === "movie") {
        for (let y = new Date().getFullYear(); y >= FIRST_YEAR; y--) {
          const list = ranked.filter((f) => f.y === y);
          if (list.length < LIST_MIN) continue;
          out.years[y] = list.slice(0, LIST_SIZE).map(compact);
          previews[`best.html?l=${lang}&y=${y}`] = posters(list);
          info.years.push([y, list.length]);
        }
      }
    }
    info.genres.sort((a, b) => b[2] + b[3] - (a[2] + a[3]));
    writeIfChanged(new URL(`best-${lang}.json`, dir), JSON.stringify(out));

    // Best on each app ("Best Hindi movies on Netflix", "Best Tamil thriller movies on Prime Video"):
    // one file per language and app, best-<lang>-<app>.json, same shape as best-<lang>.json without years.
    info.apps = [];
    for (const app of apps) {
      const s = slugOf(app);
      const on = mine.filter((f) => (f.w || []).includes(app));
      const appOut = { name: app, all: {}, genres: {} };
      const row = [s, app, 0, 0, []];
      for (const kind of ["movie", "tv"]) {
        const ranked = weightedRank(on.filter((f) => (kind === "tv" ? f.k === "tv" : f.k !== "tv")));
        if (ranked.length < LIST_MIN) continue;
        const tvq = kind === "tv" ? "&k=tv" : "";
        appOut.all[kind] = ranked.slice(0, LIST_SIZE).map(compact);
        row[kind === "tv" ? 3 : 2] = ranked.length;
        previews[`best.html?l=${lang}&app=${s}${tvq}`] = posters(ranked);
        for (const g of [...new Set(ranked.flatMap((f) => f.g || []))]) {
          const list = ranked.filter((f) => (f.g || []).includes(g));
          if (list.length < LIST_MIN) continue;
          const gs = slugOf(g);
          (appOut.genres[gs] = appOut.genres[gs] || { name: g })[kind] = list.slice(0, LIST_SIZE).map(compact);
          const gr = row[4].find((r) => r[0] === gs) || (row[4].push([gs, g, 0, 0]), row[4][row[4].length - 1]);
          gr[kind === "tv" ? 3 : 2] = list.length;
        }
      }
      if (!row[2] && !row[3]) continue;
      row[4].sort((a, b) => b[2] + b[3] - (a[2] + a[3]));
      writeIfChanged(new URL(`best-${lang}-${s}.json`, dir), JSON.stringify(appOut));
      written.add(`best-${lang}-${s}.json`);
      info.apps.push(row);
    }
    info.apps.sort((a, b) => b[2] + b[3] - (a[2] + a[3]));
    index.best[lang] = info;
  }
  // Per-app lists that no longer have enough titles.
  for (const name of readdirSync(dir)) {
    if (/^best-[a-z]{2}-[a-z0-9-]+\.json$/.test(name) && !written.has(name)) rmSync(new URL(name, dir));
  }
  writeIfChanged(new URL("index.json", dir), JSON.stringify(index));
  writeIfChanged(new URL("previews.json", dir), JSON.stringify(previews));
  console.log(`Lists: ${index.ott.length} apps, ${Object.values(index.best).reduce((s, b) => s + b.genres.length + b.years.length + b.kinds.length, 0)} best-of lists, ${written.size} app files.`);
}

// Sitemaps, ready-made so the site doesn't have to read big files on each request
// (served by functions/sitemaps/[name].js): one per language, plus people and lists.
const xml = (paths) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${SITE}${p.replace(/&/g, "&amp;")}</loc></url>`).join("\n")}
</urlset>`;

function writeSitemaps(all, people) {
  const dir = new URL("sitemaps/", OUT);
  mkdirSync(dir, { recursive: true });
  // Our reviewed films have review pages (in main.xml), not film pages.
  let reviewed = new Set();
  try {
    const { IMAGES } = new Function(`${readFileSync(DATA, "utf8")}; return { IMAGES };`)();
    reviewed = new Set(Object.values(IMAGES).map((i) => i.tmdb));
  } catch {}
  for (const lang of OUT_LANGS) {
    const paths = all.filter((f) => f.l === lang && !(f.k !== "tv" && reviewed.has(f.id))).map((f) => `/film?id=${keyOf(f)}`);
    if (paths.length) writeIfChanged(new URL(`${lang}.xml`, dir), xml(paths.slice(0, 50000)));
  }
  // Actor and director pages, for people with at least 3 titles (fewer makes a thin page).
  const pids = Object.entries(people).filter(([, p]) => p[2].length >= 3).map(([id]) => id).sort((a, b) => a - b);
  writeIfChanged(new URL("people.xml", dir), xml(pids.slice(0, 50000).map((id) => `/person?id=${id}`)));
}

// lists.xml: New on <app>, best-of lists and upcoming (after writeUpcoming, which knows the languages).
function writeListsSitemap(upcoming) {
  const index = JSON.parse(readFileSync(new URL("lists/index.json", OUT), "utf8"));
  const paths = ["/ott", "/best", ...index.ott.map(([s]) => `/ott?app=${s}`)];
  for (const [l, b] of Object.entries(index.best)) {
    b.kinds.forEach((k) => paths.push(`/best?l=${l}${k === "tv" ? "&k=tv" : ""}`));
    b.genres.forEach(([g, , movies, tv]) => {
      if (movies) paths.push(`/best?l=${l}&g=${g}`);
      if (tv) paths.push(`/best?l=${l}&g=${g}&k=tv`);
    });
    b.years.forEach(([y]) => paths.push(`/best?l=${l}&y=${y}`));
    (b.apps || []).forEach(([a, , movies, tv, genres]) => {
      if (movies) paths.push(`/best?l=${l}&app=${a}`);
      if (tv) paths.push(`/best?l=${l}&app=${a}&k=tv`);
      genres.forEach(([g, , gm, gt]) => {
        if (gm) paths.push(`/best?l=${l}&app=${a}&g=${g}`);
        if (gt) paths.push(`/best?l=${l}&app=${a}&g=${g}&k=tv`);
      });
    });
  }
  if (upcoming.length) paths.push("/upcoming", ...[...new Set(upcoming.map((f) => f.l))].map((l) => `/upcoming?l=${l}`));
  writeIfChanged(new URL("sitemaps/lists.xml", OUT), xml(paths));
}

// upcoming.json: the most-awaited films releasing in the next UPCOMING_DAYS days, per language, with
// trailer and lead cast, for the Upcoming releases page. Rebuilt on every run (daily and Sunday).
async function writeUpcoming() {
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
  writeListsSitemap(films);
  console.log(`Upcoming: ${films.length} films.`);
}

function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, "utf8") === text) return;
  writeFileSync(file, text);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
