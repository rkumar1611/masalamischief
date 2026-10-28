// Shared rendering for every page. Each HTML page sets <body data-page="...">.

const NAV = [
  { href: "index.html", label: "Home", page: "home" },
  { href: "reviews.html", label: "Reviews", page: "reviews" },
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
const watchlist = () => store.get("watchlist", []);
const inWatchlist = (id) => watchlist().includes(id);
function toggleWatchlist(id) {
  const list = watchlist();
  store.set("watchlist", list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  return !list.includes(id);
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
  const links = NAV.map((n) =>
    `<a href="${n.href}" class="${n.page === page ? "active" : ""}">${n.label}${n.soon ? '<span class="soon">soon</span>' : ""}</a>`
  ).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="site-header"><div class="wrap">
      <a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">🌶️</span>Masala <span>Mischief</span></a>
      <button class="theme-btn search-btn" id="search-btn" type="button" aria-label="Search movies and series" aria-expanded="false">🔍</button>
      <button class="theme-btn" id="theme-btn" type="button" aria-label="Switch light or dark mode"></button>
      <nav class="nav" aria-label="Main">${links}</nav>
      <div class="site-search" id="site-search" hidden>
        <form id="site-search-form" role="search">
          <input type="search" id="site-q" placeholder="Search movies & series…" autocomplete="off" aria-label="Search movies and series">
        </form>
        <div class="site-results" id="site-results"></div>
      </div>
    </div></header>`);
  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site-footer"><div class="wrap">
      <div>
        <a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">🌶️</span>Masala <span>Mischief</span></a>
        <p>Indian and Hollywood film reviews with extra chilli.</p>
      </div>
      <div class="footer-links">
        <a href="reviews.html">Reviews</a><a href="suggest.html">What should I watch?</a>
        <a href="family.html">Family Picks</a><a href="reviews.html?saved=1">My watchlist</a>
        <a href="privacy.html">Privacy & community rules</a>
      </div>
      <p class="fine">🌶️ Masala Meter = entertainment · score out of 10 = craft. Streaming info from JustWatch India, checked ${fmtDate(WATCH_CHECKED)}; availability changes, so confirm in the app.<br>${Object.keys(IMAGES).length ? `Film images from <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.<br>` : ""}© ${new Date().getFullYear()} Masala Mischief.</p>
    </div></footer>`);

  const btn = document.getElementById("theme-btn");
  const paint = () => (btn.textContent = currentTheme() === "dark" ? "☀️" : "🌙");
  paint();
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next); store.set("theme", next); paint();
  });
  initSiteSearch();
}

