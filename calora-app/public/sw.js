// Calora service worker — PWA + offline cache.
//
// Strategy:
//   - App shell + static assets: cache-first (next/static, icons, manifest)
//   - Same-origin HTML pages: network-first, fallback to cached
//   - API routes (/api/*): never cache — they must hit the network
//
// Versioning: BUMP CACHE_NAME on every deploy to invalidate old caches.
// Old caches are purged on activate.

const CACHE_VERSION = "v1";
const STATIC_CACHE = `calora-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `calora-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/app",
  "/privacy",
  "/terms",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Use addAll with a forgiving strategy — don't fail install if one URL 404s
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache
            .add(url)
            .catch((e) => console.warn(`[sw] precache failed for ${url}:`, e)),
        ),
      ),
    ),
  );
  // Activate immediately on first install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k !== STATIC_CACHE &&
              k !== RUNTIME_CACHE &&
              k.startsWith("calora-"),
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — they have rate limits, auth, and user data.
  if (url.pathname.startsWith("/api/")) return;

  // Same-origin HTML pages: network-first with cache fallback
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful responses for offline fallback
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) =>
              cached ||
              caches.match("/").then((fallback) => {
                if (fallback) return fallback;
                return new Response(
                  "<h1>Offline</h1><p>Calora isn't cached yet. Connect to the internet once to enable offline use.</p>",
                  { status: 503, headers: { "Content-Type": "text/html" } },
                );
              }),
          ),
        ),
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Default: try network, fall back to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((c) => c || Response.error())),
  );
});

// Allow the page to trigger an immediate skipWaiting via postMessage.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});