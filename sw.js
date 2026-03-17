const CACHE_NAME = 'gimbal-control-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './StyleSheet.css',
  './manifest.json',
  './vendor/font-awesome.min.css',
  './vendor/regression.min.js',
  './vendor/sweetalert2@11.js',
  './vendor/plotly-latest.min.js',
  './js/constants.js',
  './js/mathUtils.js',
  './js/uiUtils.js',
  './js/gimbalSerial.js',
  './js/fileHandling.js',
  './js/plotting.js',
  './js/movementControl.js',
  './js/app.js',
  './images/RafLogo.svg',
  './images/logo-title.svg',
  './images/StopSign.svg',
  './images/glimpse-bw-icon.svg',
  './images/logo-192x192.png',
  './images/logo-512x512.png',
  './assets/minimal-ping.mp3',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(
        STATIC_ASSETS.map((url) => new Request(url, { cache: 'reload' }))
      );
    })
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-only for everything else
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests (e.g. chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Only cache same-origin successful responses
        if (
          response.ok &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
