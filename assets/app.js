// Shared rendering for every page. Each HTML page sets <body data-page="...">.

const NAV = [
  { href: "index.html", label: "Home", page: "home" },
  { href: "reviews.html", label: "Our reviews", page: "reviews" },
  { href: "films.html", label: "Movies & series", page: "films" },
  { href: "suggest.html", label: "What should I watch?", page: "suggest" },
  { href: "family.html", label: "Family Picks", page: "family" },
  { href: "group.html", label: "Group Pick", page: "group" },
];

const GENRE_ICONS = {
  Action: "💥", Superhero: "🦸", Comedy: "😂", Drama: "🎭", Romance: "💞", Thriller: "🔪", "Dark comedy": "🃏",
  Horror: "👻", Mystery: "🔍", "Sci-fi": "🚀", Fantasy: "🐉", Period: "🏰", Sports: "🏏", Musical: "🎷",
  Animation: "🎨", Family: "🏠", Kids: "🧒", Adventure: "🧭", Folklore: "🔥", Anthology: "📚",
  "Road trip": "🚗", "Family drama": "🏠",
};
const LEVELS = ["None", "Mild", "Some", "Strong"];
const NOTE_KINDS = [["violence", "⚔️ Violence"], ["romance", "💋 Romance"], ["language", "🤬 Language"], ["scary", "👻 Scary"]];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const moodById = (id) => MOODS.find((m) => m.id === id);
const movieById = (id) => MOVIES.find((m) => m.id === id);
const fmtRuntime = (min) => `${Math.floor(min / 60)}h ${min % 60}m`;
const langLabel = (l) => LANG_LABELS[l] || l;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
// Catalogue titles (see catToMovie) carry their apps; reviewed films use WATCH.
const streamsOn = (m) => m.apps || (WATCH[m.id] && WATCH[m.id].stream) || [];
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Per-device storage for ratings, watchlist and theme. Works without it (private mode etc.).
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("mm:" + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("mm:" + key, JSON.stringify(value)); } catch {}
  },
};
// The watchlist holds our review ids ("rrr") and catalogue titles as "_<lang>-<id>" ("_hi-864692",
// "_en-tv1396", the same ids Group Pick uses). For catalogue titles, a small copy of the card details is
// kept in "watchlistInfo" so the list can be drawn without loading each title's file.
// Our WhatsApp Channel: new reviews and the week's picks (footer, home page, under every review).
const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbA1FqA5a248kESjLD0Z";
const watchlist = () => store.get("watchlist", []);
const inWatchlist = (id) => watchlist().includes(id);
const CAT_ID = /^_([a-z]{2})-((?:tv)?\d+)$/;
const isCatId = (id) => CAT_ID.test(id) && Boolean(CAT_LANGS[id.slice(1, 3)]);
const catSaveId = (f) => `_${f.l}-${f.id}`;
function toggleWatchlist(id, info) {
  const list = watchlist();
  const adding = !list.includes(id);
  store.set("watchlist", adding ? [...list, id] : list.filter((x) => x !== id));
  if (CAT_ID.test(id)) {
    const all = store.get("watchlistInfo", {});
    if (adding && info) all[id] = { t: info.t, l: info.l, id: info.id, ...(info.k ? { k: info.k } : {}), y: info.y, p: info.p, v: info.v, w: info.w || [] };
    else if (!adding) delete all[id];
    store.set("watchlistInfo", all);
  }
  return adding;
}
// Saved catalogue titles as card entries: the kept copy, or the title's file (a friend's list).
async function savedTitles(ids) {
  const info = store.get("watchlistInfo", {});
  const out = await Promise.all(ids.filter(isCatId).map(async (id) => {
    if (info[id]) return info[id];
    const [, l, raw] = id.match(CAT_ID);
    const f = await loadTitle(l, raw).catch(() => null);
    return f && { t: f.t, l: f.l, id: f.id, ...(f.k ? { k: f.k } : {}), y: f.y, p: f.p, v: f.v, w: f.w || [] };
  }));
  return out.filter(Boolean);
}

/* ---------- Theme ---------- */
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
applyTheme(store.get("theme", null));
function currentTheme() {
  return document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

/* ---------- Header / footer ---------- */
function renderChrome() {
  const page = document.body.dataset.page;
  // The logo (same drawing as assets/logo.svg), inline so its dark parts follow the theme (--logo-ink).
  const mark = `<svg class="logo-mark" viewBox="80 126 448 252" aria-hidden="true">
    <path d="M270 266 L524 202 L524 372 L270 298 Z" fill="#f8d27c"/>
    <text x="440" y="303" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="44" fill="#b3202f">MM</text>
    <circle cx="130" cy="182" r="48" class="ink"/>
    <g fill="#d7263d"><circle cx="130" cy="156" r="10"/><circle cx="107" cy="196" r="10"/><circle cx="153" cy="196" r="10"/></g>
    <circle cx="130" cy="182" r="8" fill="#fff3dc"/>
    <circle cx="217" cy="197" r="33" class="ink"/>
    <g fill="#f2a900"><circle cx="217" cy="180" r="7"/><circle cx="202" cy="207" r="7"/><circle cx="232" cy="207" r="7"/></g>
    <circle cx="217" cy="197" r="6" fill="#fff3dc"/>
    <rect x="98" y="238" width="147" height="88" rx="12" fill="#d7263d"/>
    <g fill="#8e1b2b"><rect x="117" y="256" width="66" height="8" rx="4"/><rect x="117" y="274" width="66" height="8" rx="4"/><rect x="117" y="292" width="66" height="8" rx="4"/></g>
    <rect x="242" y="262" width="29" height="38" rx="4" class="ink"/>
    <g class="ink-line" stroke-width="9" stroke-linecap="round"><path d="M133 324 L117 370"/><path d="M208 324 L226 370"/></g>
  </svg>`;
  const links = NAV.map((n) =>
    `<a href="${n.href}" class="${n.page === page ? "active" : ""}">${n.label}${n.soon ? '<span class="soon">soon</span>' : ""}</a>`
  ).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="site-header"><div class="wrap">
      <a class="logo" href="index.html">${mark}<span class="logo-words">Masala <span>Mischief</span></span></a>
      <button class="theme-btn search-btn" id="search-btn" type="button" aria-label="Search movies and series" aria-expanded="false">🔍</button>
      <button class="theme-btn" id="theme-btn" type="button" aria-label="Switch light or dark mode"></button>
      <button class="theme-btn menu-btn" id="menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="main-nav">☰</button>
      <nav class="nav" id="main-nav" aria-label="Main">${links}<button class="nav-install install-btn" type="button" hidden>📲 Install app</button></nav>
      <div class="site-search" id="site-search" hidden>
        <form id="site-search-form" role="search">
          <input type="search" id="site-q" placeholder="Search movies & series…" autocomplete="off" aria-label="Search movies and series">
        </form>
        <div class="site-results" id="site-results"></div>
      </div>
    </div></header>`);
  document.body.classList.add("has-chrome"); // the header now holds its own space (see style.css)
  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site-footer"><div class="wrap">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="logo" href="index.html">${mark}<span class="logo-words">Masala <span>Mischief</span></span></a>
          <p>Indian and Hollywood film reviews with extra chilli, and where to stream them in India.</p>
          <div class="how-rate">
            <span><b>🌶️ Masala Meter</b> how much fun, 1 to 5</span>
            <span><b>★ Score</b> how well it's made, out of 10</span>
          </div>
          <a class="btn small wa-btn" target="_blank" rel="noopener" href="${WHATSAPP_CHANNEL}">💬 Follow on WhatsApp</a>
          <a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Film reviews, what to watch tonight and where to stream it: https://masalamischief.in")}">Share Masala Mischief on WhatsApp</a>
          <button class="btn small install-btn" type="button" hidden>📲 Install the app</button>
          <button class="btn small alert-btn" type="button" hidden>🔔 Weekly OTT alerts</button>
          <p class="install-help small muted" id="install-help" hidden></p>
        </div>
        <nav class="footer-col" aria-label="Explore">
          <h4>Explore</h4>
          <a href="reviews.html">Our reviews</a><a href="films.html">Movies & series</a>
          <a href="films.html?view=top-movie">Top 50 movies</a><a href="films.html?view=top-tv">Top 50 series</a>
          <a href="films.html?view=top-anime">Anime</a>
          <a href="ott-this-week.html">OTT releases this week</a><a href="ott.html">New on OTT</a><a href="upcoming.html?show=now">In theatres</a><a href="upcoming.html">Upcoming movies</a><a href="best.html">Best-of lists</a>
        </nav>
        <nav class="footer-col" aria-label="Pick something">
          <h4>Pick something</h4>
          <a href="suggest.html">What should I watch?</a><a href="family.html">Family Picks</a>
          <a href="group.html">Group Pick</a><a href="reviews.html?saved=1">My watchlist</a>
        </nav>
        <nav class="footer-col" aria-label="About">
          <h4>About</h4>
          <a href="privacy.html">Privacy & community rules</a>
          <a href="privacy.html#rules">How audience reviews work</a>
        </nav>
      </div>
      <div class="footer-bottom">
        <p>📺 Where-to-watch info from <a href="https://www.justwatch.com/in" target="_blank" rel="noopener">JustWatch</a> and TMDB, updated <span data-watch-date>${fmtDate(WATCH_CHECKED)}</span>. Apps add and remove films often, so check the app before you subscribe.</p>
        <p class="credits"><a class="tmdb-badge" href="https://www.themoviedb.org/" target="_blank" rel="noopener" aria-label="TMDB">TMDB</a>
          Film details, images, cast and trailers from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Trailers play from YouTube.</p>
        <p>© ${new Date().getFullYear()} Masala Mischief · Made in India 🇮🇳</p>
      </div>
    </div></footer>`);

  const btn = document.getElementById("theme-btn");
  const paint = () => (btn.textContent = currentTheme() === "dark" ? "☀️" : "🌙");
  paint();
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next); store.set("theme", next); paint();
  });
  initSiteSearch();
  initTrailers();
  initMenu();
  initInstall();
  initAlerts();
  initUpdates();
}

// New version available: the installed app (or a tab left open) keeps running the version it loaded.
// When the site has a newer ?v= than this page was built with, show an Update bar that reloads it.
// Checked on start and whenever the app comes back to the screen, at most every 10 minutes.
function initUpdates() {
  const mine = +((document.querySelector('script[src*="app.js?v="]') || {}).src || "").replace(/.*\?v=/, "");
  if (!mine || location.protocol === "file:") return;
  let last = 0;
  const check = async () => {
    if (document.hidden || Date.now() - last < 10 * 60e3 || document.getElementById("update-bar")) return;
    last = Date.now();
    try {
      const html = await fetch(`/?update-check=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? r.text() : ""));
      const live = +((html.match(/app\.js\?v=(\d+)/) || [])[1] || 0);
      if (live > mine) showUpdate();
    } catch {}
  };
  const showUpdate = () => {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="update-bar" id="update-bar" role="status">
        <span>✨ A new version of Masala Mischief is ready.</span>
        <button class="btn small primary" type="button" id="update-now">Update</button>
        <button class="update-x" type="button" aria-label="Later">✕</button>
      </div>`);
    document.getElementById("update-now").addEventListener("click", async () => {
      const reg = "serviceWorker" in navigator && (await navigator.serviceWorker.getRegistration().catch(() => null));
      if (reg) await reg.update().catch(() => {});
      location.reload();
    });
    document.querySelector("#update-bar .update-x").addEventListener("click", () => document.getElementById("update-bar").remove());
  };
  check();
  document.addEventListener("visibilitychange", check);
}

// Weekly "New on OTT" alerts: sw.js shows them, functions/api/push/ keeps the list and sends them on
// Fridays. The 🔔 buttons show where the browser supports push: Android and desktop browsers, and
// iPhone once the site is installed on the home screen.
// If notifications are blocked for the site, the browser won't ask again, so the button stays and
// explains how to allow them on that device.
function blockedSteps(ua) {
  const app = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (/iphone|ipad|ipod/i.test(ua)) return "Notifications are off for Masala Mischief. Open iPhone <b>Settings</b> → <b>Notifications</b> → <b>Masala Mischief</b> → turn on <b>Allow Notifications</b>, then tap 🔔 again.";
  if (/android/i.test(ua) && app) return "Notifications are blocked for the app. Long-press the <b>Masala Mischief</b> icon → <b>App info</b> → <b>Notifications</b> → turn them on, then tap 🔔 again.";
  if (/android/i.test(ua)) return "Notifications are blocked for this site. Tap the icon left of the address (🔒 or ⚙) → <b>Permissions</b> or <b>Notifications</b> → <b>Allow</b>, then tap 🔔 again.";
  return "Notifications are blocked for this site. Click the icon left of the address bar → <b>Notifications</b> → <b>Allow</b>, then click 🔔 again.";
}
// What the weekly alert should cover, sent with the subscription: chosen languages and apps, and the
// series on your watchlist ("hi-tv123"), so the alert can say when one gets a new season.
const alertChoice = () => store.get("alertChoice", { langs: [], apps: [] });
const savedSeries = () => watchlist().filter((id) => /^_[a-z]{2}-tv\d+$/.test(id)).map((id) => id.slice(1)).slice(-100);
const alertPost = (body) => fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ ...body, ...alertChoice(), series: savedSeries() }) });
// After saving or removing a series: if alerts are on, update the list we hold (no message is sent).
function syncAlerts() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || location.protocol === "file:") return;
  navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription())
    .then((s) => { if (s) alertPost(s.toJSON()).catch(() => {}); }).catch(() => {});
}

function initAlerts() {
  const btns = [...document.querySelectorAll(".alert-btn")];
  if (!btns.length || location.protocol === "file:" || !("serviceWorker" in navigator) || !("PushManager" in window) ||
    !("Notification" in window)) return;
  const paint = (on, text) => btns.forEach((b) => {
    b.hidden = false;
    b.textContent = text || (on ? "🔕 Turn off OTT alerts" : "🔔 Weekly OTT alerts");
  });
  // How-to text under the tapped button (under the heading for the one on the home page).
  const help = (b, html) => {
    let p = document.getElementById("alert-help");
    if (!p) { p = document.createElement("p"); p.id = "alert-help"; p.className = "alert-help small muted"; }
    p.innerHTML = html;
    (b.closest(".section-head") || b).after(p);
  };
  // Which languages and apps to hear about (saved on this device and sent with the subscription).
  const choice = alertChoice;
  const post = alertPost;
  const choiceText = (c) => {
    const langs = c.langs.map((l) => (l === "English" ? "Hollywood" : l));
    return `${langs.length ? langs.join(", ") : "all languages"} on ${c.apps.length ? c.apps.join(", ") : "every app"}`;
  };
  const prefsBtns = btns.map((b) => {
    const p = document.createElement("button");
    p.type = "button";
    p.className = "btn small alert-prefs-btn";
    p.textContent = "⚙️ Choose languages & apps";
    p.hidden = true;
    b.after(p);
    p.addEventListener("click", () => openChoice(p));
    return p;
  });
  const showPrefs = (on) => prefsBtns.forEach((p) => (p.hidden = !on));
  function openChoice(anchor) {
    let box = document.getElementById("alert-choice");
    if (box) { box.remove(); return; }
    const c = choice();
    box = document.createElement("div");
    box.id = "alert-choice";
    box.className = "alert-choice";
    const chipSet = (name, list, picked, label) => `<div><span class="title">${name}</span><div class="chips">${list.map((x) =>
      `<button class="chip" type="button" data-v="${esc(x)}" aria-pressed="${picked.includes(x)}">${esc(label ? label(x) : x)}</button>`).join("")}</div></div>`;
    box.innerHTML = `<p class="small muted">Pick what you'd like to hear about on Fridays. Pick none for everything. If nothing new fits in a week, we stay quiet.</p>
      <div data-k="langs">${chipSet("Languages", PICK_LANGUAGES, c.langs, langLabel)}</div>
      <div data-k="apps">${chipSet("Apps", PLATFORMS, c.apps)}</div>
      <div class="cta-row"><button class="btn primary small" type="button" data-save>Save</button><span class="small muted" data-msg></span></div>`;
    box.addEventListener("click", async (e) => {
      const chip = e.target.closest(".chip");
      if (chip) { chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") !== "true"); return; }
      if (!e.target.closest("[data-save]")) return;
      const pick = (k) => [...box.querySelectorAll(`[data-k="${k}"] .chip[aria-pressed="true"]`)].map((x) => x.dataset.v);
      const next = { langs: pick("langs"), apps: pick("apps") };
      store.set("alertChoice", next);
      const msg = box.querySelector("[data-msg]");
      msg.textContent = "Saving…";
      try {
        const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        const r = sub ? await post(sub.toJSON()) : { ok: true };
        msg.textContent = r.ok ? `✓ Saved: ${choiceText(next)}.` : "Couldn't save. Try again.";
      } catch { msg.textContent = "Couldn't save. Try again."; }
    });
    (anchor.closest(".section-head") || anchor).after(box);
  }
  paint(false);
  navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => {
    paint(Boolean(s));
    showPrefs(Boolean(s));
    // Already on: make sure our list has it (fixes a save that was cut off; no message is sent).
    if (s && Notification.permission === "granted") post(s.toJSON()).catch(() => {});
  }).catch(() => {});
  btns.forEach((b) => b.addEventListener("click", async () => {
    btns.forEach((x) => (x.disabled = true));
    try {
      const reg = await navigator.serviceWorker.ready;
      const cur = await reg.pushManager.getSubscription();
      if (cur) {
        await cur.unsubscribe();
        paint(false);
        showPrefs(false);
        document.getElementById("alert-choice")?.remove();
        post({ endpoint: cur.endpoint, off: true }).catch(() => {}); // if this is lost, the next send removes it
        return;
      }
      document.getElementById("alert-help")?.remove();
      const perm = Notification.permission === "denied" ? "denied" : await Notification.requestPermission();
      if (perm === "denied") { help(b, blockedSteps(navigator.userAgent)); return; }
      if (perm !== "granted") return; // closed the question without choosing; the button stays
      paint(false, "⏳ Turning on alerts…");
      const { key } = await fetch("/api/push/key").then((r) => r.json());
      const raw = Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
      paint(true);
      showPrefs(true);
      openChoice(prefsBtns[btns.indexOf(b)]); // straight after turning on: ask what they'd like
      // Saving can finish in the background; if our server says no, undo it so the button tells the truth.
      post(sub.toJSON()).then(async (r) => {
        if (r.ok) return;
        await sub.unsubscribe().catch(() => {});
        paint(false, "🔔 Couldn't turn on alerts. Try again");
        showPrefs(false);
        document.getElementById("alert-choice")?.remove();
      }).catch(() => {}); // offline: the next visit saves it
    } catch {
      paint(false, "🔔 Couldn't turn on alerts. Try again");
    } finally {
      btns.forEach((x) => (x.disabled = false));
    }
  }));
}

// Install as an app (manifest.webmanifest + sw.js). The service worker saves pages as you visit them so
// the site, your watchlist included, opens offline. The Install buttons (footer, phone menu) show
// everywhere except inside the installed app. Where the browser offers installing (Android, desktop
// Chrome/Edge) the button opens that; otherwise (iPhone, an offer dismissed earlier, already
// installed) it shows the steps for that browser.
let installPrompt = null;
function installSteps(ua, installed) {
  if (installed) return "The app is already on this device, and it updates by itself: open <b>Masala Mischief</b> from your home screen and you get the latest version. If it was open in the background, it shows an <b>Update</b> button.";
  if (/iphone|ipad|ipod/i.test(ua)) return "On iPhone: tap the Share button <b>⎋</b> (in Chrome it's at the top right), then <b>Add to Home Screen</b>.";
  if (/samsungbrowser/i.test(ua)) return "Tap the <b>☰</b> menu at the bottom, then <b>Add page to</b> → <b>Home screen</b>.";
  if (/android/i.test(ua) && /firefox/i.test(ua)) return "Tap the <b>⋮</b> menu, then <b>Install</b> (or <b>Add to Home screen</b>).";
  if (/android/i.test(ua)) return "Tap the <b>⋮</b> menu at the top right, then <b>Install app</b> or <b>Add to Home screen</b>. Already added? Look for <b>Masala Mischief</b> on your home screen.";
  if (/firefox/i.test(ua)) return "Firefox on computers can't install sites. Open masalamischief.in in Chrome or Edge to install it.";
  if (/macintosh/i.test(ua) && !/chrome|edg/i.test(ua)) return "In Safari on a Mac: <b>File</b> → <b>Add to Dock</b>.";
  return "Click the install icon at the right end of the address bar, or open the browser menu → <b>Install Masala Mischief</b>. Already installed? It's in your apps.";
}
function initInstall() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const btns = [...document.querySelectorAll(".install-btn")];
  if (standalone) return;
  btns.forEach((b) => (b.hidden = false));
  let installed = false;
  // Android Chrome can tell us the app is already installed (related_applications in the manifest).
  if (navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps().then((apps) => { installed = apps.length > 0; }).catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
  window.addEventListener("appinstalled", () => { installPrompt = null; installed = true; });
  btns.forEach((b) => b.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice.catch(() => ({}));
      if (outcome === "accepted") { installPrompt = null; installed = true; }
      return;
    }
    const help = document.getElementById("install-help");
    help.innerHTML = installSteps(navigator.userAgent, installed);
    help.hidden = false;
    b.after(help); // right under the button that was tapped (footer or phone menu)
    help.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}
// The browser can offer installing before the page has drawn its buttons.
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });

// Phones: the main links sit behind a ☰ button and open as a two-column panel (CSS shows the button
// only on narrow screens). Closes on Esc, a tap outside, or opening search.
function initMenu() {
  const btn = document.getElementById("menu-btn");
  const nav = document.getElementById("main-nav");
  const set = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "✕" : "☰";
    btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
  };
  btn.addEventListener("click", () => set(!nav.classList.contains("open")));
  document.getElementById("search-btn").addEventListener("click", () => set(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest("#main-nav, #menu-btn")) set(false); });
}

// Header search over our reviews and the whole catalogue. The catalogue loads on first use only.
function initSiteSearch() {
  const box = document.getElementById("site-search");
  const btn = document.getElementById("search-btn");
  const q = document.getElementById("site-q");
  const out = document.getElementById("site-results");
  // Our reviews always match first; catalogue matches come from the search index (searchCatalog).
  const ours = MOVIES.map((m) => ({ id: (IMAGES[m.id] || {}).tmdb || m.id, l: LANG_CODE[m.lang], t: m.title, y: m.year, n: 1e9,
    p: (IMAGES[m.id] || {}).poster, mine: m, key: searchNorm(m.title) }));
  const byTmdb = reviewedByTmdb();
  const open = (show) => {
    box.hidden = !show;
    btn.setAttribute("aria-expanded", show);
    if (show) q.focus(); else { q.value = ""; out.innerHTML = ""; }
  };
  btn.addEventListener("click", () => open(box.hidden));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !box.hidden) open(false);
    if (e.key === "/" && box.hidden && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); open(true); }
  });
  document.getElementById("site-search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (q.value.trim()) location.href = `films.html?q=${encodeURIComponent(q.value.trim())}`;
  });
  let t;
  q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const term = searchNorm(q.value);
      if (term.length < 2) { out.innerHTML = ""; return; }
      const [found, people] = await Promise.all([searchCatalog(term), searchPeople(term, 3)]);
      if (searchNorm(q.value) !== term) return; // a newer search is on its way
      const mineIds = new Set();
      const theirs = found.filter((f) => !(f.k !== "tv" && byTmdb[f.id] && mineIds.add(byTmdb[f.id].id)));
      // Best match first (our reviews win a tie), then the better-known title. Short forms ("ddlj")
      // are scored as the full title.
      const tq = nickname("titles", term) || term;
      const hits = [...ours.map((f) => ({ ...f, score: mineIds.has(f.mine.id) ? 4 : titleMatch(tq, f.t) })).filter((f) => f.score),
        ...theirs.map((f) => ({ ...f, score: titleMatch(tq, f.t) }))]
        .sort((a, b) => matchStep(b.score) - matchStep(a.score) || (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || b.n - a.n)
        .slice(0, 8);
      // Actors and directors first when the search is clearly a name: their match beats the titles', or
      // it's a close match for someone well known ("mohanlal" → the actor before the 2018 film Mohanlal).
      const pScore = !people.length ? 0 : nickname("people", term) ? 3 : titleMatch(term, people[0].name);
      const peopleFirst = people.length && (!hits.length || pScore > hits[0].score || (pScore >= 2.5 && people[0].titles >= 10));
      const peopleHtml = people.map((p) => `
            <a class="sr" href="person.html?id=${p.id}">
              ${p.photo ? `<img class="sr-face" src="${tmdb(p.photo, "w92")}" alt="" loading="lazy">` : `<span class="sr-none">👤</span>`}
              <span><strong>${esc(p.name)}</strong><span class="muted small">Actor / director · ${p.titles} titles</span></span>
            </a>`).join("");
      const titlesHtml = hits.slice(0, people.length ? 5 : 8).map((f) => `
            <a class="sr" href="${filmHref(f)}">
              ${f.p ? `<img src="${tmdb(f.p, "w92")}" alt="" loading="lazy">` : `<span class="sr-none">🎬</span>`}
              <span><strong>${esc(f.t)}</strong>
              <span class="muted small">${esc(langLabel(CAT_LANGS[f.l] || ""))}${f.k === "tv" ? " · Series" : ""}${f.y ? ` · ${f.y}` : ""}${f.mine ? " · 🌶️ Reviewed" : ""}</span></span>
            </a>`).join("");
      out.innerHTML = hits.length || people.length
        ? (peopleFirst ? peopleHtml + titlesHtml : titlesHtml + peopleHtml) +
          (hits.length ? `<a class="sr-all" href="films.html?q=${encodeURIComponent(q.value.trim())}">See all results →</a>` : "")
        : `<p class="muted small sr-empty">No matches. Try another spelling.</p>`;
    }, 120);
  });
}

