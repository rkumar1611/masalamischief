// Cloudflare Pages Function for /sitemaps/<name>.xml, listed by /sitemap.xml.
//   main.xml    our pages and every review (from assets/data.js)
//   <code>.xml  catalogue titles in one language we haven't reviewed (assets/catalog/list-<code>.json)
//   people.xml  actor and director pages (assets/catalog/people/*.json)
//   lists.xml   New on <app>, best-of lists and upcoming
// Newer catalogue builds pre-make every one except main.xml (assets/catalog/sitemaps/); the code below
// is the fallback for older builds.
import "../../assets/data.js";

const SITE = "https://masalamischief.in";
const PEOPLE_SHARDS = 64; // must match scripts/build-catalog.mjs

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
  // Newer catalogue builds write the language, people and lists sitemaps ready-made
  // (assets/catalog/sitemaps/<name>.xml), so they're served as they are, with no big files to read here.
  if (/^[a-z]{2,8}$/.test(name)) {
    const ready = await context.env.ASSETS.fetch(new URL(`/assets/catalog/sitemaps/${name}.xml`, context.request.url));
    if (ready.ok) return new Response(ready.body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  if (name === "lists") {
    // New on <app>, best-of lists and upcoming releases (assets/catalog/lists/index.json, upcoming.json).
    const get = (p) => context.env.ASSETS.fetch(new URL(p, context.request.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [index, upcoming] = await Promise.all([get("/assets/catalog/lists/index.json"), get("/assets/catalog/upcoming.json")]);
    if (!index) return new Response("Not found", { status: 404 });
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
    if (upcoming && upcoming.items.length) {
      paths.push("/upcoming", ...[...new Set(upcoming.items.map((f) => f.l))].map((l) => `/upcoming?l=${l}`));
    }
    return xmlResponse(paths.map((p) => `<url><loc>${SITE}${p.replace(/&/g, "&amp;")}</loc></url>`));
  }
  if (name === "people") {
    // Actor and director pages, for people with at least 3 titles (fewer makes a thin page).
    const shards = await Promise.all(Array.from({ length: PEOPLE_SHARDS }, (_, i) =>
      context.env.ASSETS.fetch(new URL(`/assets/catalog/people/${i}.json`, context.request.url))
        .then((r) => (r.ok ? r.json() : {})).catch(() => ({}))));
    const urls = shards.flatMap((s) => Object.entries(s).filter(([, p]) => p[2].length >= 3)
      .map(([id]) => `<url><loc>${SITE}/person?id=${id}</loc></url>`));
    if (!urls.length) return new Response("Not found", { status: 404 });
    return xmlResponse(urls);
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
