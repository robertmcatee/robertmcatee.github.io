const CACHE_NAME = 'cozycats-v20260319a';
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

// Install Event
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS);
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
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    }).catch(() => caches.match('./index.html'))
  );
});
