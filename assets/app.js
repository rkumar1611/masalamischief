// Shared rendering for every page. Each HTML page sets <body data-page="...">.

const NAV = [
  { href: "index.html", label: "Home", page: "home" },
  { href: "reviews.html", label: "Reviews", page: "reviews" },
  { href: "suggest.html", label: "What should I watch?", page: "suggest" },
  { href: "group.html", label: "Group Pick", page: "group", soon: true },
  { href: "family.html", label: "Family Picks", page: "family", soon: true },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const moodById = (id) => MOODS.find((m) => m.id === id);
const fmtRuntime = (min) => `${Math.floor(min / 60)}h ${min % 60}m`;

function renderChrome() {
  const page = document.body.dataset.page;
  const links = NAV.map((n) =>
    `<a href="${n.href}" class="${n.page === page ? "active" : ""}">${n.label}${n.soon ? '<span class="soon">soon</span>' : ""}</a>`
  ).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="site-header"><div class="wrap">
      <a class="logo" href="index.html">Masala <span>Mischief</span></a>
      <nav class="nav" aria-label="Main">${links}</nav>
    </div></header>`);
  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site-footer"><div class="wrap">
      <span>© ${new Date().getFullYear()} Masala Mischief. Reviews with extra chilli.</span>
      <span>🌶️ Masala Meter = entertainment · ★ score = craft</span>
    </div></footer>`);
}

function meter(n) {
  let out = "";
  for (let i = 1; i <= 5; i++) out += `<span class="${i <= n ? "" : "off"}">🌶️</span>`;
  return `<span class="meter" role="img" aria-label="Masala Meter ${n} out of 5">${out}</span>`;
}

function score(q) {
  return `<span class="score" title="Quality score">${q}<small>/10</small></span>`;
}

function card(m, extra = "") {
  return `
    <a class="card" href="review.html?id=${encodeURIComponent(m.id)}">
      <div class="poster lang-${m.lang}"><span class="lang-pill">${m.lang} · ${m.year}</span>${esc(m.title)}</div>
      <div class="card-body">
        ${extra}
        <p>${esc(m.tagline)}</p>
        <div class="card-meta">${meter(m.masala)}${score(m.quality)}</div>
      </div>
    </a>`;
}

/* ---------- Home ---------- */
function initHome() {
  const latest = [...MOVIES].sort((a, b) => b.reviewed.localeCompare(a.reviewed)).slice(0, 4);
  document.getElementById("latest").innerHTML = latest.map((m) => card(m)).join("");
  document.getElementById("moods").innerHTML = MOODS.map((m) => `
    <a class="mood" href="suggest.html?mood=${m.id}">
      <span class="e">${m.emoji}</span><strong>${m.label}</strong><span class="b">${m.blurb}</span>
    </a>`).join("");
}

/* ---------- Reviews list ---------- */
function initReviews() {
  const q = document.getElementById("q");
  const lang = document.getElementById("lang");
  const sort = document.getElementById("sort");
  const out = document.getElementById("list");
  lang.innerHTML = `<option value="">All languages</option>` + LANGUAGES.map((l) => `<option>${l}</option>`).join("");

  const params = new URLSearchParams(location.search);
  if (params.get("lang")) lang.value = params.get("lang");

  function draw() {
    const term = q.value.trim().toLowerCase();
    let list = MOVIES.filter((m) =>
      (!lang.value || m.lang === lang.value) &&
      (!term || [m.title, m.lang, ...m.genres].join(" ").toLowerCase().includes(term))
    );
    const sorters = {
      latest: (a, b) => b.reviewed.localeCompare(a.reviewed),
      masala: (a, b) => b.masala - a.masala || b.quality - a.quality,
      quality: (a, b) => b.quality - a.quality || b.masala - a.masala,
      year: (a, b) => b.year - a.year,
    };
    list.sort(sorters[sort.value]);
    out.innerHTML = list.length
      ? list.map((m) => card(m)).join("")
      : `<div class="empty">No reviews match that yet. Try a different search.</div>`;
  }
  [q, lang, sort].forEach((el) => el.addEventListener("input", draw));
  draw();
}

