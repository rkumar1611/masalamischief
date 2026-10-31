// Shared bits for the page functions (functions/review.js, film.js, person.js): structured data that
// Google reads for rich results, and the cast list in the server-rendered HTML.

export const SITE = "https://masalamischief.in";
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const tmdbImg = (path, size) => (path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined);
export const personUrl = (id) => `${SITE}/person?id=${id}`;

// <script type="application/ld+json"> for the <head>, safe against "</script>" in titles. Empty lists
// and missing values are left out.
export const ldScript = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data, (k, v) => (Array.isArray(v) && !v.length ? undefined : v)).replace(/</g, "\\u003c")}</script>`;

// IMDb and Wikidata pages for the same title, so Google can tie the page to the right film.
export const sameAs = (im, wd) => [
  /^tt\d+$/.test(im || "") && `https://www.imdb.com/title/${im}/`,
  /^Q\d+$/.test(wd || "") && `https://www.wikidata.org/wiki/${wd}`,
].filter(Boolean);

// director/actor lists in schema.org form, from the compact cast/dir arrays (see scripts/tmdb-extras.mjs).
export const people = (list) => (list || []).map(([id, name]) => ({ "@type": "Person", name, url: personUrl(id) }));

export const breadcrumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
});

// Visitors' ratings collected on this site (Google only accepts ratings gathered on the page's own site).
export const aggregate = (r) =>
  r ? { "@type": "AggregateRating", ratingValue: r.avg, bestRating: 10, worstRating: 1, ratingCount: r.n } : undefined;

