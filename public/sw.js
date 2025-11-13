// Service Worker per Tracker Velocista
const CACHE_NAME = 'tracker-velocista-v1';
const OFFLINE_URL = '/';

// Assets da cachare immediatamente
const PRECACHE_ASSETS = [
  '/',
  '/registro',
  '/storico',
  '/statistiche',
  '/manifest.json',
];

// Installazione - precache assets critici
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Attivazione - pulizia vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  // Solo GET requests
  if (event.request.method !== 'GET') return;

  // Ignora richieste Supabase (sempre online)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la response per cachare
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Fallback a cache se offline
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Fallback alla homepage se risorsa non in cache
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
