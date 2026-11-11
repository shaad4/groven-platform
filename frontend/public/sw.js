// Grove PWA Service Worker
// Cache-first for hashed static assets, network-first for pages, and a full
// pass-through (no caching) for anything backend-related — the Django REST
// API, WebSocket upgrade requests, and the admin site.

const CACHE_VERSION = 'grove-v2';
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
        } catch {
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
        } catch {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(request);
          return cached || (await caches.open(STATIC_CACHE)).match(OFFLINE_URL);
        }
      })(),
    );
  }
});

// Always show a visible notification for push delivery (required by iOS).
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload
    try { payload = event.data?.json() || {} } catch { payload = {} }
    if (!payload || typeof payload !== 'object') payload = {}
    const expired = payload.expires_at && payload.expires_at <= Date.now()
    const call = payload.kind === 'call'
    let url
    try { url = new URL(payload.url || '/', self.location.origin) } catch { url = new URL('/', self.location.origin) }
    if (url.origin !== self.location.origin) url = new URL('/', self.location.origin)
    await self.registration.showNotification(expired && call ? 'Missed call' : (payload.title || 'Workspace update'), {
      body: expired && call ? 'Open your workspace to call back.' : payload.body,
      icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png',
      tag: payload.tag || 'workspace-update',
      data: { url: url.href, call_id: payload.call_id },
      ...(call && !expired ? { requireInteraction: true, actions: [{ action: 'open', title: 'Open call' }] } : {}),
    })
  })())
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.url || '/', self.location.origin)
    if (url.origin !== self.location.origin) return
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).origin === url.origin)
    if (existing) {
      await existing.navigate(url.href)
      return existing.focus()
    }
    return self.clients.openWindow(url.href)
  })())
})
