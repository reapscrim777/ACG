const CACHE_NAME = 'acg-dynamic-cache-v5'; // Zwiększyłem wersję, aby wymusić aktualizację
const urlsToCache = [
  './',
  './index.html',
  './historia.html',
  './statystyki.html',
  './soloq.html',
  './ranking.html',
  './style.css',
  './logo.png',
  './logo2.png',
  './background.png',
  './status.js',
  './script.js',
  './main.js',
  './firebase-init.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
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
        // Wymusza aktywację nowego service workera natychmiast po instalacji
        return self.skipWaiting();
      })
  );
});

// Aktywacja Service Workera i usunięcie starych cache
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Sprawia, że nowy service worker od razu przejmuje kontrolę nad stroną
      return self.clients.claim();
    })
  );
});

// Strategia "Network First" (Najpierw Sieć)
self.addEventListener('fetch', event => {
  // Ignoruj żądania, które nie są typu GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // 1. Spróbuj pobrać zasób z sieci
    fetch(event.request)
      .then(networkResponse => {
        // 2. Jeśli się udało, zapisz świeżą kopię w cache i zwróć odpowiedź z sieci
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // 3. Jeśli pobranie z sieci się nie udało (brak internetu),
        // spróbuj zwrócić zasób z pamięci podręcznej
        return caches.match(event.request);
      })
  );
});
