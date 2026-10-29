// Service worker: lets Masala Mischief open offline once installed (or visited), so your watchlist and
// our reviews still work without a connection. Registered by assets/app.js.
//   pages            network first, the last copy if offline (main pages saved on install)
//   assets/*?v=N     saved on first use; versioned, so a new ?v= replaces the old copy
//   assets/catalog/  network first, the last copy if offline (small files only; big lists aren't kept)
// Anything else (reviews API, admin, other sites, posters) goes straight to the network.
const PAGES = "mm-pages-1";
const STATIC = "mm-static-1";
const DATA = "mm-data-1";
const KEEP = [PAGES, STATIC, DATA];
const START = ["/", "/reviews", "/films", "/suggest", "/family", "/group"];
const MAX_PAGES = 40;
const MAX_DATA = 80;
const BIG_DATA = /\/assets\/catalog\/(list-|popular\.json|index\.json|s\/|sitemaps\/)/;

// "reviews.html?saved=1" and "/reviews?saved=1" are the same page (Cloudflare drops the .html).
const pageKey = (url) => {
  const u = new URL(url);
  let p = u.pathname.replace(/\.html$/, "").replace(/\/index$/, "/");
  u.searchParams.delete("source");
  return new Request(`${u.origin}${p || "/"}${u.searchParams.toString() ? `?${u.searchParams}` : ""}`);
};

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const pages = await caches.open(PAGES);
    const stat = await caches.open(STATIC);
    for (const p of START) {
      try {
        const res = await fetch(p, { cache: "no-cache" });
        if (!res.ok) continue;
        await pages.put(pageKey(new URL(p, location.origin)), res.clone());
        // The page's own stylesheet and scripts (assets/*.css|js?v=N), so it works offline straight away.
        if (p === "/") {
          const html = await res.text();
          const assets = [...html.matchAll(/(?:href|src)="(assets\/[^"]+\.(?:css|js)\?v=\d+)"/g)].map((m) => `/${m[1]}`);
          await Promise.all(assets.map((a) => stat.add(a).catch(() => {})));
        }
      } catch {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (!KEEP.includes(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || /^\/admin/.test(url.pathname)) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") {
          const cache = await caches.open(PAGES);
          await cache.put(pageKey(req.url), res.clone());
          trim(PAGES, MAX_PAGES);
        }
        return res;
      } catch {
        const cache = await caches.open(PAGES);
        const key = pageKey(req.url);
        return (await cache.match(key)) || (await cache.match(key, { ignoreSearch: true })) || offline();
      }
    })());
    return;
  }

  if (/^\/assets\/[^/]+\.(css|js)$/.test(url.pathname) && url.searchParams.has("v")) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      const hit = await cache.match(req);
      if (hit) return hit;
      let res;
      try { res = await fetch(req); } catch {
        // Offline with a page saved under an older ?v=: the copy we have is close enough.
        return (await cache.match(req, { ignoreSearch: true })) || Response.error();
      }
      if (res.ok) {
        // Drop older versions of the same file.
        for (const k of await cache.keys()) if (new URL(k.url).pathname === url.pathname) await cache.delete(k);
        await cache.put(req, res.clone());
      }
      return res;
    })());
    return;
  }

  if (url.pathname.startsWith("/assets/catalog/") && !BIG_DATA.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA);
      try {
        const res = await fetch(req);
        if (res.ok) { await cache.put(url.pathname, res.clone()); trim(DATA, MAX_DATA); }
        return res;
      } catch {
        return (await cache.match(url.pathname)) || Response.error();
      }
    })());
  }
});

// Weekly "New on OTT" alerts (functions/api/push/). Tapping one opens the page it points to.
self.addEventListener("push", (event) => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch {}
  event.waitUntil(self.registration.showNotification(m.title || "Masala Mischief", {
    body: m.body || "",
    icon: "/assets/icons/icon-192.png",
    badge: "/assets/icons/icon-192.png",
    tag: m.tag,
    data: { url: m.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find((w) => new URL(w.url).origin === location.origin);
    if (win) { await win.focus(); return win.navigate(url).catch(() => self.clients.openWindow(url)); }
    return self.clients.openWindow(url);
  })());
});

const offline = () => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · Masala Mischief</title>
<body style="font-family:system-ui,sans-serif;background:#26121a;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px">
<div><div style="font-size:64px">🌶️</div><h1>You're offline</h1><p>This page isn't saved on your phone yet. Pages you've opened before still work.</p>
<p><a style="color:#ffb3bd" href="/">Home</a> · <a style="color:#ffb3bd" href="/reviews?saved=1">My watchlist</a></p></div>`,
  { headers: { "content-type": "text/html; charset=utf-8" } });
