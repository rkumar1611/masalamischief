// Cloudflare Pages Function for /sitemap.xml, built from assets/data.js so new reviews are listed automatically.
import "../assets/data.js";

const SITE = "https://masalamischief.in";

export function onRequestGet() {
  const { MOVIES } = globalThis.MM_DATA;
  const pages = ["/", "/reviews", "/suggest", "/family"].map((p) => `<url><loc>${SITE}${p}</loc></url>`);
  const reviews = MOVIES.map((m) =>
    `<url><loc>${SITE}/review?id=${encodeURIComponent(m.id)}</loc><lastmod>${m.reviewed}</lastmod></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...pages, ...reviews].join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
