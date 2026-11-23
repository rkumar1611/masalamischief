// Posts the day's OTT news to the Telegram channel (https://t.me/masalamischief), from the LIVE site's own data:
//   - New on OTT today   (the strip in assets/data.js, items added today)
//   - Lands tomorrow     (assets/catalog/upcoming.json `soon`, OTT date = tomorrow)
//   - Date changes       (assets/catalog/ott-changes.json, found today)
// Nothing new, nothing posted. Each item appears once (today / tomorrow / found today), so no state file is needed.
// Needs the TELEGRAM_BOT_TOKEN secret (from @BotFather). Without it, or with DRY_RUN=1, it only prints the post.
// Run by .github/workflows/telegram.yml; locally: DRY_RUN=1 node scripts/post-telegram.mjs
import vm from "node:vm";

const SITE = "https://masalamischief.in";
const CHANNEL = process.env.TELEGRAM_CHANNEL || "@masalamischief";
const LANG = { ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", hi: "Hindi", en: "Hollywood", ko: "Korean", ja: "Anime", mr: "Marathi", bn: "Bengali", pa: "Punjabi" };

const ist = (offsetDays = 0) => new Date(Date.now() + 5.5 * 3600e3 + offsetDays * 864e5).toISOString().slice(0, 10);
const today = ist(0), tomorrow = ist(1);
const pretty = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function get(path, text = false) {
  const res = await fetch(`${SITE}${path}?t=${Date.now()}`, { headers: { "user-agent": "masala-mischief-telegram-bot" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return text ? res.text() : res.json();
}

const strip = (async () => {
  try {
    const sandbox = {};
    vm.runInNewContext(await get("/assets/data.js", true), sandbox, { timeout: 5000 });
    return (sandbox.MM_DATA?.NEW_ON_OTT?.items) || [];
  } catch (e) { console.log(`Strip unavailable: ${e.message}`); return []; }
})();
const upcoming = get("/assets/catalog/upcoming.json").catch(() => ({}));
const changes = get("/assets/catalog/ott-changes.json").catch(() => ({}));

const [items, up, ch] = await Promise.all([strip, upcoming, changes]);

const seen = new Set();
const landed = items.filter((n) => n.added === today).filter((n) => {
  const key = `${String(n.title).toLowerCase()}|${n.year}|${n.app}`; // the strip can list one title twice (e.g. once per audio language)
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).slice(0, 6);
const tomorrowSoon = (up.soon || []).filter((f) => f.d === tomorrow).slice(0, 6);
const moved = (ch.items || []).filter((x) => x.f === today).slice(0, 5);

const line = (t, extra) => `• <b>${esc(t)}</b>${extra ? ` ${extra}` : ""}`;
const parts = [];
if (landed.length) {
  parts.push(`🍿 <b>New on OTT today</b> (${pretty(today)})\n${landed.map((n) =>
    line(`${n.title}${n.year ? ` (${n.year})` : ""}`, `on ${esc(n.app)} · ${esc(n.lang)}${n.url ? ` — <a href="${esc(n.url)}">watch</a>` : ""}`)).join("\n")}`);
}
if (tomorrowSoon.length) {
  parts.push(`⏰ <b>Lands tomorrow</b> (${pretty(tomorrow)})\n${tomorrowSoon.map((f) =>
    line(f.t, `${f.a ? `on ${esc(f.a)}` : "(app not announced)"} · ${esc(LANG[f.l] || "")}`)).join("\n")}`);
}
if (moved.length) {
  parts.push(`🔄 <b>Dates changed</b>\n${moved.map((x) =>
    line(x.t, x.why === "date" ? `now ${pretty(x.d)} (was ${pretty(x.from)})${x.a ? ` on ${esc(x.a)}` : ""}` : `confirmed: ${pretty(x.d)} on ${esc(x.a)}`)).join("\n")}`);
}

if (!parts.length) { console.log(`Nothing new for ${today}; nothing posted.`); process.exit(0); }

const text = `${parts.join("\n\n")}\n\n📅 All OTT dates by language: ${SITE}/ott-tracker\n🔔 Free alerts when a film lands: ${SITE}/ott-this-week`;
console.log(text);

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || process.env.DRY_RUN === "1") { console.log("\n(dry run: nothing sent)"); process.exit(0); }

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ chat_id: CHANNEL, text, parse_mode: "HTML", disable_web_page_preview: true }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.ok) { console.error(`Telegram refused the post: ${res.status} ${body.description || ""}`); process.exit(1); }
console.log(`\nPosted to ${CHANNEL}.`);
