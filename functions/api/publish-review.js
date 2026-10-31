// POST /api/publish-review (admin only: "Authorization: Bearer <ADMIN_PASSWORD>"), used by /write.
// Adds or updates one of our reviews in assets/data.js on GitHub and bumps every page's ?v=N, as one
// commit on main; Cloudflare Pages then publishes it (about a minute). Needs GITHUB_TOKEN (lib/github.js).
// Body: the review from /write; { dryRun: true } checks it and returns the new entry without saving.
import "../../assets/data.js";
import { json, isAdmin } from "../../lib/community.js";
import { checkReview, applyReview, bumpVersions } from "../../lib/review-publish.js";
import { github } from "../../lib/github.js";

// IndexNow (Bing, Yandex and others; not Google): tells them a page changed. The key is public by
// design: /<key>.txt at the site root proves the pings come from this site.
const INDEXNOW_KEY = "fe6da0cc1ee80192b4f62861236212b1";
const pingIndexNow = (urls) => fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: "masalamischief.in", key: INDEXNOW_KEY, keyLocation: `https://masalamischief.in/${INDEXNOW_KEY}.txt`, urlList: urls }),
}).then((r) => r.status).catch(() => 0);

export async function onRequestPost({ request, env, waitUntil }) {
  if (!isAdmin(request, env)) return json({ error: "Wrong password." }, 401);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const { MOVIES, MOODS } = globalThis.MM_DATA;
  const checked = checkReview(input, MOODS.map((m) => m.id), MOVIES.map((m) => m.id));
  if (checked.error) return json({ error: checked.error }, 400);
  const review = checked.review;
  if (input.dryRun) return json({ ok: true, dryRun: true, review });

  try {
    const gh = github(env);
    // The latest commit on main, and the files to change as they are there now.
    const head = await gh.head();
    const root = await gh.list(head.sha);
    const paths = ["assets/data.js", "README.md", ...root.filter((f) => f.type === "file" && f.name.endsWith(".html")).map((f) => f.path)];
    const files = Object.fromEntries(await Promise.all(paths.map(async (p) => [p, await gh.read(p, head.sha)])));

    const changed = { "assets/data.js": applyReview(files["assets/data.js"], review), ...bumpVersions(files) };
    const sha = await gh.commit(head, changed, `${review.edit ? "Update review" : "New review"}: ${review.title} (from /write)`);
    // Tell Bing and friends straight away (after answering, so the page doesn't wait).
    waitUntil(pingIndexNow([`https://masalamischief.in/review?id=${encodeURIComponent(review.id)}`, "https://masalamischief.in/reviews", "https://masalamischief.in/"]));
    return json({ ok: true, id: review.id, url: `/review?id=${encodeURIComponent(review.id)}`, commit: sha.slice(0, 7) });
  } catch (e) {
    return json({ error: `Couldn't publish: ${e.message}. Nothing was changed; try again in a minute.` }, e.message.startsWith("Publishing isn't set up") ? 503 : 502);
  }
}
