/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Precache static assets compiled by Vite
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache name
const CACHE_NAME = 'citas-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification listener
self.addEventListener('push', (event) => {
  let title = 'Recordatorio de Citas';
  let body = 'Tienes citas pendientes para hoy.';
  let data: { url?: string } = { url: '/' };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.title) title = payload.title;
      if (payload.body) body = payload.body;
      if (payload.url) data.url = payload.url;
    } catch {
      body = event.data.text() || body;
    }
  }

  const options: NotificationOptions = {
    body,
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data,
    tag: 'citas-daily-reminder',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
