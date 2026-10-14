// Service Worker for Personal Finance Manager - Smart Offline Edition
const CACHE_NAME = 'pfm-offline-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/mobile.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './js/app.js',
  './js/i18n.js',
  './js/db.js',
  './js/security.js',
  './js/ledger.js',
  './js/charts.js',
  './js/exports.js',
  './js/reports.js',
  './js/backup.js',
  './js/assistant.js',
  './js/views/dashboard.js',
  './js/views/income.js',
  './js/views/expense.js',
  './js/views/transactions.js',
  './js/views/budgets.js',
  './js/views/savings.js',
  './js/views/lending.js',
  './js/views/borrowing.js',
  './js/views/accounts.js',
  './js/views/reports.js',
  './js/views/backup.js',
  './js/views/assistant.js',
  './js/views/settings.js',
  './tests/test_suite.html',
  './tests/test_runner.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for offline caching
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache new local resources dynamically
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return index.html fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
