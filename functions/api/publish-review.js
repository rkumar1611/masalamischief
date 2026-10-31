// POST /api/publish-review (admin only: "Authorization: Bearer <ADMIN_PASSWORD>"), used by /write.
// Adds or updates one of our reviews in assets/data.js on GitHub and bumps every page's ?v=N, as one
// commit on main; Cloudflare Pages then publishes it (about a minute).
//
// Needs these Cloudflare Pages settings (Settings → Variables and Secrets):
//   GITHUB_TOKEN  a fine-grained GitHub token for this repository only, "Contents: Read and write"
//   GITHUB_REPO   optional, "owner/name" (default rkumar1611/masalamischief)
// Body: the review from /write; { dryRun: true } checks it and returns the new entry without saving.
import "../../assets/data.js";
import { json, isAdmin } from "../../lib/community.js";
import { checkReview, applyReview, bumpVersions } from "../../lib/review-publish.js";

const BRANCH = "main";
// IndexNow (Bing, Yandex and others; not Google): tells them a page changed. The key is public by
// design: /<key>.txt at the site root proves the pings come from this site.
const INDEXNOW_KEY = "fe6da0cc1ee80192b4f62861236212b1";
const pingIndexNow = (urls) => fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: "masalamischief.in", key: INDEXNOW_KEY, keyLocation: `https://masalamischief.in/${INDEXNOW_KEY}.txt`, urlList: urls }),
}).then((r) => r.status).catch(() => 0);

// UTF-8 text ↔ base64 (GitHub's contents API speaks base64; atob/btoa alone break on "₹" or "é").
const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

export async function onRequestPost({ request, env, waitUntil }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const { MOVIES, MOODS } = globalThis.MM_DATA;
  const checked = checkReview(input, MOODS.map((m) => m.id), MOVIES.map((m) => m.id));
  if (checked.error) return json({ error: checked.error }, 400);
  const review = checked.review;
  if (input.dryRun) return json({ ok: true, dryRun: true, review });

  if (!env.GITHUB_TOKEN) return json({ error: "Publishing isn't set up yet: add the GITHUB_TOKEN secret in Cloudflare." }, 503);
  const repo = env.GITHUB_REPO || "rkumar1611/masalamischief";
  const gh = async (path, init = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28", "user-agent": "masala-mischief-publisher", ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const why = res.status === 401 ? "GitHub didn't accept the token (expired or wrong?)"
        : res.status === 403 || res.status === 404 ? "the token can't write to this repository (check it has Contents: Read and write)"
        : `GitHub said ${res.status}: ${data.message || "error"}`;
      throw new Error(why);
    }
    return data;
  };

  try {
    // The latest commit on main, and the files to change as they are there now.
    const ref = await gh(`/git/ref/heads/${BRANCH}`);
    const head = await gh(`/git/commits/${ref.object.sha}`);
    const root = await gh(`/contents/?ref=${ref.object.sha}`);
    const paths = ["assets/data.js", "README.md", ...root.filter((f) => f.type === "file" && f.name.endsWith(".html")).map((f) => f.path)];
    const files = Object.fromEntries(await Promise.all(paths.map(async (p) =>
      [p, fromB64((await gh(`/contents/${encodeURI(p)}?ref=${ref.object.sha}`)).content)])));

    const data = applyReview(files["assets/data.js"], review);
    const changed = { "assets/data.js": data, ...bumpVersions(files) };
    const tree = await gh("/git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: head.tree.sha, tree: Object.entries(changed).map(([path, content]) => ({ path, mode: "100644", type: "blob", content })) }),
    });
    const commit = await gh("/git/commits", {
      method: "POST",
      body: JSON.stringify({ message: `${review.edit ? "Update review" : "New review"}: ${review.title} (from /write)`, tree: tree.sha, parents: [ref.object.sha] }),
    });
    // Not forced: if main moved on meanwhile (the daily bot), GitHub refuses and nothing is lost.
    await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
    // Tell Bing and friends straight away (after answering, so the page doesn't wait).
    waitUntil(pingIndexNow([`https://masalamischief.in/review?id=${encodeURIComponent(review.id)}`, "https://masalamischief.in/reviews", "https://masalamischief.in/"]));
    return json({ ok: true, id: review.id, url: `/review?id=${encodeURIComponent(review.id)}`, commit: commit.sha.slice(0, 7) });
  } catch (e) {
    return json({ error: `Couldn't publish: ${e.message}. Nothing was changed; try again in a minute.` }, 502);
  }
}
