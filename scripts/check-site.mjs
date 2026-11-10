// A safety check for the site's own code, run before publishing (and by .github/workflows/site-check.yml on every push):
//   1. every script parses (assets, functions, lib, scripts, sw.js, and the scripts written inside the HTML pages);
//   2. every page's scripts are started once in a pretend browser, to catch a name that doesn't exist or a line that
//      breaks as the page loads (the kind of mistake that leaves a page half-working).
// It can't see what a page looks like or whether a button does the right thing; it only catches code that can't run.
// Plain Node 20+, no dependencies:  node scripts/check-site.mjs
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const problems = [];
const tmp = mkdtempSync(join(tmpdir(), "mm-check-"));

// ---- 1. Syntax
function walk(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, ROOT))) {
    const p = `${dir}${name}`;
    if (statSync(new URL(p, ROOT)).isDirectory()) { if (name !== "catalog" && name !== "node_modules" && !name.startsWith(".")) out.push(...walk(`${p}/`)); }
    else if ([".js", ".mjs"].includes(extname(name))) out.push(p);
  }
  return out;
}
function parses(code, label, module) {
  const file = join(tmp, `${label.replace(/[^a-z0-9]+/gi, "_")}${module ? ".mjs" : ".cjs"}`);
  writeFileSync(file, code);
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe", env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } }); }
  catch (e) { problems.push(`${label}: doesn't parse\n    ${String(e.stderr || e.message).split("\n").filter((l) => /Error|\^/.test(l)).slice(0, 3).join("\n    ")}`); }
}
const files = [...walk("assets/"), ...walk("functions/"), ...walk("lib/"), ...walk("scripts/"), "sw.js"];
for (const f of files) {
  const code = read(f);
  parses(code, f, f.endsWith(".mjs") || /^\s*(import|export)\s/m.test(code));
}
const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const scriptsOf = (html) => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .map(([, attrs, body]) => ({ src: (attrs.match(/\bsrc="([^"]+)"/) || [])[1] || "", type: (attrs.match(/\btype="([^"]+)"/) || [])[1] || "", body }))
  .filter((s) => !/json/.test(s.type));
for (const page of pages) scriptsOf(read(page)).forEach((s, i) => { if (!s.src && s.body.trim()) parses(s.body, `${page} (script ${i + 1})`, s.type === "module"); });

// ---- 2. Start each page once in a pretend browser
// Anything asked of the pretend browser answers with another pretend thing, so only the site's own mistakes surface.
function pretend(own = {}) {
  const plain = make(false);
  function make(thenable) {
    const p = new Proxy(function () {}, {
      get(_, k) {
        if (k in own) return own[k];
        if (k === Symbol.toPrimitive) return () => "";
        if (k === Symbol.iterator) return function* () {};
        if (k === Symbol.asyncIterator) return async function* () {};
        if (k === "then") return thenable ? (ok) => { if (typeof ok === "function") ok(plain); return p; } : undefined;
        if (k === "length") return 0;
        if (k === "toString" || k === "valueOf" || k === "toJSON") return () => "";
        return make(true);
      },
      apply: () => make(true), construct: () => make(true), set: () => true, has: () => true, deleteProperty: () => true,
    });
    return p;
  }
  return make(false);
}
async function start(page) {
  const html = read(page);
  const name = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || "";
  const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  const el = () => pretend({ dataset: {}, hidden: false, value: "", textContent: "", innerHTML: "", checked: false, options: [], style: {}, classList: pretend(), children: [] });
  const document = pretend({
    body: pretend({ dataset: { page: name }, classList: pretend(), insertAdjacentHTML() {}, append() {} }),
    getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], createElement: () => el(),
    addEventListener() {}, title: "", hidden: false, fonts: pretend({ load: () => Promise.resolve() }), head: el(), documentElement: el(),
  });
  const location = { href: `https://masalamischief.in/${page.replace(/\.html$/, "")}`, origin: "https://masalamischief.in", protocol: "https:", pathname: `/${page.replace(/\.html$/, "")}`, search: "", hash: "", reload() {}, replace() {} };
  const sandbox = {
    document, location, console: { log() {}, warn() {}, error() {}, info() {} },
    navigator: pretend({ userAgent: "check", serviceWorker: pretend(), clipboard: pretend(), share: undefined, canShare: undefined, standalone: false }),
    localStorage: store(), sessionStorage: store(), history: pretend(),
    fetch: () => Promise.resolve(pretend({ ok: false, status: 0, json: () => Promise.resolve({}), text: () => Promise.resolve("") })),
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
    addEventListener() {}, removeEventListener() {}, alert() {}, confirm: () => false, prompt: () => null, open() {},
    URL, URLSearchParams, TextEncoder, TextDecoder, Blob: globalThis.Blob, File: globalThis.File, crypto: globalThis.crypto,
    Image: function () { return el(); }, IntersectionObserver: function () { return pretend(); }, Notification: pretend({ permission: "default" }),
    caches: pretend(), indexedDB: pretend(), screen: {}, innerWidth: 1200, innerHeight: 800, scrollTo() {}, getComputedStyle: () => pretend(),
    atob: globalThis.atob, btoa: globalThis.btoa, structuredClone: globalThis.structuredClone, queueMicrotask, Event: function () {}, CustomEvent: function () {},
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  const late = [];
  const onLate = (e) => late.push(e);
  process.on("unhandledRejection", onLate);
  for (const [i, s] of scriptsOf(html).entries()) {
    if (s.type === "module") continue;
    let code = s.body, label = `${page} (script ${i + 1})`;
    if (s.src) {
      if (/^https?:|^\/\//.test(s.src)) continue; // other sites' scripts (Turnstile, analytics)
      label = s.src.replace(/\?.*$/, "");
      try { code = read(label.replace(/^\//, "")); } catch { problems.push(`${page}: loads ${label}, which doesn't exist`); continue; }
    }
    try { vm.runInContext(code, context, { filename: label }); }
    catch (e) { problems.push(`${page}: ${label} breaks as the page loads\n    ${e && e.name}: ${e && e.message}${e && e.stack ? `\n    ${String(e.stack).split("\n").find((l) => l.includes(label)) || ""}` : ""}`); }
  }
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); // let the page's own async work run a little
  process.off("unhandledRejection", onLate);
  // Later failures are only counted when they're a name that doesn't exist: with a pretend browser, other errors are often its fault.
  for (const e of late) if (e && e.name === "ReferenceError") problems.push(`${page}: ${e.message} (while the page was starting)`);
}
for (const page of pages) await start(page);

if (problems.length) {
  console.error(`Site check: ${problems.length} problem${problems.length === 1 ? "" : "s"}\n\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Site check passed: ${files.length} script files and ${pages.length} pages.`);
