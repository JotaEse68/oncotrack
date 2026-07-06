# Avisos + página "Por qué" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecución acordada:** tareas seguidas sin checkpoints; un commit por tarea (rama `dev`); verificación por tarea en navegador (build de producción, 375px); merge a `main` + push al final; resumen único.

**Goal:** Ejecutar el spec `docs/superpowers/specs/2026-07-06-avisos-y-porque-design.md` — avisos vía calendario (.ics) y notificación Android best-effort, más la página "Por qué hice OncoTrack".

**Architecture:** Generación .ics en módulo puro con tests; el aviso Android vive en `public/sw.js` (vanilla + raw IndexedDB) con un toggle en Ajustes que solo aparece si la plataforma lo soporta; la página del porqué es contenido estático en `(app)/apoyo/porque`.

**Tech Stack:** el existente (Next 16, Dexie 4, vitest). Sin dependencias nuevas.

## Global Constraints

- Móvil primero: botones ≥44px, probar a 375px.
- Sin juicios clínicos en ningún texto (ni en .ics ni en notificaciones).
- Todo funciona sin clave de IA y sin conexión.
- Español cálido; commits sin tildes.
- No ofrecer opciones que la plataforma no soporta (iPhone: sin sección Avisos).

---

### Task 1: Calendario .ics (lib pura + botones en citas y medicación)

**Files:**
- Create: `src/lib/calendario.ts`, `tests/calendario.test.ts`
- Modify: `src/app/(app)/citas/page.tsx` (botón en TarjetaCita), `src/app/(app)/salud/medicacion/page.tsx` (botón si hay proximaFecha vigente)

**Interfaces (Produces):**
- `icsCita(cita: Cita): string` — VCALENDAR completo, CRLF, UID `cita-{id}@oncotrack`.
- `icsToma(med: Medicacion): string` — evento de día completo en proximaFecha, UID `toma-{id}@oncotrack`.
- `descargarICS(nombreArchivo: string, contenido: string): void` — helper DOM (sin test).

- [ ] **Step 1: test que falla** — `tests/calendario.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { icsCita, icsToma } from "@/lib/calendario";

const CITA = {
  id: 5,
  fecha: "2026-07-12",
  hora: "09:30",
  especialista: "Dr. García",
  centro: "Hospital, planta 3",
};

describe("icsCita", () => {
  it("evento con hora: DTSTART local, 1h, dos avisos y UID estable", () => {
    const ics = icsCita(CITA);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:cita-5@oncotrack");
    expect(ics).toContain("DTSTART:20260712T093000");
    expect(ics).toContain("DTEND:20260712T103000");
    expect(ics).toContain("SUMMARY:Cita: Dr. García");
    expect(ics).toContain("LOCATION:Hospital\\, planta 3"); // coma escapada
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.includes("\n") && !ics.includes("\r\n")).toBe(false); // CRLF
  });

  it("evento sin hora: dia completo y un solo aviso", () => {
    const ics = icsCita({ id: 6, fecha: "2026-08-01" });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260801");
    expect(ics).toContain("DTEND;VALUE=DATE:20260802");
    expect(ics).toContain("SUMMARY:Cita: cita médica");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).not.toContain("TRIGGER:-PT2H");
  });
});

describe("icsToma", () => {
  it("dia completo en proximaFecha con aviso a las 9:00", () => {
    const ics = icsToma({
      id: 1,
      nombre: "Lanreotida",
      dosis: "120 mg",
      proximaFecha: "2026-08-03",
      historial: [],
    });
    expect(ics).toContain("UID:toma-1@oncotrack");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260803");
    expect(ics).toContain("SUMMARY:Toma: Lanreotida");
    expect(ics).toContain("DESCRIPTION:120 mg");
    expect(ics).toContain("TRIGGER:PT9H");
  });
});
```

- [ ] **Step 2: rojo** — `npm test` falla con "Cannot find package '@/lib/calendario'".
- [ ] **Step 3: implementar** `src/lib/calendario.ts`:

