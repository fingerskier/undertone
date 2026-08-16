/**
 * Offline support. Build assets are content-hashed, so cache-first is safe for
 * them; the HTML shell is network-first so deploys roll out on the next load
 * while the app keeps working offline.
 */
const VERSION = "v1";
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
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
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
