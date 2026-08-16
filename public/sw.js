/**
 * Offline support. Build assets are content-hashed, so cache-first is safe for
 * them; the HTML shell is network-first so deploys roll out on the next load
 * while the app keeps working offline.
 */
// Both placeholders are rewritten by the swPrecachePlugin in vite.config.ts:
// VERSION becomes a hash of the emitted bundle names (so every deploy drops the
// previous caches on activate) and PRECACHE_ASSETS becomes the hashed
// assets/... files, which must be precached at install — registration happens
// after window load, so the first page view fetches them before this worker
// controls the page and a fetch-time cache would miss them.
const VERSION = "dev";
const PRECACHE_ASSETS = [];
const SHELL_CACHE = `undertone-shell-${VERSION}`;
const ASSET_CACHE = `undertone-assets-${VERSION}`;
// Scope pathname is the deploy base ("/" locally, "/undertone/" on Pages).
const BASE = new URL(self.registration.scope).pathname;

const SHELL_URLS = [
  BASE,
  `${BASE}manifest.webmanifest`,
  `${BASE}favicon.svg`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
      caches
        .open(ASSET_CACHE)
        .then((cache) => cache.addAll(PRECACHE_ASSETS.map((path) => `${BASE}${path}`))),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("undertone-") && k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await cache.put(BASE, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(BASE);
    if (cached) return cached;
    throw new Error("offline and no cached shell");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) await cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isBuildAsset = sameOrigin && url.pathname.startsWith(`${BASE}assets/`);
  const isShellFile = sameOrigin && SHELL_URLS.includes(url.pathname);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (isBuildAsset || isShellFile || isFont) {
    event.respondWith(cacheFirst(request));
  }
});
