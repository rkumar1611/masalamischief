// Checks the catalogue the build has just written (assets/catalog/) before it is committed, so a bad
// run never reaches the site. Run by .github/workflows/weekly-catalog.yml between the build and the commit.
//   Stops the run (exit 1) only for big losses: the catalogue or one app shrinking sharply against the last commit.
//   Everything else is a warning, listed in the run's summary: wrong app names, links that point at another
//   site, Top 10 titles that aren't on their app, titles with impossible years or ratings, duplicates.
// Plain Node 20+, no dependencies. Offline: it only reads the files and, for the comparison, the last commit (git).
import { readdirSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIR = new URL("../assets/catalog/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8"));

// The app names the catalogue uses (APP_RULES in scripts/build-catalog.mjs) and the sites their links belong to.
const HOSTS = {
  Netflix: /(^|\.)netflix\.com$/, "Prime Video": /(^|\.)(primevideo\.com|amazon\.[a-z.]+)$/, JioHotstar: /(^|\.)(hotstar|jiohotstar)\.com$/,
  ZEE5: /(^|\.)zee5\.com$/, SonyLIV: /(^|\.)sonyliv\.com$/, "Sun NXT": /(^|\.)sunnxt\.com$/, aha: /(^|\.)aha\.video$/,
  ManoramaMAX: /(^|\.)manoramamax\.com$/, "MX Player": /(^|\.)mxplayer\.in$/, "Lionsgate Play": /(^|\.)lionsgateplay\.com$/,
  Crunchyroll: /(^|\.)crunchyroll\.com$/, "Apple TV": /(^|\.)tv\.apple\.com$/,
};
const LANGS = readdirSync(DIR).map((f) => /^list-([a-z]{2,3})\.json$/.exec(f)?.[1]).filter(Boolean);
const year = new Date().getUTCFullYear();

const stop = []; // fails the run
const warn = []; // listed only
const eg = (arr, n = 5) => arr.slice(0, n).join("; ") + (arr.length > n ? `; … ${arr.length - n} more` : "");

// 1. The titles, per language and per app, with basic sanity checks.
const films = []; // { key, lang, f }
const perLang = {};
const perApp = {};
const bad = { year: [], rating: [], noTitle: [], apps: [], many: [], dupApp: [] };
const seen = new Map();
const dupes = [];
for (const lang of LANGS) {
  const list = read(`list-${lang}.json`).films;
  perLang[lang] = list.length;
  for (const f of list) {
    const key = `${lang}-${f.id}`;
    films.push({ key, lang, f });
    const label = `${f.t || "?"} (${key})`;
    if (!f.t || !String(f.t).trim()) bad.noTitle.push(key);
    if (f.y && (f.y < 1880 || f.y > year + 3)) bad.year.push(`${label} ${f.y}`);
    if (f.v !== undefined && (f.v < 0 || f.v > 10)) bad.rating.push(`${label} ${f.v}`);
    const w = Array.isArray(f.w) ? f.w : [];
    if (new Set(w).size !== w.length) bad.dupApp.push(label);
    if (w.length > 6) bad.many.push(`${label} on ${w.length} apps`);
    for (const a of w) {
      perApp[a] = (perApp[a] || 0) + 1;
      if (!HOSTS[a]) bad.apps.push(`${label}: ${a}`);
    }
    const dk = `${lang}|${String(f.t).toLowerCase()}|${f.y}|${f.k || "m"}`;
    if (seen.has(dk) && seen.get(dk) !== f.id) dupes.push(`${f.t} (${f.y}) ${seen.get(dk)} / ${f.id}`);
    else seen.set(dk, f.id);
  }
}
const total = films.length;
if (bad.noTitle.length) warn.push(`${bad.noTitle.length} titles with no name: ${eg(bad.noTitle)}`);
if (bad.year.length) warn.push(`${bad.year.length} titles with an impossible year: ${eg(bad.year)}`);
if (bad.rating.length) warn.push(`${bad.rating.length} titles with a rating outside 0 to 10: ${eg(bad.rating)}`);
if (bad.apps.length) warn.push(`${bad.apps.length} entries naming an app we don't know: ${eg(bad.apps)}`);
if (bad.dupApp.length) warn.push(`${bad.dupApp.length} titles listing the same app twice: ${eg(bad.dupApp)}`);
if (bad.many.length) warn.push(`${bad.many.length} titles on more than 6 apps (check the matching): ${eg(bad.many)}`);
if (dupes.length > 60) warn.push(`${dupes.length} possible duplicate titles (same name, year and language): ${eg(dupes)}`);

