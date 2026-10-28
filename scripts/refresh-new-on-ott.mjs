// Refreshes the "New on OTT this week" strip (NEW_ON_OTT in assets/data.js) from JustWatch India.
// Run daily by .github/workflows/refresh-new-on-ott.yml. Plain Node 20, no dependencies.
//
// Each run reads today's new arrivals, keeps the notable films on the big Indian apps, adds them to the
// list with a direct link to the film on that app, drops anything older than 7 days, and rewrites the
// NEW_ON_OTT block. If nothing changed it leaves the files alone, so no commit and no deploy.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const DATA = new URL("assets/data.js", ROOT);
const UA = "Mozilla/5.0 (compatible; MasalaMischiefBot/1.0; +https://masalamischief.in)";
const KEEP_DAYS = 7;
const MAX_ITEMS = 14;
const MAX_LOOKUPS = 30;

// JustWatch provider name → our name, and the host the direct link must be on.
export const APPS = {
  "Netflix": ["Netflix", "netflix.com"],
  "Amazon Prime Video": ["Prime Video", "primevideo.com"],
  "JioHotstar": ["JioHotstar", "hotstar.com"],
  "Zee5": ["ZEE5", "zee5.com"],
  "Sony Liv": ["SonyLIV", "sonyliv.com"],
  "Sun Nxt": ["Sun NXT", "sunnxt.com"],
  "aha": ["aha", "aha.video"],
  "ManoramaMax": ["ManoramaMAX", "manoramamax.com"],
};
const ENGLISH_COUNTRIES = ["United States", "United Kingdom", "Canada", "Australia", "Ireland", "New Zealand"];

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const text = (html) => decode(html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

// The "new" page: [{ added, app, title, path }] for our apps.
export function parseNewPage(html) {
  const out = [];
  const frames = [...html.matchAll(/timeline__timeframe--(\d{4}-\d{2}-\d{2}) timeline__timeframe"/g)];
  frames.forEach((f, i) => {
    const seg = html.slice(f.index, frames[i + 1] ? frames[i + 1].index : html.length);
    for (const block of seg.split("timeline__provider-block").slice(1)) {
      const prov = (block.match(/provider-icon"[^>]*?alt="([^"]+)"/) || [])[1];
      const app = APPS[decode(prov || "")];
      if (!app) continue;
      for (const m of block.matchAll(/href="(\/in\/movie\/[^"]+)"[\s\S]*?picture-comp__img"[^>]*?alt="([^"]*)"/g)) {
        out.push({ added: f[1], app: app[0], path: m[1], title: decode(m[2]) });
      }
    }
  });
  return out;
}

// A title page: details plus the direct link on `app` (our name), or null if there's no such link.
export function parseTitlePage(html, app) {
  const host = Object.values(APPS).find(([name]) => name === app)[1];
  const h1 = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "").trim();
  const [, title, year] = h1.match(/^(.*?)\s*\((\d{4})\)$/) || [, h1, ""];
  const imdb = (html.match(/imdb-score"[^>]*>\s*([\d.]+)\s*\(([\d.]+)([km]?)\)/i) || []);
  const votes = imdb[2] ? Math.round(parseFloat(imdb[2]) * (imdb[3] === "m" ? 1e6 : imdb[3] === "k" ? 1e3 : 1)) : 0;
  const t = text(html);
  const genres = ((t.match(/ Genres (.+?) Runtime /) || [])[1] || "").split(",").map((g) => g.trim()).filter(Boolean);
  const age = (t.match(/ Age rating (UA\d*\+?|U|A|S) /) || [])[1] || ""; // Indian certificates
  const country = ((t.match(/ Production country (.+?) (?:Where does|Cast|Director|Videos|Streaming|Similar|Watch)/) || [])[1] || "").trim();
  const director = ((t.match(/ Director (.+?) Rating /) || [])[1] || "").trim();
  // Offer links go through JustWatch's redirector; the real app URL is its r= parameter ("&" is "&amp;" in HTML).
  const links = [...html.matchAll(/[?&;]r=(https%3A%2F%2F[^&"]+)/g)].map((m) => decodeURIComponent(m[1]));
  let url = links.find((u) => {
    const x = new URL(u);
    return x.hostname.endsWith(host) && !/offers|homepage/.test(x.pathname) && x.pathname.length > 1;
  });
  if (!url) return null;
  url = url.replace("://app.primevideo.com/", "://www.primevideo.com/");
  return { title: title.trim(), year: +year || null, votes, score: imdb[1] ? +imdb[1] : null, genres, age, country, director, url };
}

// Notable enough for the strip? Indian and kids' films get a lower bar, since they get fewer IMDb votes.
export function isNotable(d) {
  const indian = /India/.test(d.country);
  const kids = d.genres.some((g) => /Kids|Animation/.test(g));
  if (d.genres.some((g) => /Documentary|Reality/.test(g)) && d.votes < 20000) return false;
  if (/^A$/.test(d.age) && d.votes < 20000) return false;
  return d.votes >= (indian || kids ? 1000 : 10000);
}

export function toItem(n, d) {
  const indian = /India/.test(d.country);
  const english = ENGLISH_COUNTRIES.some((c) => d.country.includes(c));
  const kids = d.genres.some((g) => /Kids/.test(g)) && !/^A$|18|16/.test(d.age);
  const note = [d.director && `Directed by ${d.director.split(",")[0]}`, d.score && `IMDb ${d.score}`].filter(Boolean).join(" · ");
  return {
    title: d.title || n.title,
    year: d.year,
    ...(english && !indian ? { lang: "English" } : {}),
    app: n.app,
    added: n.added,
    url: d.url,
    ...(note ? { note } : {}),
    ...(kids ? { kids: true } : {}),
  };
}

export function renderBlock(checked, items) {
  const line = (it) => "    " + JSON.stringify(it).replace(/"(\w+)":/g, "$1: ").replace(/,(\w+: )/g, ", $1").replace(/^\{/, "{ ").replace(/\}$/, " }") + ",";
  return `const NEW_ON_OTT = {\n  checked: "${checked}",\n  items: [\n${items.map(line).join("\n")}\n  ],\n};`;
}

const BLOCK_RE = /const NEW_ON_OTT = \{[\s\S]*?\n\};/;

function currentItems(src) {
  const block = src.match(BLOCK_RE)[0];
  return new Function(`${block}; return NEW_ON_OTT;`)().items;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en-IN,en;q=0.9" } });
    if (res.status === 429) { await sleep(5000); continue; }
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return res.text();
  }
  throw new Error(`rate-limited: ${url}`);
}

async function main() {
  const src = readFileSync(DATA, "utf8");
  const existing = currentItems(src);
  const known = new Set(existing.map((i) => i.url));

  const arrivals = parseNewPage(await get("https://www.justwatch.com/in/new?content_type=movie"));
  if (!arrivals.length) throw new Error("No arrivals parsed. Has the JustWatch page layout changed?");
  console.log(`${arrivals.length} arrivals on our apps`);

  const fresh = [];
  const seen = new Set();
  for (const n of arrivals.slice(0, MAX_LOOKUPS)) {
    if (seen.has(n.path + n.app)) continue;
    seen.add(n.path + n.app);
    await sleep(1500);
    let d;
    try { d = parseTitlePage(await get("https://www.justwatch.com" + n.path), n.app); } catch (e) { console.log(`skip ${n.title}: ${e.message}`); continue; }
    if (!d) { console.log(`skip ${n.title}: no direct ${n.app} link`); continue; }
    if (!isNotable(d)) { console.log(`skip ${n.title}: not notable (${d.votes} votes, ${d.country || "?"})`); continue; }
    if (known.has(d.url)) continue;
    known.add(d.url);
    fresh.push(toItem(n, d));
    console.log(`add  ${d.title} (${d.year}) on ${n.app}`);
  }

  // Newest first; keep the last 7 days, but never shrink below 6 items just because it was a quiet week.
  const all = [...fresh, ...existing].sort((a, b) => b.added.localeCompare(a.added));
  const newest = all[0].added;
  const cutoff = new Date(new Date(newest + "T00:00:00Z") - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  let items = all.filter((i) => i.added > cutoff);
  if (items.length < 6) items = all.slice(0, 6);
  items = items.slice(0, MAX_ITEMS);

  const block = renderBlock(newest, items);
  const next = src.replace(BLOCK_RE, block);
  if (next === src) { console.log("No change."); return; }

  // Bump the asset version everywhere so browsers fetch the new data.js.
  const files = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const v = Math.max(...files.map((f) => +(readFileSync(new URL(f, ROOT), "utf8").match(/\?v=(\d+)/) || [, 0])[1]));
  for (const f of files) {
    const p = new URL(f, ROOT);
    writeFileSync(p, readFileSync(p, "utf8").replace(/\?v=\d+/g, `?v=${v + 1}`));
  }
  const readme = new URL("README.md", ROOT);
  writeFileSync(readme, readFileSync(readme, "utf8")
    .replace(/bump the `\?v=\d+` number/, `bump the \`?v=${v + 1}\` number`)
    .replace(/\(e\.g\. to `\?v=\d+`\)/, `(e.g. to \`?v=${v + 2}\`)`));
  writeFileSync(DATA, next);
  console.log(`Updated: ${fresh.length} new, ${items.length} in the strip, assets v=${v + 1}.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
