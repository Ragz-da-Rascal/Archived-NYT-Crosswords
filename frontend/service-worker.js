// service-worker.js
const CACHE_NAME = "nyt-crosswords-cache-v2";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
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

// Fetch: try cache, fall back to network
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(resp =>
            resp || fetch(event.request).catch(() => {
                // Optional: fallback page if offline and not in cache
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }
            })
        )
    );
});
