// Emails you (through a GitHub issue notification) when audience reviews are waiting in /admin.
// Run by .github/workflows/review-alert.yml. Needs ADMIN_PASSWORD (the same one as in Cloudflare)
// and GITHUB_TOKEN + GITHUB_REPOSITORY, which GitHub Actions provides.
//
// One open issue (found by the hidden counts marker in its text) is kept while anything needs a look:
//   - new waiting/reported reviews and no open issue → open one (GitHub emails you)
//   - the numbers went up since last time → add a comment (another email)
//   - nothing left to check → close the issue
// Only counts go in the issue; review text stays in /admin.

const SITE = "https://masalamischief.in";
const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if (!ADMIN_PASSWORD) { console.error("ADMIN_PASSWORD secret is missing."); process.exit(1); }

const gh = async (path, init = {}) => {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: "application/vnd.github+json", "content-type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

const res = await fetch(`${SITE}/api/admin?filter=pending`, { headers: { authorization: `Bearer ${ADMIN_PASSWORD}` } });
if (res.status === 401) { console.error("Wrong ADMIN_PASSWORD: it must match the one in Cloudflare."); process.exit(1); }
if (!res.ok) { console.error(`/api/admin answered ${res.status}`); process.exit(1); }
const { totals = {} } = await res.json();
const pending = +totals.pending || 0;
const reported = (await (await fetch(`${SITE}/api/admin?filter=reported`, { headers: { authorization: `Bearer ${ADMIN_PASSWORD}` } })).json())
  .reviews.filter((r) => r.approved === 1 && r.hidden === 1).length; // auto-hidden by reports, waiting for a decision
console.log(`Waiting for approval: ${pending}, hidden by reports: ${reported}, live: ${+totals.live || 0}`);

const open = (await gh("/issues?state=open&per_page=100")).find((i) => !i.pull_request && /<!-- counts:\d+:\d+ -->/.test(i.body || ""));
const marker = (p, r) => `<!-- counts:${p}:${r} -->`;
const summary = (p, r) => [
  p ? `- ⏳ **${p}** review${p === 1 ? "" : "s"} waiting for approval` : "",
  r ? `- 🚩 **${r}** review${r === 1 ? "" : "s"} hidden after reports` : "",
].filter(Boolean).join("\n");

if (!pending && !reported) {
  if (open) {
    await gh(`/issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body: "All checked. Closing. ✅" }) });
    await gh(`/issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
    console.log(`Closed issue #${open.number}.`);
  }
  process.exit(0);
}

const title = `Reviews to check: ${pending} waiting${reported ? `, ${reported} reported` : ""}`;
const body = `${marker(pending, reported)}\n${summary(pending, reported)}\n\nOpen **${SITE}/admin** to approve, hide or delete them.\n\n_This issue closes by itself once nothing is left to check._`;

if (!open) {
  const issue = await gh("/issues", { method: "POST", body: JSON.stringify({ title, body }) });
  console.log(`Opened issue #${issue.number}.`);
} else {
  const [, p0 = 0, r0 = 0] = (open.body || "").match(/counts:(\d+):(\d+)/) || [];
  await gh(`/issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ title, body }) });
  if (pending > +p0 || reported > +r0) {
    await gh(`/issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body: `New since last check:\n${summary(pending, reported)}\n\n${SITE}/admin` }) });
    console.log(`Commented on issue #${open.number}.`);
  } else console.log(`Updated issue #${open.number} (no new reviews).`);
}
