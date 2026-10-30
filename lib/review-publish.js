// Turns a review from /write into edits to assets/data.js (pure text in, text out), for
// functions/api/publish-review.js. Kept free of Cloudflare APIs so it can be tested in a browser.
//
// Writes, in the file's own style: the MOVIES entry (new ones go first), WATCH, WATCH_LINKS, IMAGES,
// PARENT_NOTES (optional) and FEATURED_ID (optional). An edit replaces the existing entries.

const APPS = ["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "Sun NXT", "aha", "ManoramaMAX",
  "MX Player", "Lionsgate Play", "Crunchyroll", "Apple TV", "Amazon", "YouTube", "Google Play"];
const LANGS = ["Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "English", "Marathi", "Bengali", "Punjabi", "Korean"];
const LEVELS = ["violence", "romance", "language", "scary"];

const str = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v, max, each) => (Array.isArray(v) ? v : []).map((x) => str(x, each)).filter(Boolean).slice(0, max);
const q = (s) => JSON.stringify(s); // a safe JS string literal
const arr = (a) => `[${a.map(q).join(", ")}]`; // ["a", "b"], as the file writes lists

// Checks and tidies what the form sent. Returns { review } or { error }.
export function checkReview(input, moodIds, existingIds) {
  const r = {};
  r.id = str(input.id, 60).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(r.id)) return { error: "The page name (id) can only use a–z, 0–9 and dashes." };
  r.edit = Boolean(input.edit);
  if (!r.edit && existingIds.includes(r.id)) return { error: `There's already a review called "${r.id}". Pick another page name, or edit that one.` };
  if (r.edit && !existingIds.includes(r.id)) return { error: `There's no review called "${r.id}" to edit.` };
  r.title = str(input.title, 120);
  if (!r.title) return { error: "The title is missing." };
  r.year = Math.round(+input.year);
  if (!(r.year >= 1900 && r.year <= 2100)) return { error: "The year doesn't look right." };
  r.lang = str(input.lang, 20);
  if (!LANGS.includes(r.lang)) return { error: "Pick the film's language." };
  r.audio = [...new Set([r.lang, ...list(input.audio, 10, 20).filter((l) => LANGS.includes(l))])];
  r.genres = list(input.genres, 6, 30);
  if (!r.genres.length) return { error: "Add at least one genre." };
  r.runtime = Math.round(+input.runtime) || 0;
  if (r.runtime < 0 || r.runtime > 400) return { error: "The runtime (in minutes) doesn't look right." };
  r.moods = list(input.moods, 4, 30).filter((m) => moodIds.includes(m));
  if (!r.moods.length) return { error: "Pick at least one mood." };
  r.masala = Math.round(+input.masala);
  if (!(r.masala >= 1 && r.masala <= 5)) return { error: "Give it 1 to 5 chillies." };
  r.quality = Math.round(+input.quality * 2) / 2;
  if (!(r.quality >= 0 && r.quality <= 10)) return { error: "The quality score is out of 10." };
  r.tagline = str(input.tagline, 200);
  if (!r.tagline) return { error: "Add a one-line tagline." };
  r.review = (Array.isArray(input.review) ? input.review : []).map((p) => str(p, 2500)).filter(Boolean).slice(0, 8);
  if (!r.review.length) return { error: "The review text is missing." };
  r.hits = list(input.hits, 8, 140);
  r.misses = list(input.misses, 8, 140);
  if (!r.hits.length || !r.misses.length) return { error: "Add at least one hit and one miss." };
  r.reviewed = /^\d{4}-\d{2}-\d{2}$/.test(input.reviewed || "") ? input.reviewed : new Date().toISOString().slice(0, 10);
  r.stream = [...new Set(list(input.stream, 12, 30).filter((a) => APPS.includes(a)))];
  r.rent = [...new Set(list(input.rent, 12, 30).filter((a) => APPS.includes(a) && !r.stream.includes(a)))];
  r.links = {};
  for (const [app, url] of Object.entries(input.links || {})) {
    if (!APPS.includes(app) || !(r.stream.includes(app) || r.rent.includes(app))) continue;
    try { const u = new URL(url); if (u.protocol === "https:") r.links[app] = u.href.slice(0, 400); } catch { /* skip */ }
  }
  r.tmdb = Math.round(+input.tmdb) || 0;
  r.poster = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png)$/.test(input.poster || "") ? input.poster : "";
  r.backdrop = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png)$/.test(input.backdrop || "") ? input.backdrop : "";
  r.imdb = /^tt\d{5,10}$/.test(input.imdb || "") ? input.imdb : "";
  if (input.parent) {
    const p = { age: Math.round(+input.parent.age) };
    if (!(p.age >= 0 && p.age <= 18)) return { error: "The parent notes age should be 0 to 18." };
    for (const k of LEVELS) p[k] = Math.min(3, Math.max(0, Math.round(+input.parent[k]) || 0));
    p.note = str(input.parent.note, 400);
    if (!p.note) return { error: "Add a line for the parent notes, or switch them off." };
    r.parent = p;
  }
  r.featured = Boolean(input.featured);
  return { review: r };
}

