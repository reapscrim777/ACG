const CACHE_NAME = 'acg-scrims-cache-auto-v1'; // Nazwa nie musi być często zmieniana
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

// Instalacja Service Workera i zapisanie podstawowych zasobów w cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache for offline fallback');
        return cache.addAll(urlsToCache);
      })
  );
});

// Strategia "Network First" - zawsze próbuj pobrać z sieci, a cache traktuj jako zapas
self.addEventListener('fetch', event => {
  event.respondWith(
    // Spróbuj pobrać zasób z sieci
    fetch(event.request)
      .then(networkResponse => {
        // Jeśli się udało, zapisz kopię w cache i zwróć odpowiedź z sieci
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Jeśli pobranie z sieci się nie udało (np. brak internetu),
        // spróbuj zwrócić zasób z pamięci podręcznej
        return caches.match(event.request);
      })
  );
});