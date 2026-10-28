// Cloudflare Pages Function for /sitemaps/<name>.xml, listed by /sitemap.xml.
//   main.xml    our pages and every review (from assets/data.js)
//   <code>.xml  catalogue titles in one language we haven't reviewed (assets/catalog/list-<code>.json)
import "../../assets/data.js";

const SITE = "https://masalamischief.in";

const xmlResponse = (urls) => new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });

export async function onRequestGet(context) {
  const name = String(context.params.name || "").replace(/\.xml$/, "");
  const { MOVIES, IMAGES } = globalThis.MM_DATA;

  if (name === "main") {
    const pages = ["/", "/reviews", "/films", "/suggest", "/family", "/group"].map((p) => `<url><loc>${SITE}${p}</loc></url>`);
    const reviews = MOVIES.map((m) => `<url><loc>${SITE}/review?id=${encodeURIComponent(m.id)}</loc><lastmod>${m.reviewed}</lastmod></url>`);
    return xmlResponse([...pages, ...reviews]);
  }
  if (!/^[a-z]{2,3}$/.test(name)) return new Response("Not found", { status: 404 });

  // "all" is the older single-file catalogue.
  const file = name === "all" ? "/assets/catalog/index.json" : `/assets/catalog/list-${name}.json`;
  const res = await context.env.ASSETS.fetch(new URL(file, context.request.url));
  if (!res.ok) return new Response("Not found", { status: 404 });
  const cat = await res.json();
  const reviewed = new Set(Object.values(IMAGES).map((i) => i.tmdb));
  const urls = cat.films.filter((f) => !reviewed.has(f.id))
    .map((f) => `<url><loc>${SITE}/film?id=${f.l}-${f.id}</loc><lastmod>${cat.built}</lastmod></url>`);
  return xmlResponse(urls);
}
