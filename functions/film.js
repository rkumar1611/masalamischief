// Cloudflare Pages Function for /film?id=<lang>-<tmdb id>, the pages for catalogue films we haven't
// reviewed, movies ("<lang>-<id>") and series ("<lang>-tv<id>"). Like functions/review.js, it puts the
// film's own title, description, image and cast into the HTML so link previews and search show the
// right film, plus structured data for Google (Movie or TVSeries, breadcrumbs, visitors' rating stars
// once there are audience reviews). Data comes from assets/catalog/t/<lang>/<n>.json (see manifest.json).
// If anything goes wrong, the plain page is served as before.
import { SITE, esc, tmdbImg, ldScript, sameAs, people, breadcrumbs, aggregate, castLine } from "../lib/seo.js";
import { audienceRating } from "../lib/community.js";

const LANGS = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi",
  en: "Hollywood", ko: "Korean", ja: "Anime",
};

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const [code, rawId] = (new URL(context.request.url).searchParams.get("id") || "").split("-");
    if (!LANGS[code] || !/^(tv)?\d+$/.test(rawId || "")) return page;
    // Layout 2 keeps each title in a small shard (t/<code>/<id % shards>.json); older builds had one file per language.
    const manRes = await context.env.ASSETS.fetch(new URL("/assets/catalog/manifest.json", context.request.url));
    const man = manRes.ok ? await manRes.json() : {};
    const file = man.layout >= 2 ? `/assets/catalog/t/${code}/${+rawId.replace(/^tv/, "") % man.shards.t}.json` : `/assets/catalog/${code}.json`;
    const [res, audience] = await Promise.all([
      context.env.ASSETS.fetch(new URL(file, context.request.url)),
      audienceRating(context.env, `c:${code}-${rawId}`),
    ]);
    if (!res.ok) return page;
    const f = (await res.json()).films[rawId];
    if (!f) return page;

    const tv = f.k === "tv";
    const years = tv && f.y ? (f.end ? (f.ye ? `${f.y}–${f.ye}` : `${f.y}`) : `${f.y}–`) : f.y ? `${f.y}` : "";
    const url = `${SITE}/film?id=${code}-${rawId}`;
    const title = `${f.t}${years ? ` (${years})` : ""}${tv ? " · series" : ""} · where to watch · Masala Mischief`;
    const ogTitle = `${f.t}${years ? ` (${years})` : ""} · ${LANGS[code]} ${tv ? "series" : "movie"} · ★ ${f.v}/10`;
    const leads = (f.cast || []).slice(0, 3).map((c) => c[1]);
    const desc = [
      f.w.length ? `Streaming in India on ${f.w.join(", ")}.` : "Where to watch in India.",
      leads.length ? `With ${leads.join(", ")}.` : "",
      f.g.length ? `${f.g.join(", ")}.` : "",
      f.ov || "",
    ].filter(Boolean).join(" ").slice(0, 300);
    const image = f.b ? `https://image.tmdb.org/t/p/w1280${f.b}` : f.p ? `https://image.tmdb.org/t/p/w780${f.p}` : null;

    const body = `
      <article class="ssr-review">
        <h1>${esc(f.t)}${years ? ` (${years})` : ""}</h1>
        <p>${esc(LANGS[code])} ${tv ? "series" : "movie"} · ${esc(f.g.join(", "))}${tv && f.s ? ` · ${f.s} season${f.s === 1 ? "" : "s"}` : !tv && f.r ? ` · ${f.r} min` : ""} · TMDB ${f.v}/10</p>
        ${f.ov ? `<p>${esc(f.ov)}</p>` : ""}
        ${castLine(f, f.k)}
        <p>${f.w.length ? `Streaming in India on ${esc(f.w.join(", "))}.` : "Not on a subscription app in India right now."}</p>
      </article>`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": tv ? "TVSeries" : "Movie",
          name: f.t,
          alternateName: f.o,
          url,
          image: tmdbImg(f.p, "w500"),
          description: f.ov || undefined,
          [tv ? "startDate" : "dateCreated"]: f.y ? String(f.y) : undefined,
          ...(tv && f.s ? { numberOfSeasons: f.s } : {}),
          genre: f.g,
          inLanguage: code === "ja" ? "ja" : code,
          contentRating: f.c || undefined,
          ...(!tv && f.r ? { duration: `PT${Math.floor(f.r / 60)}H${f.r % 60}M` } : {}),
          [tv ? "creator" : "director"]: people(f.dir),
          actor: people(f.cast),
          sameAs: sameAs(f.im, f.wd),
          aggregateRating: aggregate(audience),
        },
        breadcrumbs([["Home", `${SITE}/`], ["Movies & series", `${SITE}/films`], [f.t, url]]),
      ],
    };

    const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
    const rewriter = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(ogTitle))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:url"]', setContent(url))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
      .on("head", { element(el) { el.append(ldScript(jsonLd), { html: true }); } })
      .on("#film", { element(el) { el.setInnerContent(body, { html: true }); } });
    if (image) {
      rewriter
        .on('meta[property="og:image"]', setContent(image))
        .on('meta[property="og:image:width"]', setContent(f.b ? "1280" : "780"))
        .on('meta[property="og:image:height"]', setContent(f.b ? "720" : "1170"));
    }
    return rewriter.transform(page);
  } catch (err) {
    return page;
  }
}
