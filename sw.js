const CACHE_NAME = 'jardin-magico-v3'; // Incrementamos a v3 para que limpie la caché vieja
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './imagenes/fondo.webp',
  './imagenes/boton_jugar.webp',
  './imagenes/icono-192.webp',
  './imagenes/icono-512.webp',
  // Sprites
  './imagenes/uno_espera.webp',
  './imagenes/uno_carrera.webp',
  './imagenes/uno_victoria.webp',
  './imagenes/dos_espera.webp',
  './imagenes/dos_carrera.webp',
  './imagenes/dos_victoria.webp',
  './imagenes/tres_espera.webp',
  './imagenes/tres_carrera.webp',
  './imagenes/tres_victoria.webp',
  // Audios (Asegúrate de que las rutas relativas sean idénticas en tu carpeta)
  './sonidos/elige.mp3',
  './sonidos/ganaste.mp3',
  './sonidos/casi_ganas.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos un bucle para mapear las peticiones y evitar que un solo fallo rompa todo el almacenamiento
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.error(`Error al cachear: ${url}`, err));
        })
      );
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

// Clonamos las peticiones para evitar errores de rango con archivos multimedia (.mp3)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request.clone());
    })
  );
});