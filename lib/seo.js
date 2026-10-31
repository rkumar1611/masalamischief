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

export function filmSearchTitle(f) {
  const years = yearsOf(f);
  return `${f.t}${years ? ` (${years})` : ""} OTT: Where to Watch Online · ${LANG_WORD[f.l] || ""} ${f.k === "tv" ? "Web Series" : "Movie"}`.replace(/ {2,}/g, " ");
}

// Where it stands on OTT in India, as a short sentence: on which apps, in cinemas, coming, or not yet.
export function ottStatus(f, today = new Date().toISOString().slice(0, 10)) {
  const apps = (f.ja && f.ja.length ? f.ja : f.w) || [];
  if (apps.length) return `streaming on ${apps.slice(0, 3).join(", ")} in India.`;
  if (f.k !== "tv" && f.rd && f.rd > today) return `releases ${new Date(`${f.rd}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}; the OTT release comes after its cinema run.`;
  if (f.k !== "tv" && f.rd && (Date.parse(today) - Date.parse(f.rd)) / 864e5 <= 60) return "in cinemas now, not on any OTT app in India yet.";
  return "not on any OTT app in India right now.";
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
