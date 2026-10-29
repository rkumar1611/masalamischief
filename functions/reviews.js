// Cloudflare Pages Function for /reviews. A shared watchlist (/reviews?list=<id>,<id>,…) gets its own
// title, description and picture (the first film's still), so the WhatsApp preview says what's in it.
// Any other /reviews page, or if anything goes wrong, is served as it is.
import "../assets/data.js";
import { SITE } from "../lib/seo.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const url = new URL(context.request.url);
    if (!url.searchParams.has("list")) return page;
    const { MOVIES, IMAGES } = globalThis.MM_DATA;
    const films = [...new Set((url.searchParams.get("list") || "").split(","))]
      .map((id) => MOVIES.find((m) => m.id === id)).filter(Boolean).slice(0, 100);
    if (!films.length) return page;

    const names = films.map((m) => m.title);
    const title = `🍿 A friend's watchlist · ${films.length} film${films.length === 1 ? "" : "s"} · Masala Mischief`;
    const desc = `${names.slice(0, 6).join(", ")}${names.length > 6 ? ` and ${names.length - 6} more` : ""}. Our reviews, Masala Meter and where to stream each one in India.`;
    const still = films.map((m) => IMAGES && IMAGES[m.id] && IMAGES[m.id].backdrop).find(Boolean);
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