// The pieces of data.js for one review, in the file's own formatting.
function movieBlock(r) {
  return [
    "  {",
    `    id: ${q(r.id)}, title: ${q(r.title)}, year: ${r.year}, lang: ${q(r.lang)}, audio: ${arr(r.audio)},`,
    `    genres: ${arr(r.genres)}, runtime: ${r.runtime},`,
    `    moods: ${arr(r.moods)}, masala: ${r.masala}, quality: ${r.quality},`,
    `    tagline: ${q(r.tagline)},`,
    "    review: [",
    r.review.map((p) => `      ${q(p)}`).join(",\n"),
    "    ],",
    `    hits: ${arr(r.hits)},`,
    `    misses: ${arr(r.misses)},`,
    `    reviewed: ${q(r.reviewed)},`,
    "  },",
  ].join("\n");
}
const watchLine = (r) => `  ${q(r.id)}: { stream: ${arr(r.stream)}, rent: ${arr(r.rent)} },`;
const linksBlock = (r) => Object.keys(r.links).length
  ? `  ${q(r.id)}: {\n${Object.entries(r.links).map(([a, u]) => `    ${q(a)}: ${q(u)},`).join("\n")}\n  },` : "";
const imagesLine = (r) => r.tmdb
  ? `  ${q(r.id)}: { tmdb: ${r.tmdb}, poster: ${q(r.poster)}, backdrop: ${q(r.backdrop)}, match: ${q(`${r.title} (${r.year})`)}${r.imdb ? `, imdb: ${q(r.imdb)}` : ""} },` : "";
const notesBlock = (r) => r.parent
  ? `  ${q(r.id)}: { age: ${r.parent.age}, ${LEVELS.map((k) => `${k}: ${r.parent[k]}`).join(", ")},\n    note: ${q(r.parent.note)} },` : "";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Replaces this review's entry inside one `const NAME = { … };` (or `[ … ];`) block, or adds it at the
// top of the block. `entry` = "" removes it. Throws if the block isn't there, so nothing half-written
// is ever saved.
function upsert(text, name, id, entry, entryPattern) {
  const open = text.indexOf(`const ${name} = `);
  if (open < 0) throw new Error(`Couldn't find ${name} in data.js.`);
  const bodyStart = text.indexOf("\n", open) + 1;
  const close = text.indexOf(name === "MOVIES" ? "\n];" : "\n};", open);
  if (close < 0) throw new Error(`Couldn't find the end of ${name} in data.js.`);
  let body = text.slice(bodyStart, close + 1);
  const re = entryPattern(esc(id));
  if (re.test(body)) body = body.replace(re, entry ? `${entry}\n` : "");
  else if (entry) body = `${entry}\n${body}`;
  return text.slice(0, bodyStart) + body + text.slice(close + 1);
}

// data.js text → data.js text with this review in it.
export function applyReview(text, r) {
  let out = text.replace(/\r\n/g, "\n"); // Windows line endings (a local copy) read the same
  out = upsert(out, "MOVIES", r.id, movieBlock(r), (id) => new RegExp(`  \\{\\n    id: "${id}",[\\s\\S]*?\\n  \\},\\n`));
  out = upsert(out, "WATCH", r.id, watchLine(r), (id) => new RegExp(`  "${id}": \\{ stream:.*\\n`));
  out = upsert(out, "WATCH_LINKS", r.id, linksBlock(r), (id) => new RegExp(`  "${id}": \\{\\n(    .*\\n)*?  \\},\\n`));
  out = upsert(out, "IMAGES", r.id, imagesLine(r), (id) => new RegExp(`  "${id}": \\{ tmdb:.*\\n`));
  out = upsert(out, "PARENT_NOTES", r.id, notesBlock(r), (id) => new RegExp(`  "${id}": \\{ age:.*\\n    note:.*\\n`));
  if (r.featured) out = out.replace(/const FEATURED_ID = "[^"]*";/, `const FEATURED_ID = ${q(r.id)};`);
  return out;
}

// Every page's ?v=N goes up by one (and the README note), as scripts/bump-version.mjs does, so
// phones fetch the new data.js. files: { path: text } → { path: new text }.
export function bumpVersions(files) {
  const htmls = Object.keys(files).filter((p) => p.endsWith(".html"));
  const v = Math.max(...htmls.map((p) => +(files[p].match(/\?v=(\d+)/) || [, 0])[1]));
  const out = {};
  for (const p of htmls) out[p] = files[p].replace(/\?v=\d+/g, `?v=${v + 1}`);
  if (files["README.md"]) {
    out["README.md"] = files["README.md"]
      .replace(/bump the `\?v=\d+` number/, `bump the \`?v=${v + 1}\` number`)
      .replace(/\(e\.g\. to `\?v=\d+`\)/, `(e.g. to \`?v=${v + 2}\`)`);
  }
  return out;
}
