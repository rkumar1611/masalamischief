// Cloudflare Pages Function for /ott-this-week and /ott-this-week?l=<lang>: puts this week's new OTT
// arrivals (NEW_ON_OTT in assets/data.js, refreshed daily) and the films coming to OTT soon
// (upcoming.json) into the HTML for search engines. assets/app.js initWeek() draws the page itself.
import "../assets/data.js";
import { SITE, ottDue, ottDueText } from "../lib/seo.js";
import { asset, listPage, LANG_NAMES } from "../lib/lists.js";

const CODES = Object.fromEntries(Object.entries(LANG_NAMES).map(([c, n]) => [n, c]));
// Same normalising as the search index (scripts/build-catalog.mjs).
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.'’]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["the", "a", "an", "of", "and"]);

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const l = new URL(context.request.url).searchParams.get("l") || "";
    const lang = l === "en" ? "Hollywood" : LANG_NAMES[l] || "";
    const today = new Date().toISOString().slice(0, 10);
    const date = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

    // New this week, with each film's page where the catalogue has it (search index: [lang, id, title, year, series?, …]).
    const { NEW_ON_OTT } = globalThis.MM_DATA;
    const fresh = await Promise.all(NEW_ON_OTT.items.map(async (n) => {
      const t = norm(n.title);
      const word = t.split(" ").find((w) => w.length >= 2 && !STOP.has(w));
      const rows = word ? await asset(context, `/assets/catalog/s/${word.slice(0, 2)}.json`) : null;
      const code = CODES[n.lang] || "";
      const m = (rows || []).filter((r) => !r[4] && norm(r[2]) === t && (!n.year || !r[3] || Math.abs(r[3] - n.year) <= 1))
        .sort((a, b) => (b[0] === code) - (a[0] === code) || b[6] - a[6])[0];
      return { ...n, l: code || (m && m[0]) || "", href: m ? `/film?id=${m[0]}-${m[1]}` : "" };
    }));
    const url = `${SITE}/ott-this-week${lang ? `?l=${l}` : ""}`;
    const newItems = fresh.filter((n) => !lang || n.l === l).map((n) => ({
      name: n.title, href: n.href || `/ott-this-week${lang ? `?l=${l}` : ""}`,
      note: [`New on ${n.app} ${date(n.added)}`, n.year, LANG_NAMES[n.l]].filter(Boolean).join(" · "),
    }));

    const up = (await asset(context, "/assets/catalog/upcoming.json")) || {};
    const soon = [
      ...(up.soon || []).map((f) => ({ name: f.t, l: f.l, href: `/film?id=${f.l}-${f.id}`, note: `On OTT ${date(f.d)}${f.a ? ` on ${f.a}` : ""}` })),
      ...(up.now || []).map((f) => {
        const film = { l: f.l, rd: f.d, od: f.od, oa: f.oa };
        const due = ottDue(film, today);
        // As the page: estimates in the next 6 weeks, not ones 2+ weeks overdue.
        const days = due ? (Date.parse(due.date) - Date.parse(today)) / 864e5 : 0;
        return due && (due.sure || (days <= 42 && days >= -14)) && { name: f.t, l: f.l, href: f.pg ? `/film?id=${f.l}-${f.id}` : "/upcoming?show=now", note: `In cinemas · ${ottDueText(film, due, today)}` };
      }).filter(Boolean),
    ].filter((f) => !lang || f.l === l);

    const items = [...newItems, ...soon.slice(0, 20)];
    if (!items.length) return page;
    const h1 = `${lang ? `${lang} ` : ""}OTT releases this week`;
    const names = newItems.slice(0, 4).map((n) => n.name).join(", ");
    return listPage(page, {
      rootId: "week",
      title: `${lang ? `${lang} ` : ""}OTT Releases This Week (${date(today)}): New Movies on Netflix, Prime Video & More · Masala Mischief`,
      h1,
      desc: `New ${lang ? `${lang} ` : ""}OTT releases this week in India${names ? `: ${names} and more` : ""}, with the app and a direct link. Plus the cinema films coming to OTT soon, with dates.`,
      url,
      intro: "What just arrived on Netflix, Prime Video, JioHotstar, ZEE5, SonyLIV and more in India, and the cinema films coming to OTT next. Updated daily.",
      items,
      crumbs: [["Home", `${SITE}/`], ["OTT releases this week", `${SITE}/ott-this-week`], ...(lang ? [[h1, url]] : [])],
    });
  } catch (err) {
    return page;
  }
}
