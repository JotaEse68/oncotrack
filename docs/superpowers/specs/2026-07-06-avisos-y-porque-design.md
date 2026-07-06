# Avisos sin abrir la app + página "Por qué hice OncoTrack" — Diseño

Acordado con Jota el 2026-07-06. Dos bloques independientes.

## Restricción de partida

OncoTrack es local-first y sin servidor propio: no hay push "de verdad".
Vía principal: el calendario del móvil (universal). Refuerzo: notificación
best-effort solo en Android instalada. En iPhone no se ofrece lo que no
funciona.

## Bloque 1 — "Añadir a mi calendario" (.ics, universal)

**Módulo puro `src/lib/calendario.ts`** (con tests vitest):

- `icsCita(cita: Cita): string` — VCALENDAR/VEVENT:
  - Con hora: DTSTART fecha+hora local, duración 1h. Sin hora: evento de día
    completo.
  - SUMMARY: `Cita: {especialista ?? "cita médica"}`; LOCATION: centro si hay;
    DESCRIPTION: notas si hay + "Anotada en OncoTrack".
  - VALARM ×2: un día antes; y 2 horas antes solo si tiene hora.
  - UID estable: `cita-{id}@oncotrack` → reimportar actualiza, no duplica
    (en la mayoría de calendarios).
- `icsToma(med: Medicacion): string` — evento de día completo en
  `proximaFecha`, SUMMARY `Toma: {nombre}` (+ dosis), VALARM a las 9:00 del
  día (TRIGGER PT9H desde medianoche). UID `toma-{id}@oncotrack`.
- Escapado ICS correcto (comas, punto y coma, saltos de línea); CRLF; texto
  sin juicios clínicos.
- `descargarICS(nombreArchivo: string, contenido: string)` — Blob +
  `<a download>` programático (helper de UI, sin test).

**UI:**
- En `citas/page.tsx`, dentro de cada tarjeta de cita futura: botón
  secundario "📅 Añadir a mi calendario".
- En `salud/medicacion/page.tsx`, en cada medicación con `proximaFecha`
  futura o de hoy: mismo botón.
- Al tocar: descarga el .ics; el móvil lo abre con su calendario. Sin más
  estados (la descarga es el feedback del sistema).

## Bloque 2 — Aviso propio best-effort (Android instalada)

**Ajuste nuevo:** `Ajustes.avisosActivados: 0 | 1` (default 0) + migración de
esquema Dexie si hace falta (campo opcional: no requiere versión nueva).

**Sección "Avisos" en `/ajustes`:**
- Visible SOLO si el navegador soporta todo: `"serviceWorker" in navigator`,
  `"Notification" in window` y `"periodicSync" in registration`.
- Interruptor "Avisarme de citas y tomas aunque la app esté cerrada".
  Al activar: `Notification.requestPermission()` → si concedido,
  `registration.periodicSync.register("avisos-oncotrack", {minInterval: 12h})`
  y guardar ajuste. Al desactivar: `unregister` + guardar.
- Texto honesto bajo el toggle: "Android decide el momento exacto del aviso;
  como refuerzo, añade también las citas a tu calendario."

**En `public/sw.js`** (vanilla, mismo archivo):
- Listener `periodicsync` (tag `avisos-oncotrack`): abre IndexedDB
  `oncotrack` a pelo (sin Dexie), lee `ajustes` (si `avisosActivados !== 1`,
  salir), `citas` y `medicacion`.
- Reglas (mismas frases cálidas de la app):
  - Cita con `diasHasta` 0 → "Hoy: {especialista} · {hora}".
  - Cita con `diasHasta` 1 → "Mañana: {especialista} — prepara tus preguntas".
  - Medicación con `proximaFecha <= hoy` → "Hoy toca {nombre}".
- Anti-repetición: guarda en `ajustes` (campo `ultimoAvisoISO`) la fecha del
  último aviso mostrado; máximo una notificación agrupada por día
  (`registration.showNotification` con las líneas juntas en `body`).
- La aritmética de fechas del SW se duplica mínima en vanilla (medianoche
  local, diferencia en días) — asumido y comentado; la fuente de verdad de
  la app sigue siendo `lib/fechas.ts`.

**Verificación:** unit tests no cubren el SW; se verifica en Chrome DevTools
(Application → Service Workers → simular Periodic Background Sync) con datos
reales sembrados.

## Bloque 3 — Página "Por qué hice OncoTrack"

- Ruta nueva `src/app/(app)/apoyo/porque/page.tsx` (contenido estático, sin
  DB). Primera persona, firmada "Jota! · jsantos.pro" (enlace, pestaña
  nueva).
- Estructura: (1) Por qué la hice — los NET son crónicos y de evolución
  lenta, años con los mismos marcadores, varios especialistas, consultas
  cortas; eso desperdiga papeles, hace olvidar preguntas y empuja a googlear
  números sin contexto. (2) Cómo sacarle partido — no es un diario con
  deberes: foto a la analítica cuando llegue y confirmar; preguntas cuando
  surjan; modo consulta el día de la cita; estado del día de un toque, solo
  si apetece; añadir citas al calendario. (3) Cierre — sin ánimo de lucro,
  datos solo en tu móvil, no sustituye al equipo médico.
- Entradas: tarjeta en `/apoyo` ("Por qué existe esta app") + enlace
  "¿Por qué OncoTrack?" en `PiePagina`.
- Tono: español cálido, sin positivismo de plástico, sin juicios clínicos.

## Fuera de alcance

- Push con servidor (rompe la privacidad local).
- Notificaciones en iPhone (la plataforma no lo permite sin push server).
- Sincronizar cambios de cita con eventos ya añadidos al calendario
  (se reimporta tocando el botón otra vez; el UID estable evita duplicados).

## Criterios de aceptación

1. Tocar "Añadir a mi calendario" en una cita con hora descarga un .ics
   válido que Google Calendar/iOS abren con 2 avisos configurados.
2. Cambiar la fecha de la cita y volver a añadirla actualiza el evento (UID
   igual) en Google Calendar.
3. En escritorio/iPhone la sección "Avisos" de Ajustes no aparece.
4. Simulando periodicsync en Chrome con una cita mañana → notificación con
   el texto acordado; segunda simulación el mismo día → sin repetición.
5. `/apoyo/porque` accesible desde Apoyo y desde el pie; texto firmado con
   enlace a jsantos.pro; sin vocabulario prohibido.
6. Suite completa verde y build limpio; todo verificado a 375px.