/* ---------- Building blocks ---------- */
function meter(n, label = "Masala Meter") {
  let out = "";
  for (let i = 1; i <= 5; i++) out += `<span class="${i <= n ? "" : "off"}">🌶️</span>`;
  return `<span class="meter" role="img" aria-label="${label} ${n} out of 5">${out}</span>`;
}

function score(q) {
  return `<span class="score" title="Quality score">${q}<small>/10</small></span>`;
}

// Film images from TMDB (IMAGES in data.js). Films without one keep the coloured tile.
const tmdb = (path, size) => `https://image.tmdb.org/t/p/${size}${path}`;
// "Watch trailer": plays the official trailer on the page when TMDB knows it (key), otherwise opens a
// YouTube search. Clicks are handled once for the whole site in initTrailers().
function trailerBtn(key, title, query) {
  return key
    ? `<button class="btn" type="button" data-trailer="${esc(key)}" data-title="${esc(title)}">▶ Watch trailer</button>`
    : `<a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">▶ Watch trailer</a>`;
}

// When a film in (or just out of) cinemas should reach OTT: TMDB's listed date (od, app in oa) or an
// estimate from the cinema date. As lib/seo.js ottDue() and ottDueText(); keep them alike.
const OTT_WAIT_DAYS = { hi: 56, en: 70, ta: 28, te: 28, ml: 28, kn: 28, mr: 28, bn: 28, pa: 28 };
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
function ottDue(f, today = new Date().toISOString().slice(0, 10)) {
  if (f.k === "tv" || !f.rd || (f.w && f.w.length) || (f.ja && f.ja.length)) return null;
  const since = (Date.parse(today) - Date.parse(f.rd)) / 864e5;
  if (since > 120 || since < -60) return null;
  if (f.od && f.od >= addDays(today, -14)) return { date: f.od, app: f.oa || "", sure: true };
  return OTT_WAIT_DAYS[f.l] ? { date: addDays(f.rd, OTT_WAIT_DAYS[f.l]), app: "", sure: false } : null;
}
const roughly = (d) => {
  const x = new Date(`${d}T00:00:00Z`);
  return `${x.getUTCDate() <= 10 ? "early" : x.getUTCDate() <= 20 ? "mid" : "late"} ${x.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}`;
};
const ottRule = (f) => `${f.l === "en" ? "Hollywood" : CAT_LANGS[f.l]} films usually reach OTT about ${Math.round(OTT_WAIT_DAYS[f.l] / 7)} weeks after their cinema release`;
function ottDueText(f, due, today = new Date().toISOString().slice(0, 10)) {
  if (due.sure) return `${due.date > today ? "OTT release" : "Listed for OTT from"} ${fmtDate(due.date)}${due.app ? ` on ${due.app}` : ""}.`;
  return due.date > today ? `OTT date not announced yet; expected around ${roughly(due.date)} (${ottRule(f)}).` : `OTT date not announced yet; due any time now (${ottRule(f)}).`;
}
// Short form for cards and the film page: "1 Dec 2026 on Netflix" / "expected late Dec 2026".
const ottDueShort = (due) => due.sure ? `${fmtDate(due.date)}${due.app ? ` on ${due.app}` : ""}`
  : due.date > new Date().toISOString().slice(0, 10) ? `expected ${roughly(due.date)}` : "due any time now";

// Quick answers on film pages, as lib/seo.js quickAnswers() puts them in the HTML for search engines.
const CERT_MEANS = { U: "suitable for all ages", UA: "parental guidance for under-12s", A: "adults only", S: "for specialised audiences" };
function quickAnswers(f) {
  const tv = f.k === "tv";
  const today = new Date().toISOString().slice(0, 10);
  const apps = (f.ja && f.ja.length ? f.ja : f.w) || [];
  const due = ottDue(f, today);
  const where = apps.length ? `streaming on ${apps.slice(0, 3).join(", ")} in India.`
    : !tv && f.rd && f.rd > today ? `releasing in cinemas on ${fmtDate(f.rd)}; the OTT release comes after its cinema run.`
    : !tv && f.rd && (Date.parse(today) - Date.parse(f.rd)) / 864e5 <= 60 ? "in cinemas now, not on any OTT app in India yet."
    : due ? "not on any OTT app in India yet." : "not on any OTT app in India right now.";
  const qa = [[`Where can I watch ${f.t}?`, `${f.t} is ${where}`]];
  if (due) qa.push([`When will ${f.t} release on OTT?`, ottDueText(f, due, today)]);
  const dubs = (f.au || []).map((c) => (c === "en" ? "English" : c === "ja" ? "Japanese" : CAT_LANGS[c])).filter(Boolean);
  if (dubs.length && apps.length) qa.push([`Is ${f.t} dubbed?`, `Yes, it's also available in ${dubs.join(", ")} on the apps that list audio languages.`]);
  const certSays = CERT_MEANS[f.c] || (/^U\/A (\d+)\+$/.exec(f.c || "") ? `parental guidance for under-${/^U\/A (\d+)\+$/.exec(f.c)[1]}s` : "");
  if (f.c) qa.push([`What is ${f.t}'s certificate?`, `${f.c}${certSays ? `: ${certSays}` : ""}.`]);
  if (!tv && f.r) qa.push([`How long is ${f.t}?`, `${Math.floor(f.r / 60) ? `${Math.floor(f.r / 60)} h ` : ""}${f.r % 60} min.`]);
  if (tv && f.s) qa.push([`How many seasons does ${f.t} have?`, `${f.s} season${f.s === 1 ? "" : "s"}${f.end ? "; it has ended" : " so far"}.`]);
  if (f.rd) qa.push([`When did ${f.t} release?`, `${new Date(f.rd + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}, in ${f.l === "en" ? "English" : CAT_LANGS[f.l] || "its original language"}.`]);
  const cast = (f.cast || []).slice(0, 4).map((c) => c[1]);
  const dir = (f.dir || []).slice(0, 2).map((d) => d[1]);
  if (cast.length) qa.push([`Who is in ${f.t}?`, `${cast.join(", ")}${dir.length ? `; ${tv ? "created" : "directed"} by ${dir.join(" and ")}` : ""}.`]);
  return qa;
}

// "Book tickets": BookMyShow and District don't offer links to one film, so these open each site's
// movies page (it asks for your city once), where everything in cinemas is listed with showtimes.
const TICKET_SITES = [["BookMyShow", "https://in.bookmyshow.com/explore/movies"], ["District", "https://www.district.in/movies/"]];
const ticketLinks = () => TICKET_SITES.map(([name, url]) => `<a class="ott ott-tickets" href="${url}" target="_blank" rel="noopener">🎟️ ${name} ↗</a>`).join("");
// A film that's likely in cinemas: out in the last six weeks (or within the next week, for advance
// booking) and not on a streaming app yet.
function inCinemas(f) {
  if (f.k === "tv" || !f.rd || (f.w && f.w.length)) return false;
  const days = (Date.now() - new Date(f.rd + "T00:00:00")) / 864e5;
  return days >= -7 && days <= 42;
}

// Leaving soon (lv = { app: "YYYY-MM-DD" }, from JustWatch via the weekly build; leaving.json lists them).
function leavesOn(d) {
  const days = Math.round((new Date(d + "T00:00:00") - new Date(new Date().toDateString())) / 864e5);
  return days <= 0 ? "today" : days === 1 ? "tomorrow" : days < 7 ? `in ${days} days` : `on ${new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}
// Today on this device ("YYYY-MM-DD"), so dates that have passed since the weekly check are left out.
const todayLocal = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const stillLeaving = (lv) => Object.entries(lv || {}).some(([, d]) => d >= todayLocal());
const leavingText = (lv, only) => Object.entries(lv || {}).filter(([a, d]) => (!only || a === only) && d >= todayLocal())
  .sort((a, b) => a[1].localeCompare(b[1])).map(([a, d]) => `${a} ${leavesOn(d)}`).join(", ");
const leavingLine = (lv) => (leavingText(lv) ? `<p class="leave-note">⏳ Leaving ${esc(leavingText(lv))}. Watch it before it goes.</p>` : "");
// Titles leaving an app soon, keyed the way the watchlist saves them: { "rrr": lv, "_hi-123": lv }.
async function reviewsLeaving() {
  const data = await loadCatalog("leaving");
  if (!data) return {};
  const byTmdb = reviewedByTmdb();
  const out = {};
  data.items.filter((f) => stillLeaving(f.lv)).forEach((f) => {
    out[catSaveId(f)] = f.lv;
    if (f.k !== "tv" && byTmdb[f.id]) out[byTmdb[f.id].id] = f.lv;
  });
  return out;
}

function initTrailers() {
  let box = null;
  const close = () => { if (box) { box.remove(); box = null; document.body.classList.remove("no-scroll"); } };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-trailer]");
    if (b) {
      e.preventDefault();
      close();
      box = document.createElement("div");
      box.className = "tmodal";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-label", `${b.dataset.title} trailer`);
      box.innerHTML = `
        <div class="tmodal-box">
          <div class="tmodal-head"><strong>▶ ${esc(b.dataset.title)}</strong><button class="tmodal-x" type="button" aria-label="Close trailer">✕</button></div>
          <div class="tframe"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.trailer)}?autoplay=1&rel=0&modestbranding=1"
            title="${esc(b.dataset.title)} trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
        </div>`;
      document.body.append(box);
      document.body.classList.add("no-scroll");
      box.querySelector(".tmodal-x").focus();
      return;
    }
    if (box && (e.target === box || e.target.closest(".tmodal-x"))) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// Small "Also on" links under the share buttons: IMDb, Wikipedia (via Wikidata) and TMDB. Plain links,
// no data from those sites is shown here.
function extLinks({ im, wd, tmdbUrl }) {
  const links = [
    /^tt\d+$/.test(im || "") && [`https://www.imdb.com/title/${im}/`, "IMDb"],
    /^Q\d+$/.test(wd || "") && [`https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${wd}`, "Wikipedia"],
    tmdbUrl && [tmdbUrl, "TMDB"],
  ].filter(Boolean);
  return links.length
    ? `<p class="ext-links"><span class="muted small">Also on</span>${links.map(([u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</p>`
    : "";
}

// Top cast and director (or series creators), each linking to their page on our site.
function castRow(x) {
  if (!x || (!(x.cast || []).length && !(x.dir || []).length)) return "";
  const face = (name, photo) => photo
    ? `<img src="${tmdb(photo, "w185")}" alt="" loading="lazy" decoding="async">`
    : `<span class="cast-none">${esc(name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""))}</span>`;
  const item = (id, name, role, photo) => `
    <a class="cast-item" href="person.html?id=${id}">
      ${face(name, photo)}<strong>${esc(name)}</strong>${role ? `<span>${esc(role)}</span>` : ""}
    </a>`;
  return `
    <div class="cast">
      <h3>🎭 Cast & crew</h3>
      <div class="cast-row">
        ${(x.dir || []).map(([id, name, photo]) => item(id, name, x.kind === "tv" ? "Creator" : "Director", photo)).join("")}
        ${(x.cast || []).map(([id, name, role, photo]) => item(id, name, role, photo)).join("")}
      </div>
    </div>`;
}

function poster(m, big = false) {
  const icon = GENRE_ICONS[m.genres[0]] || "🎬";
  const still = m.still || (IMAGES[m.id] && IMAGES[m.id].backdrop);
  return `<div class="poster lang-${m.lang}${big ? " big" : ""}${still ? " has-img" : ""}">
      ${still ? `<img class="poster-img" src="${tmdb(still, big ? "w1280" : "w780")}" ${big ? `srcset="${tmdb(still, "w780")} 780w, ${tmdb(still, "w1280")} 1280w" sizes="(max-width: 700px) 100vw, 1100px"` : ""} alt="" loading="${big ? "eager" : "lazy"}" decoding="async">` : ""}
      <span class="lang-pill">${langLabel(m.lang)} · ${m.year}</span>
      ${PARENT_NOTES[m.id] ? `<span class="age-pill" title="Family Pick">👪 ${PARENT_NOTES[m.id].age}+</span>` : m.cert ? `<span class="age-pill" title="Indian certificate">${esc(m.cert)}</span>` : ""}
      <span class="poster-icon" aria-hidden="true">${icon}</span>
      <div class="poster-foot">
        ${posterRating(m)}
        <span class="poster-title">${esc(m.title)}</span>
      </div>
    </div>`;
}

// Score badges over the poster: our quality and Masala Meter, plus the visitor's own chillies if they rated it.
function posterRating(m) {
  if (m.catalog) return `<div class="poster-rating"><span class="pr" title="TMDB rating">★ ${m.quality}<small>/10 TMDB</small></span></div>`;
  const mine = store.get("ratings", {})[m.id];
  return `<div class="poster-rating">
      <span class="pr" title="Quality score">★ ${m.quality}<small>/10</small></span>
      <span class="pr" title="Masala Meter">🌶️ ${m.masala}<small>/5</small></span>
      ${mine ? `<span class="pr mine" title="Your Masala Meter">You 🌶️ ${mine}</span>` : ""}
    </div>`;
}

function platformChips(list, max = 3) {
  if (!list.length) return "";
  const shown = list.slice(0, max).map((p) => `<span class="ott ott-${slug(p)}">${p}</span>`).join("");
  return `<div class="otts">${shown}${list.length > max ? `<span class="ott more">+${list.length - max}</span>` : ""}</div>`;
}

// Like platformChips, but each chip opens the film on that app (used where we're not inside a card link).
function platformLinks(m, list) {
  if (!list.length) return "";
  const links = WATCH_LINKS[m.id] || {};
  return `<div class="otts">${list.map((p) => {
    const url = links[p] || PLATFORM_HOME[p];
    return url
      ? `<a class="ott ott-${slug(p)}" href="${esc(url)}" target="_blank" rel="noopener" title="Watch ${esc(m.title)} on ${esc(p)}">${p} ↗</a>`
      : `<span class="ott ott-${slug(p)}">${p}</span>`;
  }).join("")}</div>`;
}

function card(m, extra = "") {
  return `
    <a class="card" href="${m.href || `review.html?id=${encodeURIComponent(m.id)}`}">
      ${poster(m)}
      <div class="card-body">
        ${extra}
        <p>${esc(m.tagline)}</p>
        ${platformChips(streamsOn(m))}
        <div class="card-meta">${m.catalog ? `<span class="muted small">Not reviewed yet</span>` : meter(m.masala)}${score(m.quality)}</div>
      </div>
    </a>`;
}

function chips(el, items, isOn, onToggle) {
  el.innerHTML = items.map(([value, label]) => `<button class="chip" type="button" data-v="${esc(value)}">${label}</button>`).join("");
  const paint = () => el.querySelectorAll("[data-v]").forEach((b) => b.setAttribute("aria-pressed", isOn(b.dataset.v)));
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    onToggle(b.dataset.v); paint();
  });
  paint();
  return paint;
}

function noteBars(n) {
  return NOTE_KINDS.map(([k, label]) => `
    <div class="note-row">
      <span>${label}</span>
      <span class="bars lvl-${n[k]}" role="img" aria-label="${LEVELS[n[k]]}"><i></i><i></i><i></i></span>
      <em>${LEVELS[n[k]]}</em>
    </div>`).join("");
}

/* ---------- Home ---------- */
// Each tile opens the film straight on its app. If the list hasn't been refreshed for over 10 days,
// the heading softens to "Recently added" so it never claims stale picks are this week's.
function renderNewOnOtt() {
  const el = document.getElementById("new-ott");
  if (!el || !NEW_ON_OTT.items.length) { const s = document.getElementById("new-ott-section"); if (s) s.hidden = true; return; }
  const ageDays = (Date.now() - new Date(NEW_ON_OTT.checked + "T00:00:00")) / 864e5;
  if (ageDays > 10) document.getElementById("new-ott-head").textContent = "📺 Recently added to OTT";
  document.getElementById("new-ott-checked").textContent = `Updated ${fmtDate(NEW_ON_OTT.checked)}`;
  el.innerHTML = NEW_ON_OTT.items.map(newOttItem).join("");
}

const newOttItem = (n) => `
    <a class="new-item" href="${esc(n.url)}" target="_blank" rel="noopener" title="Watch ${esc(n.title)} on ${esc(n.app)}">
      <span class="ott ott-${slug(n.app)}">${esc(n.app)} ↗</span>
      <strong>${esc(n.title)}</strong>
      <span class="muted small">${n.lang ? `${esc(langLabel(n.lang))} · ` : ""}${n.year}${n.kids ? " · 👪 Kids" : ""}</span>
      ${n.note ? `<span class="new-note">${esc(n.note)}</span>` : ""}
      <span class="muted small new-date">Added ${new Date(n.added + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
    </a>`;

function initHome() {
  const byDate = [...MOVIES].sort((a, b) => b.reviewed.localeCompare(a.reviewed));
  const featured = MOVIES.find((m) => m.id === FEATURED_ID) || byDate[0];
  document.getElementById("featured").innerHTML = `
    <a class="featured" href="review.html?id=${featured.id}">
      ${poster(featured, true)}
      <div class="featured-body">
        <span class="badge">Pick of the week</span>
        <h2>${esc(featured.title)}</h2>
        <p>${esc(featured.tagline)}</p>
        <div class="card-meta">${meter(featured.masala)}${score(featured.quality)}</div>
        ${platformChips(streamsOn(featured), 4)}
      </div>
    </a>`;

  document.getElementById("stats").innerHTML = `
    <div><strong>${MOVIES.length}</strong><span>films reviewed</span></div>
    <div><strong>${new Set(MOVIES.map((m) => m.lang)).size}</strong><span>languages</span></div>
    <div><strong>${Object.keys(PARENT_NOTES).length}</strong><span>with parent notes</span></div>`;

  document.getElementById("latest").innerHTML = byDate.filter((m) => m.id !== featured.id).slice(0, 8).map((m) => card(m)).join("");
  renderNewOnOtt();
  document.getElementById("moods").innerHTML = MOODS.map((m) => `
    <a class="mood" href="suggest.html?mood=${m.id}">
      <span class="e">${m.emoji}</span><strong>${m.label}</strong><span class="b">${m.blurb}</span>
    </a>`).join("");

  const top = (key) => [...MOVIES].sort((a, b) => b[key] - a[key] || b.quality - a.quality).slice(0, 5);
  const row = (m, i, val) => `<li><a href="review.html?id=${m.id}"><b>${i + 1}</b><span>${esc(m.title)}<small>${langLabel(m.lang)} · ${m.year}</small></span>${val}</a></li>`;
  document.getElementById("charts").innerHTML = `
    <div class="chart-box"><h3>🌶️ Most masala</h3><ol>${top("masala").map((m, i) => row(m, i, meter(m.masala))).join("")}</ol></div>
    <div class="chart-box"><h3>🏆 Highest rated</h3><ol>${top("quality").map((m, i) => row(m, i, score(m.quality))).join("")}</ol></div>`;

  // Your watchlist: the last six saved, reviews and catalogue titles alike, newest first.
  renderSavedHome();
  renderListTiles();
  renderTonight(featured);
  renderTrending();
  renderAudienceHome();
}

async function renderSavedHome() {
  const ids = watchlist().slice().reverse();
  const cat = await savedTitles(ids);
  const saved = ids.map((id) => {
    const m = movieById(id);
    if (m) return { id, f: reviewAsFilm(m), href: `review.html?id=${encodeURIComponent(m.id)}` };
    const f = cat.find((x) => catSaveId(x) === id);
    return f && { id, f, href: `film.html?id=${f.l}-${f.id}` };
  }).filter(Boolean);
  if (saved.length) {
    document.getElementById("saved-section").hidden = false;
    document.getElementById("saved").innerHTML = saved.slice(0, 6).map((s) => filmCard(s.f)).join("");
    reviewsLeaving().then((lv) => {
      const soon = saved.filter((s) => lv[s.id]);
      if (soon.length) document.getElementById("saved").insertAdjacentHTML("beforebegin", `<div class="leave-bar"><strong>⏳ Leaving soon from your watchlist</strong>
        <ul>${soon.map((s) => `<li><a href="${s.href}">${esc(s.f.t)}</a> leaves ${esc(leavingText(lv[s.id]))}</li>`).join("")}</ul></div>`);
    });
  }
}

// Popular lists: the links are plain HTML in index.html (so search engines see them); this adds four
// posters from inside each list (assets/catalog/lists/previews.json, built daily) to make them tiles.
async function renderListTiles() {
  const box = document.querySelector(".popular-lists");
  if (!box) return;
  const [previews, upcoming, leaving, top] = await Promise.all([loadCatalog("lists/previews"), loadCatalog("upcoming"), loadCatalog("leaving"), loadCatalog("top10")]);
  if (!previews) return;
  const posters = (list) => (list || []).filter((f) => f.p).slice(0, 4).map((f) => f.p);
  const soon = upcoming ? posters(upcoming.items) : [];
  const showing = upcoming ? posters(upcoming.now) : [];
  const going = leaving ? posters(leaving.items.filter((f) => f.n >= 50 && stillLeaving(f.lv))) : [];
  const trending = top ? posters(top.apps.flatMap((r) => r.movies.slice(0, 1))) : [];
  box.querySelectorAll("a").forEach((a) => {
    const key = a.getAttribute("href");
    const pics = key === "ott.html#top10" ? trending : key === "ott.html#leaving" ? going : key === "upcoming.html?show=now" ? showing : key.startsWith("upcoming.html") ? soon : previews[key];
    // Lists that aren't built yet (or are empty this week) leave the page instead of showing a bare link.
    if (!pics || !pics.length) { if (key.startsWith("ott.html#")) a.remove(); return; }
    const label = a.textContent.trim();
    a.classList.add("ptile");
    a.innerHTML = `<span class="ptile-posters">${pics.map((p) => `<img src="${tmdb(p, "w154")}" alt="" loading="lazy" decoding="async">`).join("")}</span>
      <span class="ptile-label">${esc(label)}</span>`;
  });
  box.classList.add("tiles");
}

// Tonight's pick: one of our reviewed films that's streaming, the same for everyone all day (India time),
// a different one tomorrow. Days walk through the list in a shuffled order so neighbours aren't alike.
function renderTonight(featured) {
  const el = document.getElementById("tonight");
  const pool = MOVIES.filter((m) => m.id !== featured.id && streamsOn(m).length).sort((a, b) => a.id.localeCompare(b.id));
  if (!el || !pool.length) { document.getElementById("tonight-section").hidden = true; return; }
  const day = Math.floor((Date.now() + 5.5 * 36e5) / 864e5);
  const m = pool[(day * 37) % pool.length];
  // Four more for the same day, spread through the list so they're not alike.
  const more = [...new Set([1, 2, 3, 4, 5, 6].map((k) => pool[(day * 37 + k * 13) % pool.length]))].filter((x) => x !== m).slice(0, 4);
  const mood = moodById(m.moods[0]);
  el.innerHTML = `
    <div class="tonight">
      ${card(m)}
      <div class="tonight-body">
        ${mood ? `<p class="eyebrow">${mood.emoji} Perfect for: ${esc(mood.label)}</p>` : ""}
        <h3>${esc(m.title)}</h3>
        <p class="muted">${esc(langLabel(m.lang))} · ${m.year} · ${fmtRuntime(m.runtime)} · ${esc(m.genres.join(", "))}</p>
        <div class="card-meta">${meter(m.masala)}${score(m.quality)}</div>
        <p class="muted small">Watch it now:</p>
        ${platformLinks(m, streamsOn(m))}
        <div class="cta-row">
          <a class="btn primary" href="review.html?id=${encodeURIComponent(m.id)}">Read our review</a>
          ${mood ? `<a class="btn" href="suggest.html?mood=${mood.id}">Not feeling it? More ${esc(mood.label.toLowerCase())} picks</a>` : ""}
        </div>
      </div>
    </div>
    ${more.length ? `<h3 class="tonight-more-h">Or choose one of these</h3><div class="fgrid tonight-more">${more.map((x) => filmCard(reviewAsFilm(x))).join("")}</div>` : ""}`;
}

// Trending this week: popular new releases per language, from the weekly catalogue build (trending.json).
async function renderTrending() {
  const data = await loadCatalog("trending");
  if (!data || !data.items || !data.items.length) return;
  // Newer builds store the films themselves; older ones only {l, id}, looked up in the language lists.
  let items = data.items;
  if (!items[0].t) {
    const index = await loadIndex([...new Set(items.map((x) => x.l))]);
    const byKey = Object.fromEntries(index.films.map((f) => [`${f.l}-${f.id}`, f]));
    items = items.map((x) => byKey[`${x.l}-${x.id}`]).filter(Boolean);
  }
  const byTmdb = reviewedByTmdb();
  const films = items.slice(0, 12).map((f) => ({ ...f, mine: byTmdb[f.id] }));
  if (!films.length) return;
  document.getElementById("trending").innerHTML = films.map((f) => filmCard(f)).join("");
  document.getElementById("trending-section").hidden = false;
}

