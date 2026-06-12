const CACHE_NAME = "gastos-app-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
];

// Instalación: cachear los recursos principales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        URLS_TO_CACHE.map((url) =>
          fetch(url, { mode: "no-cors" })
            .then((res) => cache.put(url, res))
            .catch(() => {}) // si falla algún recurso externo, no rompemos la instalación
        )
      );
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first para HTML (para tener siempre la última versión cuando hay conexión),
// cache-first para todo lo demás, con fallback a cache si no hay red.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // No interceptar llamadas a la API (Anthropic / Drive / Auth)
  const url = new URL(req.url);
  if (
    url.pathname.startsWith("/claude") ||
    url.pathname.startsWith("/auth") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("google.com")
  ) {
    return; // dejar pasar directo a la red, sin cache
  }

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
