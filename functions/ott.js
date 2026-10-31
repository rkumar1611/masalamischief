// Cloudflare Pages Function for /ott (all apps), /ott?app=<app> ("New on Netflix") and /ott?l=<lang>
// ("New Malayalam OTT releases"): puts the list's title and titles into the HTML for search engines and
// link previews. See lib/lists.js.
import { SITE } from "../lib/seo.js";
import { asset, listPage, filmPath, LANG_NAMES, ottInLanguage, listLangName } from "../lib/lists.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const params = new URL(context.request.url).searchParams;
    const app = params.get("app") || "";
    const lists = await asset(context, "/assets/catalog/lists/ott.json");
    if (!lists) return page;
    const crumbs = [["Home", `${SITE}/`], ["What's new on OTT", `${SITE}/ott`]];

    // One language across every app: how people search ("new malayalam ott releases this week").
    const code = params.get("l") || "";
    if (!app && LANG_NAMES[code]) {
      const items = ottInLanguage(lists, code);
      if (!items.length) return page;
      const lang = listLangName(code);
      const Lang = lang.charAt(0).toUpperCase() + lang.slice(1);
      const url = `${SITE}/ott?l=${code}`;
      const date = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
      return listPage(page, {
        rootId: "ott",
        title: `New ${Lang} OTT Releases This Week: Movies & Web Series · Masala Mischief`,
        h1: `New ${Lang} OTT releases`,
        desc: `Latest ${Lang} movies and web series on OTT in India: ${items.slice(0, 4).map((f) => `${f.t} (${(f.w || []).join(", ")})`).join(", ")} and more. Where to watch each one, updated daily.`,
        url,
        intro: `The newest ${Lang} movies and web series streaming in India, latest releases first, on Netflix, Prime Video, JioHotstar and every other app.`,
        items: items.map((f) => ({ name: f.t, href: filmPath(f), note: [f.k === "tv" ? "web series" : "movie", (f.w || []).join(", "), date(f.rd)].filter(Boolean).join(" · ") })),
        crumbs: [...crumbs, [`New ${Lang} OTT releases`, url]],
      });
    }

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
