// Grove PWA Service Worker
// Cache-first for hashed static assets, network-first for pages, and a full
// pass-through (no caching) for anything backend-related — the Django REST
// API, WebSocket upgrade requests, and the admin site.

const CACHE_VERSION = 'grove-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/favicon.svg',
  '/icons/icon-192x192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('grove-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch the Django API, admin, or auth/token endpoints — these must
  // always hit the network so requests, chat, notifications, and billing
  // state are never served stale. WebSocket upgrade requests (chat,
  // notifications) aren't interceptable by fetch anyway, but /api/ REST
  // calls made over plain HTTP are, so they're explicitly excluded here.
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin/') ||
    url.pathname.startsWith('/grove-admin/') ||
    url.pathname.startsWith('/ws/')
  ) {
    return;
  }

  // Hashed build assets (Vite outputs these under /assets/): cache-first
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|woff2?|png|jpe?g|webp|svg|mp3|wav)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  // Page navigations (SPA routes): network-first, cache fallback, then
  // offline.html as the last resort.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch (err) {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(request);
          return cached || cache.match(OFFLINE_URL);
        }
      })(),
    );
  }
});