// Audience favourites: what visitors rated best, plus a few recent written reviews. Hidden until there
// are approved reviews (or if reviews aren't switched on).
async function renderAudienceHome() {
  let data;
  try {
    const res = await fetch("/api/reviews/top");
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  if (!data.top || !data.top.length) return;
  // Titles are "r:<our id>" or "c:<lang>-<tmdb id>"; look the catalogue ones up one by one.
  const keys = [...new Set([...data.top, ...data.latest].map((r) => r.title).filter((t) => t.startsWith("c:")).map((t) => t.slice(2)))];
  const byKey = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await loadTitle(...k.split("-"))])));
  const resolve = (t) => {
    if (t.startsWith("r:")) {
      const m = movieById(t.slice(2));
      return m && { name: m.title, sub: `${langLabel(m.lang)} · ${m.year}`, href: `review.html?id=${encodeURIComponent(m.id)}` };
    }
    const key = t.slice(2);
    const f = byKey[key];
    return f && { name: f.t, sub: `${langLabel(CAT_LANGS[f.l])}${yearsOf(f) ? ` · ${yearsOf(f)}` : ""}`, href: `film.html?id=${key}` };
  };
  const top = data.top.map((r) => ({ ...r, film: resolve(r.title) })).filter((r) => r.film).slice(0, 5);
  if (!top.length) return;
  const audVal = (r) => `<span class="aud-val">${r.score != null ? `★ ${(+r.score).toFixed(1)}` : `🌶️ ${(+r.masala).toFixed(1)}`}<small>${r.count} review${r.count === 1 ? "" : "s"}</small></span>`;
  document.getElementById("aud-top").innerHTML = top.map((r, i) =>
    `<li><a href="${r.film.href}"><b>${i + 1}</b><span>${esc(r.film.name)}<small>${esc(r.film.sub)}</small></span>${audVal(r)}</a></li>`).join("");
  document.getElementById("aud-latest").innerHTML = data.latest.map((r) => ({ ...r, film: resolve(r.title) })).filter((r) => r.film).map((r) => `
    <a class="aud-quote" href="${r.film.href}">
      <span class="muted small">${esc(r.name)} on <strong>${esc(r.film.name)}</strong></span>
      <span class="aud-q-rating">${r.masala ? meter(r.masala, "Visitor's Masala Meter") : ""}${r.score ? `<span class="pr-inline">★ ${r.score}/10</span>` : ""}</span>
      <p>${esc(r.body.length > 180 ? r.body.slice(0, 180).replace(/\s+\S*$/, "") + "…" : r.body)}</p>
    </a>`).join("");
  document.getElementById("audience-section").hidden = false;
}

/* ---------- Reviews list ---------- */
function initReviews() {
  const q = document.getElementById("q");
  const lang = document.getElementById("lang");
  const ott = document.getElementById("ott");
  const sort = document.getElementById("sort");
  const out = document.getElementById("list");
  const count = document.getElementById("count");
  const savedOnly = document.getElementById("saved-only");
  const familyOnly = document.getElementById("family-only");
  lang.innerHTML = `<option value="">All languages</option>` + LANGUAGES.map((l) => `<option value="${l}">${langLabel(l)}</option>`).join("");
  ott.innerHTML = `<option value="">Any platform</option>` + PLATFORMS.map((p) => `<option>${p}</option>`).join("");

  const params = new URLSearchParams(location.search);
  if (params.get("lang")) lang.value = params.get("lang");
  if (params.get("saved")) savedOnly.checked = true;
  // A friend's shared watchlist: reviews?list=<id>,<id>,… (our reviews and "_<lang>-<id>" catalogue titles).
  const shared = params.has("list") ? [...new Set((params.get("list") || "").split(","))].filter((id) => movieById(id) || isCatId(id)).slice(0, 100) : null;
  const bar = document.getElementById("list-bar");
  if (savedOnly.checked && !shared) {
    document.querySelector(".page-head h1").textContent = "♡ My watchlist";
    document.title = "My watchlist · Masala Mischief";
    document.querySelector(".page-head .lead").textContent = "Films and series you saved on this device. Share the list with friends, or tap any title for where to watch it.";
  }
  if (shared) {
    document.querySelector(".page-head h1").textContent = "🍿 A friend's watchlist";
    document.querySelector(".page-head .lead").textContent = shared.length
      ? `${shared.length} title${shared.length === 1 ? "" : "s"} they want to watch. Save the ones you like to your own watchlist.`
      : "This list is empty, or the films in it aren't on the site any more.";
    document.title = "A friend's watchlist · Masala Mischief";
    savedOnly.closest("label").hidden = true;
  }

  // The bar above the list: "Save all" on a friend's list, "Share my watchlist" on your own.
  function paintBar(saved) {
    if (shared) {
      const missing = shared.filter((id) => !saved.includes(id));
      bar.hidden = !shared.length;
      bar.innerHTML = missing.length
        ? `<button class="btn primary small" type="button" id="save-all">♡ Save all ${missing.length === shared.length ? "" : `${missing.length} new `}to my watchlist</button>
           <a class="btn small" href="reviews.html">See all our reviews</a>`
        : `<span>✓ All of these are in <a href="reviews.html?saved=1">your watchlist</a>.</span><a class="btn small" href="reviews.html">See all our reviews</a>`;
      const btn = document.getElementById("save-all");
      if (btn) btn.addEventListener("click", () => {
        // Keep the card details of their catalogue titles too, so your list can draw them.
        const info = store.get("watchlistInfo", {});
        catSaved.forEach((f) => { const id = catSaveId(f); if (missing.includes(id)) info[id] = f; });
        store.set("watchlistInfo", info);
        store.set("watchlist", [...saved, ...missing]);
        syncAlerts();
        draw();
      });
      return;
    }
    bar.hidden = !(savedOnly.checked && saved.length);
    if (bar.hidden) return;
    const link = `${location.origin}/reviews?list=${saved.map(encodeURIComponent).join(",")}`;
    const info = store.get("watchlistInfo", {});
    const names = saved.map((id) => (movieById(id) || {}).title || (info[id] || {}).t).filter(Boolean);
    const text = `Here's what I want to watch 🍿 ${names.slice(0, 5).join(", ")}${names.length > 5 ? ` and ${names.length - 5} more` : ""}. Reviews and where to stream them:`;
    bar.innerHTML = `<span>📤 Share your watchlist with friends</span>
      <a class="btn primary small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}">WhatsApp</a>
      ${navigator.share ? `<button class="btn small" type="button" id="share-list">More…</button>` : ""}
      <button class="btn small" type="button" id="copy-list">Copy link</button>`;
    document.getElementById("copy-list").addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(link); e.target.textContent = "✓ Copied"; } catch { prompt("Copy this link:", link); }
    });
    const more = document.getElementById("share-list");
    if (more) more.addEventListener("click", () => navigator.share({ title: "My watchlist · Masala Mischief", text, url: link }).catch(() => {}));
  }

  // "Leaving soon from your watchlist" (or from a friend's list), above the list.
  const leaveBar = document.getElementById("leave-bar");
  let leavingMap = null;
  reviewsLeaving().then((lv) => { leavingMap = lv; draw(); });
  function paintLeaving(ids) {
    const info = store.get("watchlistInfo", {});
    const named = (id) => {
      const m = movieById(id);
      if (m) return { title: m.title, href: `review.html?id=${encodeURIComponent(m.id)}` };
      const f = info[id] || catSaved.find((x) => catSaveId(x) === id);
      return f && { title: f.t, href: `film.html?id=${f.l}-${f.id}` };
    };
    const soon = (leavingMap ? ids.filter((id) => leavingMap[id]) : []).map((id) => [named(id), leavingMap[id]]).filter(([m]) => m)
      .sort((a, b) => Object.values(a[1]).sort()[0].localeCompare(Object.values(b[1]).sort()[0]));
    leaveBar.hidden = !soon.length || !(shared || savedOnly.checked || ids.length);
    leaveBar.innerHTML = soon.length ? `<strong>⏳ Leaving soon from ${shared ? "this list" : "your watchlist"}</strong>
      <ul>${soon.map(([m, lv]) => `<li><a href="${m.href}">${esc(m.title)}</a> leaves ${esc(leavingText(lv))}</li>`).join("")}</ul>` : "";
  }

  // Saved movies & series from the catalogue (your list, or a friend's), below the reviews.
  let catSaved = [];
  const catBox = document.getElementById("saved-cat");
  async function drawCatalogue(ids) {
    const want = (shared || savedOnly.checked) ? ids.filter(isCatId) : [];
    catSaved = want.length ? await savedTitles(want) : [];
    const byTmdb = reviewedByTmdb();
    catBox.hidden = !catSaved.length;
    document.getElementById("saved-cat-grid").innerHTML = catSaved.map((f) => filmCard({ ...f, mine: f.k !== "tv" && byTmdb[f.id] })).join("");
    document.getElementById("saved-cat-head").textContent = `🎬 ${shared ? "Movies & series on this list" : "Movies & series you saved"} (${catSaved.length})`;
    return catSaved.length;
  }

  let minMasala = 0;
  chips(document.getElementById("masala-chips"), [["0", "Any"], ["3", "🌶️ 3+"], ["4", "🌶️ 4+"], ["5", "🌶️ 5 only"]],
    (v) => +v === minMasala, (v) => { minMasala = +v; draw(); });

  function draw() {
    const term = q.value.trim().toLowerCase();
    const saved = watchlist();
    let list = MOVIES.filter((m) =>
      (!lang.value || m.lang === lang.value) &&
      (!ott.value || streamsOn(m).includes(ott.value)) &&
      m.masala >= minMasala &&
      (shared ? shared.includes(m.id) : !savedOnly.checked || saved.includes(m.id)) &&
      (!familyOnly.checked || PARENT_NOTES[m.id]) &&
      (!term || titleMatch(term, m.title) || [m.title, m.lang, langLabel(m.lang), ...m.genres].join(" ").toLowerCase().includes(term))
    );
    const sorters = {
      latest: (a, b) => b.reviewed.localeCompare(a.reviewed),
      masala: (a, b) => b.masala - a.masala || b.quality - a.quality,
      quality: (a, b) => b.quality - a.quality || b.masala - a.masala,
      year: (a, b) => b.year - a.year,
      short: (a, b) => a.runtime - b.runtime,
    };
    list.sort(sorters[sort.value]);
    paintBar(saved);
    paintLeaving(shared || saved);
    const listIds = shared || saved;
    const catCount = (shared || savedOnly.checked) ? listIds.filter(isCatId).length : 0;
    count.textContent = `${list.length} review${list.length === 1 ? "" : "s"}${catCount ? ` · ${catCount} more movie${catCount === 1 ? "" : "s"} & series below` : ""}`;
    out.innerHTML = list.length
      ? list.map((m) => card(m)).join("")
      : catCount ? ""
      : `<div class="empty">${savedOnly.checked && !saved.length ? "Your watchlist is empty. Tap “♡ Save” on any review, film or series to add it." : "No reviews match that yet. Try loosening a filter."}</div>`;
    const seq = ++drawSeq;
    drawCatalogue(listIds).then(() => { if (seq === drawSeq) paintLeaving(listIds); });
  }
  let drawSeq = 0;
  [q, lang, ott, sort, savedOnly, familyOnly].forEach((el) => el.addEventListener("input", draw));
  draw();
}

/* ---------- Where our reviewed films stream now ----------
   WATCH and WATCH_LINKS in data.js were checked by hand (WATCH_CHECKED). The weekly JustWatch check in
   the catalogue build writes assets/catalog/reviewed-watch.json; this folds that in before pages draw.
   Rent/buy options only exist in the hand-made list, so they're kept. */
let watchUpdated = WATCH_CHECKED;
let onFreshWatch = null; // the review page redraws its where-to-watch with this
// Pages draw straight away with the copy saved on this device from the last visit (so nothing jumps
// while they load); the latest file then loads in the background, is saved for next time, and the
// review page updates its where-to-watch in place if it changed.
function applyWatch(data) {
  if (!data || !data.films) return false;
  for (const [id, x] of Object.entries(data.films)) {
    const before = WATCH[id] || { stream: [], rent: [] };
    WATCH[id] = { stream: x.w || [], rent: (before.rent || []).filter((a) => !(x.w || []).includes(a)) };
    // Direct links: the fresh ones, plus the old ones for apps it's still on (or to rent from).
    const keep = new Set([...WATCH[id].stream, ...WATCH[id].rent]);
    WATCH_LINKS[id] = { ...Object.fromEntries(Object.entries(WATCH_LINKS[id] || {}).filter(([a]) => keep.has(a))), ...(x.u || {}) };
  }
  if (data.checked > watchUpdated) watchUpdated = data.checked;
  document.querySelectorAll("[data-watch-date]").forEach((el) => (el.textContent = fmtDate(watchUpdated)));
  return true;
}
function freshenWatch() {
  const saved = store.get("watchFresh", null);
  applyWatch(saved);
  loadCatalog("reviewed-watch").then((data) => {
    if (!data || !data.films || (saved && saved.checked === data.checked && JSON.stringify(saved.films) === JSON.stringify(data.films))) return;
    store.set("watchFresh", data);
    if (applyWatch(data) && onFreshWatch) onFreshWatch();
  }).catch(() => {});
}

/* ---------- Share a review as an image ----------
   A 1080 × 1920 card (Instagram / WhatsApp Status size), drawn on the phone: poster, Masala Meter, score,
   tagline and the site's logo. TMDB serves posters to any site (CORS), so the canvas can be saved. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
// Lines of `text` that fit `width` in the context's current font, at most `max` (the last one ends "…").
function wrapLines(g, text, width, max) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    lines.length = max;
    while (g.measureText(`${lines[max - 1]}…`).width > width && lines[max - 1].includes(" ")) lines[max - 1] = lines[max - 1].replace(/\s+\S+$/, "");
    lines[max - 1] += "…";
  }
  return lines;
}
// A blank Story card: dark background with a chilli glow around `glowY`, and the logo badge at the top.
async function storyCanvas(glowY = 700) {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  await Promise.all(["800 80px 'Baloo 2'", "600 36px Inter", "700 36px Inter", "italic 400 40px Inter"].map((f) => document.fonts.load(f).catch(() => {})));
  g.fillStyle = "#1c1416"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, glowY, 80, W / 2, glowY, 900);
  glow.addColorStop(0, "rgba(215,38,61,0.45)"); glow.addColorStop(1, "rgba(215,38,61,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = "#fff3dc";
  g.beginPath(); g.roundRect(W / 2 - 250, 70, 500, 120, 60); g.fill();
  const logo = await loadImage("assets/logo.svg").catch(() => null);
  if (logo) g.drawImage(logo, W / 2 - 230, 88, 150, 84);
  g.fillStyle = "#26121a"; g.font = "800 46px 'Baloo 2', sans-serif"; g.textBaseline = "middle"; g.textAlign = "left";
  g.fillText("Masala", W / 2 - 60, 112);
  g.fillStyle = "#d7263d"; g.fillText("Mischief", W / 2 - 60, 156);
  return { c, g, W, H };
}
// Phones: the share sheet with the image (WhatsApp, Instagram…). Elsewhere: a preview to save.
async function shareImage(makeBlob, name, btn, text, alt) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⏳ Making the image…";
  try {
    const blob = await makeBlob();
    const file = new File([blob], name, { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text }).catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const box = document.createElement("div");
      box.className = "card-preview";
      box.innerHTML = `<div class="card-preview-inner">
          <img src="${url}" alt="${esc(alt)}">
          <div class="cta-row"><a class="btn primary" href="${url}" download="${file.name}">⬇️ Save image</a><button class="btn" type="button" data-close>Close</button></div>
          <p class="muted small">Then post it to your WhatsApp channel, Status or Instagram. On iPhone, press and hold the image to save it.</p>
        </div>`;
      const close = () => { box.remove(); URL.revokeObjectURL(url); };
      box.addEventListener("click", (e) => { if (e.target === box || e.target.closest("[data-close]")) close(); });
      document.body.append(box);
    }
  } catch {
    btn.textContent = "Couldn't make the image. Try again";
    btn.disabled = false;
    return;
  }
  btn.textContent = label;
  btn.disabled = false;
}

async function reviewCard(m) {
  const { c, g, W, H } = await storyCanvas(700);
  // Poster.
  const img = IMAGES[m.id] || {};
  const pw = 600, ph = 900, px = (W - pw) / 2, py = 250;
  const poster = img.poster ? await loadImage(tmdb(img.poster, "w780")).catch(() => null) : null;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 50; g.shadowOffsetY = 20;
  g.beginPath(); g.roundRect(px, py, pw, ph, 32); g.fillStyle = "#3a2a2e"; g.fill();
  g.restore();
  if (poster) { g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 32); g.clip(); g.drawImage(poster, px, py, pw, ph); g.restore(); }
  // Title, language · year.
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = "#fff3dc"; g.font = "800 80px 'Baloo 2', sans-serif";
  const titleLines = wrapLines(g, m.title, W - 140, 2);
  let y = py + ph + 110;
  titleLines.forEach((l) => { g.fillText(l, W / 2, y); y += 78; });
  g.fillStyle = "#c9b8ad"; g.font = "600 36px Inter, sans-serif";
  g.fillText(`${langLabel(m.lang)} · ${m.year}${m.runtime ? ` · ${fmtRuntime(m.runtime)}` : ""}`, W / 2, y + 2);
  // Masala Meter and score, side by side.
  y += 100;
  g.font = "64px sans-serif";
  for (let i = 0; i < 5; i++) { g.globalAlpha = i < m.masala ? 1 : 0.22; g.fillText("🌶️", W / 2 - 330 + i * 72, y); }
  g.globalAlpha = 1;
  g.fillStyle = "#f6b73c"; g.font = "800 84px 'Baloo 2', sans-serif"; g.textAlign = "right";
  g.fillText(`${m.quality}`, W / 2 + 290, y + 4);
  g.fillStyle = "#c9b8ad"; g.font = "600 36px Inter, sans-serif"; g.textAlign = "left";
  g.fillText("/10", W / 2 + 296, y);
  g.textAlign = "center"; g.font = "600 28px Inter, sans-serif"; g.fillStyle = "#c9b8ad";
  g.fillText("MASALA METER", W / 2 - 186, y + 52);
  g.fillText("QUALITY", W / 2 + 270, y + 52);
  // Tagline.
  y += 150;
  g.fillStyle = "#fff3dc"; g.font = "italic 400 40px Inter, sans-serif";
  // Two lines at most under a two-line title, so it never runs into the footer.
  wrapLines(g, `“${m.tagline}”`, W - 180, titleLines.length > 1 ? 2 : 3).forEach((l) => { g.fillText(l, W / 2, y); y += 56; });
  // Footer.
  g.fillStyle = "#f6b73c"; g.font = "700 36px Inter, sans-serif";
  g.fillText("Full review & where to stream", W / 2, H - 130);
  g.fillStyle = "#fff3dc"; g.font = "800 46px 'Baloo 2', sans-serif";
  g.fillText("masalamischief.in", W / 2, H - 70);
  return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.9)); // a few hundred KB (PNG: ~2 MB)
}
const shareReviewCard = (m, btn, text) => shareImage(() => reviewCard(m), `${m.id}-masala-mischief.jpg`, btn, text, `Share card for ${m.title}`);

/* ---------- Single review ---------- */
function initReview() {
  const id = new URLSearchParams(location.search).get("id");
  const m = movieById(id);
  const root = document.getElementById("review");
  if (!m) {
    root.innerHTML = `<div class="empty">We couldn't find that review. <a href="reviews.html">See all reviews</a>.</div>`;
    return;
  }
  document.title = `${m.title} (${m.year}) Review, Rating & OTT · Masala Mischief`; // as functions/review.js
  const dubs = m.audio.filter((a) => a !== m.lang);
  const shareText = `${m.title}: ${m.masala}/5 on the Masala Meter, ${m.quality}/10 overall. ${m.tagline}`;
  const pageUrl = location.href;
  // Where to watch: drawn by these two, and drawn again in place if fresher data arrives (freshenWatch).
  let fix = null; // a reader's report we've checked and applied (overrides.json)
  const watchNow = () => { const w = WATCH[m.id] || { stream: [], rent: [] }; return fix ? { ...w, stream: withCorrection(w.stream, fix) } : w; };
  const watchLine = () => { const w = watchNow(); return w.stream.length ? `<div class="stream-line"><span class="muted small">📺 Streaming on</span>${platformLinks(m, w.stream)}</div>` : ""; };
  const watchPanel = () => {
    const w = watchNow();
    return `<h3>📺 Where to watch</h3>
      ${w.stream.length
        ? `<p class="muted small">Included with subscription · tap to open</p>${platformLinks(m, w.stream)}`
        : `<p class="muted small">Not on a subscription service in India right now.</p>`}
      ${w.rent.length ? `<p class="muted small" style="margin-top:12px">Rent or buy</p>${platformLinks(m, w.rent)}` : ""}
      <p class="fine">Updated ${fmtDate(fix && fix.date > watchUpdated ? fix.date : watchUpdated)}${fix ? " (corrected from a reader's report)" : ""}. Availability changes, so confirm in the app.</p>`;
  };
  const redrawWatch = () => {
    const line = document.getElementById("watch-line"), panel = document.getElementById("watch-panel");
    if (line) line.innerHTML = watchLine();
    if (panel) panel.innerHTML = watchPanel();
  };
  onFreshWatch = redrawWatch;
  const notes = PARENT_NOTES[m.id];

  root.innerHTML = `
    ${poster(m, true)}
    <div class="review-layout">
      <article class="review-body">
        <p class="tagline">${esc(m.tagline)}</p>
        <div class="rating-big">
          <div><div class="label">Masala Meter</div>${meter(m.masala)}</div>
          <div><div class="label">Quality</div><span class="num">${m.quality}</span><span class="muted">/10</span></div>
        </div>
        <div id="watch-line">${watchLine()}</div>
        <div id="leave-slot"></div>
        ${m.review.map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="hm">
          <div class="hits"><h3>Full masala</h3><ul>${m.hits.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>
          <div class="misses"><h3>Needs more salt</h3><ul>${m.misses.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>
        </div>

        ${notes ? `
        <div class="panel parent">
          <h3>👪 Parent notes <span class="age-pill static">${notes.age}+</span></h3>
          <div class="notes">${noteBars(notes)}</div>
          <p>${esc(notes.note)}</p>
        </div>` : ""}

        <div class="panel your-rating">
          <h3>What's your Masala Meter?</h3>
          <p class="muted">Tap to rate. It's saved on this device only.</p>
          <div class="rate" id="rate" role="radiogroup" aria-label="Your Masala Meter">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" data-n="${n}" aria-label="${n} chilli${n > 1 ? "es" : ""}">🌶️</button>`).join("")}
          </div>
          <p id="rate-msg" class="rate-msg"></p>
        </div>

        <div id="cast-slot"></div>

        <div class="share-row">
          <span id="trailer-slot">${trailerBtn("", m.title, `${m.title} ${m.year} official trailer`)}</span>
          <a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}">Share on WhatsApp</a>
          <button class="btn" id="save" type="button"></button>
          <button class="btn" id="share-card" type="button">📸 Share as image</button>
          <button class="btn" id="copy" type="button">Copy link</button>
        </div>
        <a class="wa-follow compact" href="${WHATSAPP_CHANNEL}" target="_blank" rel="noopener">
          <span class="wa-icon" aria-hidden="true">💬</span>
          <span><strong>Liked this review?</strong><span>Follow us on WhatsApp for every new one.</span></span>
          <span class="wa-go">Follow</span>
        </a>
        <div id="ext-slot">${extLinks({ im: IMAGES[m.id] && IMAGES[m.id].imdb, tmdbUrl: IMAGES[m.id] && IMAGES[m.id].tmdb ? `https://www.themoviedb.org/movie/${IMAGES[m.id].tmdb}` : "" })}</div>
      </article>
      <aside>
        ${IMAGES[m.id] && IMAGES[m.id].poster ? `<img class="side-poster" src="${tmdb(IMAGES[m.id].poster, "w342")}" alt="${esc(m.title)} poster" loading="lazy" decoding="async">` : ""}
        <div class="side panel-watch" id="watch-panel">${watchPanel()}</div>
        <div class="side">
          <dl>
            <dt>Language</dt><dd>${m.lang}${LANG_LABELS[m.lang] ? ` (${LANG_LABELS[m.lang]})` : ""}</dd>
            <dt>Dubbed in</dt><dd>${dubs.length ? dubs.join(", ") : "Original only"}</dd>
            <dt>Year</dt><dd>${m.year}</dd>
            <dt>Runtime</dt><dd>${fmtRuntime(m.runtime)}</dd>
            <dt>Genre</dt><dd>${m.genres.join(", ")}</dd>
            <dt>Watch when</dt><dd>${m.moods.map((mid) => `<a href="suggest.html?mood=${mid}">${moodById(mid).label}</a>`).join(", ")}</dd>
            <dt>Reviewed</dt><dd>${fmtDate(m.reviewed)}</dd>
          </dl>
        </div>
      </aside>
    </div>
    <div id="similar-slot"></div>
    <section>
      <div class="section-head"><h2>More of our reviews in this mood</h2></div>
      <div class="grid">${MOVIES.filter((x) => x.id !== m.id && x.moods.some((mo) => m.moods.includes(mo)))
        .sort((a, b) => b.quality - a.quality).slice(0, 4).map((x) => card(x)).join("")}</div>
    </section>`;

  // Your rating
  const ratings = store.get("ratings", {});
  const rateBtns = [...document.querySelectorAll("#rate button")];
  const msg = document.getElementById("rate-msg");
  function paintRate(n) {
    rateBtns.forEach((b) => { const on = +b.dataset.n <= n; b.classList.toggle("on", on); b.setAttribute("aria-checked", +b.dataset.n === n); });
    if (!n) { msg.textContent = ""; return; }
    const diff = n - m.masala;
    msg.textContent = diff === 0 ? "Same as us. Great minds." :
      diff > 0 ? `You'd give it ${diff} more chilli${diff > 1 ? "es" : ""} than we did.` :
      `You'd give it ${-diff} fewer chilli${diff < -1 ? "es" : ""} than we did.`;
  }
  rateBtns.forEach((b) => b.addEventListener("click", () => {
    const n = +b.dataset.n;
    const all = store.get("ratings", {});
    all[m.id] = n; store.set("ratings", all); paintRate(n);
    const badges = root.querySelector(".poster.big .poster-rating");
    if (badges) badges.outerHTML = posterRating(m);
  }));
  paintRate(ratings[m.id] || 0);

  document.getElementById("watch-panel").after(reportBox(`r:${m.id}`, m.title, () => watchNow().stream));
  correctionFor(`r:${m.id}`).then((ov) => { if (ov) { fix = ov; redrawWatch(); } });

  root.insertAdjacentHTML("beforeend", `<section class="community" id="community"></section>`);
  initCommunity(`r:${m.id}`, document.getElementById("community"), m.title);

  // Trailer, cast and Wikipedia link arrive separately (reviewed.json, refreshed daily).
  loadCatalog("reviewed").then((all) => {
    const x = all && all[m.id];
    if (!x) return;
    if (x.tr) document.getElementById("trailer-slot").innerHTML = trailerBtn(x.tr, m.title);
    document.getElementById("cast-slot").innerHTML = castRow(x);
    const img = IMAGES[m.id] || {};
    document.getElementById("ext-slot").innerHTML = extLinks({ im: img.imdb, wd: x.wd, tmdbUrl: img.tmdb ? `https://www.themoviedb.org/movie/${img.tmdb}` : "" });
  });

  reviewsLeaving().then((lv) => { if (lv[m.id]) document.getElementById("leave-slot").innerHTML = leavingLine(lv[m.id]); });
  // More like this: from the film's catalogue entry (TMDB recommendations) when we have it.
  const code = LANG_CODE[m.lang] || "en";
  const tmdbId = IMAGES[m.id] && IMAGES[m.id].tmdb;
  (tmdbId ? loadTitle(code, String(tmdbId)) : Promise.resolve(null)).then((f) =>
    renderMoreLike(document.getElementById("similar-slot"), f || { l: code, id: tmdbId || m.id, g: m.genres, y: m.year }, `🍿 Liked ${m.title}? Try these`));

  // Share as image: a Story-sized card for Instagram or WhatsApp Status.
  document.getElementById("share-card").addEventListener("click", (e) => shareReviewCard(m, e.currentTarget, `${shareText} ${pageUrl}`));

  // Watchlist
  const save = document.getElementById("save");
  const paintSave = () => (save.textContent = inWatchlist(m.id) ? "✓ Saved" : "♡ Save for later");
  save.addEventListener("click", () => { toggleWatchlist(m.id); paintSave(); });
  paintSave();

  document.getElementById("copy").addEventListener("click", (e) => {
    navigator.clipboard?.writeText(pageUrl).then(() => (e.target.textContent = "Copied!"));
  });
}

