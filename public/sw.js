// FIXR Service Worker — Network-first para HTML, Cache-first para assets com hash
const CACHE_VERSION = 'fixr-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Apaga TODOS os caches antigos
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Nunca cachear: API, auth, extensões do Chrome
  const url = event.request.url;
  if (
    url.includes('/rest/v1/') ||
    url.includes('/auth/') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome://')
  ) return;

  // index.html — sempre buscar da rede (nunca cache)
  if (url.endsWith('/') || url.endsWith('/index.html') || !url.includes('.')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets com hash no nome (ex: index-DDWwJVST.js) — cache-first
  if (url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Demais requests — network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
