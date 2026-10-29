// Cloudflare Pages Function for /best (all lists) and /best?l=<lang>[&app=<app>][&g=<genre>|&y=<year>][&k=tv]:
// puts the list's title and ranked titles into the HTML for search engines. See lib/lists.js.
import { SITE } from "../lib/seo.js";
import { asset, listPage, filmPath, bestTitle, LANG_NAMES } from "../lib/lists.js";

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const p = new URL(context.request.url).searchParams;
    const l = p.get("l") || "";
    const g = p.get("g") || "";
    const y = p.get("y") || "";
    const k = p.get("k") === "tv" ? "tv" : "movie";
    const crumbs = [["Home", `${SITE}/`], ["Best-of lists", `${SITE}/best`]];
    const index = await asset(context, "/assets/catalog/lists/index.json");
    if (!index) return page;

    if (!index.best[l]) {
      const items = Object.entries(index.best).flatMap(([code, b]) => b.kinds.map((kind) =>
        ({ name: bestTitle(code, "", "", kind), href: `/best?l=${code}${kind === "tv" ? "&k=tv" : ""}` })));
      return listPage(page, {
        rootId: "best",
        title: "Best movies and series lists: Hindi, Tamil, Telugu, Malayalam, Korean and more · Masala Mischief",
        h1: "Best movies & series",
        desc: "Ranked lists of the best movies and series in Hindi, Tamil, Telugu, Malayalam, Kannada, Korean, Hollywood and anime, by genre and year.",
        url: `${SITE}/best`,
        items,
        crumbs,
      });
    }
    // A per-app list (&app=netflix) is in its own file, best-<lang>-<app>.json.
    const app = (p.get("app") || "").match(/^[a-z0-9-]+$/)?.[0] || "";
    const appRow = app && (index.best[l].apps || []).find((r) => r[0] === app);
    if (app && !appRow) return page;
    const data = await asset(context, `/assets/catalog/lists/best-${l}${app ? `-${app}` : ""}.json`);
    const gInfo = g && data && data.genres[g];
    const list = !data ? null : y ? !app && data.years[y] : g ? gInfo && gInfo[k] : data.all[k];
    if (!list) return page;
    const h1 = bestTitle(l, gInfo ? gInfo.name : "", y, k, app ? data.name : "");
    const query = `l=${l}${app ? `&app=${app}` : ""}${g ? `&g=${g}` : ""}${y ? `&y=${y}` : ""}${k === "tv" && !y ? "&k=tv" : ""}`;
    const url = `${SITE}/best?${query}`;
    return listPage(page, {
      rootId: "best",
      title: `${h1}${y || app ? "" : " of all time"}${app ? " India" : ""} · top ${list.length} · Masala Mischief`,
      h1,
      desc: `${h1}${app ? " in India" : ""}, ranked: ${list.slice(0, 5).map((f) => `${f.t}${f.y ? ` (${f.y})` : ""}`).join(", ")} and more. With trailers, cast and where to stream them in India.`,
      url,
      intro: `Top ${list.length}, ranked by a weighted TMDB rating. ${LANG_NAMES[l]}${app ? `, streaming on ${data.name} in India` : ""}.`,
      items: list.map((f) => ({ name: f.t, href: filmPath(f), note: [f.y, `★ ${f.v}`].filter(Boolean).join(" · ") })),
      crumbs: [...crumbs, [h1, url]],
    });
  } catch (err) {
    return page;
  }
}
