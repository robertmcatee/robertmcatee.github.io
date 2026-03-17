const CACHE_NAME = 'catsort-v1';
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
  './assets/cat_purple.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
