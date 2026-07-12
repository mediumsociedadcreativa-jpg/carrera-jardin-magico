const CACHE_NAME = 'jardin-magico-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './imagenes/fondo.webp',
  './imagenes/boton_jugar.webp',
  './imagenes/icono-192.webp',
  './imagenes/icono-512.webp',
  // Sprites de los corredores
  './imagenes/uno_espera.webp',
  './imagenes/uno_carrera.webp',
  './imagenes/uno_victoria.webp',
  './imagenes/dos_espera.webp',
  './imagenes/dos_carrera.webp',
  './imagenes/dos_victoria.webp',
  './imagenes/tres_espera.webp',
  './imagenes/tres_carrera.webp',
  './imagenes/tres_victoria.webp',
  // Audios del juego
  './sonidos/elige.mp3',
  './sonidos/ganaste.mp3',
  './sonidos/casi_ganas.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});