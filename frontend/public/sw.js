/* Only the public offline page and brand icons are cached. Never cache API,
   RSC, account pages, farmer uploads, conversations or private advisory results. */
const CACHE = "duducare-public-v1";
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"]))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("duducare-public-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => { const url = new URL(event.request.url); if(event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/"))return;
 if(event.request.mode === "navigate")event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
