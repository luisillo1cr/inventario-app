/* ==========================================================
   SERVICE WORKER PARA PWA DE INVENTARIO
   - Cacheo básico de recursos estáticos
   - Reporte de versión al cliente
   ========================================================== */

const SW_VERSION = "v1.0.1";

const CACHE_NAME = `inventario-web-${SW_VERSION}`;

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
          if (nombre.startsWith("inventario-web-") && nombre !== CACHE_NAME) {
            return caches.delete(nombre);
          }
          return null;
        })
      ).then(() => self.clients.claim())
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

/**
 * Responde al cliente con la versión actual cuando recibe
 * el mensaje GET_VERSION.
 */
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "GET_VERSION") {
    return;
  }

  const mensaje = {
    type: "VERSION",
    version: SW_VERSION
  };

  if (event.source && typeof event.source.postMessage === "function") {
    event.source.postMessage(mensaje);
  } else {
    self.clients.matchAll({ type: "window" }).then((clientes) => {
      clientes.forEach((cliente) => cliente.postMessage(mensaje));
    });
  }
});
