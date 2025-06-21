const CACHE_NAME = 'acg-dynamic-cache-v3';
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
  '/main.js',
  '/firebase-init.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalacja Service Workera
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // NOWA LINIA: Wymusza aktywację nowego service workera natychmiast po instalacji
        return self.skipWaiting();
      })
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // NOWA LINIA: Sprawia, że nowy service worker od razu przejmuje kontrolę nad stroną
      return self.clients.claim();
    })
  );
});


// Strategia "Network First" (Najpierw Sieć)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});