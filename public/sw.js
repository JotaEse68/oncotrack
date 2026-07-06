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

// ---------------------------------------------------------------------------
// Aviso best-effort de citas/tomas (Android instalada, spec avisos B2).
// La app guarda avisosActivados en ajustes; aquí solo leemos y avisamos,
// máximo una notificación agrupada por día. La aritmética de fechas se
// duplica en vanilla a propósito: el SW no puede importar lib/fechas.ts.
// ---------------------------------------------------------------------------
function abrirDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("oncotrack");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function leerTodo(db, store) {
  return new Promise((res, rej) => {
    const rq = db.transaction(store).objectStore(store).getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function diasHasta(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const [y2, m2, d2] = hoyISO().split("-").map(Number);
  return Math.round((new Date(y, m - 1, d) - new Date(y2, m2 - 1, d2)) / 86400000);
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "avisos-oncotrack") return;
  event.waitUntil(
    (async () => {
      const db = await abrirDB();
      try {
        const ajustes = (await leerTodo(db, "ajustes"))[0];
        if (!ajustes || ajustes.avisosActivados !== 1) return;
        if (ajustes.ultimoAvisoISO === hoyISO()) return; // ya avisamos hoy

        const lineas = [];
        for (const c of await leerTodo(db, "citas")) {
          const dias = diasHasta(c.fecha);
          const quien = c.especialista || "cita médica";
          if (dias === 0) lineas.push(`Hoy: ${quien}${c.hora ? ` · ${c.hora}` : ""}`);
          if (dias === 1) lineas.push(`Mañana: ${quien} — prepara tus preguntas`);
        }
        for (const m of await leerTodo(db, "medicacion")) {
          if (m.proximaFecha && diasHasta(m.proximaFecha) <= 0) {
            lineas.push(`Hoy toca ${m.nombre}`);
          }
        }
        if (lineas.length === 0) return;

        await self.registration.showNotification("OncoTrack", {
          body: lineas.join("\n"),
          icon: "/icon.svg",
          tag: "avisos-oncotrack",
        });
        await new Promise((res, rej) => {
          const tx = db.transaction("ajustes", "readwrite");
          ajustes.ultimoAvisoISO = hoyISO();
          const rq = tx.objectStore("ajustes").put(ajustes);
          rq.onsuccess = () => res();
          rq.onerror = () => rej(rq.error);
        });
      } finally {
        db.close();
      }
    })()
  );
});
