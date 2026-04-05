/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache app assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Push notification handler ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; icon?: string; badge?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Fixr', body: event.data?.text() ?? '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Fixr', {
      body: data.body ?? 'Nova atividade no seu painel.',
      icon: data.icon ?? '/pwa-icon-512.png',
      badge: data.badge ?? '/pwa-icon-512.png',
      vibrate: [200, 100, 200],
      tag: 'Fixr-dispatch',
      renotify: true,
    })
  );
});

// ── Notification click: open/focus the app ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow('/dashboard');
      })
  );
});

