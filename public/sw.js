// Lunele PWA Service Worker
// Strategy: Network-First for pages, Cache-First for static assets

const CACHE_NAME = 'lunele-v1';
const STATIC_ASSETS = [
  '/offline.html',
  '/css/dashboard.css',
  '/js/shared.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Install: Pre-cache the offline page and critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// Activate: Clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch: Network-First for navigation, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests (POST for API calls, etc.)
  if (request.method !== 'GET') return;

  // Skip external requests (CDNs, Google APIs, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  // Skip API requests — always go to network, no caching
  if (request.url.includes('/api/')) return;

  // Navigation requests (HTML pages): Network-First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Optionally cache the page for faster subsequent loads
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Network failed — try cache first, then offline page
          return caches.match(request).then((cached) => {
            return cached || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, images): Cache-First
  if (
    request.url.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Return cache immediately, but also update in background
          const fetchPromise = fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
            return response.clone();
          }).catch(() => {});
          return cached;
        }
        // Not in cache — fetch from network and cache it
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }
});
