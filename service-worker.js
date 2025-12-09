/* ==========================================================
   SERVICE WORKER BÁSICO PARA PWA
   Cachea los archivos estáticos mínimos para uso offline.
   ========================================================== */

const CACHE_NAME = "inventario-asulatina-v1";

const RECURSOS_ESTATICOS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/bootstrap.min.css",
  "./assets/bootstrap.bundle.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(RECURSOS_ESTATICOS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres.map((nombre) => {
          if (nombre !== CACHE_NAME) {
            return caches.delete(nombre);
          }
          return null;
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((respuesta) => {
      if (respuesta) {
        return respuesta;
      }
      return fetch(event.request);
    })
  );
});