/* ---------- Suggest ---------- */
function initSuggest() {
  const params = new URLSearchParams(location.search);
  const state = {
    mood: params.get("mood") || "",
    langs: new Set(params.get("lang") ? params.get("lang").split(",") : []),
    apps: new Set(store.get("apps", [])),
    dubs: true,
    family: false,
    maxTime: 0,
  };
  const out = document.getElementById("results");
  const heading = document.getElementById("results-head");

  const paintMoods = chips(document.getElementById("mood-chips"), MOODS.map((m) => [m.id, `${m.emoji} ${m.label}`]),
    (v) => v === state.mood, (v) => { state.mood = state.mood === v ? "" : v; draw(); });
  chips(document.getElementById("lang-chips"), PICK_LANGUAGES.map((l) => [l, `${l}${LANG_LABELS[l] ? ` / ${LANG_LABELS[l]}` : ""}`]),
    (v) => state.langs.has(v), (v) => { state.langs.has(v) ? state.langs.delete(v) : state.langs.add(v); draw(); });
  chips(document.getElementById("app-chips"), PLATFORMS.map((p) => [p, p]),
    (v) => state.apps.has(v), (v) => { state.apps.has(v) ? state.apps.delete(v) : state.apps.add(v); store.set("apps", [...state.apps]); draw(); });

  document.getElementById("dubs").addEventListener("change", (e) => { state.dubs = e.target.checked; draw(); });
  document.getElementById("family").addEventListener("change", (e) => { state.family = e.target.checked; draw(); });
  document.getElementById("time").addEventListener("change", (e) => { state.maxTime = +e.target.value; draw(); });
  // I liked…: search the catalogue as you type, then show "More like this" for the title picked.
  const liked = document.getElementById("liked");
  const sugg = document.getElementById("liked-sugg");
  const likedOut = document.getElementById("liked-results");
  let likedTimer = 0;
  liked.addEventListener("input", () => {
    clearTimeout(likedTimer);
    likedTimer = setTimeout(async () => {
      const term = liked.value.trim();
      const found = term.length < 2 ? [] : (await searchCatalog(term)).sort((a, b) => b.n - a.n).slice(0, 6);
      if (liked.value.trim() !== term) return;
      sugg.innerHTML = found.map((f) => `<button class="chip" type="button" data-l="${f.l}" data-id="${esc(String(f.id))}">${esc(f.t)}${f.y ? ` (${f.y})` : ""}${f.k === "tv" ? " · series" : ""}</button>`).join("")
        || (term.length >= 2 ? `<span class="muted small">No match yet. Try another spelling.</span>` : "");
    }, 250);
  });
  sugg.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    sugg.innerHTML = "";
    likedOut.innerHTML = `<p class="muted">Finding films like ${esc(b.textContent)}…</p>`;
    const f = await loadTitle(b.dataset.l, b.dataset.id);
    if (!f) { likedOut.innerHTML = `<p class="muted">Couldn't load that one. Try another.</p>`; return; }
    liked.value = f.t;
    likedOut.innerHTML = "";
    await renderMoreLike(likedOut, f, `🍿 Because you liked ${f.t}`, true);
    if (!likedOut.innerHTML) likedOut.innerHTML = `<p class="muted">We couldn't find similar titles for that one yet.</p>`;
  });

  // Surprise me: five random picks that fit the choices, from our reviews (up to two) and the catalogue's
  // best matches, so there's something to choose between. Tapping again shuffles.
  let drawSeq = 0;
  let catPicks = [];
  document.getElementById("surprise").addEventListener("click", () => {
    const shuffle = (arr) => arr.map((x) => [x, Math.random()]).sort((a, b) => a[1] - b[1]).map(([x]) => x);
    const ours = shuffle(matches().slice(0, 12)).slice(0, catPicks.length >= 3 ? 2 : 5).map(({ m }) => reviewAsFilm(m));
    const picks = shuffle([...ours, ...shuffle(catPicks).slice(0, 5 - ours.length)]);
    const box = document.getElementById("surprise-section");
    box.hidden = false;
    document.getElementById("surprise-results").innerHTML = picks.length
      ? picks.map((f) => filmCard(f)).join("")
      : `<div class="empty">Nothing fits all of that yet. Try fewer choices.</div>`;
    document.getElementById("surprise").textContent = "🎲 Shuffle again";
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Which language the viewer would watch it in: original first, otherwise a dub.
  function watchableIn(m) {
    if (!state.langs.size) return m.lang;
    if (state.langs.has(m.lang)) return m.lang;
    if (state.dubs) return m.audio.find((a) => state.langs.has(a));
    return undefined;
  }

  function matches() {
    return MOVIES
      .filter((m) => !state.mood || m.moods.includes(state.mood))
      .filter((m) => !state.maxTime || m.runtime <= state.maxTime)
      .filter((m) => !state.family || PARENT_NOTES[m.id])
      .filter((m) => !state.apps.size || streamsOn(m).some((p) => state.apps.has(p)))
      .map((m) => ({ m, via: watchableIn(m) }))
      .filter((x) => x.via)
      // Mood's first-listed films are the strongest fit; then rank by craft + fun.
      .sort((a, b) => {
        const fit = (x) => (state.mood ? 2 - x.m.moods.indexOf(state.mood) * 0.5 : 0);
        return fit(b) + b.m.quality + b.m.masala * 0.5 - (fit(a) + a.m.quality + a.m.masala * 0.5);
      });
  }

  function draw() {
    paintMoods();
    // New choices: the old five picks no longer fit.
    document.getElementById("surprise-section").hidden = true;
    document.getElementById("surprise").textContent = "🎲 Surprise me (5 picks)";
    const mood = moodById(state.mood);
    const list = matches();
    heading.textContent = mood ? `${mood.emoji} ${mood.label}: ${mood.blurb}` : "Our top picks right now";
    out.innerHTML = list.length
      ? list.map(({ m, via }) => {
          const notes = [];
          if (via !== m.lang) notes.push(`Available dubbed in ${via}`);
          if (state.apps.size) notes.push(`On ${streamsOn(m).filter((p) => state.apps.has(p)).join(", ")}`);
          return card(m, notes.length ? `<span class="why">${notes.join(" · ")}</span>` : "");
        }).join("")
      : `<div class="empty">Nothing fits all of that yet. Try turning on dubbed films, adding an app, or picking another language.</div>`;

    const qs = new URLSearchParams();
    if (state.mood) qs.set("mood", state.mood);
    if (state.langs.size) qs.set("lang", [...state.langs].join(","));
    // Keeps the URL shareable; some browsers block this on file:// pages.
    try { history.replaceState(null, "", qs.toString() ? `?${qs}` : location.pathname); } catch {}
    drawCatalogue();
  }

  // Beyond our reviews: catalogue movies and series that fit the same choices. The catalogue has no
  // dub info, so languages match the original language only, and runtime limits apply to movies.
  async function drawCatalogue() {
    const seq = ++drawSeq;
    const codes = new Set([...state.langs].map((l) => LANG_CODE[l]));
    // With dubbed versions on, also titles from other languages dubbed in the chosen ones (dubs-<code>.json).
    const dubCodes = state.dubs ? [...codes] : [];
    const [cat, ...dubLists] = await Promise.all([loadIndex([...codes]), ...dubCodes.map((c) => loadCatalog(`dubs-${c}`))]);
    if (seq !== drawSeq) return; // the choices changed while this was loading
    const section = document.getElementById("cat-section");
    if (!cat) { section.hidden = true; return; }
    const byTmdb = reviewedByTmdb();
    const fits = (f) =>
      !byTmdb[f.id] &&
      fitsMood(f, state.mood) &&
      (!state.apps.size || f.w.some((a) => state.apps.has(a))) &&
      (!state.family || kidSafe(f)) &&
      (!state.maxTime || f.k === "tv" || (f.r && f.r <= state.maxTime));
    const originals = rankWithFallback(cat.films.filter((f) => (!codes.size || codes.has(f.l)) && fits(f)), 24);
    const dubKey = new Map();
    dubLists.forEach((d, i) => (d ? d.films : []).forEach((f) => {
      const k = `${f.l}-${f.id}`;
      if (!codes.has(f.l) && !dubKey.has(k)) dubKey.set(k, { ...f, dubIn: dubCodes[i] });
    }));
    const dubbed = rankWithFallback([...dubKey.values()].filter(fits), 12);
    // Two in the original language for every dubbed one, so the chosen languages still come first.
    const picks = [];
    for (let i = 0, j = 0; picks.length < 24 && (i < originals.length || j < dubbed.length);) {
      if (i < originals.length && (picks.length % 3 !== 2 || j >= dubbed.length)) picks.push(originals[i++]);
      else picks.push(dubbed[j++]);
    }
    catPicks = picks;
    section.hidden = !picks.length;
    // None of our reviews fit: say so briefly and point at the catalogue picks instead.
    if (!matches().length) {
      out.innerHTML = picks.length
        ? `<p class="muted">None of our reviews fit all of that yet, so here are ${picks.length} picks from the full catalogue 👇</p>`
        : `<div class="empty">Nothing fits all of that yet. Try turning on dubbed films, adding an app, or picking another language.</div>`;
    }
    const mood = moodById(state.mood);
    document.getElementById("cat-head").textContent = mood ? `More ${mood.label.toLowerCase()} picks` : "More to watch";
    const p = new URLSearchParams();
    if (codes.size === 1) p.set("l", [...codes][0]);
    if (state.apps.size === 1) p.set("a", [...state.apps][0]);
    document.getElementById("cat-more").href = `films.html${p.toString() ? "?" + p : ""}`;
    document.getElementById("cat-results").innerHTML = picks
      .map((f) => filmCard(f, 0, f.dubIn ? `🗣️ Dubbed in ${langLabel(CAT_LANGS[f.dubIn])}` : "")).join("");
  }
  draw();
}

/* ---------- Family Picks ---------- */
function initFamily() {
  const out = document.getElementById("family-list");
  const params = new URLSearchParams(location.search);
  let age = +params.get("age") || 0;
  const paintAge = chips(document.getElementById("age-chips"),
    [["0", "All ages"], ["5", "Little ones (5+)"], ["8", "8+"], ["10", "10+"], ["12", "12+"]],
    (v) => +v === age, (v) => { age = +v; draw(); });

  function draw() {
    paintAge();
    const list = MOVIES.filter((m) => PARENT_NOTES[m.id] && (!age || PARENT_NOTES[m.id].age <= age))
      .sort((a, b) => PARENT_NOTES[a.id].age - PARENT_NOTES[b.id].age || b.quality - a.quality);
    out.innerHTML = list.map((m) => {
      const n = PARENT_NOTES[m.id];
      return `
        <a class="family-card" href="review.html?id=${m.id}">
          ${poster(m)}
          <div class="family-body">
            <div class="notes compact">${noteBars(n)}</div>
            <p>${esc(n.note)}</p>
            ${platformChips(streamsOn(m))}
          </div>
        </a>`;
    }).join("") || `<div class="empty">No picks for that age yet.</div>`;
    try { history.replaceState(null, "", age ? `?age=${age}` : location.pathname); } catch {}
  }
  draw();
}

/* ---------- Group Pick ----------
   No server: the room is the link. ?d= holds the 10 film ids, and each ?v=Name~10110… holds one
   person's yes/no votes. Every share link carries all the votes collected so far, so the latest
   link posted in the WhatsApp group has everyone's. Votes are kept on this device per room. */
async function initGroup() {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const ids = (params.get("d") || "").split(".").filter(Boolean);
  const deck = (await Promise.all(ids.map(resolveDeckId))).filter(Boolean);

  if (!deck.length) return groupCreate($);
  document.body.classList.add("gp-active"); // compact header so the card fits on a phone

  const roomKey = "group:" + deck.map((m) => m.id).join(".");
  const room = store.get(roomKey, { me: "", votes: {} });
  for (const v of params.getAll("v")) {
    const [name, bits] = v.split("~");
    if (name && bits && /^[01]+$/.test(bits) && bits.length === deck.length) room.votes[name.slice(0, 20)] = bits;
  }
  store.set(roomKey, room);
  if (params.has("v")) {
    try { history.replaceState(null, "", `${location.pathname}?d=${deck.map((m) => m.id).join(".")}`); } catch {}
  }

  const linkFor = (withVotes) => {
    const p = new URLSearchParams({ d: deck.map((m) => m.id).join(".") });
    if (withVotes) Object.entries(room.votes).forEach(([n, b]) => p.append("v", `${n}~${b}`));
    return `${location.origin}${location.pathname}?${p.toString().replace(/%7E/gi, "~").replace(/%2E/gi, ".")}`;
  };

  const showResults = () => {
    $("gp-swipe").hidden = true;
    groupResults($("gp-results"), deck, room, linkFor, () => {
      delete room.votes[room.me]; store.set(roomKey, room); startSwipe();
    });
  };

  const startSwipe = () => {
    $("gp-results").hidden = true;
    $("gp-swipe").hidden = false;
    $("gp-name").value = room.me || "";
    $("gp-name-box").hidden = false;
    $("gp-deck").hidden = true;
    const go = () => {
      const name = $("gp-name").value.trim().replace(/~/g, "").slice(0, 20);
      if (!name) { $("gp-name").focus(); return; }
      room.me = name; store.set(roomKey, room);
      $("gp-name-box").hidden = true;
      $("gp-deck").hidden = false;
      groupSwipe($, deck, (bits) => { room.votes[name] = bits; store.set(roomKey, room); showResults(); });
    };
    $("gp-go").onclick = go;
    $("gp-name").onkeydown = (e) => { if (e.key === "Enter") go(); };
  };

  if (room.me && room.votes[room.me]) showResults(); else startSwipe();
}

function groupCreate($) {
  $("gp-create").hidden = false;
  let mood = null;
  const langs = new Set();
  chips($("gp-moods"), MOODS.map((m) => [m.id, `${m.emoji} ${m.label}`]), (v) => v === mood, (v) => { mood = mood === v ? null : v; });
  chips($("gp-langs"), PICK_LANGUAGES.map((l) => [l, langLabel(l)]), (v) => langs.has(v), (v) => { langs.has(v) ? langs.delete(v) : langs.add(v); });

  $("gp-start").addEventListener("click", async () => {
    const kids = $("gp-family").checked;
    const more = $("gp-more").checked;
    const ok = (m, useMood) =>
      (!langs.size || m.audio.some((a) => langs.has(a))) &&
      (!kids || PARENT_NOTES[m.id]) &&
      (!useMood || !mood || m.moods.includes(mood));
    let pool = MOVIES.filter((m) => ok(m, true));
    if (pool.length < 6) pool = MOVIES.filter((m) => ok(m, false)); // too narrow: drop the mood
    // No review fits (say, only Marathi chosen): with the bigger mix the room comes from the catalogue.
    if (!pool.length && !more) pool = MOVIES.slice();
    // Good films first, with a shuffle so every room is different.
    const shuffled = (arr, score) => arr.map((x) => [x, score(x) + Math.random() * 3]).sort((a, b) => b[1] - a[1]).map(([x]) => x);
    const ours = shuffled(pool, (m) => m.quality + m.masala * 0.3).map((m) => m.id);

    // Bigger mix: up to 5 of ours, the rest well-loved catalogue movies that fit the same choices.
    let theirs = [];
    if (more) {
      $("gp-start").disabled = true;
      const cat = await loadIndex([...langs].map((l) => LANG_CODE[l]));
      if (cat) {
        const byTmdb = reviewedByTmdb();
        const codes = new Set([...langs].map((l) => LANG_CODE[l]));
        // Well-known films first; regional languages have few TMDB votes, so the bar drops if needed.
        const fits = (f, useMood, bar) => f.k !== "tv" && !byTmdb[f.id] && f.n >= (f.l === "en" ? bar * 20 : bar) &&
          (!codes.size || codes.has(f.l)) && (!kids || kidSafe(f)) && (!useMood || fitsMood(f, mood));
        let catPool = [];
        for (const [useMood, bar] of [[true, 100], [true, 20], [true, 5], [false, 20], [false, 1]]) {
          catPool = cat.films.filter((f) => fits(f, useMood, bar));
          if (catPool.length >= 10) break;
        }
        theirs = shuffled(catPool, (f) => f.v).slice(0, 10).map((f) => `_${f.l}-${f.id}`);
      }
    }
    // At least 5 of ours (more if the catalogue came up short), topped up to 10 from the catalogue.
    const mineCount = Math.min(ours.length, Math.max(5, 10 - theirs.length));
    const picks = [...ours.slice(0, mineCount), ...theirs].slice(0, 10)
      .map((id) => [id, Math.random()]).sort((a, b) => a[1] - b[1]).map(([id]) => id);
    location.search = `?d=${picks.join(".")}`;
  });
}

function groupSwipe($, deck, done) {
  let i = 0;
  let bits = "";
  const cardEl = $("gp-card");
  const paint = () => {
    const m = deck[i];
    $("gp-progress").textContent = `Film ${i + 1} of ${deck.length}`;
    cardEl.style.transform = "";
    cardEl.className = "gp-card";
    cardEl.innerHTML = `
      ${poster(m, true)}
      <div class="gp-card-body">
        <p>${esc(m.tagline)}</p>
        <p class="muted small">${m.genres.map(esc).join(" · ")}${m.runtime ? ` · ${fmtRuntime(m.runtime)}` : ""}${m.catalog ? " · not reviewed yet" : ""}${m.audio.length > 1 ? ` · Also in ${m.audio.filter((a) => a !== m.lang).map(esc).join(", ")}` : ""}</p>
        ${platformChips(streamsOn(m), 5)}
      </div>`;
  };
  const vote = (yes) => {
    if (i >= deck.length) return;
    cardEl.classList.add(yes ? "out-yes" : "out-no");
    bits += yes ? "1" : "0";
    i++;
    setTimeout(() => (i < deck.length ? paint() : finish()), 220);
  };
  const finish = () => { document.removeEventListener("keydown", onKey); done(bits); };
  const onKey = (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") vote(true);
    if (e.key === "ArrowLeft") vote(false);
  };
  document.addEventListener("keydown", onKey);
  $("gp-yes").onclick = () => vote(true);
  $("gp-no").onclick = () => vote(false);

  // Drag to swipe (touch or mouse).
  let startX = null;
  cardEl.onpointerdown = (e) => { startX = e.clientX; cardEl.setPointerCapture(e.pointerId); cardEl.classList.add("dragging"); };
  cardEl.onpointermove = (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    cardEl.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    cardEl.dataset.lean = dx > 40 ? "yes" : dx < -40 ? "no" : "";
  };
  cardEl.onpointerup = cardEl.onpointercancel = (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    cardEl.classList.remove("dragging");
    cardEl.dataset.lean = "";
    if (Math.abs(dx) > 90) vote(dx > 0); else cardEl.style.transform = "";
  };
  paint();
}

function groupResults(el, deck, room, linkFor, redo) {
  el.hidden = false;
  const people = Object.keys(room.votes);
  const n = people.length;
  const ranked = deck.map((m, idx) => ({ m, yes: people.filter((p) => room.votes[p][idx] === "1") }))
    .sort((a, b) => b.yes.length - a.yes.length || b.m.quality - a.m.quality);
  const top = ranked[0];
  const all = ranked.filter((r) => n > 1 && r.yes.length === n);
  const headline = n < 2
    ? `<h2>Your picks are in 🎉</h2><p class="lead">Now get the others to swipe. Post the link below in your WhatsApp group.</p>`
    : all.length
      ? `<h2>🎉 Everyone's in: ${esc(all[0].m.title)}</h2><p class="lead">${all.length > 1 ? `${all.length} films got a yes from all ${n} of you.` : `All ${n} of you said yes.`}</p>`
      : top.yes.length
        ? `<h2>Closest match: ${esc(top.m.title)}</h2><p class="lead">${top.yes.length} of ${n} said yes. No film got everyone, so here's the best compromise.</p>`
        : `<h2>Tough crowd 😅</h2><p class="lead">Nobody agreed on anything. Start a new room with a different vibe?</p>`;

  const shareText = n < 2
    ? `🎬 Help pick tonight's film! Swipe yes or no on 10 films, then post your link back here: ${linkFor(true)}`
    : `🎬 Group Pick update: ${n} of us have voted. Tap to see the match or add your votes: ${linkFor(true)}`;

  el.innerHTML = `
    <div class="gp-head">${headline}</div>
    <div class="share-row">
      <a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText)}">Share on WhatsApp</a>
      <button class="btn" id="gp-copy" type="button">Copy link</button>
      <button class="btn" id="gp-redo" type="button">Swipe again</button>
      <a class="btn" href="group.html">New room</a>
    </div>
    <p class="muted small">Voted so far: ${people.map((p) => `<span class="gp-voter${p === room.me ? " me" : ""}">${esc(p)}</span>`).join(" ")}</p>
    <ol class="gp-ranked">
      ${ranked.map((r) => `
        <li class="${n > 1 && r.yes.length === n ? "all" : ""}">
          <a href="${r.m.href || `review.html?id=${encodeURIComponent(r.m.id)}`}">${esc(r.m.title)}</a>
          <span class="gp-bar" style="--pct:${n ? Math.round((r.yes.length / n) * 100) : 0}%"><span></span></span>
          <span class="gp-count">${r.yes.length}/${n} yes</span>
          <span class="gp-who muted small">${r.yes.map(esc).join(", ")}</span>
          ${platformChips(streamsOn(r.m), 3)}
        </li>`).join("")}
    </ol>`;

  el.querySelector("#gp-redo").onclick = redo;
  el.querySelector("#gp-copy").onclick = async (e) => {
    try { await navigator.clipboard.writeText(linkFor(true)); e.target.textContent = "Copied!"; }
    catch { prompt("Copy this link:", linkFor(true)); }
  };
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- Audience reviews (Cloudflare D1, see functions/api and lib/community.js) ----------
   Visitors rate a title and write a short review; it shows once approved in /admin. Until the database
   and Turnstile are set up in Cloudflare, the box just says reviews are coming. */
let communityConfig;
const getCommunityConfig = () => (communityConfig = communityConfig ||
  fetch("/api/config").then((r) => (r.ok ? r.json() : { reviews: false })).catch(() => ({ reviews: false })));

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function initCommunity(titleKey, el, label) {
  el.innerHTML = `<div class="section-head"><h2>🗣️ Audience reviews</h2></div><p class="muted">Loading…</p>`;
  const cfg = await getCommunityConfig();
  if (!cfg.reviews) {
    el.innerHTML = `<div class="section-head"><h2>🗣️ Audience reviews</h2></div>
      <p class="muted">Audience ratings and reviews are opening soon. Watch this space.</p>`;
    return;
  }
  let masala = 0;
  const ago = (t) => {
    const d = (Date.now() - t) / 864e5;
    return d < 1 ? "today" : d < 2 ? "yesterday" : d < 30 ? `${Math.floor(d)} days ago` : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  el.innerHTML = `
    <div class="section-head"><h2>🗣️ Audience reviews</h2></div>
    <div class="aud-summary" id="cm-summary"></div>
    <form class="cm-form" id="cm-form" novalidate>
      <h3>Your turn: what did you think of ${esc(label)}?</h3>
      <div class="cm-row">
        <span class="cm-label">Masala Meter</span>
        <span class="cm-chillies" id="cm-masala" role="radiogroup" aria-label="Your Masala Meter">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" role="radio" aria-checked="false" aria-label="${n} out of 5">🌶️</button>`).join("")}
        </span>
      </div>
      <div class="cm-row">
        <label class="cm-label" for="cm-score">Score</label>
        <select id="cm-score"><option value="">Out of 10…</option>${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join("")}</select>
      </div>
      <textarea id="cm-body" maxlength="1000" rows="4" placeholder="A few words: what worked, what didn't? (no spoilers, no links)"></textarea>
      <div class="cm-row cm-bottom">
        <input id="cm-name" type="text" maxlength="40" placeholder="Display name" autocomplete="nickname">
        <label class="toggle"><input type="checkbox" id="cm-adult"> I'm 18 or over</label>
      </div>
      <div id="cm-ts"></div>
      <div class="cm-row">
        <button class="btn primary" type="submit" id="cm-submit">Post review</button>
        <span class="small" id="cm-msg" role="status"></span>
      </div>
      <p class="fine">We read every review before it goes up (usually within a day), then it appears under your display name. Please follow our <a href="privacy.html#rules">community rules</a>. See how we handle your data in our <a href="privacy.html">privacy note</a>.</p>
    </form>
    <ol class="cm-list" id="cm-list"></ol>`;

  const $ = (id) => el.querySelector(`#${id}`);
  try { $("cm-name").value = store.get("reviewName", ""); } catch {}
  const chillies = [...el.querySelectorAll("#cm-masala button")];
  const paintChillies = () => chillies.forEach((b) => { const on = +b.dataset.n <= masala; b.classList.toggle("on", on); b.setAttribute("aria-checked", +b.dataset.n === masala); });
  chillies.forEach((b) => b.addEventListener("click", () => { masala = masala === +b.dataset.n ? 0 : +b.dataset.n; paintChillies(); }));

  let token = "";
  let widget;
  loadTurnstile().then((ts) => {
    widget = ts.render($("cm-ts"), { sitekey: cfg.sitekey, theme: currentTheme(), callback: (t) => (token = t), "expired-callback": () => (token = "") });
  }).catch(() => { $("cm-msg").textContent = "Couldn't load the spam check. Please refresh."; });

  async function load() {
    const res = await fetch(`/api/reviews?t=${encodeURIComponent(titleKey)}`).then((r) => r.json()).catch(() => null);
    if (!res || !res.summary) { $("cm-summary").textContent = ""; return; }
    const s = res.summary;
    $("cm-summary").innerHTML = s.count
      ? `<strong>Audience:</strong> ${s.masalaCount ? `🌶️ ${(+s.masala).toFixed(1)}<small>/5</small>` : ""}${s.masalaCount && s.scoreCount ? " · " : ""}${s.scoreCount ? `★ ${(+s.score).toFixed(1)}<small>/10</small>` : ""}
         <span class="muted">from ${s.count} ${s.count === 1 ? "review" : "reviews"}</span>`
      : `<span class="muted">No audience reviews yet. Be the first!</span>`;
    $("cm-list").innerHTML = res.reviews.map((r) => `
      <li>
        <div class="cm-head"><strong>${esc(r.name)}</strong>
          ${r.masala ? `<span class="pr-inline">🌶️ ${r.masala}/5</span>` : ""}${r.score ? `<span class="pr-inline">★ ${r.score}/10</span>` : ""}
          <span class="muted small">${ago(r.created)}</span></div>
        ${r.body ? `<p>${esc(r.body).replace(/\n/g, "<br>")}</p>` : ""}
        <button class="cm-report" type="button" data-id="${r.id}">Report</button>
      </li>`).join("");
  }

  $("cm-list").addEventListener("click", async (e) => {
    const b = e.target.closest(".cm-report");
    if (!b || b.disabled) return;
    if (!confirm("Report this review as spam, abusive or a spoiler?")) return;
    b.disabled = true;
    await fetch("/api/reviews/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: +b.dataset.id }) }).catch(() => {});
    b.textContent = "Reported. Thanks!";
  });

  $("cm-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("cm-msg");
    const payload = {
      t: titleKey, name: $("cm-name").value, masala: masala || null, score: $("cm-score").value || null,
      body: $("cm-body").value, adult: $("cm-adult").checked, token,
    };
    if (!payload.adult) { msg.textContent = "Please confirm you're 18 or over."; return; }
    if (!token) { msg.textContent = "One moment, the spam check is still running…"; return; }
    $("cm-submit").disabled = true;
    msg.textContent = "Posting…";
    const res = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false, error: "Network problem. Please try again." }));
    $("cm-submit").disabled = false;
    if (window.turnstile && widget !== undefined) { window.turnstile.reset(widget); token = ""; }
    if (!res.ok) { msg.textContent = res.error || "Something went wrong."; return; }
    store.set("reviewName", payload.name.trim());
    msg.textContent = res.published ? "Thanks! Your review is up." : "Thanks! Your review will appear once we've checked it.";
    $("cm-body").value = ""; $("cm-score").value = ""; masala = 0; paintChillies();
    load();
  });
  load();
}

