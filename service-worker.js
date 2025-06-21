const CACHE_NAME = 'acg-scrims-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/historia.html',
  '/statystyki.html',
  '/soloq.html',
  '/ranking.html',
  '/style.css',
  '/logo.png',
  '/logo2.png',
  '/background.png',
  '/status.js',
  '/script.js',
  '/firebase-init.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalacja Service Workera i zapisanie zasobów w cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Odpowiadanie z cache, gdy aplikacja jest offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jeśli zasób jest w cache, zwróć go
        if (response) {
          return response;
        }
        // W przeciwnym wypadku, pobierz z sieci
        return fetch(event.request);
      }
    )
  );
});