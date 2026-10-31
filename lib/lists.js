// Shared by the list page functions (functions/ott.js, best.js, upcoming.js) and the sitemap.
// The lists themselves are built by scripts/build-catalog.mjs into assets/catalog/lists/ and upcoming.json.
import { SITE, esc, ldScript, breadcrumbs } from "./seo.js";

export const LANG_NAMES = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi",
  en: "English", ko: "Korean", ja: "Anime",
};
const listLang = (l) => (l === "en" ? "Hollywood" : l === "ja" ? "anime" : LANG_NAMES[l] || "");

// Same wording as bestTitle() in assets/app.js.
export function bestTitle(l, genre, year, kind, app) {
  if (year) return `Best ${listLang(l)} movies of ${year}`;
  return `Best ${listLang(l)}${genre ? ` ${genre.toLowerCase()}` : ""} ${kind === "tv" ? "series" : "movies"}${app ? ` on ${app}` : ""}`;
}

export const asset = (context, path) => context.env.ASSETS.fetch(new URL(path, context.request.url))
  .then((r) => (r.ok ? r.json() : null)).catch(() => null);

export const filmPath = (f) => `/film?id=${f.l}-${f.id}`;

// New OTT releases in one language (/ott?l=ml): every app's latest titles (lists/ott.json) in that
// language, each once with all its apps, newest release first. assets/app.js ottInLanguage() does
// the same for the page itself.
export const listLangName = (l) => listLang(l);
export function ottInLanguage(lists, code, max = 60) {
  const byKey = new Map();
  for (const L of Object.values(lists || {})) {
    for (const f of L.items || []) {
      if (f.l !== code) continue;
      const k = `${f.l}-${f.id}`;
      const had = byKey.get(k);
      byKey.set(k, had ? { ...had, w: [...new Set([...(had.w || []), ...(f.w || [])])] } : f);
    }
  }
  return [...byKey.values()].sort((a, b) => (b.rd || "").localeCompare(a.rd || "") || (b.n || 0) - (a.n || 0)).slice(0, max);
}

// Swaps in the list's title, description and canonical URL, puts a plain ordered list of the titles
// (with links) in the page for search engines, and adds ItemList + breadcrumb structured data.
export function listPage(page, { rootId, title, h1, desc, url, intro, items, crumbs }) {
  const body = `
    <article class="ssr-review">
      <h1>${esc(h1)}</h1>
      ${intro ? `<p>${esc(intro)}</p>` : ""}
      <ol>${items.map((it) => `<li><a href="${it.href}">${esc(it.name)}</a>${it.note ? ` · ${esc(it.note)}` : ""}</li>`).join("")}</ol>
    </article>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: h1,
        url,
        numberOfItems: items.length,
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${it.href}`, name: it.name })),
      },
      breadcrumbs(crumbs),
    ],
  };
  const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(title); } })
    .on('meta[name="description"]', setContent(desc))
    .on('meta[property="og:title"]', setContent(h1))
    .on('meta[property="og:description"]', setContent(desc))
    .on('meta[property="og:url"]', setContent(url))
    .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
    .on("head", { element(el) { el.append(ldScript(jsonLd), { html: true }); } })
    .on(`#${rootId}`, { element(el) { el.setInnerContent(body, { html: true }); } })
    .transform(page);
}
