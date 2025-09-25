// service-worker.js
const CACHE_NAME = `nyt-crosswords-cache-${Date.now()}`;
const ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./images/Logo.png"
];

// Install: cache assets
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                ASSETS.map(asset => cache.add(asset))
            )
        )
    );

    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
        )
    );

    self.clients.claim();
});

// Fetch: network-first for all, cache fallback if offline
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Optionally: put a copy in cache
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone);
                });
                return response;
            })
            .catch(() => caches.match(event.request)) // fallback if offline
    );
});

