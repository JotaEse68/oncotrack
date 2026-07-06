/**
 * Service worker de OncoTrack (§4.8).
 * Los DATOS ya viven offline en IndexedDB; esto cubre el "shell" de la app:
 * - estáticos de Next: cache-first (tienen hash en el nombre)
 * - navegaciones: network-first con caché de respaldo para modo avión
 */
// Subir la versión purga cachés viejas en el próximo arranque (ver activate)
const CACHE = "oncotrack-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Estáticos con hash: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const enCache = await cache.match(request);
        if (enCache) return enCache;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // Navegaciones: red primero, caché si no hay conexión
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
          }
          return res;
        })
        .catch(async () => {
          const enCache = await caches.match(request);
          if (enCache) return enCache;
          const hoy = await caches.match("/hoy");
          return hoy ?? Response.error();
        })
    );
  }
});