/* ---------- All films catalogue (TMDB, built weekly by scripts/build-catalog.mjs) ---------- */
// "ja" holds anime only (Japanese animation), so it's shown as "Anime".
const CAT_LANGS = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", mr: "Marathi", bn: "Bengali", pa: "Punjabi",
  en: "English", ko: "Korean", ja: "Anime",
};
// Language choices on Suggest and Group Pick: ours, plus catalogue-only languages (no reviews yet).
const PICK_LANGUAGES = [...LANGUAGES, "Marathi", "Bengali", "Punjabi", "Korean"];
const LANG_CODE = Object.fromEntries(Object.entries(CAT_LANGS).map(([c, l]) => [l, c]));

// Title pages link straight to the title on the app (f.u, from JustWatch). Where we don't have that
// link, we open the app's search for the title instead.
const APP_SEARCH = {
  "Netflix": "https://www.netflix.com/search?q=",
  "Prime Video": "https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase=",
  "JioHotstar": "https://www.hotstar.com/in/explore?search_query=",
  "ZEE5": "https://www.zee5.com/search?q=",
  "aha": "https://www.aha.video/search?q=",
  "SonyLIV": "https://www.sonyliv.com/search",
  "Crunchyroll": "https://www.crunchyroll.com/search?q=",
};
const appSearchUrl = (app, title) =>
  APP_SEARCH[app] ? (APP_SEARCH[app].endsWith("=") ? APP_SEARCH[app] + encodeURIComponent(title) : APP_SEARCH[app]) : PLATFORM_HOME[app];
