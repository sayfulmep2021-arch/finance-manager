// Service Worker for Personal Finance Manager - Smart Offline Edition
// Version: pfm-offline-v11 (Full-screen native mobile UI with English bottom navigation)
const CACHE_NAME = 'pfm-offline-v11';
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

// Install: Cache all core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Delete all previous caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for Navigation (HTML), Stale-While-Revalidate for Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navigation requests (index.html): Network-First with Cache Fallback
  // Guarantees mobile users receive fresh updates when online, 100% functional when offline
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // 2. All other assets (CSS, JS, Icons): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline and not in cache
      });

      return cachedResponse || fetchPromise;
    })
  );
});