// "Watch on Netflix" etc.: one WatchAction per direct link to the title on a streaming app in India
// ({ app: url }, from the catalogue's f.u or WATCH_LINKS). App home pages and searches are left out.
export const watchActions = (links) => Object.entries(links || {})
  .filter(([, url]) => { try { const u = new URL(url); return u.protocol === "https:" && u.pathname.length > 1 && !/search/.test(u.pathname); } catch { return false; } })
  .map(([app, url]) => ({
    "@type": "WatchAction",
    name: `Watch on ${app}`,
    target: { "@type": "EntryPoint", urlTemplate: url, actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"] },
    expectsAcceptanceOf: { "@type": "Offer", category: "subscription", eligibleRegion: { "@type": "Country", name: "IN" } },
  }));

// Search titles and descriptions in the words Indians search with ("<film> ott", "<actor> movies",
// "<film> review", "<film> certificate"), with the answer first so it shows in the result.
// assets/app.js filmSearchTitle() repeats the film title rule for the page itself; keep them alike.
const LANG_WORD = { hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi", en: "Hollywood", ko: "Korean", ja: "Anime" };
const yearsOf = (f) => (f.k === "tv" && f.y ? (f.end ? (f.ye ? `${f.y}–${f.ye}` : `${f.y}`) : `${f.y}–`) : f.y ? `${f.y}` : "");

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// When a film in (or just out of) cinemas should reach OTT: TMDB's listed digital release (od, with
// the app in oa when known, from scripts/build-catalog.mjs) or an estimate from the cinema date: Hindi
// films usually stream about 8 weeks after release (the multiplexes' rule), South Indian ones about 4.
// { date, app, sure } or null (series, films already streaming, films out over 4 months).
// assets/app.js ottDue() repeats this; keep them alike.
const OTT_WAIT_DAYS = { hi: 56, en: 70, ta: 28, te: 28, ml: 28, kn: 28, mr: 28, bn: 28, pa: 28 };
export function ottDue(f, today = todayIso()) {
  if (f.k === "tv" || !f.rd || (f.w && f.w.length) || (f.ja && f.ja.length)) return null;
  const since = (Date.parse(today) - Date.parse(f.rd)) / 864e5;
  if (since > 120 || since < -60) return null;
  if (f.od && f.od >= addDays(today, -14)) return { date: f.od, app: f.oa || "", sure: true };
  return OTT_WAIT_DAYS[f.l] ? { date: addDays(f.rd, OTT_WAIT_DAYS[f.l]), app: "", sure: false } : null;
}
// "early December 2026"
const roughly = (d) => {
  const x = new Date(`${d}T00:00:00Z`);
  return `${x.getUTCDate() <= 10 ? "early" : x.getUTCDate() <= 20 ? "mid" : "late"} ${x.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}`;
};
// The answer to "<film> OTT release date", as a sentence.
export function ottDueText(f, due, today = todayIso()) {
  if (due.sure) return `${due.date > today ? "OTT release" : "Listed for OTT from"} ${fmtDay(due.date)}${due.app ? ` on ${due.app}` : ""}.`;
  const rule = `${LANG_WORD[f.l]} films usually reach OTT about ${Math.round(OTT_WAIT_DAYS[f.l] / 7)} weeks after their cinema release`;
  return due.date > today ? `OTT date not announced yet; expected around ${roughly(due.date)} (${rule}).` : `OTT date not announced yet; due any time now (${rule}).`;
}

export function filmSearchTitle(f) {
  const years = yearsOf(f);
  // While it's in cinemas, people search for the OTT release date.
  const what = ottDue(f) ? "OTT Release Date & Platform" : "OTT: Where to Watch Online";
  return `${f.t}${years ? ` (${years})` : ""} ${what} · ${LANG_WORD[f.l] || ""} ${f.k === "tv" ? "Web Series" : "Movie"}`.replace(/ {2,}/g, " ");
}

// Where it stands on OTT in India, as a short sentence: on which apps, in cinemas, coming, or not yet.
export function ottStatus(f, today = todayIso()) {
  const apps = (f.ja && f.ja.length ? f.ja : f.w) || [];
  if (apps.length) return `streaming on ${apps.slice(0, 3).join(", ")} in India.`;
  const due = ottDue(f, today);
  if (f.k !== "tv" && f.rd && f.rd > today) return `releases in cinemas ${fmtDay(f.rd)}. ${due ? ottDueText(f, due, today) : "The OTT release comes after its cinema run."}`;
  if (f.k !== "tv" && f.rd && (Date.parse(today) - Date.parse(f.rd)) / 864e5 <= 60) return `in cinemas now, not on any OTT app in India yet. ${due ? ottDueText(f, due, today) : ""}`.trim();
  return due ? `not on any OTT app in India yet. ${ottDueText(f, due, today)}` : "not on any OTT app in India right now.";
}

export function filmSearchDesc(f) {
  const leads = (f.cast || []).slice(0, 3).map((c) => c[1]);
  return [
    `${f.t} OTT: ${ottStatus(f)}`,
    f.c ? `Certificate ${f.c}.` : "",
    f.k !== "tv" && f.r ? `${f.r} min.` : "",
    leads.length ? `Cast: ${leads.join(", ")}.` : "",
    (f.g || []).length ? `${f.g.slice(0, 3).join(", ")}.` : "",
    f.ov || "",
  ].filter(Boolean).join(" ").slice(0, 300);
}

// "Quick answers" for a film page: the questions people search ("<film> ott", "<film> certificate",
// "<film> runtime", "<film> cast"), answered in a sentence each. [[question, answer], …].
// assets/app.js quickAnswers() draws the same box on the page; keep them alike.
const CERT_MEANS = { U: "suitable for all ages", UA: "parental guidance for under-12s", A: "adults only", S: "for specialised audiences" };
const certMeaning = (c) => CERT_MEANS[c] || (/^U\/A (\d+)\+$/.exec(c) ? `parental guidance for under-${/^U\/A (\d+)\+$/.exec(c)[1]}s` : "");
const DUB_NAMES = { hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi", en: "English", ko: "Korean", ja: "Japanese" };
export function quickAnswers(f) {
  const tv = f.k === "tv";
  // The OTT date gets its own answer, so it's left out of the first.
  const due = ottDue(f);
  const status = due ? ottStatus(f).replace(ottDueText(f, due), "").trim() : ottStatus(f);
  const qa = [[`Where can I watch ${f.t}?`, `${f.t} ${status.startsWith("releases") ? "" : "is "}${status}`]];
  if (due) qa.push([`When will ${f.t} release on OTT?`, ottDueText(f, due)]);
  const dubs = (f.au || []).map((c) => DUB_NAMES[c]).filter(Boolean);
  if (dubs.length && ((f.ja && f.ja.length) || (f.w && f.w.length))) qa.push([`Is ${f.t} dubbed?`, `Yes, it's also available in ${dubs.join(", ")} on the apps that list audio languages.`]);
  if (f.c) qa.push([`What is ${f.t}'s certificate?`, `${f.c}${certMeaning(f.c) ? `: ${certMeaning(f.c)}` : ""}.`]);
  if (!tv && f.r) qa.push([`How long is ${f.t}?`, `${Math.floor(f.r / 60) ? `${Math.floor(f.r / 60)} h ` : ""}${f.r % 60} min.`]);
  if (tv && f.s) qa.push([`How many seasons does ${f.t} have?`, `${f.s} season${f.s === 1 ? "" : "s"}${f.end ? "; it has ended" : " so far"}.`]);
  if (f.rd) qa.push([`When did ${f.t} release?`, `${new Date(`${f.rd}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}, in ${LANG_WORD[f.l] === "Hollywood" ? "English" : LANG_WORD[f.l] || "its original language"}.`]);
  const cast = (f.cast || []).slice(0, 4).map((c) => c[1]);
  const dir = (f.dir || []).slice(0, 2).map((d) => d[1]);
  if (cast.length) qa.push([`Who is in ${f.t}?`, `${cast.join(", ")}${dir.length ? `; ${tv ? "created" : "directed"} by ${dir.join(" and ")}` : ""}.`]);
  return qa;
}

// "Cast: A (as X), B, C. Directed by D." for the server-rendered page.
export function castLine(x, kind) {
  if (!x) return "";
  const cast = (x.cast || []).map(([id, name, role]) => `<a href="/person?id=${id}">${esc(name)}</a>${role ? ` (${esc(role)})` : ""}`);
  const dir = (x.dir || []).map(([id, name]) => `<a href="/person?id=${id}">${esc(name)}</a>`);
  return [
    cast.length ? `<p>Cast: ${cast.join(", ")}.</p>` : "",
    dir.length ? `<p>${kind === "tv" ? "Created by" : "Directed by"} ${dir.join(" and ")}.</p>` : "",
  ].join("");
}
