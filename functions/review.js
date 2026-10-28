// Cloudflare Pages Function for /review?id=…
// The review page is filled in by JavaScript in the browser, which WhatsApp and most link-preview
// bots don't run. This adds the film's own title, description and review text to the HTML before
// it's sent, so shares and search results show the right film. If anything goes wrong, the plain
// page is served as before.
import "../assets/data.js";

const SITE = "https://masalamischief.in";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const { MOVIES, WATCH, PARENT_NOTES, LANG_LABELS } = globalThis.MM_DATA;
    const id = new URL(context.request.url).searchParams.get("id");
    const m = MOVIES.find((x) => x.id === id);
    if (!m) return page;

    const lang = LANG_LABELS[m.lang] || m.lang;
    const stream = (WATCH[m.id] && WATCH[m.id].stream) || [];
    const notes = PARENT_NOTES[m.id];
    const url = `${SITE}/review?id=${encodeURIComponent(m.id)}`;
    const title = `${m.title} (${m.year}) review · Masala Mischief`;
    const ogTitle = `${m.title} · 🌶️ ${m.masala}/5 Masala Meter · ★ ${m.quality}/10`;
    const desc = [
      m.tagline,
      `${lang} film, ${m.year}.`,
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
        ${stream.length ? `<p>Where to watch in India: ${esc(stream.join(", "))}.</p>` : ""}
      </article>`;

    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Review",
      name: `${m.title} review`,
      url,
      datePublished: m.reviewed,
      reviewBody: m.review.join(" "),
      author: { "@type": "Organization", name: "Masala Mischief" },
      publisher: { "@type": "Organization", name: "Masala Mischief", url: SITE },
      reviewRating: { "@type": "Rating", ratingValue: m.quality, bestRating: 10, worstRating: 0 },
      itemReviewed: {
        "@type": "Movie",
        name: m.title,
        dateCreated: String(m.year),
        inLanguage: m.lang,
        genre: m.genres,
      },
    }).replace(/</g, "\\u003c");

    const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
    return new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(ogTitle))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:url"]', setContent(url))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
      .on("head", { element(el) { el.append(`<script type="application/ld+json">${jsonLd}</script>`, { html: true }); } })
      .on("#review", { element(el) { el.setInnerContent(body, { html: true }); } })
      .transform(page);
  } catch (err) {
    return page;
  }
}
