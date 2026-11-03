// Crop Watch offline shell. Caches the app and the static map outlines. Never caches the API, so data is always fresh or an honest error.
const CACHE = "cropwatch-shell-v1";
const PRECACHE = ["/", "/index.html", "/maharashtra.json", "/jalna_talukas.json", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;       // the API always goes to the network
  if (req.mode === "navigate") {                                              // pages: network first, cached shell if offline
    e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put("/index.html", r.clone())); return r; }).catch(() => caches.match("/index.html")));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {                                 // assets: cache first
    if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
    return r;
  })));
});
