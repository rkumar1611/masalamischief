// Cloudflare Pages Function for /ott-tracker and /ott-tracker?l=<lang> (ta, te, ml, kn, hi): per language, the films in
// cinemas now with when each reaches OTT, the confirmed OTT dates, and what just landed. The words go into the HTML
// for search engines and link previews; assets/app.js initTracker() draws the page itself (keep the two alike).
import "../assets/data.js";
import { SITE, ottDue, ottDueText } from "../lib/seo.js";
import { asset, listPage, LANG_NAMES } from "../lib/lists.js";

const TRACKED = ["ta", "te", "ml", "kn", "hi"]; // the languages with a tracker

const CODES = Object.fromEntries(Object.entries(LANG_NAMES).map(([c, n]) => [n, c]));

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const l = new URL(context.request.url).searchParams.get("l") || "";
    const today = new Date().toISOString().slice(0, 10);
    const date = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
    const crumbs = [["Home", `${SITE}/`], ["OTT release date tracker", `${SITE}/ott-tracker`]];

    if (!TRACKED.includes(l)) {
      return listPage(page, {
        rootId: "tracker",
        title: "OTT Release Date Tracker: Tamil, Telugu, Malayalam, Kannada & Hindi Movies · Masala Mischief",
        h1: "OTT release date tracker",
        desc: "Which new films are in cinemas, when each one reaches OTT, and which app it lands on. Tamil, Telugu, Malayalam, Kannada and Hindi, updated daily.",
        url: `${SITE}/ott-tracker`,
        intro: "Pick a language to see its films in cinemas, their OTT dates and what just arrived.",
        items: TRACKED.map((c) => ({ name: `${LANG_NAMES[c]} OTT release date tracker`, href: `/ott-tracker?l=${c}`, note: "" })),
        crumbs,
      });
    }
    const lang = LANG_NAMES[l];
    const up = (await asset(context, "/assets/catalog/upcoming.json")) || {};
    const href = (f) => (f.pg ? `/film?id=${f.l}-${f.id}` : `/upcoming?show=now&l=${l}`);

    const confirmed = (up.soon || []).filter((f) => f.l === l)
      .map((f) => ({ name: f.t, href: href({ ...f, pg: 1 }), note: `On OTT ${date(f.d)}${f.a ? ` on ${f.a}` : ""}` }));
    const have = new Set(confirmed.map((f) => f.href));
    const cinema = (up.now || []).filter((f) => f.l === l).map((f) => {
      const film = { l, rd: f.d, od: f.od, oa: f.oa };
      const due = ottDue(film, today);
      return { name: f.t, href: href(f), note: `In cinemas since ${date(f.d)} · ${due ? ottDueText(film, due, today) : "No OTT date yet."}` };
    }).filter((f) => !have.has(f.href));
    const landed = globalThis.MM_DATA.NEW_ON_OTT.items.filter((n) => CODES[n.lang] === l)
      .map((n) => ({ name: n.title, href: `/ott-this-week?l=${l}`, note: `New on ${n.app} ${date(n.added)}` }));

    const items = [...confirmed, ...cinema, ...landed];
    if (!items.length) return page;
    const h1 = `${lang} OTT release date tracker`;
    const url = `${SITE}/ott-tracker?l=${l}`;
    const first = confirmed[0];
    const intro = `${first ? `Next confirmed ${lang} OTT release: ${first.name}, ${first.note.replace(/^On OTT /, "")}. ` : ""}${cinema.length ? `${cinema.length} ${lang} films are in cinemas now.` : ""} Dates are the announced ones where known, otherwise our estimate. Updated daily.`.trim();
    return listPage(page, {
      rootId: "tracker",
      title: `${lang} OTT Release Dates: Movies in Cinemas & When They Come to OTT (${date(today)}) · Masala Mischief`,
      h1,
      desc: `${lang} movies in cinemas and their OTT release dates: ${[...confirmed, ...cinema].slice(0, 4).map((f) => f.name).join(", ")} and more. Which app, which date, updated daily.`,
      url,
      intro,
      items,
      crumbs: [...crumbs, [h1, url]],
    });
  } catch (err) {
    return page;
  }
}
