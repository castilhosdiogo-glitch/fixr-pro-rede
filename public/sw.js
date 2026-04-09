// FIXR Service Worker v2 — Network-first para HTML, cache-first para assets com hash
const CACHE_VERSION = 2;
const CACHE_NAME = `fixr-v${CACHE_VERSION}`;

self.addEventListener('install', () => {
  // Skip waiting para ativar imediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpa TODOS os caches antigos
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

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora non-GET, API calls, e Supabase
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return;
  if (url.hostname !== location.hostname) return;

  // HTML (navegação) → SEMPRE network-first para nunca servir HTML velho
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheia a versão fresca para uso offline
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Assets com hash no nome (ex: index-Dp45H5Ss.js, index-C6G_3qQV.css)
  // Estes são imutáveis — cache-first é seguro
  const hasHash = /\/assets\/[^/]+-[a-zA-Z0-9]{6,}\.(js|css|woff2?|png|jpg|svg)$/.test(url.pathname);

  if (hasHash) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Tudo o resto (manifest.json, favicon, etc) → network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title || 'Fixr', {
        body: payload.body || '',
        icon: '/pwa-icon-512.png',
        badge: '/pwa-icon-512.png',
        data: payload.data || {},
      })
    );
  } catch {
    // Ignora payloads inválidos
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
