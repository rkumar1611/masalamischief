// Cloudflare Pages Function for /sitemap.xml, built from assets/data.js (our reviews) and the TMDB
// catalogue (assets/catalog/index.json), so new reviews and catalogue films are listed automatically.
import "../assets/data.js";

const SITE = "https://masalamischief.in";

export async function onRequestGet(context) {
  const { MOVIES, IMAGES } = globalThis.MM_DATA;
  const pages = ["/", "/reviews", "/films", "/suggest", "/family", "/group"].map((p) => `<url><loc>${SITE}${p}</loc></url>`);
  const reviews = MOVIES.map((m) =>
    `<url><loc>${SITE}/review?id=${encodeURIComponent(m.id)}</loc><lastmod>${m.reviewed}</lastmod></url>`);

  // Catalogue films we haven't reviewed (reviewed ones already have their review page above).
  let films = [];
  try {
    const res = await context.env.ASSETS.fetch(new URL("/assets/catalog/index.json", context.request.url));
    if (res.ok) {
      const cat = await res.json();
      const reviewed = new Set(Object.values(IMAGES).map((i) => i.tmdb));
      films = cat.films.filter((f) => !reviewed.has(f.id))
        .map((f) => `<url><loc>${SITE}/film?id=${f.l}-${f.id}</loc><lastmod>${cat.built}</lastmod></url>`);
    }
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...pages, ...reviews, ...films].join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
