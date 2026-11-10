// Cloudflare Pages Function for /person?id=<TMDB person id>, the actor and director pages. Like
// functions/film.js, it puts the person's name, photo and list of titles into the HTML before it's sent,
// so link previews and search show the right person (the page itself is drawn by app.js). Data comes
// from the catalogue's people index (assets/catalog/p/<id % shards>.json; see manifest.json).
// If anything goes wrong, the plain page is served as before.
import "../assets/data.js";
import { SITE, esc, tmdbImg, ldScript, breadcrumbs } from "../lib/seo.js";

const PEOPLE_SHARDS = 64; // the older layout's people/<id % 64>.json
const LANGS = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi",
  en: "Hollywood", ko: "Korean", ja: "Anime",
};

export async function onRequestGet(context) {
  const page = await context.next();
  try {
    const pid = (new URL(context.request.url).searchParams.get("id") || "").match(/^\d{1,9}$/)?.[0];
    if (!pid) return page;
    const asset = (path) => context.env.ASSETS.fetch(new URL(path, context.request.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    // Layout 2: p/<id % shards>.json, each person with their titles; older builds: people/<id % 64>.json with keys only.
    const man = (await asset("/assets/catalog/manifest.json")) || {};
    const v2 = man.layout >= 2;
    const [shard, reviewed, bios] = await Promise.all([
      asset(v2 ? `/assets/catalog/p/${pid % man.shards.p}.json` : `/assets/catalog/people/${pid % PEOPLE_SHARDS}.json`),
      asset("/assets/catalog/reviewed.json"),
      asset(`/assets/catalog/pb/${pid % 256}.json`), // [bio, born, birthplace, died, job], as app.js PERSON_BIO_SHARDS
    ]);
    const [bio, born, birthplace, died, job] = (bios && bios[pid]) || [];
    const { MOVIES, IMAGES } = globalThis.MM_DATA;

    // Our reviewed films with this person.
    const ours = Object.entries(reviewed || {}).flatMap(([id, x]) => {
      const m = MOVIES.find((mv) => mv.id === id);
      const c = [...(x.cast || []), ...(x.dir || [])].find((p) => String(p[0]) === pid);
      return m && c ? [{ name: c[1], t: m.title, y: m.year, href: `/review?id=${encodeURIComponent(m.id)}`, tmdb: IMAGES[m.id] && IMAGES[m.id].tmdb }] : [];
    });
    const p = shard && shard[pid];
    if (!p && !ours.length) return page;
    const name = p ? p[0] : ours[0].name;

    // Their catalogue titles: in the person's entry (layout 2), or looked up in each language's list.
    let found;
    if (v2) {
      found = (p ? p[2] : []).map(([l, id, t, y, tv]) => ({ l, id, t, y, ...(tv ? { k: "tv" } : {}) }));
    } else {
      const keys = p ? p[2] : [];
      const codes = [...new Set(keys.map((k) => k.split("-")[0]))].filter((c) => LANGS[c]);
      const lists = await Promise.all(codes.map((c) => asset(`/assets/catalog/list-${c}.json`)));
      const byKey = {};
      lists.forEach((l) => l && l.films.forEach((f) => { byKey[`${f.l}-${f.id}`] = f; }));
      found = keys.map((k) => byKey[k]).filter(Boolean);
    }
    const reviewedIds = new Set(ours.map((o) => o.tmdb));
    const titles = [
      ...ours,
      ...found.filter((f) => !reviewedIds.has(f.id))
        .map((f) => ({ t: f.t, y: f.y, tv: f.k === "tv", lang: LANGS[f.l], href: `/film?id=${f.l}-${f.id}` })),
    ].sort((a, b) => (b.y || 0) - (a.y || 0));
    if (!titles.length) return page;

    const url = `${SITE}/person?id=${pid}`;
    const photo = p && p[1];
    const top = titles.slice(0, 4).map((t) => `${t.t}${t.y ? ` (${t.y})` : ""}`);
    // Search wording: "<name> movies", "<name> series".
    const movies = titles.filter((t) => !t.tv), series = titles.filter((t) => t.tv);
    const title = `${name} Movies List${series.length ? " & Web Series" : ""}: ${titles.length} Titles, Where to Watch Online`;
    const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const role = job === "Directing" ? "director" : job === "Writing" ? "writer" : job === "Acting" ? "actor" : "";
    const facts = [born ? `Born ${fmtDay(born)}${birthplace ? ` in ${birthplace}` : ""}` : "", died ? `died ${fmtDay(died)}` : ""].filter(Boolean).join(", ");
    const firstLine = bio ? (bio.match(/^.*?[.!?](\s|$)/) || [bio])[0].trim() : "";
    const desc = `${name}${role ? `, ${role}` : ""}: ${titles.length} movies and web series, including ${top.join(", ")}. ${firstLine || facts ? `${firstLine || `${facts}.`} ` : ""}Where to stream them in India.`.slice(0, 300);

    // A plain-words introduction, so a page with only a few titles and no biography still says who this is and what's here
    // (app.js personIntro() writes the same for the page itself).
    const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0] || "");
    const years = titles.map((t) => +t.y).filter(Boolean);
    const span = years.length ? (Math.min(...years) === Math.max(...years) ? ` from ${years[0]}` : ` from ${Math.min(...years)} to ${Math.max(...years)}`) : "";
    const langNames = [...new Set(titles.map((t) => t.lang).filter(Boolean))].slice(0, 4);
    const verb = role === "director" ? "has directed" : role === "writer" ? "has written" : role === "actor" ? "appears in" : "is credited in";
    const what = [movies.length ? `${movies.length} movie${movies.length === 1 ? "" : "s"}` : "", series.length ? `${series.length} web series` : ""].filter(Boolean).join(" and ");
    const intro = `${name} ${verb} ${what} listed on Masala Mischief${langNames.length ? ` (${list(langNames)})` : ""}${span}, including ${list(top.slice(0, 3))}. Open any title to see which app it is streaming on in India, or where to book it if it is still in cinemas.`;

    const body = `
      <article class="ssr-review">
        <h1>${esc(name)}</h1>
        ${facts ? `<p>${esc(facts)}.</p>` : ""}
        ${bio ? `<p>${esc(bio)}</p>` : ""}
        <p>${esc(intro)}</p>
        <p>${titles.length} movies and series, newest first.</p>
        ${[[`${name} movies`, movies], [`${name} web series`, series]].filter(([, list]) => list.length).map(([h, list]) => `
        <h2>${esc(h)}</h2>
        <ul>${list.map((t) => `<li><a href="${t.href}">${esc(t.t)}</a>${t.y ? ` (${t.y})` : ""}${t.lang ? ` · ${esc(t.lang)}` : ""}</li>`).join("")}</ul>`).join("")}
      </article>`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Person", name, url, image: tmdbImg(photo, "w500"), sameAs: [`https://www.themoviedb.org/person/${pid}`],
          ...(born ? { birthDate: born } : {}), ...(birthplace ? { birthPlace: birthplace } : {}), ...(died ? { deathDate: died } : {}),
          ...(role ? { jobTitle: role } : {}), ...(bio ? { description: bio } : {}) },
        breadcrumbs([["Home", `${SITE}/`], ["Movies & series", `${SITE}/films`], [name, url]]),
      ],
    };

    const setContent = (value) => ({ element(el) { el.setAttribute("content", value); } });
    const rewriter = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(`${name} · movies and series`))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="og:url"]', setContent(url))
      .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", url); } })
      .on("head", { element(el) { el.append(ldScript(jsonLd), { html: true }); } })
      .on("#person", { element(el) { el.setInnerContent(body, { html: true }); } });
    if (photo) {
      // A portrait photo; the size tags are for the landscape default image, so drop them.
      rewriter
        .on('meta[property="og:image"]', setContent(`https://image.tmdb.org/t/p/w500${photo}`))
        .on('meta[property="og:image:width"]', { element(el) { el.remove(); } })
        .on('meta[property="og:image:height"]', { element(el) { el.remove(); } })
        .on('meta[name="twitter:card"]', setContent("summary"));
    }
    return rewriter.transform(page);
  } catch (err) {
    return page;
  }
}