/* ---------- Single review ---------- */
function initReview() {
  const id = new URLSearchParams(location.search).get("id");
  const m = MOVIES.find((x) => x.id === id);
  const root = document.getElementById("review");
  if (!m) {
    root.innerHTML = `<div class="empty">We couldn't find that review. <a href="reviews.html">See all reviews</a>.</div>`;
    return;
  }
  document.title = `${m.title} review · Masala Mischief`;
  const dubs = m.audio.filter((a) => a !== m.lang);
  const shareText = `${m.title}: ${m.masala}/5 on the Masala Meter, ${m.quality}/10 overall. ${m.tagline}`;
  const pageUrl = location.href;

  root.innerHTML = `
    <div class="poster big lang-${m.lang}"><span class="lang-pill">${m.lang} · ${m.year}</span>${esc(m.title)}</div>
    <div class="review-layout">
      <article class="review-body">
        <p class="tagline">${esc(m.tagline)}</p>
        <div class="rating-big">
          <div><div class="label">Masala Meter</div>${meter(m.masala)}</div>
          <div><div class="label">Quality</div><span class="num">${m.quality}</span><span class="muted">/10</span></div>
        </div>
        ${m.review.map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="hm">
          <div class="hits"><h3>Full masala</h3><ul>${m.hits.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>
          <div class="misses"><h3>Needs more salt</h3><ul>${m.misses.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>
        </div>
        <div class="share-row">
          <a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText + " " + pageUrl)}">Share on WhatsApp</a>
          <button class="btn" id="copy">Copy link</button>
        </div>
      </article>
      <aside class="side">
        <dl>
          <dt>Language</dt><dd>${m.lang}</dd>
          <dt>Dubbed in</dt><dd>${dubs.length ? dubs.join(", ") : "Original only"}</dd>
          <dt>Year</dt><dd>${m.year}</dd>
          <dt>Runtime</dt><dd>${fmtRuntime(m.runtime)}</dd>
          <dt>Genre</dt><dd>${m.genres.join(", ")}</dd>
          <dt>Watch when</dt><dd>${m.moods.map((id) => `<a href="suggest.html?mood=${id}">${moodById(id).label}</a>`).join(", ")}</dd>
        </dl>
      </aside>
    </div>
    <section>
      <div class="section-head"><h2>More like this mood</h2></div>
      <div class="grid">${MOVIES.filter((x) => x.id !== m.id && x.moods.some((mo) => m.moods.includes(mo)))
        .sort((a, b) => b.quality - a.quality).slice(0, 4).map((x) => card(x)).join("")}</div>
    </section>`;

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
    dubs: true,
    maxTime: 0,
  };
  const moodsEl = document.getElementById("mood-chips");
  const langsEl = document.getElementById("lang-chips");
  const out = document.getElementById("results");
  const heading = document.getElementById("results-head");

  moodsEl.innerHTML = MOODS.map((m) => `<button class="chip" data-mood="${m.id}">${m.emoji} ${m.label}</button>`).join("");
  langsEl.innerHTML = LANGUAGES.map((l) => `<button class="chip" data-lang="${l}">${l}</button>`).join("");

  moodsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mood]"); if (!b) return;
    state.mood = state.mood === b.dataset.mood ? "" : b.dataset.mood; draw();
  });
  langsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    const l = b.dataset.lang;
    state.langs.has(l) ? state.langs.delete(l) : state.langs.add(l); draw();
  });
  document.getElementById("dubs").addEventListener("change", (e) => { state.dubs = e.target.checked; draw(); });
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
      .map((m) => ({ m, via: watchableIn(m) }))
      .filter((x) => x.via)
      // Mood's first-listed films are the strongest fit; then rank by craft + fun.
      .sort((a, b) => {
        const fit = (x) => (state.mood ? 2 - x.m.moods.indexOf(state.mood) * 0.5 : 0);
        return fit(b) + b.m.quality + b.m.masala * 0.5 - (fit(a) + a.m.quality + a.m.masala * 0.5);
      });
  }

  function draw() {
    moodsEl.querySelectorAll("[data-mood]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mood === state.mood));
    langsEl.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", state.langs.has(b.dataset.lang)));

    const mood = moodById(state.mood);
    const list = matches();
    heading.textContent = mood ? `${mood.emoji} ${mood.label}: ${mood.blurb}` : "Our top picks right now";
    out.innerHTML = list.length
      ? list.map(({ m, via }) => card(m, via !== m.lang ? `<span class="why">Available dubbed in ${via}</span>` : "")).join("")
      : `<div class="empty">Nothing fits all of that yet. Try turning on dubbed films or picking another language.</div>`;

    const qs = new URLSearchParams();
    if (state.mood) qs.set("mood", state.mood);
    if (state.langs.size) qs.set("lang", [...state.langs].join(","));
    // Keeps the URL shareable; some browsers block this on file:// pages.
    try { history.replaceState(null, "", qs.toString() ? `?${qs}` : location.pathname); } catch {}
  }
  draw();
}

renderChrome();
({ home: initHome, reviews: initReviews, review: initReview, suggest: initSuggest }[document.body.dataset.page] || (() => {}))();
