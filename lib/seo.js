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