// Header search over our reviews and the whole catalogue. The catalogue loads on first use only.
function initSiteSearch() {
  const box = document.getElementById("site-search");
  const btn = document.getElementById("search-btn");
  const q = document.getElementById("site-q");
  const out = document.getElementById("site-results");
  const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
  let items = null;

  async function load() {
    if (items) return items;
    const cat = await loadIndex();
    const byTmdb = reviewedByTmdb();
    const list = (cat ? cat.films : []).map((f) => ({ ...f, mine: byTmdb[f.id] }));
    const have = new Set(list.filter((f) => f.mine).map((f) => f.mine.id));
    MOVIES.forEach((m) => { if (!have.has(m.id)) list.push({ id: m.id, l: LANG_CODE[m.lang], t: m.title, y: m.year, n: 1e9, p: (IMAGES[m.id] || {}).poster, mine: m }); });
    return (items = list.map((f) => ({ ...f, key: norm(`${f.t} ${f.o || ""}`) })));
  }
  const open = (show) => {
    box.hidden = !show;
    btn.setAttribute("aria-expanded", show);
    if (show) { q.focus(); load(); } else { q.value = ""; out.innerHTML = ""; }
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
      const term = norm(q.value.trim());
      if (term.length < 2) { out.innerHTML = ""; return; }
      const all = await load();
      const hits = all.filter((f) => f.key.includes(term))
        .sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || (b.key.startsWith(term) ? 1 : 0) - (a.key.startsWith(term) ? 1 : 0) || b.n - a.n)
        .slice(0, 8);
      out.innerHTML = hits.length
        ? hits.map((f) => `
            <a class="sr" href="${filmHref(f)}">
              ${f.p ? `<img src="${tmdb(f.p, "w92")}" alt="" loading="lazy">` : `<span class="sr-none">🎬</span>`}
              <span><strong>${esc(f.t)}</strong>
              <span class="muted small">${esc(langLabel(CAT_LANGS[f.l] || ""))}${f.k === "tv" ? " · Series" : ""}${f.y ? ` · ${f.y}` : ""}${f.mine ? " · 🌶️ Reviewed" : ""}</span></span>
            </a>`).join("") + `<a class="sr-all" href="films.html?q=${encodeURIComponent(q.value.trim())}">See all results →</a>`
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

function poster(m, big = false) {
  const icon = GENRE_ICONS[m.genres[0]] || "🎬";
  const still = m.still || (IMAGES[m.id] && IMAGES[m.id].backdrop);
  return `<div class="poster lang-${m.lang}${big ? " big" : ""}${still ? " has-img" : ""}">
      ${still ? `<img class="poster-img" src="${tmdb(still, big ? "w1280" : "w780")}" alt="" loading="${big ? "eager" : "lazy"}" decoding="async">` : ""}
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
  el.innerHTML = NEW_ON_OTT.items.map((n) => `
    <a class="new-item" href="${esc(n.url)}" target="_blank" rel="noopener" title="Watch ${esc(n.title)} on ${esc(n.app)}">
      <span class="ott ott-${slug(n.app)}">${esc(n.app)} ↗</span>
      <strong>${esc(n.title)}</strong>
      <span class="muted small">${n.lang ? `${esc(langLabel(n.lang))} · ` : ""}${n.year}${n.kids ? " · 👪 Kids" : ""}</span>
      ${n.note ? `<span class="new-note">${esc(n.note)}</span>` : ""}
      <span class="muted small new-date">Added ${new Date(n.added + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
    </a>`).join("");
}

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

  const saved = watchlist().map(movieById).filter(Boolean);
  if (saved.length) {
    document.getElementById("saved-section").hidden = false;
    document.getElementById("saved").innerHTML = saved.slice(0, 4).map((m) => card(m)).join("");
  }
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
      (!savedOnly.checked || saved.includes(m.id)) &&
      (!familyOnly.checked || PARENT_NOTES[m.id]) &&
      (!term || [m.title, m.lang, langLabel(m.lang), ...m.genres].join(" ").toLowerCase().includes(term))
    );
    const sorters = {
      latest: (a, b) => b.reviewed.localeCompare(a.reviewed),
      masala: (a, b) => b.masala - a.masala || b.quality - a.quality,
      quality: (a, b) => b.quality - a.quality || b.masala - a.masala,
      year: (a, b) => b.year - a.year,
      short: (a, b) => a.runtime - b.runtime,
    };
    list.sort(sorters[sort.value]);
    count.textContent = `${list.length} film${list.length === 1 ? "" : "s"}`;
    out.innerHTML = list.length
      ? list.map((m) => card(m)).join("")
      : `<div class="empty">${savedOnly.checked && !saved.length ? "Your watchlist is empty. Tap “Save” on any review to add it." : "No reviews match that yet. Try loosening a filter."}</div>`;
  }
  [q, lang, ott, sort, savedOnly, familyOnly].forEach((el) => el.addEventListener("input", draw));
  draw();
}

/* ---------- Single review ---------- */
function initReview() {
  const id = new URLSearchParams(location.search).get("id");
  const m = movieById(id);
  const root = document.getElementById("review");
  if (!m) {
    root.innerHTML = `<div class="empty">We couldn't find that review. <a href="reviews.html">See all reviews</a>.</div>`;
    return;
  }
  document.title = `${m.title} review · Masala Mischief`;
  const dubs = m.audio.filter((a) => a !== m.lang);
  const shareText = `${m.title}: ${m.masala}/5 on the Masala Meter, ${m.quality}/10 overall. ${m.tagline}`;
  const pageUrl = location.href;
  const watch = WATCH[m.id] || { stream: [], rent: [] };
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
        ${watch.stream.length ? `<div class="stream-line"><span class="muted small">📺 Streaming on</span>${platformLinks(m, watch.stream)}</div>` : ""}
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

        <div class="share-row">
          <a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.title} ${m.year} official trailer`)}">▶ Watch trailer</a>
          <a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}">Share on WhatsApp</a>
          <button class="btn" id="save" type="button"></button>
          <button class="btn" id="copy" type="button">Copy link</button>
        </div>
      </article>
      <aside>
        ${IMAGES[m.id] && IMAGES[m.id].poster ? `<img class="side-poster" src="${tmdb(IMAGES[m.id].poster, "w342")}" alt="${esc(m.title)} poster" loading="lazy" decoding="async">` : ""}
        <div class="side panel-watch">
          <h3>📺 Where to watch</h3>
          ${watch.stream.length
            ? `<p class="muted small">Included with subscription · tap to open</p>${platformLinks(m, watch.stream)}`
            : `<p class="muted small">Not on a subscription service in India right now.</p>`}
          ${watch.rent.length ? `<p class="muted small" style="margin-top:12px">Rent or buy</p>${platformLinks(m, watch.rent)}` : ""}
          <p class="fine">Checked ${fmtDate(WATCH_CHECKED)}. Availability changes, so confirm in the app.</p>
        </div>
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
    <section>
      <div class="section-head"><h2>More like this mood</h2></div>
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

  root.insertAdjacentHTML("beforeend", `<section class="community" id="community"></section>`);
  initCommunity(`r:${m.id}`, document.getElementById("community"), m.title);

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
  document.getElementById("surprise").addEventListener("click", () => {
    const pool = matches();
    if (pool.length) location.href = `review.html?id=${pool[Math.floor(Math.random() * pool.length)].m.id}`;
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
    const cat = await loadIndex([...state.langs].map((l) => LANG_CODE[l]));
    const section = document.getElementById("cat-section");
    if (!cat) { section.hidden = true; return; }
    const byTmdb = reviewedByTmdb();
    const codes = new Set([...state.langs].map((l) => LANG_CODE[l]));
    const picks = weightedRank(cat.films.filter((f) =>
      !byTmdb[f.id] &&
      fitsMood(f, state.mood) &&
      (!codes.size || codes.has(f.l)) &&
      (!state.apps.size || f.w.some((a) => state.apps.has(a))) &&
      (!state.family || kidSafe(f)) &&
      (!state.maxTime || f.k === "tv" || (f.r && f.r <= state.maxTime))
    ), 20).slice(0, 24);
    section.hidden = !picks.length;
    const mood = moodById(state.mood);
    document.getElementById("cat-head").textContent = mood ? `More ${mood.label.toLowerCase()} picks` : "More to watch";
    const p = new URLSearchParams();
    if (codes.size === 1) p.set("l", [...codes][0]);
    if (state.apps.size === 1) p.set("a", [...state.apps][0]);
    document.getElementById("cat-more").href = `films.html${p.toString() ? "?" + p : ""}`;
    document.getElementById("cat-results").innerHTML = picks.map((f) => filmCard(f)).join("");
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
        const fits = (f, useMood) => f.k !== "tv" && !byTmdb[f.id] && f.n >= (f.l === "en" ? 2000 : 100) &&
          (!codes.size || codes.has(f.l)) && (!kids || kidSafe(f)) && (!useMood || fitsMood(f, mood));
        let catPool = cat.films.filter((f) => fits(f, true));
        if (catPool.length < 10) catPool = cat.films.filter((f) => fits(f, false));
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

// Catalogue films only know which app has them, not the exact page, so we open the app's search.
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

const catCache = {};
function loadCatalog(name) {
  if (!catCache[name]) {
    catCache[name] = fetch(`assets/catalog/${name}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }
  return catCache[name];
}

