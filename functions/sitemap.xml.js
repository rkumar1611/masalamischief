// Cloudflare Pages Function for /sitemap.xml: a sitemap index pointing at one sitemap for our pages and
// reviews (/sitemaps/main.xml) and one per catalogue language (/sitemaps/<code>.xml, see
// functions/sitemaps/[name].js), plus one for actor pages (/sitemaps/people.xml). Splitting keeps each
// one small and quick to build.

const SITE = "https://masalamischief.in";

export async function onRequestGet(context) {
  let langs = [];
  let built = "";
  try {
    const res = await context.env.ASSETS.fetch(new URL("/assets/catalog/manifest.json", context.request.url));
    if (res.ok) {
      const man = await res.json();
      langs = Object.keys(man.langs);
      built = man.built;
    } else if ((await context.env.ASSETS.fetch(new URL("/assets/catalog/index.json", context.request.url))).ok) {
      langs = ["all"]; // older single-file catalogue
    }
  } catch {}

  const entry = (name) => `<sitemap><loc>${SITE}/sitemaps/${name}.xml</loc>${built ? `<lastmod>${built}</lastmod>` : ""}</sitemap>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["main", ...langs, ...(langs.length && langs[0] !== "all" ? ["people", "lists"] : [])].map(entry).join("\n")}
</sitemapindex>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