const directUrl = (f, app) => (f.u && /^https:\/\//.test(f.u[app] || "") ? f.u[app] : "");
const appUrl = (f, app) => directUrl(f, app) || appSearchUrl(app, f.t);

const catCache = {};
function loadCatalog(name) {
  if (!catCache[name]) {
    catCache[name] = fetch(`assets/catalog/${name}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }
  return catCache[name];
}

/* ---------- Wrong-info reports and the corrections made from them ----------
   "Wrong app? Tell us" on film and review pages posts to /api/report; once checked in /admin, the fix
   lands in assets/catalog/overrides.json, laid over the catalogue here (and by the page functions). */
const REPORT_KINDS = { gone: "Not on this app any more", also: "Also streaming on another app", details: "Wrong details (year, cast, language…)", other: "Something else" };
// As lib/fixes.js APPS.
const REPORT_APPS = ["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "Sun NXT", "aha", "ManoramaMAX",
  "Lionsgate Play", "Crunchyroll", "Apple TV", "MX Player", "Hoichoi", "ETV Win", "Chaupal"];
const OVERRIDE_DAYS = 90;
// The correction for one title ("<lang>-<id>" or "r:<review id>"), if there's a current one.
const correctionFor = async (key) => {
  const ov = ((await loadCatalog("overrides")) || {}).titles?.[key];
  return ov && ov.date && (Date.now() - Date.parse(ov.date)) / 864e5 <= OVERRIDE_DAYS ? ov : null;
};
// As lib/fixes.js overrideApps().
const withCorrection = (apps, ov) => {
  if (!ov) return apps || [];
  const out = (apps || []).filter((a) => !(ov.remove || []).includes(a));
  for (const a of ov.add || []) if (!out.includes(a)) out.push(a);
  return out;
};

// The "Wrong app? Tell us" box: a closed <details> under where-to-watch. apps() gives the apps shown now.
function reportBox(target, name, apps) {
  const box = document.createElement("details");
  box.className = "report-wrong";
  box.innerHTML = `
    <summary>⚠️ Wrong app? Tell us</summary>
    <form novalidate>
      <label>What's wrong?
        <select name="kind">${Object.entries(REPORT_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select>
      </label>
      <label class="rw-app">Which app?<select name="app"></select></label>
      <label><span>Anything to add? <span class="muted small">(optional for apps)</span></span>
        <textarea name="note" rows="2" maxlength="300" placeholder="e.g. it moved to ZEE5 last week"></textarea>
      </label>
      <button class="btn primary small" type="submit">Send</button>
      <p class="fine rw-msg" role="status"></p>
    </form>`;
  const form = box.querySelector("form");
  const msg = box.querySelector(".rw-msg");
  const paintApps = () => {
    const kind = form.kind.value;
    const now = apps();
    const list = kind === "gone" ? now : REPORT_APPS.filter((a) => !now.includes(a));
    box.querySelector(".rw-app").hidden = !(kind === "gone" || kind === "also");
    form.app.innerHTML = list.length ? list.map((a) => `<option>${esc(a)}</option>`).join("") : `<option value="">No apps listed</option>`;
  };
  // "Not on this app any more" only makes sense when it's listed on one.
  box.addEventListener("toggle", () => {
    if (!box.open) return;
    if (!apps().length && form.kind.value === "gone") form.kind.value = "also";
    paintApps();
  });
  form.kind.addEventListener("change", paintApps);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const kind = form.kind.value;
    const needsApp = kind === "gone" || kind === "also";
    if (needsApp && !form.app.value) { msg.textContent = "Please pick the app."; return; }
    if (!needsApp && form.note.value.trim().length < 3) { msg.textContent = "Please tell us what's wrong."; form.note.focus(); return; }
    const btn = form.querySelector("button");
    btn.disabled = true; msg.textContent = "Sending…";
    const res = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ target, name, kind, app: needsApp ? form.app.value : "", note: form.note.value }) })
      .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false, error: "Network problem. Please try again." }));
    btn.disabled = false;
    if (!res.ok) { msg.textContent = res.error || "Something went wrong."; return; }
    form.innerHTML = `<p class="rw-thanks">🙏 Thanks! We'll check it and fix the page, usually within a day.</p>`;
  });
  return box;
}

// The catalogue's storage (see scripts/build-catalog.mjs). manifest.json says which layout is live:
//   layout 2: list-<code>.json per language, popular.json for "all languages", t/<code>/<n>.json title
//             details, p/<n>.json people, s/<letter>.json search
//   layout 1 (older builds): list-<code>.json and <code>.json per language, people/<n>.json
const catLayout = async () => ((await loadCatalog("manifest")) || {}).layout || 1;

// The browse list for some languages (codes like "ta"). With no languages: every language on the older
// layout, or the best-known titles across all languages (popular.json, marked popular: true) on layout 2,
// since the full catalogue is too big to load at once.
async function loadIndex(codes) {
  const man = await loadCatalog("manifest");
  if (!man) return loadCatalog("index");
  const asked = (codes || []).filter(Boolean);
  if (!asked.length && man.layout >= 2) {
    const pop = await loadCatalog("popular");
    return pop && { built: man.built, films: pop.films, popular: true };
  }
  const want = (asked.length ? asked : Object.keys(man.langs)).filter((c) => man.langs[c]);
  const parts = await Promise.all(want.map((c) => loadCatalog(`list-${c}`)));
  // Newer builds leave the language out of each entry (the file is per language).
  return { built: man.built, films: parts.flatMap((p, i) => (p ? p.films.map((f) => (f.l ? f : { ...f, l: want[i] })) : [])) };
}

// One title's full details (raw id like "12345" or "tv12345"), or null.
async function loadTitle(code, rawId) {
  if (!CAT_LANGS[code] || !rawId) return null;
  const man = await loadCatalog("manifest");
  const data = man && man.layout >= 2
    ? await loadCatalog(`t/${code}/${+String(rawId).replace(/^tv/, "") % man.shards.t}`)
    : await loadCatalog(code);
  return (data && data.films[rawId]) || null;
}

// Titles matching a search, from the search index (layout 2): every title with a word starting with the
// same two letters as the search's first word is in one small file. Older layout: the whole catalogue.
// Same normalising as the build (scripts/build-catalog.mjs): "K.G.F: Chapter 1" → "kgf chapter 1".
const searchNorm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[.'’]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Spelling-tolerant matching. Indian titles get written many ways in English ("Baahubali"/"Bahubali",
// "Drishyam"/"Drushyam", "Dhoom"/"Doom", "Spider-Man"/"spiderman"), so words are compared by a rough
// sound-alike skeleton, allowing a typo or two in longer words.
const SEARCH_STOP = new Set(["the", "a", "an", "of", "and"]);
// Numbers as words count as digits ("three idiots" → "3 idiots").
const NUMBER_WORDS = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
const searchWords = (s) => searchNorm(s).replace(/([a-z])(\d)|(\d)([a-z])/g, "$1$3 $2$4").split(" ").filter(Boolean)
  .map((w) => NUMBER_WORDS[w] || w);
const skeleton = (w) => w
  .replace(/ph/g, "f").replace(/ksh/g, "x").replace(/([bcdgjkpstr])h+/g, "$1").replace(/w/g, "v").replace(/z/g, "j")
  .replace(/q/g, "k").replace(/ck/g, "k").replace(/ee|ea|ie|y/g, "i").replace(/oo|ou/g, "u").replace(/ai|ay/g, "e")
  .replace(/(.)\1+/g, "$1").replace(/(.)h$/, "$1");
// Edit distance with swaps (Damerau), stopping early once it's over `max`.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}
// How well one typed word fits one title word: 3 exact, 2.5 sounds the same ("pathan"/"Pathaan"), 2.3
// start of a longer word, 1.3 close typo, 0 no fit. The last typed word may be unfinished, so prefixes count.
function wordFit(q, t, last) {
  if (q === t) return 3;
  if (/^\d+$/.test(q) || /^\d+$/.test(t)) return 0; // numbers only match exactly ("2" isn't "3")
  const qs = skeleton(q), ts = skeleton(t);
  if (qs === ts) return 2.5;
  if (last && q.length >= 2 && t.startsWith(q)) return 2.3;
  if (last && qs.length >= 3 && ts.startsWith(qs)) return 2.1;
  const allowed = qs.length >= 7 ? 2 : qs.length >= 4 ? 1 : 0;
  if (allowed && editDistance(qs, last && ts.length > qs.length + allowed ? ts.slice(0, qs.length) : ts, allowed) <= allowed) return 1.3;
  return 0;
}
// 0 when the title doesn't match the search, otherwise a score (higher is better): every typed word
// has to fit a word of the title. Words typed together ("spiderman") can match the title's split ones.
function titleMatch(query, title) {
  const qw = searchWords(query).filter((w) => !SEARCH_STOP.has(w) || searchWords(query).length === 1);
  const tw = searchWords(title);
  if (!qw.length || !tw.length) return 0;
  const joinedQ = skeleton(qw.join("")), joinedT = skeleton(tw.filter((w) => !SEARCH_STOP.has(w)).join(""));
  let total = 0;
  for (const [i, q] of qw.entries()) {
    const best = Math.max(...tw.map((t) => wordFit(q, t, i === qw.length - 1)));
    if (!best) {
      // "spiderman", "brakingbad", "shahrukh": the whole thing without spaces, against the title's start.
      // Only for long enough searches, so "salar" doesn't turn into "Sahara". Ending exactly where a word
      // of the title ends ("shahrukh" = "Shah Rukh") is as good as typing the words.
      if (joinedQ.length < 6 || joinedT.length < joinedQ.length) return 0;
      if (joinedT.startsWith(joinedQ)) {
        const words = tw.filter((w) => !SEARCH_STOP.has(w));
        const onBoundary = words.some((_, k) => skeleton(words.slice(0, k + 1).join("")) === joinedQ);
        return onBoundary ? 2.8 : 1.8;
      }
      return joinedQ.length >= 8 && editDistance(joinedQ, joinedT.slice(0, joinedQ.length), 1) <= 1 ? 1.8 : 0;
    }
    total += best;
  }
  const exactStart = searchNorm(title).startsWith(searchNorm(query)) ? 0.3 : 0;
  // The whole title, as typed ("animal" → Animal before Animal House).
  const wholeTitle = skeleton(searchWords(title).join("")) === joinedQ ? 1 : 0;
  return total / qw.length + exactStart + wholeTitle - Math.max(0, tw.length - qw.length) * 0.05;
}
// Sort order for search results: how well they match, in whole-point steps (exact and sound-alike count
// the same, so "lagan" finds the famous Lagaan before an old "Lagan"), then the better-known title.
const matchStep = (s) => Math.round(s);
const byMatch = (score, votes) => (a, b) => matchStep(score(b)) - matchStep(score(a)) || votes(b) - votes(a);

// Nicknames and short forms people actually search with, mapped to the real name or title.
const NICKNAMES = {
  people: {
    "srk": "Shah Rukh Khan", "king khan": "Shah Rukh Khan", "shahrukh khan": "Shah Rukh Khan",
    "bhai": "Salman Khan", "sallu": "Salman Khan", "big b": "Amitabh Bachchan", "bachchan": "Amitabh Bachchan",
    "thalaivar": "Rajinikanth", "superstar rajini": "Rajinikanth", "rajini": "Rajinikanth",
    "thala": "Ajith Kumar", "ajith": "Ajith Kumar", "thalapathy": "Vijay", "thalapathy vijay": "Vijay",
    "jr ntr": "N.T. Rama Rao Jr.", "ntr": "N.T. Rama Rao Jr.", "ntr jr": "N.T. Rama Rao Jr.", "junior ntr": "N.T. Rama Rao Jr.", "tarak": "N.T. Rama Rao Jr.",
    "mahesh": "Mahesh Babu", "megastar": "Chiranjeevi", "chiru": "Chiranjeevi", "power star": "Pawan Kalyan", "pspk": "Pawan Kalyan",
    "darling": "Prabhas", "rebel star": "Prabhas", "bunny": "Allu Arjun", "icon star": "Allu Arjun", "stylish star": "Allu Arjun",
    "rocking star": "Yash", "rocky bhai": "Yash", "lalettan": "Mohanlal", "mammukka": "Mammootty", "ikka": "Mammootty",
    "ulaganayagan": "Kamal Haasan", "ulaganayakan": "Kamal Haasan", "mr perfectionist": "Aamir Khan",
    "khiladi": "Akshay Kumar", "akki": "Akshay Kumar", "bebo": "Kareena Kapoor Khan", "kareena": "Kareena Kapoor Khan",
    "greek god": "Hrithik Roshan", "duggu": "Hrithik Roshan", "nawaz": "Nawazuddin Siddiqui", "rk": "Ranbir Kapoor",
    "ssr": "Sushant Singh Rajput", "dq": "Dulquer Salmaan", "fafa": "Fahadh Faasil", "vjs": "Vijay Sethupathi",
    "makkal selvan": "Vijay Sethupathi", "charan": "Ram Charan", "cherry": "Ram Charan", "prithvi": "Prithviraj Sukumaran",
    "prithviraj": "Prithviraj Sukumaran", "sk": "Sivakarthikeyan", "natural star": "Nani", "appu": "Puneeth Rajkumar",
    "power star puneeth": "Puneeth Rajkumar", "lady superstar": "Nayanthara", "pc": "Priyanka Chopra Jonas",
    "priyanka chopra": "Priyanka Chopra Jonas", "ssr rajamouli": "S. S. Rajamouli", "jakkanna": "S. S. Rajamouli",
    "slb": "Sanjay Leela Bhansali", "kjo": "Karan Johar", "lokesh": "Lokesh Kanagaraj", "loki": "Lokesh Kanagaraj",
  },
  titles: {
    "ddlj": "Dilwale Dulhania Le Jayenge", "k3g": "Kabhi Khushi Kabhie Gham", "kkhh": "Kuch Kuch Hota Hai",
    "znmd": "Zindagi Na Milegi Dobara", "yjhd": "Yeh Jawaani Hai Deewani", "khnh": "Kal Ho Naa Ho", "jwm": "Jab We Met",
    "dch": "Dil Chahta Hai", "rnbdj": "Rab Ne Bana Di Jodi", "gow": "Gangs of Wasseypur", "mnik": "My Name Is Khan",
    "ps1": "Ponniyin Selvan: Part I", "ps 1": "Ponniyin Selvan: Part I", "ps2": "Ponniyin Selvan: Part II", "ps 2": "Ponniyin Selvan: Part II",
    "lotr": "The Lord of the Rings", "got": "Game of Thrones", "hotd": "House of the Dragon", "tbbt": "The Big Bang Theory",
    "b99": "Brooklyn Nine-Nine", "himym": "How I Met Your Mother", "mi": "Mission: Impossible", "hp": "Harry Potter",
  },
};
// The real name for a nickname, or "" (also when it would only point back to itself). Keys are compared
// in the same split-up form as searches ("k3g" → "k 3 g").
let nicknameKeys = null;
const nickname = (kind, q) => {
  nicknameKeys ||= Object.fromEntries(Object.entries(NICKNAMES).map(([k, map]) =>
    [k, Object.fromEntries(Object.entries(map).map(([nick, real]) => [searchWords(nick).join(" "), real]))]));
  const key = searchWords(q).join(" ");
  const real = nicknameKeys[kind][key] || "";
  return real && searchWords(real).join(" ") !== key ? real : "";
};

// The search index files go by a word's first two letters; a misspelling can start differently
// ("bahubali", "doom" for "Dhoom"), so look in the files for the sound-alike start too, for the first
// two words. Same for titles (s/) and people (ps/).
function searchFiles(q) {
  const words = searchWords(q).filter((w) => w.length >= 2 && !SEARCH_STOP.has(w)).slice(0, 2);
  const files = new Set();
  for (const w of words) {
    files.add(w.slice(0, 2));
    const s = skeleton(w);
    if (s.length >= 2) files.add(s.slice(0, 2));
    if (/^[bcdgjkpst][^h]/.test(w)) files.add(`${w[0]}h`);
    if (/^[aeiou][^aeiou]/.test(w)) files.add(w[0] + w[0]); // "ashiqui" for "Aashiqui"
  }
  return [...files].filter((f) => /^[a-z0-9]{2}$/.test(f));
}

// Actors and directors matching a search (ps/<ab>.json, built with the catalogue): { id, name, photo,
// titles }, best match first, then whoever has more titles. Empty until the index exists.
async function searchPeople(term, limit = 6) {
  // A nickname ("srk", "thalaivar", "jr ntr") stands for the person's real name.
  const real = nickname("people", term);
  if (real) return (await searchPeople(real, 1)).slice(0, 1); // just that person
  const q = searchNorm(term);
  if (q.length < 3) return [];
  const parts = await Promise.all(searchFiles(q).map((f) => loadCatalog(`ps/${f}`)));
  const longName = skeleton(searchWords(q).join("")).length >= 7;
  const seen = new Set();
  const scored = [];
  for (const rows of parts) for (const r of rows || []) {
    if (seen.has(r[0])) continue;
    seen.add(r[0]);
    const score = titleMatch(q, r[1]);
    // Names: close spellings and joined-up names ("shahrukh"); a typo only in a long name ("rajnikanth").
    if (score >= 1.8 || (score && longName)) scored.push([r, score]);
  }
  // Match quality plus how well-known they are (titles in the catalogue), so "nolan" finds Christopher
  // Nolan before Nolan North, and "ranbir" Ranbir Kapoor before Rana Ranbir.
  const rank = ([r, s]) => s + 0.7 * Math.log10(r[3] + 1);
  return scored.sort((a, b) => rank(b) - rank(a)).slice(0, limit)
    .map(([[id, name, photo, titles]]) => ({ id, name, photo, titles }));
}

async function searchCatalog(term) {
  // A short form ("ddlj", "k3g", "got") stands for the full title.
  const real = nickname("titles", term);
  if (real) return searchCatalog(real);
  const q = searchNorm(term);
  if (!q) return [];
  if ((await catLayout()) < 2) {
    const cat = await loadIndex();
    return (cat ? cat.films : []).map((f) => [f, Math.max(titleMatch(q, f.t), titleMatch(q, f.o || ""))]).filter(([, s]) => s)
      .sort(byMatch((x) => x[1], (x) => x[0].n)).map(([f]) => f);
  }
  const files = searchFiles(q);
  if (!files.length) return [];
  const parts = await Promise.all(files.map((f) => loadCatalog(`s/${f}`)));
  const seen = new Set();
  const scored = [];
  for (const rows of parts) for (const r of rows || []) {
    const key = `${r[0]}-${r[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const score = titleMatch(q, r[2]);
    if (score) scored.push([r, score]);
  }
  return scored.sort(byMatch((x) => x[1], (x) => x[0][6]))
    .map(([[l, id, t, y, tv, p, n, v]]) => ({ l, id, t, y, ...(tv ? { k: "tv" } : {}), p, n, v }));
}

// Our reviewed films, keyed by TMDB id (from IMAGES), so the catalogue can link to the review instead.
function reviewedByTmdb() {
  const map = {};
  MOVIES.forEach((m) => { if (IMAGES[m.id] && IMAGES[m.id].tmdb) map[IMAGES[m.id].tmdb] = m; });
  return map;
}
const filmHref = (f) => (f.mine ? `review.html?id=${encodeURIComponent(f.mine.id)}` : `film.html?id=${f.l}-${f.id}`);

// Moods → TMDB genres (film and TV names), so catalogue titles can match a mood.
const MOOD_GENRES = {
  "rainy-sunday": ["Drama", "Romance", "Family"],
  "post-breakup": ["Comedy", "Romance", "Drama"],
  "first-date": ["Romance", "Comedy"],
  "friends-night": ["Comedy", "Action", "Action & Adventure"],
  "edge-of-seat": ["Thriller", "Crime", "Mystery", "Horror"],
  "feel-good": ["Comedy", "Family", "Animation", "Music"],
  "go-big": ["Action", "Adventure", "Fantasy", "Science Fiction", "War", "Action & Adventure", "Sci-Fi & Fantasy"],
  "mind-bender": ["Science Fiction", "Mystery", "Thriller", "Sci-Fi & Fantasy"],
  "family-time": ["Family", "Animation", "Kids"],
};
const fitsMood = (f, mood) => !mood || (f.g || []).some((g) => (MOOD_GENRES[mood] || []).includes(g));
// Kid-friendly enough for "Kids are watching": tagged Family or Kids, no adult or 16+ certificate, not
// horror. Animation alone isn't enough (Primal, Invincible), and a "U" alone isn't either.
const kidSafe = (f) => {
  const g = f.g || [];
  return g.some((x) => x === "Family" || x === "Kids") && !g.includes("Horror") && !/^A$|16|18/.test(f.c || "");
};

// TMDB rating pulled towards the average when few people voted (an IMDb-style weighted rating), so a
// 10/10 from five votes can't outrank a well-loved classic. Used for Top 50s and catalogue picks.
function weightedRank(arr, minVotes = 3) {
  const voted = arr.filter((f) => f.n > 0);
  if (!voted.length) return [];
  const C = voted.reduce((s, f) => s + f.v, 0) / voted.length;
  const ns = voted.map((f) => f.n).sort((a, b) => a - b);
  const m = Math.max(20, ns[Math.floor(ns.length / 2)]);
  const score = (f) => (f.n / (f.n + m)) * f.v + (m / (f.n + m)) * C;
  return voted.filter((f) => f.n >= minVotes).sort((a, b) => score(b) - score(a));
}
// Same ranking, but when fewer than `want` titles have minVotes votes (most Marathi, Punjabi or Kannada
// films have only a handful on TMDB), tops up with less-voted ones so a mood + language isn't empty.
function rankWithFallback(arr, want, minVotes = 20) {
  const out = [];
  const seen = new Set();
  for (const n of [minVotes, 5, 1]) {
    for (const f of weightedRank(arr, n)) {
      const k = `${f.l}-${f.id}`;
      if (!seen.has(k)) { seen.add(k); out.push(f); }
    }
    if (out.length >= want) break;
  }
  return out;
}
// More like this: TMDB's recommendations (f.rc, from the weekly build) that we have pages for, then titles
// in the same language and kind with the most genres in common, well-rated and close in year first.
// The weekly build works this out per title (f.ml), so title pages usually need no extra download;
// without it, this falls back to the title's language list.
async function moreLikeThis(f, n = 6) {
  if (f.ml && f.ml.length) return f.ml.slice(0, n).map(([l, id, t, y, p, v, tv, w]) => ({ l, id, t, y, p, v, ...(tv ? { k: "tv" } : {}), w: w || [] }));
  const cat = await loadIndex([f.l]);
  if (!cat) return [];
  const byKey = new Map(cat.films.map((x) => [`${x.l}-${x.id}`, x]));
  const seen = new Set([`${f.l}-${f.id}`]);
  const out = [];
  const add = (x) => { const k = `${x.l}-${x.id}`; if (x && !seen.has(k)) { seen.add(k); out.push(x); } };
  (f.rc || []).map((k) => byKey.get(k)).filter(Boolean).forEach(add);
  if (out.length < n) {
    const g = new Set(f.g || []);
    const tv = f.k === "tv";
    const overlap = (x) => { const shared = (x.g || []).filter((y) => g.has(y)).length; return shared / (g.size + (x.g || []).length - shared || 1); };
    const ranked = rankWithFallback(cat.films.filter((x) => (x.k === "tv") === tv && !seen.has(`${x.l}-${x.id}`) && (x.g || []).some((y) => g.has(y))), 80);
    ranked.slice(0, 300)
      .map((x, i) => [x, overlap(x) * 2 - i / 300 - (f.y && x.y ? Math.min(Math.abs(f.y - x.y), 30) / 60 : 0)])
      .sort((a, b) => b[1] - a[1]).slice(0, n).forEach(([x]) => add(x));
  }
  return out.slice(0, n);
}
// Fills a slot with "More like this" for title f (a catalogue entry, or a stand-in for one of our reviews).
async function renderMoreLike(slot, f, heading, now) {
  if (!slot) return;
  // Without the built list it means a big download, so wait until the row is nearly on screen.
  if (!(f.ml && f.ml.length) && !now && "IntersectionObserver" in window) {
    await new Promise((resolve) => {
      const go = () => { io.disconnect(); resolve(); };
      const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) go(); }, { rootMargin: "600px" });
      io.observe(slot);
      setTimeout(go, 4000); // in case the browser never reports it (some embedded views)
    });
  }
  const list = await moreLikeThis(f);
  if (!list.length) return;
  const byTmdb = reviewedByTmdb();
  slot.innerHTML = `<section class="more-like"><div class="section-head"><h2>${esc(heading)}</h2></div>
    <div class="fgrid">${list.map((x) => filmCard({ ...x, mine: x.k !== "tv" && byTmdb[x.id] })).join("")}</div></section>`;
}

// One of our reviews shaped like a catalogue entry, for filmCard (it links to the review).
const reviewAsFilm = (m) => ({ t: m.title, l: LANG_CODE[m.lang] || "en", id: (IMAGES[m.id] || {}).tmdb, y: m.year,
  p: (IMAGES[m.id] || {}).poster, v: m.quality, w: streamsOn(m), mine: m });

// A catalogue entry shaped like one of our MOVIES, so cards, posters and Group Pick can show it.
// `full` is the entry from assets/catalog/<lang>.json, which adds the still and summary.
function catToMovie(f, full) {
  const d = { ...f, ...(full || {}) };
  const blurb = d.ov ? (d.ov.length > 150 ? d.ov.slice(0, 150).replace(/\s+\S*$/, "") + "…" : d.ov) : d.g.join(" · ");
  return {
    id: `_${d.l}-${d.id}`, catalog: true, kind: d.k, title: d.t, year: d.y, lang: CAT_LANGS[d.l], audio: [CAT_LANGS[d.l]],
    genres: d.g.length ? d.g : ["Drama"], runtime: d.r || 0, quality: d.v, masala: null, moods: [], tagline: blurb,
    apps: d.w, still: d.b, cert: d.c, href: `film.html?id=${d.l}-${d.id}`,
  };
}

// Resolves a Group Pick deck id: ours ("rrr") or a catalogue one ("_hi-12345").
async function resolveDeckId(id) {
  if (id[0] !== "_") return movieById(id);
  const [code, raw] = id.slice(1).split("-");
  const f = await loadTitle(code, raw);
  return f ? catToMovie(f) : null;
}

// "2019–2023", "2021–" (still running) or "2024" for series; just the year for films.
const yearsOf = (f) => (f.k === "tv" && f.y ? (f.end ? (f.ye ? `${f.y}–${f.ye}` : `${f.y}`) : `${f.y}–`) : f.y ? `${f.y}` : "");

function filmCard(f, rank, note) {
  // Safe with .map(filmCard) too, which passes the position and the whole list as rank and note.
  if (Array.isArray(note) || typeof rank !== "number") rank = 0;
  if (typeof note !== "string") note = "";
  const m = f.mine;
  return `
    <a class="fcard" href="${filmHref(f)}">
      <div class="fposter">
        ${f.p ? `<img src="${tmdb(f.p, "w342")}" srcset="${tmdb(f.p, "w185")} 185w, ${tmdb(f.p, "w342")} 342w" sizes="(max-width: 700px) 46vw, 180px" alt="" loading="lazy" decoding="async">` : `<span class="fposter-none">🎬</span>`}
        ${rank ? `<span class="fbadge rank">#${rank}</span>` : ""}
        ${m ? `<span class="fbadge mine" title="Reviewed by Masala Mischief">🌶️ ${m.masala}/5</span>` : ""}
        <span class="fbadge score" title="${m ? "Our score" : "TMDB rating"}">★ ${m ? m.quality : f.v}</span>
      </div>
      <div class="fbody">
        <strong>${esc(f.t)}</strong>
        <span class="muted small">${esc(langLabel(CAT_LANGS[f.l] || ""))}${f.k === "tv" ? " · Series" : ""}${yearsOf(f) ? ` · ${yearsOf(f)}` : ""}</span>
        ${f.w && f.w.length ? `<span class="fapps">${f.w.slice(0, 2).map((a) => `<span class="ott ott-${slug(a)}">${esc(a)}</span>`).join("")}${f.w.length > 2 ? `<span class="ott more">+${f.w.length - 2}</span>` : ""}</span>` : ""}
        ${note ? `<span class="leave-chip">${esc(note)}</span>` : ""}
      </div>
    </a>`;
}

async function initFilms() {
  const $ = (id) => document.getElementById(id);
  const byTmdb = reviewedByTmdb();
  const layout = await catLayout();

  // The titles to filter: on layout 2, one language at a time (key = its code), the best-known titles
  // across all languages (key ""), or search matches across all languages (key "q:<term>"). The older
  // layout loads everything once (key ""). Our reviewed films are always added.
  const cache = {};
  async function getList(key) {
    if (cache[key]) return cache[key];
    let films = null;
    let popular = false;
    if (key.startsWith("q:")) films = await searchCatalog(key.slice(2));
    else {
      const cat = await loadIndex(key ? [key] : []);
      films = cat && cat.films;
      popular = !!(cat && cat.popular);
    }
    const list = (films || []).map((f) => ({ ...f, mine: f.k !== "tv" && byTmdb[f.id] }));
    const have = new Set(list.map((f) => f.id));
    MOVIES.forEach((m) => {
      const img = IMAGES[m.id] || {};
      if (img.tmdb && have.has(img.tmdb)) return;
      list.push({ id: img.tmdb || m.id, l: LANG_CODE[m.lang], t: m.title, y: m.year, g: m.genres, r: m.runtime,
        v: m.quality, n: 0, p: img.poster, w: streamsOn(m), c: PARENT_NOTES[m.id] && PARENT_NOTES[m.id].age <= 6 ? "U" : "", mine: m });
    });
    return (cache[key] = { list, popular, ok: !!films });
  }
  // While a big list downloads, the first page of it (head-<key>.json, most popular first) is shown,
  // when nothing but the language is chosen. Returns true if it painted.
  const plainView = (p) => !["q", "t", "g", "a", "view"].some((k) => p.get(k)) && !["r", "k", "w"].some((k) => p.get(k) === "1")
    && (p.get("s") || "popular") === "popular";
  async function quickPaint(key, full, isCurrent) {
    if (layout < 2 || key.startsWith("q:") || cache[key]) return false;
    const head = await Promise.race([loadCatalog(`head-${key || "all"}`), full.then(() => null)]);
    if (!head || !head.films || !isCurrent()) return false;
    $("fgrid").innerHTML = head.films.map((f) => filmCard({ ...f, mine: f.k !== "tv" && byTmdb[f.id] })).join("");
    $("fcount").textContent = "Loading all titles…";
    $("fmore").hidden = true;
    return true;
  }
  const firstKey = layout >= 2 ? new URLSearchParams(location.search).get("l") || "" : "";
  const firstFull = getList(firstKey);
  if (plainView(new URLSearchParams(location.search))) await quickPaint(firstKey, firstFull, () => true);
  const first = await firstFull;
  const cat = first.ok;
  if (!cat) $("films-lead").textContent = "The full catalogue is being prepared. Meanwhile, here are all the films we've reviewed.";

  const params = new URLSearchParams(location.search);
  const state = {
    view: ["top-movie", "top-tv", "top-anime"].includes(params.get("view")) ? params.get("view") : "all",
    q: params.get("q") || "", t: params.get("t") || "", l: params.get("l") || "", g: params.get("g") || "", a: params.get("a") || "",
    s: params.get("s") || "popular", r: params.get("r") === "1" || !cat, k: params.get("k") === "1", w: params.get("w") === "1",
  };
  const paintView = chips($("fview"), [["all", "All"], ["top-movie", "🏆 Top 50 movies"], ["top-tv", "🏆 Top 50 series"], ["top-anime", "🎌 Top 50 anime"]],
    (v) => v === state.view, (v) => { state.view = v; apply(); });
  const count = (arr) => arr.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {});
  $("fl").insertAdjacentHTML("beforeend", Object.entries(CAT_LANGS).map(([c, l]) => `<option value="${c}">${esc(langLabel(l))}</option>`).join(""));
  // Genre and app choices come from the titles loaded, so they're refilled when the list changes.
  const fillOptions = (list) => {
    [["fg", (f) => f.g, "Any genre"], ["fa", (f) => f.w, "Any app"]].forEach(([id, pick]) => {
      const keep = state[id === "fg" ? "g" : "a"];
      const names = Object.entries(count(list.flatMap((f) => pick(f) || []))).sort((a, b) => b[1] - a[1]).map(([x]) => x);
      if (keep && !names.includes(keep)) names.unshift(keep);
      const firstOpt = $(id).querySelector("option");
      $(id).innerHTML = `${firstOpt ? firstOpt.outerHTML : ""}${names.map((x) => `<option>${esc(x)}</option>`).join("")}`;
      $(id).value = keep;
    });
  };
  fillOptions(first.list);
  let list = first.list;
  let listIsPopular = first.popular;
  let listKey = null;
  $("fq").value = state.q; $("ft").value = state.t; $("fl").value = state.l; $("fg").value = state.g; $("fa").value = state.a; $("fs").value = state.s;
  $("fr").checked = state.r; $("fk").checked = state.k; $("fw").checked = state.w;

  const PAGE = 60;
  let shown = PAGE;
  let results = [];
  let run = 0;
  const sorters = {
    popular: (a, b) => (b.mine ? 1e9 : b.n) - (a.mine ? 1e9 : a.n),
    rating: (a, b) => (b.mine ? b.mine.quality : b.v) - (a.mine ? a.mine.quality : a.v) || b.n - a.n,
    new: (a, b) => (b.y || 0) - (a.y || 0) || b.n - a.n,
    old: (a, b) => (a.y || 9999) - (b.y || 9999) || b.n - a.n,
  };
  // Top 50 uses the weighted rating, which adapts to the language/genre chosen.
  const topRanked = (arr) => weightedRank(arr).slice(0, 50);
  const isTop = () => state.view !== "all";
  const paint = () => {
    $("fgrid").innerHTML = results.slice(0, shown).map((f, i) => filmCard(f, isTop() ? i + 1 : 0)).join("") ||
      `<div class="empty">${$("fpeople").hidden ? "Nothing matches. Try fewer filters." : "No titles by that name. Tap the name above for their films and series."}</div>`;
    $("fmore").hidden = isTop() || shown >= results.length;
  };
  // Actors and directors matching the search, as a row of faces above the titles.
  let peopleFor = null;
  const paintPeople = async (q) => {
    if (q === peopleFor) return;
    peopleFor = q;
    const box = $("fpeople");
    const people = q.length >= 3 ? await searchPeople(q, 8) : [];
    if (peopleFor !== q) return;
    box.hidden = !people.length;
    box.innerHTML = people.map((p) => `<a href="person.html?id=${p.id}">${p.photo ? `<img src="${tmdb(p.photo, "w92")}" alt="" loading="lazy">` : `<span class="face-none">👤</span>`}<span>${esc(p.name)}<small>${p.titles} titles</small></span></a>`).join("");
    if (!results.length) paint(); // the empty message depends on whether anyone was found
  };
  const apply = async () => {
    const q = searchNorm(state.q);
    paintPeople(q);
    // Top 50 anime covers films and series together, so it sets the language rather than the type.
    const animeTop = state.view === "top-anime";
    const type = animeTop ? "" : isTop() ? state.view.slice(4) : state.t;
    const lang = animeTop ? "ja" : state.l;
    $("ft").disabled = $("fs").disabled = isTop();
    $("fl").disabled = animeTop;
    paintView();
    const key = layout < 2 ? "" : lang || (q.length >= 2 && !isTop() ? `q:${q}` : "");
    if (key !== listKey) {
      const mine = ++run;
      if (listKey !== null) $("fcount").textContent = "Loading…";
      const full = getList(key);
      const plain = !q && !isTop() && !state.t && !state.g && !state.a && !state.r && !state.k && !state.w && state.s === "popular";
      if (listKey !== null && plain) await quickPaint(key, full, () => mine === run);
      const got = await full;
      if (mine !== run) return; // a newer choice is loading
      list = got.list;
      listIsPopular = got.popular;
      listKey = key;
      fillOptions(list);
    }
    const fit = new Map();
    const qTitle = nickname("titles", q) || q; // "ddlj" → Dilwale Dulhania Le Jayenge
    const matches = (f) => {
      const s = Math.max(titleMatch(qTitle, f.t), f.o ? titleMatch(qTitle, f.o) : 0);
      fit.set(f, s);
      return s;
    };
    results = list.filter((f) =>
      (!q || matches(f)) &&
      (!type || (type === "tv" ? f.k === "tv" : f.k !== "tv")) &&
      (!lang || f.l === lang) &&
      (!state.g || (f.g || []).includes(state.g)) &&
      (!state.a || (f.w || []).includes(state.a)) &&
      (!state.r || f.mine) &&
      (!state.k || f.c === "U") &&
      (!state.w || (f.w && f.w.length))
    ).sort(sorters[state.s] || sorters.popular);
    // A search sorted by "popular" puts the closest spelling first; another sort keeps its own order.
    if (q && (state.s || "popular") === "popular") results.sort((a, b) => matchStep(fit.get(b)) - matchStep(fit.get(a)) || (sorters.popular)(a, b));
    if (isTop()) results = topRanked(results);
    shown = PAGE;
    const noun = type === "tv" ? ["series", "series"] : type === "movie" ? ["movie", "movies"] : ["title", "titles"];
    const where = [!animeTop && state.l && langLabel(CAT_LANGS[state.l]), state.g].filter(Boolean).join(" ");
    $("fcount").textContent = animeTop
      ? `🎌 Top ${results.length} ${where ? where + " " : ""}anime`
      : isTop()
      ? `🏆 Top ${results.length} ${where ? where + " " : ""}${type === "tv" ? "series" : "movies"}`
      : `${results.length.toLocaleString("en-IN")} ${results.length === 1 ? noun[0] : noun[1]}`;
    // "All languages" shows the best-known titles only; a language (or a search) covers everything.
    if (listIsPopular && !q) $("fcount").textContent += isTop() ? " · from the best-known titles" : " · the best-known across all languages. Pick a language to see every title.";
    paint();
    try {
      const p = new URLSearchParams();
      if (isTop()) p.set("view", state.view);
      ["q", "t", "l", "g", "a"].forEach((k) => state[k] && p.set(k, state[k]));
      if (state.s !== "popular") p.set("s", state.s);
      ["r", "k", "w"].forEach((k) => state[k] && p.set(k, "1"));
      history.replaceState(null, "", `${location.pathname}${p.toString() ? "?" + p : ""}`);
    } catch {}
  };
  let t;
  $("fq").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.q = $("fq").value; apply(); }, 150); });
  [["ft", "t"], ["fl", "l"], ["fg", "g"], ["fa", "a"], ["fs", "s"]].forEach(([id, k]) => $(id).addEventListener("change", () => { state[k] = $(id).value; apply(); }));
  [["fr", "r"], ["fk", "k"], ["fw", "w"]].forEach(([id, k]) => $(id).addEventListener("change", () => { state[k] = $(id).checked; apply(); }));
  $("fmore").addEventListener("click", () => { shown += PAGE; paint(); });
  apply();
}

async function initFilm() {
  const root = document.getElementById("film");
  const [code, rawId] = (new URLSearchParams(location.search).get("id") || "").split("-");
  // Movies are "<lang>-<tmdb id>", series "<lang>-tv<tmdb id>".
  const id = /^\d+$/.test(rawId || "") ? +rawId : /^tv\d+$/.test(rawId || "") ? rawId : null;
  const mine = typeof id === "number" && reviewedByTmdb()[id];
  if (mine) { location.replace(`review.html?id=${encodeURIComponent(mine.id)}`); return; }
  const [f, man, fix] = await Promise.all([id ? loadTitle(code, String(id)) : null, loadCatalog("manifest"), correctionFor(`${code}-${rawId}`)]);
  if (!f) {
    root.innerHTML = `<div class="empty">We couldn't find that title. <a href="films.html">Browse movies & series</a>.</div>`;
    return;
  }
  // A reader's report we've checked and applied (overrides.json).
  if (fix) { f.w = withCorrection(f.w, fix); if (f.ja) f.ja = withCorrection(f.ja, fix); }
  const tv = f.k === "tv";
  const lang = langLabel(CAT_LANGS[f.l]);
  const years = yearsOf(f);
  const seasons = tv && f.s ? `${f.s} season${f.s === 1 ? "" : "s"}` : "";
  // When it should reach OTT, for films in (or just out of) cinemas.
  const due = ottDue(f);
  const dueLine = due ? `<p class="ott-due">📅 <strong>OTT release:</strong> ${esc(ottDueShort(due))}${due.sure ? "" : ` <span class="muted small">· not announced yet</span>`}</p>` : "";
  // Same wording as the server's (lib/seo.js filmSearchTitle): how people search, "<film> OTT".
  document.title = `${f.t}${years ? ` (${years})` : ""} ${due ? "OTT Release Date & Platform" : "OTT: Where to Watch Online"} · ${f.l === "en" ? "Hollywood" : lang} ${tv ? "Web Series" : "Movie"}`;
  // Dubbed versions on the apps that list them (f.au, from the weekly JustWatch check; not Netflix).
  const dubs = f.w.length ? (f.au || []).map((c) => langLabel(CAT_LANGS[c] || "")).filter(Boolean) : [];
  const cinemas = inCinemas(f);
  const out = cinemas && f.rd <= new Date().toISOString().slice(0, 10);
  const pageUrl = location.href;
  const shareText = `${f.t}${years ? ` (${years})` : ""}: ${f.w.length ? `streaming on ${f.w.join(", ")}` : "where to watch it"} · via Masala Mischief`;
  root.innerHTML = `
    <div class="poster big lang-${CAT_LANGS[f.l]}${f.b ? " has-img" : ""}">
      ${f.b ? `<img class="poster-img" src="${tmdb(f.b, "w1280")}" alt="" decoding="async">` : ""}
      <span class="lang-pill">${esc(lang)}${tv ? " · Series" : ""}${years ? ` · ${years}` : ""}</span>
      ${f.c ? `<span class="age-pill" title="Indian certificate">${esc(f.c)}</span>` : ""}
      <div class="poster-foot">
        <div class="poster-rating"><span class="pr" title="TMDB rating">★ ${f.v}<small>/10 TMDB</small></span></div>
        <span class="poster-title">${esc(f.t)}</span>
      </div>
    </div>
    <div class="review-layout">
      <article>
        <p class="muted film-meta">${tv ? `📺 Series${seasons ? ` · ${seasons}` : ""}${f.end ? " · ended" : " · still running"} · ` : ""}${esc(f.g.join(" · "))}${!tv && f.r ? ` · ${fmtRuntime(f.r)}` : ""}</p>
        ${f.w.length ? `<div class="stream-line"><span class="muted small">📺 Streaming on</span>${f.w.map((a) => `<a class="ott ott-${slug(a)}" href="${esc(appUrl(f, a))}" target="_blank" rel="noopener">${esc(a)} ↗</a>`).join("")}</div>` : ""}
        ${dubs.length ? `<p class="muted small dub-line">🗣️ Also in ${esc(dubs.join(", "))} (dubbed)</p>` : ""}
        ${leavingLine(f.lv)}
        ${cinemas ? `<div class="stream-line"><span class="muted small">🎬 ${out ? "In cinemas · book on" : `In cinemas ${fmtDate(f.rd)} · book on`}</span>${ticketLinks()}</div>` : ""}
        ${dueLine}
        ${f.ov ? `<p>${esc(f.ov)}</p>` : ""}
        <section class="quick-answers"><h2>⚡ Quick answers</h2><dl>${quickAnswers(f).map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl></section>
        ${castRow({ ...f, kind: f.k })}
        <div class="panel not-reviewed">
          <h3>🌶️ Not reviewed yet</h3>
          <p class="muted">We haven't given this one the Masala Meter treatment. Summary and rating are from TMDB.</p>
        </div>
        <div class="share-row">
          ${trailerBtn(f.tr, f.t, `${f.t} ${f.y || ""} ${tv ? "series" : ""} official trailer`)}
          <button class="btn primary" id="save" type="button"></button>
          <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}">Share on WhatsApp</a>
          <button class="btn" id="copy" type="button">Copy link</button>
        </div>
        ${extLinks({ im: f.im, wd: f.wd, tmdbUrl: `https://www.themoviedb.org/${tv ? `tv/${String(f.id).slice(2)}` : `movie/${f.id}`}` })}
      </article>
      <aside>
        ${f.p ? `<img class="side-poster" src="${tmdb(f.p, "w342")}" alt="${esc(f.t)} poster" loading="lazy" decoding="async">` : ""}
        <div class="side panel-watch">
          <h3>📺 Where to watch</h3>
          ${f.w.length
            ? `<p class="muted small">Included with subscription · ${f.w.every((a) => directUrl(f, a)) ? "opens the title in the app" : "opens the app's search where we don't have a direct link"}</p><div class="otts">${f.w.map((a) => `<a class="ott ott-${slug(a)}" href="${esc(appUrl(f, a))}" target="_blank" rel="noopener">${esc(a)} ↗</a>`).join("")}</div>`
            : cinemas
              ? `<p class="muted small">🎬 ${out ? "In cinemas now" : `In cinemas from ${fmtDate(f.rd)}`}, not streaming yet. Pick your city for showtimes and tickets:</p><div class="otts">${ticketLinks()}</div>`
              : `<p class="muted small">Not on a subscription app in India right now, as far as we know.</p>`}
          ${due ? `<p class="small"><strong>📅 OTT release:</strong> ${esc(ottDueText(f, due))}</p>` : ""}
          <p class="fine">From TMDB, updated ${fmtDate((man && man.built) || "")}${fix ? `, corrected ${fmtDate(fix.date)} from a reader's report` : ""}. Availability changes, so confirm in the app.</p>
        </div>
        <div class="side">
          <dl>
            <dt>Language</dt><dd>${esc(lang)}</dd>
            ${dubs.length ? `<dt>Dubbed in</dt><dd>${esc(dubs.join(", "))}</dd>` : ""}
            ${f.o ? `<dt>Original title</dt><dd>${esc(f.o)}</dd>` : ""}
            ${years ? `<dt>${tv ? "Years" : "Year"}</dt><dd>${years}${tv && !f.end ? " (still running)" : ""}</dd>` : ""}
            ${seasons ? `<dt>Seasons</dt><dd>${seasons}</dd>` : ""}
            ${f.r ? `<dt>${tv ? "Episode" : "Runtime"}</dt><dd>${tv ? `about ${f.r} min` : fmtRuntime(f.r)}</dd>` : ""}
            ${f.g.length ? `<dt>Genre</dt><dd>${esc(f.g.join(", "))}</dd>` : ""}
            ${f.c ? `<dt>Certificate</dt><dd>${esc(f.c)}</dd>` : ""}
            <dt>TMDB</dt><dd>${f.v}/10 · <a href="https://www.themoviedb.org/${tv ? `tv/${String(f.id).slice(2)}` : `movie/${f.id}`}" target="_blank" rel="noopener">${f.n.toLocaleString("en-IN")} votes</a></dd>
            ${/^tt\d+$/.test(f.im || "") ? `<dt>IMDb</dt><dd><a href="https://www.imdb.com/title/${f.im}/" target="_blank" rel="noopener">See rating on IMDb ↗</a></dd>` : ""}
          </dl>
        </div>
      </aside>
    </div>
    <div id="similar-slot"></div>`;

  document.getElementById("copy").onclick = async (e) => {
    try { await navigator.clipboard.writeText(pageUrl); e.target.textContent = "Copied!"; } catch { prompt("Copy this link:", pageUrl); }
  };
  renderMoreLike(document.getElementById("similar-slot"), f, `🍿 Liked ${f.t}? Try these`);
  root.querySelector(".panel-watch").after(reportBox(`c:${code}-${rawId}`, f.t, () => f.w));
  // Save to the watchlist (kept on this device, like saved reviews).
  const saveId = catSaveId(f);
  const save = document.getElementById("save");
  const paintSave = () => (save.textContent = inWatchlist(saveId) ? "✓ In your watchlist" : "♡ Save to watchlist");
  save.addEventListener("click", () => { toggleWatchlist(saveId, f); paintSave(); if (tv) syncAlerts(); });
  paintSave();

  root.insertAdjacentHTML("beforeend", `<section class="community" id="community"></section>`);
  initCommunity(`c:${code}-${rawId}`, document.getElementById("community"), f.t);
}

/* ---------- Actor / director page ---------- */
// person.html?id=<TMDB person id>. Their titles come from the catalogue's people index
// (assets/catalog/p/<id % shards>.json, shard count in manifest.json) plus our reviewed films (reviewed.json).
const PEOPLE_SHARDS = 64; // the older layout's people/<id % 64>.json
const PERSON_BIO_SHARDS = 256; // pb/<id % 256>.json, as scripts/build-catalog.mjs BIO_SHARDS

async function initPerson() {
  const root = document.getElementById("person");
  const pid = (new URLSearchParams(location.search).get("id") || "").match(/^\d{1,9}$/)?.[0];
  const notFound = () => { root.innerHTML = `<div class="empty">We couldn't find that person. <a href="films.html">Browse movies & series</a>.</div>`; };
  if (!pid) return notFound();
  const man = await loadCatalog("manifest");
  const v2 = man && man.layout >= 2;
  const [shard, reviewed, bios] = await Promise.all([
    loadCatalog(v2 ? `p/${pid % man.shards.p}` : `people/${pid % PEOPLE_SHARDS}`), loadCatalog("reviewed"),
    loadCatalog(`pb/${pid % PERSON_BIO_SHARDS}`)]);
  const p = shard && shard[pid];
  // Their details (pb/, fetched once from TMDB by the build): [bio, born, birthplace, died, main job].
  const [bio, born, birthplace, died, job] = (bios && bios[pid]) || [];

  // Our reviewed films with this person, as catalogue-style entries.
  const roleIn = (x) => {
    const c = (x.cast || []).find((c) => String(c[0]) === pid);
    if (c) return { role: c[2], name: c[1], photo: c[3] };
    const d = (x.dir || []).find((d) => String(d[0]) === pid);
    return d ? { role: "Director", name: d[1], photo: d[2] } : null;
  };
  const ours = Object.entries(reviewed || {}).map(([id, x]) => ({ m: movieById(id), r: roleIn(x) })).filter((o) => o.m && o.r);
  if (!p && !ours.length) return notFound();
  const name = p ? p[0] : ours[0].r.name;
  const photo = (p && p[1]) || (ours.find((o) => o.r.photo) || {}).r?.photo || "";

  // Layout 2 keeps each person's titles in their own entry; the older one only had "<lang>-<id>" keys.
  let found;
  if (v2) {
    found = (p ? p[2] : []).map(([l, id, t, y, tv, poster, v]) => ({ l, id, t, y, ...(tv ? { k: "tv" } : {}), p: poster, v, n: 0 }));
  } else {
    const keys = p ? p[2] : [];
    const index = keys.length ? await loadIndex([...new Set(keys.map((k) => k.split("-")[0]))]) : { films: [] };
    const byKey = Object.fromEntries(index.films.map((f) => [`${f.l}-${f.id}`, f]));
    found = keys.map((k) => byKey[k]).filter(Boolean);
  }
  const byTmdb = reviewedByTmdb();
  const titles = found.map((f) => ({ ...f, mine: f.k !== "tv" && byTmdb[f.id] }));
  // Add reviewed films the catalogue doesn't have.
  const have = new Set(titles.filter((f) => f.mine).map((f) => f.mine.id));
  ours.filter((o) => !have.has(o.m.id)).forEach(({ m }) => {
    const img = IMAGES[m.id] || {};
    titles.push({ id: img.tmdb || m.id, l: LANG_CODE[m.lang], t: m.title, y: m.year, g: m.genres, v: m.quality, n: 0, p: img.poster, w: streamsOn(m), mine: m });
  });
  titles.sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || (b.y || 0) - (a.y || 0));

  const movies = titles.filter((f) => f.k !== "tv").length;
  const series = titles.length - movies;
  const langs = [...new Set(titles.map((f) => langLabel(CAT_LANGS[f.l] || "")).filter(Boolean))];
  // About them: job, birth, a short bio; their best-known titles (the catalogue lists them most popular
  // first) and the newest one.
  const fmtDay = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const ageNow = born && !died ? Math.floor((Date.now() - new Date(born + "T00:00:00")) / 3.15576e10) : 0;
  const facts = [
    job === "Directing" ? "Director" : job === "Writing" ? "Writer" : job === "Acting" ? "Actor" : job,
    born ? `Born ${fmtDay(born)}${birthplace ? ` in ${birthplace}` : ""}${ageNow ? ` (age ${ageNow})` : ""}` : birthplace ? `From ${birthplace}` : "",
    died ? `Died ${fmtDay(died)}` : "",
  ].filter(Boolean).join(" · ");
  const knownFor = found.slice(0, 4);
  const thisYear = new Date().getFullYear();
  const latest = found.filter((f) => f.y && f.y <= thisYear + 1).sort((a, b) => b.y - a.y)[0];
  const titleLink = (f) => `<a href="${filmHref({ ...f, mine: f.k !== "tv" && byTmdb[f.id] })}">${esc(f.t)}</a>${f.y ? ` (${f.y})` : ""}`;
  const about = `
    ${facts ? `<p class="person-facts">${esc(facts)}</p>` : ""}
    ${bio ? `<p class="person-bio${bio.length > 320 ? " clamp" : ""}" id="pbio">${esc(bio)}</p>${bio.length > 320 ? `<button class="btn small" type="button" id="pbio-more">Read more</button>` : ""}` : ""}
    ${knownFor.length ? `<p class="person-known"><strong>Known for:</strong> ${knownFor.map(titleLink).join(", ")}</p>` : ""}
    ${latest ? `<p class="person-known"><strong>Latest:</strong> ${titleLink(latest)}</p>` : ""}`;
  document.title = `${name} Movies & Web Series: Full List, Where to Watch`; // as functions/person.js
  root.innerHTML = `
    <div class="person-head">
      ${photo ? `<img class="person-photo" src="${tmdb(photo, "w342")}" alt="${esc(name)}" decoding="async">` : `<span class="person-photo cast-none">${esc(name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(""))}</span>`}
      <div>
        <p class="eyebrow">Cast & crew</p>
        <h1>${esc(name)}</h1>
        <p class="lead">${movies ? `${movies} movie${movies === 1 ? "" : "s"}` : ""}${movies && series ? " and " : ""}${series ? `${series} series` : ""} on Masala Mischief${langs.length ? ` · ${esc(langs.join(", "))}` : ""}. ${have.size || ours.length ? "Our reviews first, then newest." : "Newest first."}</p>
        ${about}
        ${extLinks({ tmdbUrl: `https://www.themoviedb.org/person/${pid}` })}
      </div>
    </div>
    <div class="view-tabs chips" id="pview"></div>
    <div class="fgrid" id="pgrid"></div>`;
  const kinds = [["all", `All (${titles.length})`], ...(movies && series ? [["movie", `Movies (${movies})`], ["tv", `Series (${series})`]] : [])];
  let view = "all";
  const paint = () => {
    document.getElementById("pgrid").innerHTML = titles
      .filter((f) => view === "all" || (view === "tv" ? f.k === "tv" : f.k !== "tv"))
      .map((f) => filmCard(f)).join("") || `<div class="empty">Nothing here yet.</div>`;
  };
  if (kinds.length > 1) chips(document.getElementById("pview"), kinds, (v) => v === view, (v) => { view = v; paint(); });
  paint();
  document.getElementById("pbio-more")?.addEventListener("click", (e) => { document.getElementById("pbio").classList.remove("clamp"); e.currentTarget.remove(); });
}

/* ---------- List pages: New on <app>, Best-of lists, Upcoming ---------- */
// Built ahead of time by scripts/build-catalog.mjs into assets/catalog/lists/ (and upcoming.json), so
// each page loads one small file. functions/ott.js, best.js and upcoming.js put the same lists into the
// HTML for search engines.
const notReadyYet = (el) => { el.innerHTML = `<div class="empty">These lists are being prepared. Try again in a little while, or <a href="films.html">browse movies & series</a>.</div>`; };
const listLang = (l) => (l === "en" ? "Hollywood" : l === "ja" ? "anime" : CAT_LANGS[l] || "");

// "Best Malayalam thriller movies", "Best Tamil movies of 2025", "Best Korean drama series".
// Same wording as lib/lists.js (used for the page titles on the server).
function bestTitle(l, genre, year, kind, app) {
  const what = kind === "tv" ? "series" : "movies";
  const lang = listLang(l);
  if (year) return `Best ${lang} movies of ${year}`;
  return `Best ${lang}${genre ? ` ${genre.toLowerCase()}` : ""} ${what}${app ? ` on ${app}` : ""}`;
}

function addFilmControls(el, items, render) {
  const kinds = [...new Set(items.map((f) => (f.k === "tv" ? "tv" : "movie")))];
  const langs = [...new Set(items.map((f) => f.l))];
  const state = { k: "", l: "" };
  const paint = () => render(items.filter((f) => (!state.k || (state.k === "tv") === (f.k === "tv")) && (!state.l || f.l === state.l)));
  const opts = [
    ...(kinds.length > 1 ? [["k:", "All"], ["k:movie", "Movies"], ["k:tv", "Series"]] : []),
    ...(langs.length > 1 ? [["l:", "All languages"], ...langs.map((l) => [`l:${l}`, langLabel(CAT_LANGS[l])])] : []),
  ];
  if (opts.length) {
    chips(el, opts, (v) => { const [key, val] = v.split(":"); return state[key] === val; },
      (v) => { const [key, val] = v.split(":"); state[key] = val; paint(); });
  }
  paint();
}

async function initOtt() {
  const root = document.getElementById("ott");
  const appSlug = new URLSearchParams(location.search).get("app") || "";
  const [lists, index, leaving, top] = await Promise.all([loadCatalog("lists/ott"), loadCatalog("lists/index"), loadCatalog("leaving"), loadCatalog("top10")]);
  if (!lists || !index) return notReadyYet(root);
  const byTmdb = reviewedByTmdb();
  const withMine = (f) => ({ ...f, mine: f.k !== "tv" && byTmdb[f.id] });
  // 🔥 Top 10 this week (top10.json, weekly from JustWatch India's popularity): movies or series, on one
  // app, or on the overview page any app picked from chips. Drawn into #top10 after the page is.
  const topSection = (app) => {
    const rows = (top ? top.apps : []).filter((r) => !app || r.app === app);
    if (!rows.length) return "";
    return `<section id="top10"><div class="section-head"><h2>🔥 Top 10 ${app ? `on ${esc(app)} ` : "on OTT "}this week</h2></div>
      ${app ? "" : `<div class="chips" data-top="app">${rows.map((r, i) => `<button class="chip" type="button" data-v="${esc(r.app)}" aria-pressed="${i === 0}">${esc(r.app)}</button>`).join("")}</div>`}
      <div class="chips" data-top="kind"><button class="chip" type="button" data-v="movies" aria-pressed="true">Movies</button><button class="chip" type="button" data-v="series" aria-pressed="false">Series</button></div>
      <div class="fgrid" id="top10-grid"></div>
      <p class="fine">Most watched and searched in India this week, from JustWatch. Updated ${fmtDate(top.built)}.</p></section>`;
  };
  const mountTop = (app) => {
    const box = document.getElementById("top10");
    if (!box) return;
    const state = { app: app || top.apps[0].app, kind: "movies" };
    const draw = () => {
      const row = top.apps.find((r) => r.app === state.app) || {};
      if (!(row[state.kind] || []).length && (row.movies || []).length + (row.series || []).length) state.kind = state.kind === "movies" ? "series" : "movies";
      box.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === state[c.parentElement.dataset.top])));
      document.getElementById("top10-grid").innerHTML = (row[state.kind] || []).map((f, i) => filmCard(withMine(f), i + 1)).join("")
        || `<div class="empty">No ${state.kind} in the chart this week.</div>`;
    };
    box.addEventListener("click", (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      state[c.parentElement.dataset.top] = c.dataset.v;
      draw();
    });
    draw();
  };

  // ⏳ Leaving soon: well-known titles first within the next few weeks (soonest first), on one app or all.
  const leavingSection = (app) => {
    const items = (leaving ? leaving.items : []).filter((f) => (!app || f.lv[app]) && leavingText(f.lv, app));
    const known = items.filter((f) => f.n >= 50);
    const pick = (known.length >= 6 ? known : items).slice(0, 12);
    if (!pick.length) return "";
    return `<section id="leaving"><div class="section-head"><h2>⏳ Leaving ${app ? esc(app) : "OTT"} soon</h2></div>
      <p class="muted small" style="margin-top:-6px">Watch these before they go. Dates from JustWatch, checked weekly; apps sometimes extend them.</p>
      <div class="fgrid">${pick.map((f) => filmCard(withMine(f), 0, `⏳ Leaves ${leavingText(f.lv, app)}`)).join("")}</div></section>`;
  };
  const tabs = `<nav class="chips app-tabs" aria-label="Streaming apps">${index.ott.map(([s, name]) =>
    `<a class="chip" href="ott.html?app=${s}" aria-pressed="${s === appSlug}">${esc(name)}</a>`).join("")}</nav>`;
  const L = lists[appSlug];
  // By language (/ott?l=ml): every app's newest titles in that language, as lib/lists.js ottInLanguage().
  const langCode = new URLSearchParams(location.search).get("l") || "";
  const langWord = (c) => (c === "en" ? "Hollywood" : c === "ja" ? "Anime" : CAT_LANGS[c]);
  const langCodes = [...new Set(Object.values(lists).flatMap((x) => x.items.map((f) => f.l)))].filter((c) => CAT_LANGS[c]);
  const langChips = (on) => `<nav class="chips app-tabs" aria-label="Languages">${langCodes.map((c) =>
    `<a class="chip" href="ott.html?l=${c}" aria-pressed="${c === on}">${esc(langWord(c))}</a>`).join("")}</nav>`;

  if (!L && CAT_LANGS[langCode]) {
    const byKey = new Map();
    for (const x of Object.values(lists)) for (const f of x.items) {
      if (f.l !== langCode) continue;
      const k = `${f.l}-${f.id}`, had = byKey.get(k);
      byKey.set(k, had ? { ...had, w: [...new Set([...(had.w || []), ...(f.w || [])])] } : f);
    }
    const items = [...byKey.values()].sort((a, b) => (b.rd || "").localeCompare(a.rd || "") || (b.n || 0) - (a.n || 0)).slice(0, 60);
    const Lang = langWord(langCode);
    document.title = `New ${Lang} OTT Releases This Week: Movies & Web Series · Masala Mischief`;
    const grid = (list) => list.map((f) => filmCard(withMine(f), 0, f.rd ? `Released ${new Date(f.rd + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "")).join("");
    const movies = items.filter((f) => f.k !== "tv"), series = items.filter((f) => f.k === "tv");
    root.innerHTML = `
      <div class="page-head"><p class="eyebrow">📺 Streaming in India · updated daily</p><h1>New ${esc(Lang)} OTT releases</h1>
        <p class="lead">The newest ${esc(Lang)} movies and web series you can stream in India, latest first, on every app.</p></div>
      ${langChips(langCode)}
      ${movies.length ? `<section><div class="section-head"><h2>🎬 Movies</h2></div><div class="fgrid">${grid(movies)}</div></section>` : ""}
      ${series.length ? `<section><div class="section-head"><h2>📺 Web series</h2></div><div class="fgrid">${grid(series)}</div></section>` : ""}
      ${items.length ? "" : `<div class="empty">Nothing new in ${esc(Lang)} on OTT right now.</div>`}
      <p><a href="ott.html">All apps →</a></p>`;
    return;
  }

  if (!L) {
    document.title = "What's new on OTT in India: Netflix, Prime Video, JioHotstar and more · Masala Mischief";
    root.innerHTML = `
      <div class="page-head"><p class="eyebrow">📺 Streaming in India</p><h1>What's new on OTT</h1>
        <p class="lead">The newest movies and series on every big streaming app in India. Pick an app, or a language.</p></div>
      ${langChips("")}
      <div class="app-grid">${index.ott.map(([s, name, count]) => `
        <a class="app-tile" href="ott.html?app=${s}">
          <span class="ott ott-${slug(name)}">${esc(name)}</span>
          <span class="app-posters">${(lists[s]?.items || []).slice(0, 4).map((f) => f.p ? `<img src="${tmdb(f.p, "w154")}" alt="" loading="lazy">` : "").join("")}</span>
          <strong>New on ${esc(name)}</strong><span class="muted small">${count.toLocaleString("en-IN")} titles</span>
        </a>`).join("")}</div>
      ${topSection("")}
      ${leavingSection("")}`;
    if (top) mountTop("");
    // From the home page's tiles; the lists are drawn after the page loads.
    if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    return;
  }
  document.title = `New on ${L.name} India: latest movies & series · Masala Mischief`;
  const justAdded = NEW_ON_OTT.items.filter((n) => n.app === L.name);
  // Ranked lists per language on this app ("Best Hindi movies on Netflix"), from the best-of lists.
  const bestOnApp = Object.entries(index.best).flatMap(([code, b]) => {
    const r = (b.apps || []).find((row) => row[0] === appSlug);
    return !r ? [] : ["movie", "tv"].filter((kind) => r[kind === "tv" ? 3 : 2])
      .map((kind) => `<a href="best.html?l=${code}&app=${appSlug}${kind === "tv" ? "&k=tv" : ""}">${esc(bestTitle(code, "", "", kind, L.name))}</a>`);
  });
  root.innerHTML = `
    <div class="page-head"><p class="eyebrow">📺 Streaming in India</p><h1>New on ${esc(L.name)}</h1>
      <p class="lead">The newest movies and series you can stream on ${esc(L.name)} in India, latest releases first. ${L.count.toLocaleString("en-IN")} titles on ${esc(L.name)} in all.</p></div>
    ${tabs}
    ${topSection(L.name)}
    ${justAdded.length ? `<section><div class="section-head"><h2>🆕 Just added this week</h2></div><div class="new-ott">${justAdded.map(newOttItem).join("")}</div></section>` : ""}
    ${leavingSection(L.name)}
    <section>
      <div class="section-head"><h2>Latest releases on ${esc(L.name)}</h2></div>
      <div class="chips list-filter" id="ott-filter"></div>
      <div class="fgrid" id="ott-grid"></div>
      <div class="cta-row list-more">
        <a class="btn primary" href="films.html?a=${encodeURIComponent(L.name)}&s=rating">Top rated on ${esc(L.name)} →</a>
        <a class="btn" href="films.html?a=${encodeURIComponent(L.name)}">All ${L.count.toLocaleString("en-IN")} titles on ${esc(L.name)}</a>
      </div>
    </section>
    ${bestOnApp.length ? `<section class="more-lists"><h2>Best on ${esc(L.name)}</h2><p class="hub-links">${bestOnApp.join("")}</p></section>` : ""}`;
  addFilmControls(document.getElementById("ott-filter"), L.items.map(withMine),
    (items) => { document.getElementById("ott-grid").innerHTML = items.map((f) => filmCard(f)).join("") || `<div class="empty">Nothing here.</div>`; });
  if (top) mountTop(L.name);
}

async function initBest() {
  const root = document.getElementById("best");
  const p = new URLSearchParams(location.search);
  const l = p.get("l") || "";
  const g = p.get("g") || "";
  const y = p.get("y") || "";
  const k = p.get("k") === "tv" ? "tv" : "movie";
  const index = await loadCatalog("lists/index");
  if (!index) return notReadyYet(root);
  const info = index.best[l];
  const link = (q, text) => `<a href="best.html?${q}">${esc(text)}</a>`;

  if (!info) {
    document.title = "Best movies and series lists: Hindi, Tamil, Telugu, Malayalam, Korean and more · Masala Mischief";
    root.innerHTML = `
      <div class="page-head"><p class="eyebrow">🏆 Best-of lists</p><h1>Best movies & series</h1>
        <p class="lead">Ranked lists by language, genre and year, from thousands of ratings. Pick a list.</p></div>
      <div class="list-hub">${Object.entries(index.best).map(([code, b]) => `
        <div class="chart-box">
          <h3>${esc(langLabel(CAT_LANGS[code]))}</h3>
          <p class="hub-links">
            ${b.kinds.includes("movie") ? link(`l=${code}`, bestTitle(code, "", "", "movie")) : ""}
            ${b.kinds.includes("tv") ? link(`l=${code}&k=tv`, bestTitle(code, "", "", "tv")) : ""}
          </p>
          <p class="hub-links small">${b.genres.filter((r) => r[2]).slice(0, 8).map(([s, name]) => link(`l=${code}&g=${s}`, name)).join("")}</p>
          <p class="hub-links small">${b.years.slice(0, 6).map(([yr]) => link(`l=${code}&y=${yr}`, String(yr))).join("")}</p>
          ${(b.apps || []).length ? `<p class="hub-links small">${b.apps.slice(0, 6).map(([s, name, movies]) => link(`l=${code}&app=${s}${movies ? "" : "&k=tv"}`, `On ${name}`)).join("")}</p>` : ""}
        </div>`).join("")}</div>`;
    return;
  }
  // A per-app list (&app=netflix) is in its own file, best-<lang>-<app>.json.
  const app = p.get("app") || "";
  const apps = info.apps || [];
  const appRow = app && apps.find((r) => r[0] === app);
  const data = app && !appRow ? null : await loadCatalog(`lists/best-${l}${app ? `-${app}` : ""}`);
  const gInfo = g && data && data.genres[g];
  const list = !data ? null : y ? !app && data.years[y] : g ? gInfo && gInfo[k] : data.all[k];
  if (!list) { root.innerHTML = `<div class="empty">We couldn't find that list. <a href="best.html">See all lists</a>.</div>`; return; }
  const heading = bestTitle(l, gInfo ? gInfo.name : "", y, k, appRow ? appRow[1] : "");
  document.title = `${heading}${y || app ? "" : " of all time"}${app ? " India" : ""} · top ${list.length} · Masala Mischief`;
  const byTmdb = reviewedByTmdb();
  const lang = langLabel(CAT_LANGS[l]);
  const kindRows = info.genres.filter((r) => r[k === "tv" ? 3 : 2]);
  const ki = k === "tv" ? 3 : 2;
  const tvq = k === "tv" ? "&k=tv" : "";
  // Links to the same kind of list on each app ("Best Hindi movies on Netflix").
  const appLinks = (genre) => apps.filter((r) => r[0] !== app && (genre ? r[4].some((gr) => gr[0] === genre[0] && gr[ki]) : r[ki]))
    .map((r) => link(`l=${l}&app=${r[0]}${genre ? `&g=${genre[0]}` : ""}${tvq}`, bestTitle(l, genre ? genre[1] : "", "", k, r[1]))).join("");
  const appMore = appRow ? `
      <h2>More ${esc(lang)} on ${esc(appRow[1])}</h2>
      <p class="hub-links">
        ${["movie", "tv"].filter((kind) => appRow[kind === "tv" ? 3 : 2]).map((kind) => link(`l=${l}&app=${app}${kind === "tv" ? "&k=tv" : ""}`, bestTitle(l, "", "", kind, appRow[1]))).join("")}
        ${appRow[4].filter((r) => r[ki]).map(([s, name]) => link(`l=${l}&app=${app}&g=${s}${tvq}`, bestTitle(l, name, "", k, appRow[1]))).join("")}
      </p>` : "";
  const otherApps = y ? "" : appLinks(gInfo ? [g, gInfo.name] : null);
  root.innerHTML = `
    <div class="page-head"><p class="eyebrow">🏆 ${esc(lang)}${appRow ? ` · ${esc(appRow[1])}` : ""} · top ${list.length}</p><h1>${esc(heading)}</h1>
      <p class="lead">${appRow ? `The best ${esc(lang)} ${k === "tv" ? "series" : "movies"} you can stream on ${esc(appRow[1])} in India right now. ` : ""}Ranked by a weighted TMDB rating, so a film with a handful of perfect votes can't beat a well-loved classic.
        Tap any title for the trailer, cast and where to stream it in India.</p></div>
    <div class="fgrid">${list.map((f, i) => filmCard({ ...f, mine: f.k !== "tv" && byTmdb[f.id] }, i + 1)).join("")}</div>
    <section class="more-lists">
      ${appMore}
      ${otherApps ? `<h2>${appRow ? "On other apps" : "By streaming app"}</h2><p class="hub-links">${otherApps}</p>` : ""}
      <h2>More ${esc(lang)} lists</h2>
      <p class="hub-links">
        ${info.kinds.map((kind) => link(`l=${l}${kind === "tv" ? "&k=tv" : ""}`, bestTitle(l, "", "", kind))).join("")}
        ${kindRows.map(([s, name]) => link(`l=${l}&g=${s}${k === "tv" ? "&k=tv" : ""}`, bestTitle(l, name, "", k))).join("")}
        ${info.years.map(([yr]) => link(`l=${l}&y=${yr}`, bestTitle(l, "", yr, "movie"))).join("")}
      </p>
      ${g ? `<h2>${esc(gInfo.name)} in other languages</h2><p class="hub-links">${Object.entries(index.best)
        .filter(([code, b]) => code !== l && b.genres.some((r) => r[0] === g && r[k === "tv" ? 3 : 2]))
        .map(([code]) => link(`l=${code}&g=${g}${k === "tv" ? "&k=tv" : ""}`, bestTitle(code, gInfo.name, "", k))).join("")}</p>` : ""}
      <p><a href="best.html">All best-of lists →</a></p>
    </section>`;
}

// Two tabs on one page: ?show=now is "In theatres now", otherwise "Coming soon". Either takes ?l=<lang>.
async function initUpcoming() {
  const root = document.getElementById("upcoming");
  const params = new URLSearchParams(location.search);
  const l = params.get("l") || "";
  const data = await loadCatalog("upcoming");
  if (!data) return notReadyYet(root);
  const showNow = params.get("show") === "now" || (location.hash === "#now" && !params.has("show"));
  const allNow = data.now || [];
  const langs = [...new Set((showNow ? allNow : data.items).map((f) => f.l))];
  const lang = CAT_LANGS[l] ? langLabel(CAT_LANGS[l]) : "";
  const heading = showNow ? `${lang ? `${lang} movies` : "Movies"} in theatres now` : `Upcoming ${lang ? `${lang} ` : ""}movies`;
  document.title = showNow ? `${heading}: book tickets & OTT release dates · Masala Mischief` : `${heading}: release dates and trailers · Masala Mischief`;
  const items = showNow ? [] : data.items.filter((f) => !l || f.l === l);
  const now = showNow ? allNow.filter((f) => !l || f.l === l) : [];
  const href = (show, code) => {
    const q = new URLSearchParams();
    if (show) q.set("show", "now");
    if (code) q.set("l", code);
    return `upcoming.html${q.toString() ? `?${q}` : ""}`;
  };
  const count = (list) => list.filter((f) => !l || f.l === l).length;
  const showDay = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const theatres = now.length ? `
    <section id="now">
      <div class="booking-row">${ticketLinks()}</div>
      <div class="ulist">${now.map((f) => {
        const name = f.pg ? `<a href="film.html?id=${f.l}-${f.id}">${esc(f.t)}</a>` : esc(f.t);
        const due = ottDue({ l: f.l, rd: f.d, od: f.od, oa: f.oa });
        return `
        <article class="ucard" id="n-${f.l}-${f.id}">
          ${f.p ? `<img src="${tmdb(f.p, "w185")}" alt="${esc(f.t)} poster" loading="lazy" decoding="async">` : `<span class="fposter-none">🎬</span>`}
          <div class="ucard-body">
            <span class="udate">Out ${showDay(f.d)}</span>
            <strong>${name}</strong>
            <span class="muted small">${esc(langLabel(CAT_LANGS[f.l]))}${f.g.length ? ` · ${esc(f.g.slice(0, 2).join(", "))}` : ""}${f.c ? ` · ${esc(f.c)}` : ""}${f.v ? ` · ★ ${f.v}` : ""}</span>
            ${f.cast.length ? `<span class="small">With ${f.cast.map(([id, n]) => `<a href="person.html?id=${id}">${esc(n)}</a>`).join(", ")}</span>` : ""}
            ${due ? `<span class="small ott-due-chip">📅 OTT: ${esc(ottDueShort(due))}</span>` : ""}
            ${f.tr ? trailerBtn(f.tr, f.t) : ""}
          </div>
        </article>`;
      }).join("")}</div>
    </section>` : "";
  const month = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const groups = {};
  items.forEach((f) => (groups[month(f.d)] = groups[month(f.d)] || []).push(f));
  root.innerHTML = `
    <nav class="view-tabs" aria-label="In theatres or coming soon">
      <a href="${href(true, l)}" aria-current="${showNow ? "page" : "false"}">🎟️ In theatres <small>${count(allNow)}</small></a>
      <a href="${href(false, l)}" aria-current="${showNow ? "false" : "page"}">🗓️ Coming soon <small>${count(data.items)}</small></a>
    </nav>
    <div class="page-head"><h1>${esc(heading)}</h1>
      <p class="lead">${showNow
        ? `${lang ? `${esc(lang)} films` : "Films"} in Indian cinemas and not streaming yet. Book tickets to pick your city, cinema and showtime. 📅 OTT dates are the announced ones where known, otherwise our estimate.`
        : `The most-awaited ${lang ? `${esc(lang)} ` : ""}films of the next few months, with release dates and trailers. Dates can move, so check closer to release.`}</p></div>
    <nav class="chips app-tabs" aria-label="Languages">
      <a class="chip" href="${href(showNow, "")}" aria-pressed="${!l}">All</a>
      ${langs.map((c) => `<a class="chip" href="${href(showNow, c)}" aria-pressed="${c === l}">${esc(langLabel(CAT_LANGS[c]))}</a>`).join("")}
    </nav>
    ${theatres || (showNow ? `<div class="empty">Nothing ${lang ? `in ${esc(lang)} ` : ""}in theatres right now that we know of. <a href="${href(false, l)}">See what's coming soon</a>.</div>` : "")}
    ${Object.entries(groups).map(([m, list]) => `
      <section><div class="section-head"><h2>🗓️ ${esc(m)}</h2></div>
        <div class="ulist">${list.map((f) => `
          <article class="ucard" id="u-${f.l}-${f.id}">
            ${f.p ? `<img src="${tmdb(f.p, "w185")}" alt="${esc(f.t)} poster" loading="lazy" decoding="async">` : `<span class="fposter-none">🎬</span>`}
            <div class="ucard-body">
              <span class="udate">${new Date(f.d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
              <strong>${esc(f.t)}</strong>
              <span class="muted small">${esc(langLabel(CAT_LANGS[f.l]))}${f.g.length ? ` · ${esc(f.g.slice(0, 2).join(", "))}` : ""}</span>
              ${f.cast.length ? `<span class="small">With ${f.cast.map(([id, name]) => `<a href="person.html?id=${id}">${esc(name)}</a>`).join(", ")}</span>` : ""}
              ${f.tr ? trailerBtn(f.tr, f.t) : ""}
            </div>
          </article>`).join("")}</div>
      </section>`).join("") || (showNow ? "" : `<div class="empty">No upcoming films found right now.</div>`)}`;
  // The list arrives after the page loads, so jump to a film's card (#u-…, from search) once it's drawn.
  if (location.hash.length > 4) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

/* ---------- OTT releases this week (ott-this-week.html) ----------
   New on OTT: the daily JustWatch strip (NEW_ON_OTT, films added in the last 7 days), matched to the
   catalogue's search index for posters and film pages. Coming to OTT: announced dates (upcoming.json
   `soon`, and films in cinemas with od), then estimates for films in cinemas. Plus a ready-made
   WhatsApp post (text and Story image) of the top 5 of each, for the channel or any group. */
// A film in the catalogue by title and year ([lang, id, title, year, series?, poster, votes, rating]), or null.
async function catalogueMatch(title, year, code) {
  const t = searchNorm(title);
  const word = t.split(" ").find((w) => w.length >= 2 && !SEARCH_STOP.has(w));
  const rows = word ? await loadCatalog(`s/${word.slice(0, 2)}`) : null;
  const hits = (rows || []).filter((r) => !r[4] && searchNorm(r[2]) === t && (!year || !r[3] || Math.abs(r[3] - year) <= 1));
  return hits.sort((a, b) => (b[0] === code) - (a[0] === code) || b[6] - a[6])[0] || null;
}

const shortDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

async function weekData() {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = new Date().getFullYear();
  const byTmdb = reviewedByTmdb();
  const fresh = await Promise.all(NEW_ON_OTT.items.map(async (n) => {
    const code = LANG_CODE[n.lang] || "";
    const m = await catalogueMatch(n.title, n.year, code);
    const l = code || (m && m[0]) || "";
    return {
      t: n.title, y: n.year, l, app: n.app, date: n.added, url: n.url, note: n.note || "",
      p: m && m[5], votes: (m && m[6]) || 0, recent: n.year >= thisYear - 1,
      href: m ? filmHref({ l: m[0], id: m[1], mine: !m[4] && byTmdb[m[1]] }) : "",
    };
  }));
  // Newest films first (a 2026 release beats a 1990s classic), then Indian films, then the best-known.
  const indian = (l) => l && !["en", "ko", "ja"].includes(l);
  const top = [...fresh].sort((a, b) => b.recent - a.recent || indian(b.l) - indian(a.l) || b.votes - a.votes);

  const up = (await loadCatalog("upcoming")) || {};
  // How well-known (TMDB votes; older files only have a rating for the better-known ones).
  const known = (f) => f.n || (f.v ? 10 : 0);
  const soon = (up.soon || []).map((f) => ({ t: f.t, l: f.l, date: f.d, app: f.a || "", p: f.p, href: `film.html?id=${f.l}-${f.id}`, sure: true, n: known(f) }));
  const have = new Set(soon.map((f) => f.href));
  for (const f of up.now || []) {
    const href = f.pg ? `film.html?id=${f.l}-${f.id}` : "";
    if (href && have.has(href)) continue;
    const due = ottDue({ l: f.l, rd: f.d, od: f.od, oa: f.oa }, today);
    // Estimates in the next 6 weeks; ones overdue by 2+ weeks probably have no OTT deal yet.
    if (!due || (!due.sure && (due.date > addDays(today, 42) || due.date < addDays(today, -14)))) continue;
    soon.push({ t: f.t, l: f.l, date: due.date, app: due.app, p: f.p, href, sure: due.sure, est: !due.sure, cinema: f.d, n: known(f) });
  }
  // Announced dates first, by date; then estimates, by date.
  soon.sort((a, b) => (a.est ? 1 : 0) - (b.est ? 1 : 0) || a.date.localeCompare(b.date));
  // For sharing: announced dates, then the best-known of the estimates.
  const share = [...soon.filter((f) => !f.est), ...soon.filter((f) => f.est).sort((a, b) => b.n - a.n || a.date.localeCompare(b.date))];
  return { fresh: top, soon, share, checked: NEW_ON_OTT.checked };
}

const WEEK_URL = "https://masalamischief.in/ott-this-week";
const soonWhen = (f) => f.est
  ? (f.date > new Date().toISOString().slice(0, 10) ? `expected ${roughly(f.date).replace(/ \d{4}$/, "")}` : "due any day")
  : `${shortDay(f.date)}${f.app ? ` on ${f.app}` : ""}`;
function weekMessage(kind, list, langName, l) {
  const five = list.slice(0, 5);
  const lines = kind === "new"
    ? [`📺 *Top ${five.length} new on OTT this week*${langName ? ` (${langName})` : ""}`, "", ...five.map((f, i) => `${i + 1}. *${f.t}*${f.y ? ` (${f.y})` : ""} – ${f.app}`)]
    : [`🍿 *${five.length} films coming to OTT soon*${langName ? ` (${langName})` : ""}`, "", ...five.map((f, i) => `${i + 1}. *${f.t}* – ${soonWhen(f)}${f.est ? " (in cinemas now)" : ""}`)];
  return [...lines, "", `Full list with direct links 👉 ${WEEK_URL}${l ? `?l=${l}` : ""}`].join("\n");
}
async function weekCard(kind, list, langName) {
  const { c, g, W, H } = await storyCanvas(900);
  const five = list.slice(0, 5);
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = "#fff3dc"; g.font = "800 76px 'Baloo 2', sans-serif";
  g.fillText(kind === "new" ? "New on OTT this week" : "Coming to OTT soon", W / 2, 300);
  g.fillStyle = "#f6b73c"; g.font = "700 36px Inter, sans-serif";
  g.fillText(`${langName ? `${langName} · ` : ""}${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, W / 2, 360);
  const posters = await Promise.all(five.map((f) => (f.p ? loadImage(tmdb(f.p, "w185")).catch(() => null) : null)));
  const rowH = 250, x0 = 80, pw = 140, ph = 210;
  let y = 430;
  five.forEach((f, i) => {
    g.fillStyle = "rgba(255,243,220,0.07)";
    g.beginPath(); g.roundRect(x0 - 20, y - 20, W - 2 * (x0 - 20), rowH - 10, 28); g.fill();
    g.fillStyle = "#3a2a2e"; g.beginPath(); g.roundRect(x0, y, pw, ph, 16); g.fill();
    if (posters[i]) { g.save(); g.beginPath(); g.roundRect(x0, y, pw, ph, 16); g.clip(); g.drawImage(posters[i], x0, y, pw, ph); g.restore(); }
    const tx = x0 + pw + 40, tw = W - tx - 80;
    g.textAlign = "left";
    g.fillStyle = "#d7263d"; g.font = "800 44px 'Baloo 2', sans-serif"; g.fillText(`${i + 1}`, tx, y + 50);
    g.fillStyle = "#fff3dc"; g.font = "800 50px 'Baloo 2', sans-serif";
    const tl = wrapLines(g, f.t, tw - 50, 2);
    tl.forEach((l, j) => g.fillText(l, tx + 50, y + 52 + j * 52));
    const meta = kind === "new" ? `on ${f.app}${f.y ? ` · ${f.y}` : ""}` : soonWhen(f);
    g.fillStyle = "#f6b73c"; g.font = "700 36px Inter, sans-serif"; g.fillText(meta, tx + 50, y + 70 + tl.length * 52);
    const sub = kind === "new" ? (f.l ? langLabel(CAT_LANGS[f.l] || "") : "") : f.est ? "In cinemas now · date not announced" : `${f.l ? langLabel(CAT_LANGS[f.l] || "") : ""}`;
    if (sub) { g.fillStyle = "#c9b8ad"; g.font = "600 32px Inter, sans-serif"; g.fillText(sub, tx + 50, y + 116 + tl.length * 52); }
    y += rowH;
  });
  g.textAlign = "center";
  g.fillStyle = "#f6b73c"; g.font = "700 36px Inter, sans-serif";
  g.fillText("Full list & direct links", W / 2, H - 130);
  g.fillStyle = "#fff3dc"; g.font = "800 46px 'Baloo 2', sans-serif";
  g.fillText("masalamischief.in/ott-this-week", W / 2, H - 70);
  return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.9));
}

async function initWeek() {
  const root = document.getElementById("week");
  const l = new URLSearchParams(location.search).get("l") || "";
  const { fresh, soon, share, checked } = await weekData();
  const langName = CAT_LANGS[l] ? langLabel(CAT_LANGS[l]) : "";
  const pick = (list) => list.filter((f) => !l || f.l === l);
  const newList = pick(fresh), soonList = pick(soon), shareSoon = pick(share);
  const langs = [...new Set([...fresh, ...soon].map((f) => f.l).filter((c) => CAT_LANGS[c]))];
  document.title = `${langName ? `${langName} ` : ""}OTT Releases This Week in India: New Movies on Netflix, Prime Video & More · Masala Mischief`;
  const card = (f, kind) => `
    <article class="ucard">
      ${f.p ? `<img src="${tmdb(f.p, "w185")}" alt="${esc(f.t)} poster" loading="lazy" decoding="async">` : `<span class="fposter-none">🎬</span>`}
      <div class="ucard-body">
        <span class="udate">${kind === "new" ? `Added ${shortDay(f.date)}` : f.est ? `Expected ${esc(soonWhen(f).replace(/^expected /, ""))}` : `📅 ${shortDay(f.date)}`}</span>
        <strong>${f.href ? `<a href="${f.href}">${esc(f.t)}</a>` : esc(f.t)}</strong>
        <span class="muted small">${[f.l && langLabel(CAT_LANGS[f.l] || ""), kind === "new" ? f.y : "", kind === "new" && f.recent ? "🆕 New film" : "", f.est ? `in cinemas since ${shortDay(f.cinema)}` : ""].filter(Boolean).map(esc).join(" · ")}</span>
        ${kind === "new" && f.note ? `<span class="small">${esc(f.note)}</span>` : ""}
        ${kind === "new" ? `<div class="otts"><a class="ott ott-${slug(f.app)}" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.app)} ↗</a></div>`
          : f.app ? `<div class="otts"><span class="ott ott-${slug(f.app)}">${esc(f.app)}</span></div>` : f.est ? `<span class="small muted">Date not announced yet</span>` : ""}
      </div>
    </article>`;
  root.innerHTML = `
    <div class="page-head"><h1>📺 ${langName ? `${esc(langName)} ` : ""}OTT releases this week</h1>
      <p class="lead">What just arrived on Netflix, Prime Video, JioHotstar, ZEE5, SonyLIV and more in India, and the cinema films coming to OTT next. Updated daily · ${fmtDate(checked)}.</p>
      <p><a class="btn small" href="#wa-post">📲 Share this list on WhatsApp</a></p></div>
    <nav class="chips app-tabs" aria-label="Languages">
      <a class="chip" href="ott-this-week.html" aria-pressed="${!l}">All</a>
      ${langs.map((c) => `<a class="chip" href="ott-this-week.html?l=${c}" aria-pressed="${c === l}">${esc(langLabel(CAT_LANGS[c]))}</a>`).join("")}
    </nav>
    <section><div class="section-head"><h2>🆕 New on OTT this week</h2></div>
      ${newList.length ? `<div class="ulist">${newList.map((f) => card(f, "new")).join("")}</div>` : `<div class="empty">Nothing new ${langName ? `in ${esc(langName)} ` : ""}this week yet. <a href="ott-this-week.html">See all languages</a>.</div>`}
    </section>
    <section><div class="section-head"><h2>📅 Coming to OTT soon</h2></div>
      <p class="muted small">Announced dates first; then our estimate for films still in cinemas (Hindi films usually stream about 8 weeks after release, South Indian films about 4).</p>
      ${soonList.length ? `<div class="ulist">${soonList.map((f) => card(f, "soon")).join("")}</div>` : `<div class="empty">No OTT dates ${langName ? `for ${esc(langName)} films ` : ""}in the next few weeks yet. <a href="upcoming.html?show=now">See what's in cinemas</a>.</div>`}
    </section>
    <section class="wa-post panel" id="wa-post">
      <h2>📲 Share this week's picks</h2>
      <p class="muted small">A ready-made post for your WhatsApp channel, groups or Status: copy the message, or share it as an image.</p>
      <div class="view-tabs" id="wa-kind">
        <button type="button" data-k="new" aria-pressed="true">🆕 Top 5 new</button>
        <button type="button" data-k="soon" aria-pressed="false">🍿 5 coming soon</button>
      </div>
      <textarea id="wa-text" rows="9" readonly aria-label="Message to share"></textarea>
      <div class="cta-row">
        <button class="btn primary" type="button" id="wa-copy">📋 Copy message</button>
        <button class="btn" type="button" id="wa-image">📸 Share as image</button>
        <a class="btn wa-btn" id="wa-send" target="_blank" rel="noopener">💬 Send on WhatsApp</a>
      </div>
    </section>
    <a class="wa-follow" href="${WHATSAPP_CHANNEL}" target="_blank" rel="noopener">
      <span class="wa-icon" aria-hidden="true">💬</span>
      <span><strong>Get this every week</strong><span>Follow Masala Mischief on WhatsApp for new OTT releases.</span></span>
      <span class="wa-go">Follow</span>
    </a>`;

  // The share box: message and image for the chosen list.
  let kind = newList.length ? "new" : "soon";
  const listFor = () => (kind === "new" ? newList : shareSoon);
  const paint = () => {
    document.querySelectorAll("#wa-kind [data-k]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.k === kind));
    const text = listFor().length ? weekMessage(kind, listFor(), langName, l) : "";
    document.getElementById("wa-text").value = text || "Nothing to share in this list yet.";
    document.getElementById("wa-send").href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    ["wa-copy", "wa-image"].forEach((id) => (document.getElementById(id).disabled = !text));
  };
  document.getElementById("wa-kind").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { kind = b.dataset.k; paint(); } });
  document.getElementById("wa-copy").addEventListener("click", async (e) => {
    const text = document.getElementById("wa-text").value;
    try { await navigator.clipboard.writeText(text); e.target.textContent = "✓ Copied"; setTimeout(() => (e.target.textContent = "📋 Copy message"), 2000); }
    catch { document.getElementById("wa-text").select(); }
  });
  document.getElementById("wa-image").addEventListener("click", (e) => shareImage(() => weekCard(kind, listFor(), langName),
    `ott-${kind === "new" ? "this-week" : "coming-soon"}.jpg`, e.currentTarget, document.getElementById("wa-text").value, "OTT releases card"));
  paint();
}

renderChrome();
freshenWatch(); // the saved where-to-watch now; the latest one in the background
({ home: initHome, reviews: initReviews, review: initReview, suggest: initSuggest, family: initFamily, group: initGroup, films: initFilms, film: initFilm, person: initPerson, ott: initOtt, best: initBest, upcoming: initUpcoming, week: initWeek }[document.body.dataset.page] || (() => {}))();
