// Cloudflare Pages Function for /ott (all apps) and /ott?app=<app> ("New on Netflix"): puts the list's
// title and titles into the HTML for search engines and link previews. See lib/lists.js.
import { SITE } from "../lib/seo.js";
import { asset, listPage, filmPath, LANG_NAMES } from "../lib/lists.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const app = new URL(context.request.url).searchParams.get("app") || "";
    const lists = await asset(context, "/assets/catalog/lists/ott.json");
    if (!lists) return page;
    const crumbs = [["Home", `${SITE}/`], ["What's new on OTT", `${SITE}/ott`]];
    const L = lists[app];
    if (!L) {
      const apps = Object.entries(lists);
      return listPage(page, {
        rootId: "ott",
        title: "What's new on OTT in India: Netflix, Prime Video, JioHotstar and more · Masala Mischief",
        h1: "What's new on OTT in India",
        desc: `The newest movies and series on ${apps.map(([, a]) => a.name).join(", ")} in India, latest releases first.`,
        url: `${SITE}/ott`,
        items: apps.map(([s, a]) => ({ name: `New on ${a.name}`, href: `/ott?app=${s}`, note: `${a.count} titles` })),
        crumbs,
      });
    }
    const url = `${SITE}/ott?app=${app}`;
    const top = L.items.slice(0, 5).map((f) => f.t);
    return listPage(page, {
      rootId: "ott",
      title: `New on ${L.name} India: latest movies & series · Masala Mischief`,
      h1: `New on ${L.name}`,
      desc: `Latest movies and series on ${L.name} India: ${top.join(", ")} and more. ${L.count} titles on ${L.name}, with trailers, ratings and cast.`,
      url,
      intro: `The newest movies and series you can stream on ${L.name} in India, latest releases first.`,
      items: L.items.map((f) => ({ name: f.t, href: filmPath(f), note: [LANG_NAMES[f.l], f.k === "tv" ? "series" : "", f.y].filter(Boolean).join(" · ") })),
      crumbs: [...crumbs, [`New on ${L.name}`, url]],
    });
  } catch (err) {
    return page;
  }
}