// 2. Against the last commit: a big drop means the build lost data (a TMDB or JustWatch problem), so don't publish it.
function before(file) {
  try {
    return JSON.parse(execFileSync("git", ["show", `HEAD:assets/catalog/${file}`], { maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] }).toString());
  } catch { return null; }
}
const prevApp = {};
let prevTotal = 0;
let compared = 0;
for (const lang of LANGS) {
  const old = before(`list-${lang}.json`);
  if (!old) continue;
  compared++;
  prevTotal += old.films.length;
  for (const f of old.films) for (const a of f.w || []) prevApp[a] = (prevApp[a] || 0) + 1;
}
if (compared === LANGS.length && prevTotal) {
  if (total < prevTotal * 0.8) stop.push(`The catalogue shrank from ${prevTotal} to ${total} titles.`);
  else if (total < prevTotal * 0.97) warn.push(`The catalogue shrank from ${prevTotal} to ${total} titles.`);
  for (const [a, n] of Object.entries(prevApp)) {
    const now = perApp[a] || 0;
    if (n >= 100 && now < n * 0.6) stop.push(`${a} dropped from ${n} to ${now} titles.`);
    else if (n >= 50 && now < n * 0.85) warn.push(`${a} dropped from ${n} to ${now} titles.`);
  }
} else {
  console.log("No earlier commit to compare with: skipping the size comparison.");
}

// 3. Top 10: each title has to stream on the app whose list it is in (the JioHotstar-showing-Prime-Video bug).
try {
  const top = read("top10.json");
  const known = new Map(films.map((x) => [`${x.lang}|${x.f.id}`, x.f]));
  const wrong = [];
  const short = [];
  for (const block of top.apps || []) {
    for (const kind of ["movies", "series"]) {
      const items = block[kind] || [];
      const ids = new Set();
      for (const f of items) {
        const label = `${f.t} on ${block.app} Top 10`;
        const mine = known.get(`${f.l}|${f.id}`);
        if (block.app !== "MX Player" && !(f.w || []).includes(block.app)) wrong.push(label);
        else if (mine && block.app !== "MX Player" && !(mine.w || []).includes(block.app)) wrong.push(`${label} (the catalogue says otherwise)`);
        if (ids.has(`${f.l}|${f.id}`)) wrong.push(`${label} twice`);
        ids.add(`${f.l}|${f.id}`);
      }
      if (items.length < 3) short.push(`${block.app} ${kind} (${items.length})`);
    }
  }
  if (wrong.length) warn.push(`${wrong.length} Top 10 entries that don't stream on their app: ${eg(wrong)}`);
  if (short.length) warn.push(`Short Top 10 lists: ${eg(short, 8)}`);
} catch (e) {
  warn.push(`Couldn't read top10.json (${e.message}).`);
}

// 4. Links: each "where to watch" link must belong to an app the title is on, and to that app's own site.
const badLink = [];
const strayLink = [];
let links = 0;
for (const lang of LANGS) {
  const dir = new URL(`t/${lang}/`, DIR);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    for (const [id, f] of Object.entries(JSON.parse(readFileSync(new URL(file, dir), "utf8")).films)) {
      for (const [app, url] of Object.entries(f.u || {})) {
        links++;
        let host = "";
        try { const x = new URL(url); host = x.hostname; if (x.protocol !== "https:") throw 0; } catch { badLink.push(`${f.t} (${lang}-${id}) ${app}: ${String(url).slice(0, 60)}`); continue; }
        if (!HOSTS[app]) continue;
        if (!HOSTS[app].test(host)) badLink.push(`${f.t} (${lang}-${id}) ${app} → ${host}`);
        else if (!(f.w || []).includes(app) && !(f.ja || []).includes(app)) strayLink.push(`${f.t} (${lang}-${id}) ${app}`);
      }
    }
  }
}
if (badLink.length) warn.push(`${badLink.length} links that aren't https or point at another site: ${eg(badLink)}`);
if (strayLink.length > Math.max(20, links * 0.01)) warn.push(`${strayLink.length} links for apps the title is no longer on (these are ignored by the site): ${eg(strayLink, 3)}`);

// Report
const lines = [
  `Catalogue check: ${total} titles in ${LANGS.length} languages, ${links} links, ${Object.keys(perApp).length} apps.`,
  ...stop.map((s) => `STOP: ${s}`),
  ...warn.map((s) => `Warning: ${s}`),
  stop.length || warn.length ? "" : "All checks passed.",
].filter((l, i, a) => l || i < a.length - 1);
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  const apps = Object.entries(perApp).sort((a, b) => b[1] - a[1]).map(([a, n]) => `| ${a} | ${n}${prevApp[a] ? ` (was ${prevApp[a]})` : ""} |`).join("\n");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Catalogue check\n${total} titles, ${links} links.\n\n${stop.map((s) => `- ❌ ${s}`).join("\n")}${stop.length ? "\n" : ""}${warn.map((s) => `- ⚠️ ${s}`).join("\n")}${!stop.length && !warn.length ? "✅ All checks passed.\n" : ""}\n\n| App | Titles |\n|---|---|\n${apps}\n`);
}
if (stop.length) process.exit(1);
