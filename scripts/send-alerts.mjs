// Sends this week's "New on OTT" alert to everyone who turned alerts on, a batch at a time
// (functions/api/push/send.js). Run on Fridays by .github/workflows/ott-alerts.yml with the
// ADMIN_PASSWORD repository secret (same value as in Cloudflare). Plain Node 20+, no dependencies.

const SITE = process.env.SITE || "https://masalamischief.in";
const PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  if (!PASSWORD) throw new Error("No ADMIN_PASSWORD set.");
  let after = 0;
  let sent = 0;
  let removed = 0;
  for (let round = 0; round < 5000 && after !== null; round++) {
    const res = await fetch(`${SITE}/api/push/send?after=${after}`, { method: "POST", headers: { authorization: `Bearer ${PASSWORD}` } });
    if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
    const out = await res.json();
    if (out.note) console.log(out.note);
    sent += out.sent;
    removed += out.removed;
    after = out.next;
  }
  console.log(`Alerts sent: ${sent}. Removed ${removed} browsers that turned alerts off.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