```ts
import type { Cita, Medicacion } from "@/lib/db";

/** Eventos de calendario (.ics) — el móvil avisa, sin servidor (spec B1). */

function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function fechaCompacta(iso: string): string {
  return iso.replaceAll("-", "");
}

/** "2026-07-12" + "09:30" → "20260712T093000" (hora local flotante). */
function fechaHora(iso: string, hora: string): string {
  return `${fechaCompacta(iso)}T${hora.replace(":", "")}00`;
}

function diaSiguiente(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(y, m - 1, d + 1);
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const dd = String(f.getDate()).padStart(2, "0");
  return `${f.getFullYear()}-${mm}-${dd}`;
}

function alarma(trigger: string, texto: string): string[] {
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(texto)}`,
    `TRIGGER:${trigger}`,
    "END:VALARM",
  ];
}

function envolver(lineas: string[]): string {
  return (
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OncoTrack//ES", ...lineas, "END:VCALENDAR"].join(
      "\r\n"
    ) + "\r\n"
  );
}

/** Sumar 1h a "HH:mm" (fin por defecto de la cita). */
function horaFin(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function icsCita(cita: Cita): string {
  const quien = cita.especialista ?? "cita médica";
  const lineas: string[] = ["BEGIN:VEVENT", `UID:cita-${cita.id}@oncotrack`];
  lineas.push(`DTSTAMP:${fechaCompacta(cita.fecha)}T000000Z`);
  if (cita.hora) {
    lineas.push(`DTSTART:${fechaHora(cita.fecha, cita.hora)}`);
    lineas.push(`DTEND:${fechaHora(cita.fecha, horaFin(cita.hora))}`);
  } else {
    lineas.push(`DTSTART;VALUE=DATE:${fechaCompacta(cita.fecha)}`);
    lineas.push(`DTEND;VALUE=DATE:${fechaCompacta(diaSiguiente(cita.fecha))}`);
  }
  lineas.push(`SUMMARY:${escapar(`Cita: ${quien}`)}`);
  if (cita.centro) lineas.push(`LOCATION:${escapar(cita.centro)}`);
  lineas.push(
    `DESCRIPTION:${escapar(`${cita.notas ? `${cita.notas}\n` : ""}Anotada en OncoTrack.`)}`
  );
  lineas.push(...alarma("-P1D", `Mañana: ${quien}`));
  if (cita.hora) lineas.push(...alarma("-PT2H", `En 2 horas: ${quien}`));
  lineas.push("END:VEVENT");
  return envolver(lineas);
}

export function icsToma(med: Medicacion): string {
  const fecha = med.proximaFecha!;
  const lineas: string[] = [
    "BEGIN:VEVENT",
    `UID:toma-${med.id}@oncotrack`,
    `DTSTAMP:${fechaCompacta(fecha)}T000000Z`,
    `DTSTART;VALUE=DATE:${fechaCompacta(fecha)}`,
    `DTEND;VALUE=DATE:${fechaCompacta(diaSiguiente(fecha))}`,
    `SUMMARY:${escapar(`Toma: ${med.nombre}`)}`,
  ];
  if (med.dosis) lineas.push(`DESCRIPTION:${escapar(med.dosis)}`);
  lineas.push(...alarma("PT9H", `Hoy toca ${med.nombre}`));
  lineas.push("END:VEVENT");
  return envolver(lineas);
}

/** Descarga el .ics; el móvil lo abre con su calendario. Solo cliente. */
export function descargarICS(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: verde** (`npm test`).
- [ ] **Step 5: botón en citas** — en `TarjetaCita` (citas/page.tsx), tras el bloque de info de la cita y antes de `<ListaPreguntas/>`, solo citas futuras (la tarjeta ya distingue: el botón va incondicional dentro de la sección de futuras; si TarjetaCita se reusa para pasadas, condicionar con `diasHasta(cita.fecha) >= 0`):

```tsx
<button
  onClick={() => descargarICS(`cita-${cita.id}.ics`, icsCita(cita))}
  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-morado/50 hover:text-fg"
>
  📅 Añadir a mi calendario
</button>
```

Import: `import { descargarICS, icsCita } from "@/lib/calendario";`

- [ ] **Step 6: botón en medicación** — en la tarjeta de cada medicación (medicacion/page.tsx), debajo de "Registrar toma de hoy", solo si `m.proximaFecha && diasHasta(m.proximaFecha) >= 0` (import `diasHasta` de `@/lib/fechas` y `descargarICS, icsToma` de `@/lib/calendario`):

```tsx
{m.proximaFecha && diasHasta(m.proximaFecha) >= 0 && (
  <button
    onClick={() => descargarICS(`toma-${m.id}.ics`, icsToma(m))}
    className={`${BTN_SECUNDARIO} mt-2 w-full`}
  >
    📅 Añadir a mi calendario
  </button>
)}
```

- [ ] **Step 7: verificar** — build; navegador 375px: cita futura muestra el botón, al tocarlo descarga `cita-N.ics`; leer el archivo descargado y comprobar DTSTART/VALARM/UID; medicación con proximaFecha ídem. Tests verdes.
- [ ] **Step 8: commit** `feat(calendario): citas y tomas al calendario del movil con recordatorios`

### Task 2: Aviso Android best-effort (toggle en Ajustes + periodicsync en SW)

**Files:**
- Create: `src/app/(app)/ajustes/_components/SeccionAvisos.tsx`
- Modify: `src/lib/db/index.ts` (campos opcionales `avisosActivados`, `ultimoAvisoISO` en Ajustes), `src/app/(app)/ajustes/page.tsx` (montar sección), `public/sw.js` (listener periodicsync)

**Interfaces:** `Ajustes.avisosActivados?: 0 | 1`, `Ajustes.ultimoAvisoISO?: string` (los lee el SW a pelo).

- [ ] **Step 1: campos en db** — añadir a la interface Ajustes:

```ts
  avisosActivados?: 0 | 1;
  ultimoAvisoISO?: string; // yyyy-mm-dd del último aviso mostrado (lo escribe el SW)
```

(Campos no indexados: no hace falta versión nueva de Dexie.)

- [ ] **Step 2: SeccionAvisos.tsx** — client; detecta soporte en efecto (`"serviceWorker" in navigator && "Notification" in window`, luego `const reg = await navigator.serviceWorker.ready; soporta = "periodicSync" in reg`); si no soporta → return null. Toggle:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getAjustes, saveAjustes } from "@/lib/db";
import { CARD_CLS } from "../../_components/ui";

interface RegistroConPeriodicSync extends ServiceWorkerRegistration {
  periodicSync: {
    register(tag: string, opts: { minInterval: number }): Promise<void>;
    unregister(tag: string): Promise<void>;
  };
}

const TAG = "avisos-oncotrack";

/** Aviso best-effort de citas/tomas (spec B2). Solo Android instalada. */
export function SeccionAvisos() {
  const ajustes = useLiveQuery(() => getAjustes());
  const [soportado, setSoportado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        if (vivo && "periodicSync" in reg) setSoportado(true);
      } catch {
        /* sin SW no hay avisos */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (!soportado || !ajustes) return null;
  const activo = ajustes.avisosActivados === 1;

  async function alternar() {
    setError("");
    const reg = (await navigator.serviceWorker.ready) as RegistroConPeriodicSync;
    if (activo) {
      try {
        await reg.periodicSync.unregister(TAG);
      } catch {
        /* si no estaba registrado, da igual */
      }
      await saveAjustes({ avisosActivados: 0 });
      return;
    }
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setError("Sin permiso de notificaciones no puedo avisarte — puedes darlo en los ajustes del navegador.");
      return;
    }
    try {
      await reg.periodicSync.register(TAG, { minInterval: 12 * 60 * 60 * 1000 });
      await saveAjustes({ avisosActivados: 1 });
    } catch {
      setError("Tu navegador no permite registrarlo ahora — instala la app en tu pantalla de inicio y vuelve a intentarlo.");
    }
  }

  return (
    <section className={CARD_CLS}>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Avisos</h2>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm text-fg">Avisarme de citas y tomas aunque la app esté cerrada</span>
        <input type="checkbox" checked={activo} onChange={alternar} className="h-6 w-6 accent-morado" />
      </label>
      <p className="mt-2 text-xs leading-5 text-muted">
        Android decide el momento exacto del aviso; como refuerzo, añade también tus citas al calendario.
      </p>
      {error && <p className="mt-2 text-xs leading-5 text-error">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 3: montar** en ajustes/page.tsx junto a las demás secciones (`<SeccionAvisos />` después de SeccionBackup — mirar la página y seguir su orden).
- [ ] **Step 4: sw.js** — añadir al final:

```js
// Aviso best-effort de citas/tomas (Android instalada). La app guarda
// avisosActivados en ajustes; aquí solo leemos y avisamos, máx. 1 vez/día.
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
        // marcar el día (sin Dexie: put directo conservando el objeto)
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
```

- [ ] **Step 5: verificar** — build; navegador prod: en Chromium `/ajustes` muestra la sección (Chromium soporta periodicSync); activar con permiso concedido vía Playwright → toggle queda activo o muestra el mensaje honesto de "instala la app" (ambos resultados válidos según el entorno); en contexto sin soporte no aparece. Tests verdes. Anotar para Jota la prueba real en su Android.
- [ ] **Step 6: commit** `feat(avisos): notificacion opcional de citas y tomas en android instalada`

### Task 3: Página "Por qué hice OncoTrack" + entradas

**Files:**
- Create: `src/app/(app)/apoyo/porque/page.tsx`
- Modify: `src/app/(app)/apoyo/page.tsx` (tarjeta), `src/app/(app)/_components/PiePagina.tsx` (enlace)

- [ ] **Step 1: página** — contenido estático (server component, sin "use client"), `max-w-md`, cabecera estilo app ("Apoyo · Por qué"), título "Por qué hice OncoTrack". Secciones en `text-sm leading-6 text-fg/text-muted`:
  1. **Por qué la hice** — "Los tumores neuroendocrinos son enfermedades crónicas, de evolución lenta. Se siguen durante años con los mismos marcadores, entre varios especialistas y en consultas que duran minutos. Eso hace tres cosas: los papeles se desperdigan, la pregunta importante se olvida justo en la consulta, y un número suelto empuja a buscar en internet respuestas que no están ahí. OncoTrack existe para esas tres cosas: tu historia en un sitio, tus preguntas listas, y tus valores comparados solo con tu propio camino."
  2. **Cómo sacarle partido** — lista: "No es un diario con deberes. Cuando llegue una analítica, hazle una foto y confirma los valores. Las preguntas, apúntalas en el momento en que surjan. El día de la cita, abre el modo consulta y enséñalo. El estado del día es un toque — y solo si te apetece. Añade tus citas al calendario para que el móvil te avise."
  3. **Lo que esta app no es** — "No sustituye a tu equipo médico ni a sus indicaciones. Aquí no hay diagnósticos ni valoraciones: los datos son tuyos, las decisiones son de tu equipo."
  4. **Cierre firmado** — "Sin ánimo de lucro. Tus datos viven solo en tu móvil. Hecha con cariño para apoyar a pacientes con tumores neuroendocrinos y a quienes los acompañan." + "— Jota! · [jsantos.pro](https://jsantos.pro)" (enlace `target="_blank" rel="noopener noreferrer"`, `text-morado`).
- [ ] **Step 2: tarjeta en /apoyo** — seguir el patrón de tarjetas existente en apoyo/page.tsx: Link a `/apoyo/porque`, título "Por qué existe esta app", subtítulo "La historia y cómo sacarle partido".
- [ ] **Step 3: enlace en pie** — en PiePagina, tras el párrafo del disclaimer, añadir: `<Link href="/apoyo/porque" className="text-morado underline-offset-2 hover:underline">¿Por qué OncoTrack?</Link>` dentro de un `<p className="text-xs">` (import Link).
- [ ] **Step 4: verificar** — build (ruta `/apoyo/porque` en la lista); navegador 375px: tarjeta en Apoyo, enlace en pie, página legible, enlace jsantos.pro abre fuera; grep vocabulario prohibido en la página nueva. Tests verdes.
- [ ] **Step 5: commit** `feat(apoyo): pagina por que hice oncotrack firmada y enlazada`

### Task 4: Verificación final + publicar

- [ ] `npm test` verde completo; `npm run build` limpio.
- [ ] Grep vocabulario prohibido en `src/lib/calendario.ts`, `public/sw.js`, `src/app/(app)/apoyo/porque/page.tsx`.
- [ ] Navegador prod 375px, pasada: cita → añadir a calendario (leer .ics) → medicación con próxima fecha → ajustes (sección Avisos según soporte) → /apoyo/porque desde tarjeta y pie.
- [ ] Apagar servidor local y cerrar navegador.
- [ ] Push `dev`; merge a `main` + push; resumen final (incluida la prueba pendiente en el Android de Jota).
