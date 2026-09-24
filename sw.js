// ---------------------------------------------------------------
// Nova Run — Service Worker
// Strategy: stale-while-revalidate
//
// - Serve cached files instantly (fast loads)
// - Fetch fresh copies from the network in the background
// - Cache gets updated automatically for the next visit
//
// You never need to edit this file when you push updates.
// Just commit your changes to the repo and installed users
// will pick them up within one open of the app.
// ---------------------------------------------------------------

const CACHE_NAME = 'novarun-cache-v1';

// Files that get precached on first install
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './js/game.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './music.mp3',
  './UAL1_Standard.glb',
  './venice_sunset_1k.hdr'
];

// Install: precache everything
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails the whole install if any file 404s, so we add
      // each one individually and ignore failures.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] precache failed for', url, err);
          })
        )
      );
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Don't try to cache chrome-extension: or other non-http(s) schemes
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Kick off a network fetch regardless — this updates the cache
      const networkFetch = fetch(req)
        .then((response) => {
          // Only cache successful responses
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, copy).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed — nothing to do here, cached (if any) wins
          return cached;
        });

      // Serve cached immediately if we have it, else wait for network
      return cached || networkFetch;
    })
  );
});
