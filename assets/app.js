// Shared rendering for every page. Each HTML page sets <body data-page="...">.

const NAV = [
  { href: "index.html", label: "Home", page: "home" },
  { href: "reviews.html", label: "Reviews", page: "reviews" },
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
const streamsOn = (m) => (WATCH[m.id] && WATCH[m.id].stream) || [];
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
      <button class="theme-btn" id="theme-btn" type="button" aria-label="Switch light or dark mode"></button>
      <nav class="nav" aria-label="Main">${links}</nav>
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
  const still = IMAGES[m.id] && IMAGES[m.id].backdrop;
  return `<div class="poster lang-${m.lang}${big ? " big" : ""}${still ? " has-img" : ""}">
      ${still ? `<img class="poster-img" src="${tmdb(still, big ? "w1280" : "w780")}" alt="" loading="${big ? "eager" : "lazy"}" decoding="async">` : ""}
      <span class="lang-pill">${langLabel(m.lang)} · ${m.year}</span>
      ${PARENT_NOTES[m.id] ? `<span class="age-pill" title="Family Pick">👪 ${PARENT_NOTES[m.id].age}+</span>` : ""}
      <span class="poster-icon" aria-hidden="true">${icon}</span>
      <div class="poster-foot">
        ${posterRating(m)}
        <span class="poster-title">${esc(m.title)}</span>
      </div>
    </div>`;
}

// Score badges over the poster: our quality and Masala Meter, plus the visitor's own chillies if they rated it.
function posterRating(m) {
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
    <a class="card" href="review.html?id=${encodeURIComponent(m.id)}">
      ${poster(m)}
      <div class="card-body">
        ${extra}
        <p>${esc(m.tagline)}</p>
        ${platformChips(streamsOn(m))}
        <div class="card-meta">${meter(m.masala)}${score(m.quality)}</div>
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
  chips(document.getElementById("lang-chips"), LANGUAGES.map((l) => [l, `${l}${LANG_LABELS[l] ? ` / ${LANG_LABELS[l]}` : ""}`]),
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
function initGroup() {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const deck = (params.get("d") || "").split(".").map(movieById).filter(Boolean);

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
  chips($("gp-langs"), LANGUAGES.map((l) => [l, langLabel(l)]), (v) => langs.has(v), (v) => { langs.has(v) ? langs.delete(v) : langs.add(v); });

  $("gp-start").addEventListener("click", () => {
    const kids = $("gp-family").checked;
    const ok = (m, useMood) =>
      (!langs.size || m.audio.some((a) => langs.has(a))) &&
      (!kids || PARENT_NOTES[m.id]) &&
      (!useMood || !mood || m.moods.includes(mood));
    let pool = MOVIES.filter((m) => ok(m, true));
    if (pool.length < 6) pool = MOVIES.filter((m) => ok(m, false)); // too narrow: drop the mood
    if (!pool.length) pool = MOVIES.slice();
    // Good films first, with a shuffle so every room is different.
    const picks = pool.map((m) => [m, m.quality + m.masala * 0.3 + Math.random() * 3])
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([m]) => m.id);
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
        <p class="muted small">${m.genres.map(esc).join(" · ")} · ${fmtRuntime(m.runtime)}${m.audio.length > 1 ? ` · Also in ${m.audio.filter((a) => a !== m.lang).map(esc).join(", ")}` : ""}</p>
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
          <a href="review.html?id=${encodeURIComponent(r.m.id)}">${esc(r.m.title)}</a>
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

renderChrome();
({ home: initHome, reviews: initReviews, review: initReview, suggest: initSuggest, family: initFamily, group: initGroup }[document.body.dataset.page] || (() => {}))();
