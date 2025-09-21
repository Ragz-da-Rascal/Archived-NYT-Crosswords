// service-worker.js
const CACHE_NAME = "nyt-crosswords-cache-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./images/Logo.png"
];

// Install: cache assets
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

// Activate: clean up old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
        )
    );
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
