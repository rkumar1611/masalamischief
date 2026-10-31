// Cloudflare Pages Function for /person?id=<TMDB person id>, the actor and director pages. Like
// functions/film.js, it puts the person's name, photo and list of titles into the HTML before it's sent,
// so link previews and search show the right person (the page itself is drawn by app.js). Data comes
// from the catalogue's people index (assets/catalog/p/<id % shards>.json; see manifest.json).
// If anything goes wrong, the plain page is served as before.
import "../assets/data.js";
import { SITE, esc, tmdbImg, ldScript, breadcrumbs } from "../lib/seo.js";

const PEOPLE_SHARDS = 64; // the older layout's people/<id % 64>.json
const LANGS = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi",
  en: "Hollywood", ko: "Korean", ja: "Anime",
};

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const pid = (new URL(context.request.url).searchParams.get("id") || "").match(/^\d{1,9}$/)?.[0];
    if (!pid) return page;
    const asset = (path) => context.env.ASSETS.fetch(new URL(path, context.request.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    // Layout 2: p/<id % shards>.json, each person with their titles; older builds: people/<id % 64>.json with keys only.
    const man = (await asset("/assets/catalog/manifest.json")) || {};
    const v2 = man.layout >= 2;
    const [shard, reviewed] = await Promise.all([
      asset(v2 ? `/assets/catalog/p/${pid % man.shards.p}.json` : `/assets/catalog/people/${pid % PEOPLE_SHARDS}.json`),
      asset("/assets/catalog/reviewed.json"),
    ]);
    const { MOVIES, IMAGES } = globalThis.MM_DATA;

    // Our reviewed films with this person.
    const ours = Object.entries(reviewed || {}).flatMap(([id, x]) => {
      const m = MOVIES.find((mv) => mv.id === id);
      const c = [...(x.cast || []), ...(x.dir || [])].find((p) => String(p[0]) === pid);
      return m && c ? [{ name: c[1], t: m.title, y: m.year, href: `/review?id=${encodeURIComponent(m.id)}`, tmdb: IMAGES[m.id] && IMAGES[m.id].tmdb }] : [];
    });
    const p = shard && shard[pid];
    if (!p && !ours.length) return page;
    const name = p ? p[0] : ours[0].name;

    // Their catalogue titles: in the person's entry (layout 2), or looked up in each language's list.
    let found;
    if (v2) {
      found = (p ? p[2] : []).map(([l, id, t, y, tv]) => ({ l, id, t, y, ...(tv ? { k: "tv" } : {}) }));
    } else {
      const keys = p ? p[2] : [];
      const codes = [...new Set(keys.map((k) => k.split("-")[0]))].filter((c) => LANGS[c]);
      const lists = await Promise.all(codes.map((c) => asset(`/assets/catalog/list-${c}.json`)));
      const byKey = {};
      lists.forEach((l) => l && l.films.forEach((f) => { byKey[`${f.l}-${f.id}`] = f; }));
      found = keys.map((k) => byKey[k]).filter(Boolean);
    }
    const reviewedIds = new Set(ours.map((o) => o.tmdb));
    const titles = [
      ...ours,
      ...found.filter((f) => !(f.k !== "tv" && reviewedIds.has(f.id)))
        .map((f) => ({ t: f.t, y: f.y, tv: f.k === "tv", lang: LANGS[f.l], href: `/film?id=${f.l}-${f.id}` })),
    ].sort((a, b) => (b.y || 0) - (a.y || 0));
    if (!titles.length) return page;

    const url = `${SITE}/person?id=${pid}`;
    const photo = p && p[1];
    const top = titles.slice(0, 4).map((t) => `${t.t}${t.y ? ` (${t.y})` : ""}`);
    // Search wording: "<name> movies", "<name> series".
    const title = `${name} Movies & Web Series: Full List, Where to Watch`;
    const desc = `${name}'s ${titles.length} movies and series on Masala Mischief: ${top.join(", ")}${titles.length > 4 ? " and more" : ""}. Ratings, trailers and where to stream them in India.`;

    const body = `
      <article class="ssr-review">
        <h1>${esc(name)}</h1>
        <p>${titles.length} movies and series, newest first.</p>
        <ul>${titles.map((t) => `<li><a href="${t.href}">${esc(t.t)}</a>${t.y ? ` (${t.y})` : ""}${t.tv ? " · series" : ""}</li>`).join("")}</ul>
      </article>`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Person", name, url, image: tmdbImg(photo, "w500"), sameAs: [`https://www.themoviedb.org/person/${pid}`] },
        breadcrumbs([["Home", `${SITE}/`], ["Movies & series", `${SITE}/films`], [name, url]]),
      ],
    };

    const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
    const rewriter = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(`${name} · movies and series`))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:url"]', setContent(url))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
      .on("head", { element(el) { el.append(ldScript(jsonLd), { html: true }); } })
      .on("#person", { element(el) { el.setInnerContent(body, { html: true }); } });
    if (photo) {
      // A portrait photo; the size tags are for the landscape default image, so drop them.
      rewriter
        .on('meta[property="og:image"]', setContent(`https://image.tmdb.org/t/p/w500${photo}`))
        .on('meta[property="og:image:width"]', { element(el) { el.remove(); } })
        .on('meta[property="og:image:height"]', { element(el) { el.remove(); } })
        .on('meta[name="twitter:card"]', setContent("summary"));
    }
    return rewriter.transform(page);
  } catch (err) {
    return page;
  }
}
