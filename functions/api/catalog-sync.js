// /api/catalog-sync (admin only), used by scripts/sync-catalog-db.mjs after each catalogue run.
//   GET  ?after=<key>  → { hashes: [[key, hash], …], next }  the titles already saved (up to 5000), so the script
//                         only sends what changed; with no ?after it also returns { total }
//   POST { rows, seed } → saves up to 40 titles and their app history (lib/catalog-db.js)
import { json, notReady, isAdmin } from "../../lib/community.js";
import { ensureCatalogSchema, saveTitles } from "../../lib/catalog-db.js";

const PAGE = 5000;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  await ensureCatalogSchema(env.DB);
  const after = new URL(request.url).searchParams.get("after") || "";
  const { results } = await env.DB.prepare("SELECT key, hash FROM catalog_titles WHERE key > ? ORDER BY key LIMIT ?").bind(after, PAGE).all();
  const out = { hashes: results.map((r) => [r.key, r.hash]), next: results.length === PAGE ? results[results.length - 1].key : null };
  if (!after) out.total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM catalog_titles").first()).n;
  return json(out);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return notReady();
  if (!isAdmin(request, env)) return json({ error: "Not allowed." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const rows = Array.isArray(body.rows) ? body.rows.filter((r) => r && typeof r.k === "string" && r.k.length <= 40 && typeof r.h === "string") : [];
  if (!rows.length || rows.length > 40) return json({ error: "Send 1 to 40 rows." }, 400);
  const writes = await saveTitles(env.DB, rows, body.seed === true);
  return json({ saved: rows.length, writes });
}
