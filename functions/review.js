// Cloudflare Pages Function for /review?id=…
// The review page is filled in by JavaScript in the browser, which WhatsApp and most link-preview
// bots don't run. This adds the film's own title, description and review text to the HTML before
// it's sent, so shares and search results show the right film, plus structured data for Google's
// rich results (our rating, visitors' rating stars, cast, IMDb/Wikidata links, breadcrumbs).
// If anything goes wrong, the plain page is served as before.
import "../assets/data.js";
import { SITE, esc, tmdbImg, ldScript, sameAs, people, breadcrumbs, aggregate, castLine, watchActions } from "../lib/seo.js";
import { audienceRating } from "../lib/community.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const { MOVIES, WATCH, WATCH_LINKS, PARENT_NOTES, LANG_LABELS, IMAGES } = globalThis.MM_DATA;
    const id = new URL(context.request.url).searchParams.get("id");
    const m = MOVIES.find((x) => x.id === id);
    if (!m) return page;

    // Trailer/cast/Wikidata for our films (assets/catalog/reviewed.json, refreshed daily) and visitors' rating.
    const [extras, audience] = await Promise.all([
      context.env.ASSETS.fetch(new URL("/assets/catalog/reviewed.json", context.request.url))
        .then((r) => (r.ok ? r.json() : {})).then((all) => all[m.id] || {}).catch(() => ({})),
      audienceRating(context.env, `r:${m.id}`),
    ]);

    const img = (IMAGES && IMAGES[m.id]) || {};
    const lang = LANG_LABELS[m.lang] || m.lang;
    const stream = (WATCH[m.id] && WATCH[m.id].stream) || [];
    const notes = PARENT_NOTES[m.id];
    const url = `${SITE}/review?id=${encodeURIComponent(m.id)}`;
    const title = `${m.title} (${m.year}) review · Masala Mischief`;
    const ogTitle = `${m.title} · 🌶️ ${m.masala}/5 Masala Meter · ★ ${m.quality}/10`;
    const leads = (extras.cast || []).slice(0, 3).map((c) => c[1]);
    const desc = [
      m.tagline,
      `${lang} film, ${m.year}${leads.length ? `, with ${leads.join(", ")}` : ""}.`,
      stream.length ? `Streaming on ${stream.join(", ")}.` : "",
      notes ? `Family Pick, ${notes.age}+.` : "",
    ].filter(Boolean).join(" ");

    // Readable review in the HTML itself, for search engines and no-JS visitors. app.js replaces it.
    const body = `
      <article class="ssr-review">
        <h1>${esc(m.title)} (${m.year})</h1>
        <p><strong>Masala Meter ${m.masala}/5 · Quality ${m.quality}/10</strong> · ${esc(lang)} · ${esc(m.genres.join(", "))}</p>
        <p><em>${esc(m.tagline)}</em></p>
        ${m.review.map((p) => `<p>${esc(p)}</p>`).join("")}
        ${castLine(extras, "movie")}
        ${stream.length ? `<p>Where to watch in India: ${esc(stream.join(", "))}.</p>` : ""}
      </article>`;

    const movie = {
      "@type": "Movie",
      name: m.title,
      url,
      image: tmdbImg(img.poster, "w500"),
      dateCreated: String(m.year),
      inLanguage: m.lang,
      genre: m.genres,
      duration: m.runtime ? `PT${Math.floor(m.runtime / 60)}H${m.runtime % 60}M` : undefined,
      director: people(extras.dir),
      actor: people(extras.cast),
      sameAs: sameAs(img.imdb, extras.wd),
      aggregateRating: aggregate(audience),
      // Only the apps it's streaming on now (WATCH), with their direct links.
      potentialAction: watchActions(Object.fromEntries(Object.entries((WATCH_LINKS && WATCH_LINKS[m.id]) || {}).filter(([app]) => stream.includes(app)))),
    };
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Review",
          name: `${m.title} review`,
          url,
          datePublished: m.reviewed,
          reviewBody: m.review.join(" "),
          author: { "@type": "Organization", name: "Masala Mischief", url: SITE },
          publisher: { "@type": "Organization", name: "Masala Mischief", url: SITE },
          reviewRating: { "@type": "Rating", ratingValue: m.quality, bestRating: 10, worstRating: 0 },
          itemReviewed: movie,
        },
        breadcrumbs([["Home", `${SITE}/`], ["Our reviews", `${SITE}/reviews`], [m.title, url]]),
      ],
    };

    const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
    const rewriter = new HTMLRewriter();
    if (img.backdrop) {
      // The film's own still for the preview card (TMDB w1280 is 1280x720).
      rewriter
        .on('meta[property="og:image"]', setContent(`https://image.tmdb.org/t/p/w1280${img.backdrop}`))
        .on('meta[property="og:image:width"]', setContent("1280"))
        .on('meta[property="og:image:height"]', setContent("720"));
    }
    return rewriter
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(ogTitle))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:url"]', setContent(url))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
      .on("head", { element(el) { el.append(ldScript(jsonLd), { html: true }); } })
      .on("#review", { element(el) { el.setInnerContent(body, { html: true }); } })
      .transform(page);
  } catch (err) {
    return page;
  }
}
