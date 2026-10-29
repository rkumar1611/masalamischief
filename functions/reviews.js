// Cloudflare Pages Function for /reviews. A shared watchlist (/reviews?list=<id>,<id>,…) gets its own
// title, description and picture (the first film's still), so the WhatsApp preview says what's in it.
// Any other /reviews page, or if anything goes wrong, is served as it is.
// Catalogue titles in the list ("_<lang>-<id>") are looked up in the catalogue's title files.
import "../assets/data.js";
import { SITE } from "../lib/seo.js";
import { asset } from "../lib/lists.js";

const CAT_ID = /^_([a-z]{2})-((?:tv)?\d+)$/;

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const url = new URL(context.request.url);
    if (!url.searchParams.has("list")) return page;
    const { MOVIES, IMAGES } = globalThis.MM_DATA;
    const ids = [...new Set((url.searchParams.get("list") || "").split(","))].slice(0, 100);
    // Up to six catalogue titles (one small file each), enough for the preview's names and picture.
    const man = ids.some((id) => CAT_ID.test(id)) ? await asset(context, "/assets/catalog/manifest.json") : null;
    let lookups = 0;
    const films = (await Promise.all(ids.map(async (id) => {
      const m = MOVIES.find((x) => x.id === id);
      if (m) return { id, title: m.title, still: IMAGES && IMAGES[m.id] && IMAGES[m.id].backdrop };
      const c = id.match(CAT_ID);
      if (!c || !man || !man.shards || lookups++ >= 6) return c ? { id } : null;
      const file = await asset(context, `/assets/catalog/t/${c[1]}/${+c[2].replace(/^tv/, "") % man.shards.t}.json`);
      const f = file && file.films[c[2]];
      return f ? { id, title: f.t, still: f.b } : null;
    }))).filter(Boolean);
    if (!films.length) return page;

    const names = films.map((m) => m.title).filter(Boolean);
    const title = `🍿 A friend's watchlist · ${films.length} title${films.length === 1 ? "" : "s"} · Masala Mischief`;
    const desc = `${names.slice(0, 6).join(", ")}${films.length > 6 ? ` and ${films.length - 6} more` : ""}. Our reviews, Masala Meter and where to stream each one in India.`;
    const still = films.map((m) => m.still).find(Boolean);
    const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
    const rewriter = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(desc))
      .on("head", { element(el) { el.append(`<meta property="og:url" content="${SITE}/reviews?list=${films.map((m) => encodeURIComponent(m.id)).join(",")}"><meta name="robots" content="noindex">`, { html: true }); } });
    if (still) {
      rewriter
        .on('meta[property="og:image"]', setContent(`https://image.tmdb.org/t/p/w1280${still}`))
        .on('meta[property="og:image:width"]', setContent("1280"))
        .on('meta[property="og:image:height"]', setContent("720"));
    }
    return rewriter.transform(page);
  } catch {
    return page;
  }
}
