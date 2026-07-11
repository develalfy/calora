// Calora service worker — basic offline shell.
// Network-first for /api/* (so estimates always use live model), cache-first for the rest.

const CACHE_NAME = "calora-v1";
const CORE_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  // Pre-cache the shell so the app can boot offline.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(CORE_ASSETS);
      } catch (_err) {
        // Non-fatal: we still want skipWaiting to take effect.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  // Take control of uncontrolled clients (first install on existing tabs).
  event.waitUntil(
    (async () => {
      // Best-effort cleanup of any old caches from prior versions.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
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

  // Network-first for API calls (we always want a live AI response).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch (_err) {
          // No useful offline fallback for AI; let the browser show its error.
          return new Response("", {
            status: 503,
            statusText: "Offline",
          });
        }
      })(),
    );
    return;
  }

  // Cache-first for everything else (app shell, static assets).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        return cached;
      }
      try {
        const fresh = await fetch(req);
        // Only cache successful basic responses.
        if (fresh && fresh.status === 200 && fresh.type === "basic") {
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_err) {
        // Last-resort: try the app root so navigation gets something.
        const fallback = await cache.match("/");
        if (fallback) return fallback;
        return new Response("Offline", { status: 503 });
      }
    })(),
  );
});