// The browse list for some languages (codes like "ta"), or all of them. The catalogue is stored as one
// small list per language (list-<code>.json, named in manifest.json), so a page only downloads what it
// needs. Older builds had a single index.json, which still works.
async function loadIndex(codes) {
  const man = await loadCatalog("manifest");
  if (!man) return loadCatalog("index");
  const want = (codes && codes.filter(Boolean).length ? codes : Object.keys(man.langs)).filter((c) => man.langs[c]);
  const parts = await Promise.all(want.map((c) => loadCatalog(`list-${c}`)));
  return { built: man.built, films: parts.flatMap((p) => (p ? p.films : [])) };
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
  const data = CAT_LANGS[code] ? await loadCatalog(code) : null;
  const f = data && data.films[raw];
  return f ? catToMovie(f) : null;
}

// "2019–2023", "2021–" (still running) or "2024" for series; just the year for films.
const yearsOf = (f) => (f.k === "tv" && f.y ? (f.end ? (f.ye ? `${f.y}–${f.ye}` : `${f.y}`) : `${f.y}–`) : f.y ? `${f.y}` : "");

function filmCard(f, rank) {
  const m = f.mine;
  return `
    <a class="fcard" href="${filmHref(f)}">
      <div class="fposter">
        ${f.p ? `<img src="${tmdb(f.p, "w342")}" alt="" loading="lazy" decoding="async">` : `<span class="fposter-none">🎬</span>`}
        ${rank ? `<span class="fbadge rank">#${rank}</span>` : ""}
        ${m ? `<span class="fbadge mine" title="Reviewed by Masala Mischief">🌶️ ${m.masala}/5</span>` : ""}
        <span class="fbadge score" title="${m ? "Our score" : "TMDB rating"}">★ ${m ? m.quality : f.v}</span>
      </div>
      <div class="fbody">
        <strong>${esc(f.t)}</strong>
        <span class="muted small">${esc(langLabel(CAT_LANGS[f.l] || ""))}${f.k === "tv" ? " · Series" : ""}${yearsOf(f) ? ` · ${yearsOf(f)}` : ""}</span>
        ${f.w && f.w.length ? `<span class="fapps">${f.w.slice(0, 2).map((a) => `<span class="ott ott-${slug(a)}">${esc(a)}</span>`).join("")}${f.w.length > 2 ? `<span class="ott more">+${f.w.length - 2}</span>` : ""}</span>` : ""}
      </div>
    </a>`;
}

async function initFilms() {
  const $ = (id) => document.getElementById(id);
  const cat = await loadIndex();
  const byTmdb = reviewedByTmdb();
  const list = cat ? cat.films.map((f) => ({ ...f, mine: byTmdb[f.id] })) : [];
  // Make sure every reviewed film is in the list, even if TMDB's top lists missed it.
  const have = new Set(list.map((f) => f.id));
  MOVIES.forEach((m) => {
    const img = IMAGES[m.id] || {};
    if (img.tmdb && have.has(img.tmdb)) return;
    list.push({ id: img.tmdb || m.id, l: LANG_CODE[m.lang], t: m.title, y: m.year, g: m.genres, r: m.runtime,
      v: m.quality, n: 0, p: img.poster, w: streamsOn(m), c: PARENT_NOTES[m.id] && PARENT_NOTES[m.id].age <= 6 ? "U" : "", mine: m });
  });
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
  const genres = Object.entries(count(list.flatMap((f) => f.g || []))).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  $("fg").insertAdjacentHTML("beforeend", genres.map((g) => `<option>${esc(g)}</option>`).join(""));
  const apps = Object.entries(count(list.flatMap((f) => f.w || []))).sort((a, b) => b[1] - a[1]).map(([a]) => a);
  $("fa").insertAdjacentHTML("beforeend", apps.map((a) => `<option>${esc(a)}</option>`).join(""));
  $("fq").value = state.q; $("ft").value = state.t; $("fl").value = state.l; $("fg").value = state.g; $("fa").value = state.a; $("fs").value = state.s;
  $("fr").checked = state.r; $("fk").checked = state.k; $("fw").checked = state.w;

  const PAGE = 60;
  let shown = PAGE;
  let results = [];
  const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
      `<div class="empty">Nothing matches. Try fewer filters.</div>`;
    $("fmore").hidden = isTop() || shown >= results.length;
  };
  const apply = () => {
    const q = norm(state.q.trim());
    // Top 50 anime covers films and series together, so it sets the language rather than the type.
    const animeTop = state.view === "top-anime";
    const type = animeTop ? "" : isTop() ? state.view.slice(4) : state.t;
    const lang = animeTop ? "ja" : state.l;
    $("ft").disabled = $("fs").disabled = isTop();
    $("fl").disabled = animeTop;
    paintView();
    results = list.filter((f) =>
      (!q || norm(f.t).includes(q) || norm(f.o).includes(q)) &&
      (!type || (type === "tv" ? f.k === "tv" : f.k !== "tv")) &&
      (!lang || f.l === lang) &&
      (!state.g || (f.g || []).includes(state.g)) &&
      (!state.a || (f.w || []).includes(state.a)) &&
      (!state.r || f.mine) &&
      (!state.k || f.c === "U") &&
      (!state.w || (f.w && f.w.length))
    ).sort(sorters[state.s] || sorters.popular);
    if (isTop()) results = topRanked(results);
    shown = PAGE;
    const noun = type === "tv" ? ["series", "series"] : type === "movie" ? ["movie", "movies"] : ["title", "titles"];
    const where = [!animeTop && state.l && langLabel(CAT_LANGS[state.l]), state.g].filter(Boolean).join(" ");
    $("fcount").textContent = animeTop
      ? `🎌 Top ${results.length} ${where ? where + " " : ""}anime`
      : isTop()
      ? `🏆 Top ${results.length} ${where ? where + " " : ""}${type === "tv" ? "series" : "movies"}`
      : `${results.length.toLocaleString("en-IN")} ${results.length === 1 ? noun[0] : noun[1]}`;
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
  const data = CAT_LANGS[code] && id ? await loadCatalog(code) : null;
  const f = data && data.films[id];
  if (!f) {
    root.innerHTML = `<div class="empty">We couldn't find that title. <a href="films.html">Browse movies & series</a>.</div>`;
    return;
  }
  const tv = f.k === "tv";
  const lang = langLabel(CAT_LANGS[f.l]);
  const years = yearsOf(f);
  const seasons = tv && f.s ? `${f.s} season${f.s === 1 ? "" : "s"}` : "";
  document.title = `${f.t}${years ? ` (${years})` : ""}${tv ? " · series" : ""} · where to watch · Masala Mischief`;
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
        ${f.w.length ? `<div class="stream-line"><span class="muted small">📺 Streaming on</span>${f.w.map((a) => `<a class="ott ott-${slug(a)}" href="${esc(appSearchUrl(a, f.t))}" target="_blank" rel="noopener">${esc(a)} ↗</a>`).join("")}</div>` : ""}
        ${f.ov ? `<p>${esc(f.ov)}</p>` : ""}
        <div class="panel not-reviewed">
          <h3>🌶️ Not reviewed yet</h3>
          <p class="muted">We haven't given this one the Masala Meter treatment. Summary and rating are from TMDB.</p>
        </div>
        <div class="share-row">
          <a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${f.t} ${f.y || ""} ${tv ? "series" : ""} official trailer`)}">▶ Watch trailer</a>
          <a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}">Share on WhatsApp</a>
          <button class="btn" id="copy" type="button">Copy link</button>
        </div>
      </article>
      <aside>
        ${f.p ? `<img class="side-poster" src="${tmdb(f.p, "w342")}" alt="${esc(f.t)} poster" loading="lazy" decoding="async">` : ""}
        <div class="side panel-watch">
          <h3>📺 Where to watch</h3>
          ${f.w.length
            ? `<p class="muted small">Included with subscription · opens a search in the app</p><div class="otts">${f.w.map((a) => `<a class="ott ott-${slug(a)}" href="${esc(appSearchUrl(a, f.t))}" target="_blank" rel="noopener">${esc(a)} ↗</a>`).join("")}</div>`
            : `<p class="muted small">Not on a subscription app in India right now, as far as we know.</p>`}
          <p class="fine">From TMDB, updated ${fmtDate(data.built)}. Availability changes, so confirm in the app.</p>
        </div>
        <div class="side">
          <dl>
            <dt>Language</dt><dd>${esc(lang)}</dd>
            ${f.o ? `<dt>Original title</dt><dd>${esc(f.o)}</dd>` : ""}
            ${years ? `<dt>${tv ? "Years" : "Year"}</dt><dd>${years}${tv && !f.end ? " (still running)" : ""}</dd>` : ""}
            ${seasons ? `<dt>Seasons</dt><dd>${seasons}</dd>` : ""}
            ${f.r ? `<dt>${tv ? "Episode" : "Runtime"}</dt><dd>${tv ? `about ${f.r} min` : fmtRuntime(f.r)}</dd>` : ""}
            ${f.g.length ? `<dt>Genre</dt><dd>${esc(f.g.join(", "))}</dd>` : ""}
            ${f.c ? `<dt>Certificate</dt><dd>${esc(f.c)}</dd>` : ""}
            <dt>TMDB</dt><dd>${f.v}/10 · <a href="https://www.themoviedb.org/${tv ? `tv/${String(f.id).slice(2)}` : `movie/${f.id}`}" target="_blank" rel="noopener">${f.n.toLocaleString("en-IN")} votes</a></dd>
          </dl>
        </div>
      </aside>
    </div>
    <section id="film-more" hidden>
      <div class="section-head"><h2>More ${esc(lang)} ${tv ? "series" : "movies"} like this</h2></div>
      <div class="fgrid" id="film-more-grid"></div>
    </section>`;

  document.getElementById("copy").onclick = async (e) => {
    try { await navigator.clipboard.writeText(pageUrl); e.target.textContent = "Copied!"; } catch { prompt("Copy this link:", pageUrl); }
  };

  root.insertAdjacentHTML("beforeend", `<section class="community" id="community"></section>`);
  initCommunity(`c:${code}-${rawId}`, document.getElementById("community"), f.t);

  const index = await loadIndex([f.l]);
  if (index) {
    const byTmdb = reviewedByTmdb();
    const more = index.films.filter((x) => x.l === f.l && x.id !== f.id && (x.k === "tv") === tv && x.g.some((g) => f.g.includes(g)))
      .map((x) => ({ ...x, mine: byTmdb[x.id] }))
      .sort((a, b) => b.g.filter((g) => f.g.includes(g)).length - a.g.filter((g) => f.g.includes(g)).length || b.v - a.v)
      .slice(0, 6);
    if (more.length) {
      document.getElementById("film-more-grid").innerHTML = more.map(filmCard).join("");
      document.getElementById("film-more").hidden = false;
    }
  }
}

renderChrome();
({ home: initHome, reviews: initReviews, review: initReview, suggest: initSuggest, family: initFamily, group: initGroup, films: initFilms, film: initFilm }[document.body.dataset.page] || (() => {}))();
