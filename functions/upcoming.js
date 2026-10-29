// Cloudflare Pages Function for /upcoming and /upcoming?l=<lang>: puts the upcoming releases with their
// dates into the HTML for search engines and link previews. See lib/lists.js.
import { SITE } from "../lib/seo.js";
import { asset, listPage, LANG_NAMES } from "../lib/lists.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const params = new URL(context.request.url).searchParams;
    const l = params.get("l") || "";
    const data = await asset(context, "/assets/catalog/upcoming.json");
    if (!data) return page;
    const lang = l === "en" ? "Hollywood" : LANG_NAMES[l] || "";
    const date = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

    // ?show=now: the "In theatres now" tab.
    if (params.get("show") === "now") {
      const now = (data.now || []).filter((f) => !lang || f.l === l);
      if (!now.length) return page;
      const h1 = `${lang ? `${lang} movies` : "Movies"} in theatres now`;
      const url = `${SITE}/upcoming?show=now${lang ? `&l=${l}` : ""}`;
      return listPage(page, {
        rootId: "upcoming",
        title: `${h1}: book tickets · Masala Mischief`,
        h1,
        desc: `${h1} in India, not streaming yet: ${now.slice(0, 4).map((f) => f.t).join(", ")} and more. Book tickets on BookMyShow or District.`,
        url,
        intro: "Films in Indian cinemas and not streaming yet. Book tickets to pick your city, cinema and showtime.",
        items: now.map((f) => ({ name: f.t, href: f.pg ? `/film?id=${f.l}-${f.id}` : url, note: [`Out ${date(f.d)}`, LANG_NAMES[f.l], f.cast.map((c) => c[1]).join(", ")].filter(Boolean).join(" · ") })),
        crumbs: [["Home", `${SITE}/`], ["In theatres now", `${SITE}/upcoming?show=now`], ...(lang ? [[h1, url]] : [])],
      });
    }

    const items = data.items.filter((f) => !lang || f.l === l);
    if (!items.length) return page;
    const h1 = `Upcoming ${lang ? `${lang} ` : ""}movies`;
    const url = `${SITE}/upcoming${lang ? `?l=${l}` : ""}`;
    return listPage(page, {
      rootId: "upcoming",
      title: `${h1}: release dates and trailers · Masala Mischief`,
      h1,
      desc: `${h1} with release dates, cast and trailers: ${items.slice(0, 4).map((f) => `${f.t} (${date(f.d)})`).join(", ")} and more.`,
      url,
      intro: "The most-awaited films of the next few months. Dates can move, so check closer to release.",
      // Upcoming films don't have their own page yet, so each links to its card on this page.
      items: items.map((f) => ({ name: f.t, href: `/upcoming${lang ? `?l=${l}` : ""}#u-${f.l}-${f.id}`, note: [date(f.d), LANG_NAMES[f.l], f.cast.map((c) => c[1]).join(", ")].filter(Boolean).join(" · ") })),
      crumbs: [["Home", `${SITE}/`], ["Upcoming movies", `${SITE}/upcoming`], ...(lang ? [[h1, url]] : [])],
    });
  } catch (err) {
    return page;
  }
}
