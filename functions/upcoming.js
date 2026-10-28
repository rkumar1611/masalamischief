// Cloudflare Pages Function for /upcoming and /upcoming?l=<lang>: puts the upcoming releases with their
// dates into the HTML for search engines and link previews. See lib/lists.js.
import { SITE } from "../lib/seo.js";
import { asset, listPage, LANG_NAMES } from "../lib/lists.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const l = new URL(context.request.url).searchParams.get("l") || "";
    const data = await asset(context, "/assets/catalog/upcoming.json");
    if (!data) return page;
    const lang = l === "en" ? "Hollywood" : LANG_NAMES[l] || "";
    const items = data.items.filter((f) => !lang || f.l === l);
    if (!items.length) return page;
    const h1 = `Upcoming ${lang ? `${lang} ` : ""}movies`;
    const url = `${SITE}/upcoming${lang ? `?l=${l}` : ""}`;
    const date = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
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
