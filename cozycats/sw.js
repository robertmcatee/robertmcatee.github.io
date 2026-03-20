const CACHE_NAME = 'cozycats-v20260320j'; // Incremented version
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './assets/background.png',
  './assets/house_base.png',
  './assets/cat_orange.png',
  './assets/cat_blue.png',
  './assets/cat_green.png',
  './assets/cat_purple.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/screenshot-mobile.png',
  './assets/screenshot-desktop.png'
];

// Install Event - Resilient Caching
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets individually...');
      return Promise.allSettled(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.warn(`Failed to cache: ${url}`, err));
        })
      );
    })
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  // Only handle GET requests for caching
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(e.request).then(networkResponse => {
        // Optionally cache new successful GET requests here
        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
