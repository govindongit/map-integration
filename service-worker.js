// service-worker.js

const CACHE_NAME = "map-cache-v1";
const MAX_ITEMS = 100; // limit number of cached requests

// Pre-cache core Leaflet files (so map works offline immediately)
const PRECACHE_URLS = [
  "index.html",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

// 🧱 Install event — pre-cache Leaflet and base files
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ♻️ Activate event — clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
});

// 🌍 Fetch handler — network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse; // Serve cached if available

      try {
        const response = await fetch(request);

        // Cache map tiles and Leaflet files only
        if (
          response.status === 200 &&
          (request.url.includes("tile.openstreetmap.org") ||
            request.url.includes("unpkg.com/leaflet"))
        ) {
          cache.put(request, response.clone());
          limitCacheSize(cache);
        }

        return response;
      } catch (error) {
        // Offline fallback if cache exists
        return cachedResponse || Response.error();
      }
    })
  );
});

// 🧹 Limit cache size helper
async function limitCacheSize(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_ITEMS) {
    cache.delete(keys[0]); // delete oldest
  }
}
