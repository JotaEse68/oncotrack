# OncoTrack — Pivote a app local individual (Plan de implementación)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Instrucciones de ejecución acordadas con el usuario (2026-07-05):**
> - Ejecutar TODAS las tareas seguidas, sin checkpoints de revisión humana entre bloques.
> - `verification-before-completion` en cada tarea antes de pasar a la siguiente.
> - Un commit por tarea (rama `dev`).
> - `security-review` autónomo (sin preguntar, corrigiendo hallazgos in situ) antes de cerrar las tareas 4 (PIN), 12 (sync Supabase) y 13 (asistente). Anotar hallazgos y correcciones en el resumen final.
> - Resumen final único: qué se hizo por bloque, qué probar manualmente, desviaciones tomadas.

**Goal:** Convertir OncoTrack de app multi-usuario con Supabase obligatorio en una PWA individual, local (Dexie/IndexedDB), sin login, tema claro cálido, con PIN opcional, compartir sin servidor, IA con clave propia del paciente y asistente de acompañamiento — según `Downloads\oncotrack_plan_correccion.md`.

**Architecture:** Next.js 16 App Router se mantiene, pero todas las pantallas de datos pasan a client components que leen/escriben IndexedDB vía Dexie.js (`useLiveQuery`). No hay servidor de datos: compartir = datos cifrados en el fragmento de la URL; backup = archivo local vía Web Share; IA = fetch directo del navegador al proveedor con la clave del paciente. Supabase queda en el repo solo como sync opcional avanzado, apagado por defecto.

**Tech Stack:** Next.js 16.2.9 · React 19 · TypeScript · Tailwind v4 · Dexie 4 + dexie-react-hooks · Web Crypto API (`crypto.subtle`) · CompressionStream · vitest + fake-indexeddb (tests) · Supabase JS (solo tarea 12).

## Global Constraints

(De §6 del documento — aplican a TODAS las tareas)

- NO registro de usuarios ni login por defecto. La app abre directo.
- NO Supabase como requisito — solo opción avanzada apagada por defecto (`NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false`).
- NO semáforos, NO alertas de "valor anormal", NO interpretación diagnóstica automática (ni en marcadores ni en asistente). Valores solo comparados con el propio histórico del paciente.
- NO obligar a configurar clave de IA — la app entera funciona sin ella (entrada manual).
- NO integraciones con portales de salud autonómicos.
- El asistente (§4.13) NUNCA: diagnostica, da pautas de medicación, minimiza, sustituye terapia — requisitos obligatorios.
- UI en español, tono cálido y humano, sin jerga. Público no técnico, móvil primero: botones grandes, una acción principal por pantalla.
- Contraste WCAG AA mínimo en el tema claro.
- Next 16 ≠ Next de training data: **leer `node_modules/next/dist/docs/` antes de tocar routing/proxy/manifest** (AGENTS.md). El middleware se llama `src/proxy.ts` aquí.
- El código Supabase (`src/lib/supabase/*`, `supabase/migrations/*`) NO se borra — solo deja de usarse en el flujo principal.
- Trabajar en rama `dev`. Mensajes de commit `feat(pivote): ...` / `feat(bloque-N): ...`.

**Desviaciones de alcance ya decididas (anotar en resumen final):**
1. Se inserta una Tarea 2 "Pantallas base de registro" (marcadores, síntomas, medicación, documentos) no listada en §5 — imprescindible porque §4.1 (estados vacíos), §4.6 (backup) y §4.13 (repasar evolución) las presuponen. No altera el orden relativo de los bloques de §5.
2. Sync (§4.11) se implementa como **snapshot manual subir/descargar** (tabla `device_snapshots` con RLS por usuario), no sync incremental en tiempo real — alcance honesto para el caso "dos dispositivos propios". Blobs de documentos excluidos del snapshot (aviso en UI).
3. El radar (§4.10) consulta ClinicalTrials.gov API v2 y PubMed E-utilities desde el cliente; REEC no tiene API pública con CORS fiable → se ofrece como enlace externo con la búsqueda preparada.

---

## Estructura de archivos final

```
src/lib/db/index.ts            ← esquema Dexie + helpers (T1)
src/lib/fechas.ts              ← countdown y utilidades de fecha (T5)
src/lib/pin.ts                 ← hash/verify PIN, PBKDF2 (T4)
src/lib/compartir.ts           ← codec cifrado+comprimido para enlaces (T8)
src/lib/backup.ts              ← export/import JSON + resumen (T6)
src/lib/ia.ts                  ← cliente OpenAI-compatible con clave propia (T7)
src/lib/radar.ts               ← consultas ClinicalTrials/PubMed + resumen IA (T11)
src/lib/sync.ts                ← snapshot Supabase opcional (T12)
src/lib/asistente.ts           ← system prompt + guardarraíles del asistente (T13)
src/app/(app)/hoy/page.tsx     ← client, countdown, banners (T1,5,6)
src/app/(app)/perfil/page.tsx  ← client, perfil local (T1)
src/app/(app)/salud/…          ← hub + marcadores/sintomas/medicacion/documentos (T2)
src/app/(app)/citas/page.tsx   ← citas + preguntas (T5)
src/app/(app)/ajustes/page.tsx ← tema, PIN, backup, IA, avanzado (T3,4,6,7,12)
src/app/(app)/apoyo/…          ← hub + ayuda, radar, asistente, sesiones (T9,11,13)
src/app/(app)/compartir/page.tsx  y  src/app/compartido/page.tsx (T8)
src/app/onboarding/…           ← bienvenida (T10)
src/app/_components/…          ← ThemeProvider, LockGate, EmptyState, etc.
tests/*.test.ts                ← vitest + fake-indexeddb
public/sw.js, src/app/manifest.ts ← PWA (T1, T14)
```

---

### Task 1: Pivote de arquitectura — Dexie, fuera login, la app abre directo (§1, §2)

**Files:**
- Create: `src/lib/db/index.ts`, `tests/setup.ts`, `tests/db.test.ts`, `vitest.config.ts`, `src/app/manifest.ts`, `public/icon.svg`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/hoy/page.tsx`, `src/app/(app)/perfil/page.tsx`, `package.json`, `.env.example`
- Delete: `src/proxy.ts`, `src/app/login/` (page + actions), `src/app/(app)/perfil/actions.ts`
- Keep intocado: `src/lib/supabase/*`, `supabase/*`

**Interfaces (Produces — el resto del plan depende de esto):**
- `db` — instancia Dexie con tablas: `perfil, marcadores, sintomas, medicacion, citas, preguntas, documentos, sesionesApoyo, conversacionesAsistente, radarPerfil, ajustes`.
- Tipos exportados: `Perfil, Marcador, Sintoma, Medicacion, Cita, Pregunta, Documento, SesionApoyo, MensajeAsistente, RadarPerfil, Ajustes`.
- `getAjustes(): Promise<Ajustes>` (singleton id=1, crea defaults si no existe), `saveAjustes(patch: Partial<Ajustes>): Promise<void>`.

- [ ] **Step 1: Instalar dependencias y configurar vitest**

```bash
npm i dexie dexie-react-hooks
npm i -D vitest fake-indexeddb
```

Añadir a `package.json` scripts: `"test": "vitest run"`.

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

`tests/setup.ts`:
```ts
import "fake-indexeddb/auto";
```

- [ ] **Step 2: Test que falla — esquema Dexie**

`tests/db.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { db, getAjustes, saveAjustes } from "@/lib/db";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("esquema local", () => {
  it("tiene las 11 tablas del documento §2", () => {
    const nombres = db.tables.map((t) => t.name).sort();
    expect(nombres).toEqual(
      [
        "ajustes", "citas", "conversacionesAsistente", "documentos",
        "marcadores", "medicacion", "perfil", "preguntas",
        "radarPerfil", "sesionesApoyo", "sintomas",
      ].sort()
    );
  });

  it("guarda y recupera un marcador", async () => {
    const id = await db.marcadores.add({
      nombre: "Cromogranina A", fecha: "2026-07-01", valor: 84, unidad: "ng/mL",
    });
    const m = await db.marcadores.get(id);
    expect(m?.valor).toBe(84);
  });

  it("getAjustes crea defaults (tema claro, sin PIN, sync apagado)", async () => {
    const a = await getAjustes();
    expect(a.tema).toBe("claro");
    expect(a.pinHash).toBeUndefined();
    expect(a.syncActivado).toBe(0);
    expect(a.onboardingVisto).toBe(0);
  });

  it("saveAjustes hace merge parcial", async () => {
    await saveAjustes({ tema: "oscuro" });
    const a = await getAjustes();
    expect(a.tema).toBe("oscuro");
    expect(a.syncActivado).toBe(0);
  });
});
```

- [ ] **Step 3: Correr el test — debe fallar** (`npm test` → módulo `@/lib/db` no existe)

- [ ] **Step 4: Implementar `src/lib/db/index.ts`**

```ts
import Dexie, { type EntityTable } from "dexie";

export interface Perfil {
  id?: number;
  nombre: string;
  fechaNacimiento?: string; // ISO yyyy-mm-dd
  diagnostico?: string;
  idioma?: string;
}
export interface Marcador {
  id?: number;
  nombre: string;
  fecha: string;
  valor: number;
  unidad: string;
  documentoId?: number;
}
export interface Sintoma {
  id?: number;
  fecha: string;
  tipo: string;
  escala: number; // 0-10
  nota?: string;
}
export interface TomaMedicacion { fecha: string; nota?: string }
export interface Medicacion {
  id?: number;
  nombre: string;
  dosis?: string;
  ultimaToma?: string;
  proximaFecha?: string;
  historial: TomaMedicacion[];
}
export interface Cita {
  id?: number;
  fecha: string; // ISO yyyy-mm-dd
  hora?: string; // HH:mm
  especialista?: string;
  centro?: string;
  notas?: string;
}
export interface Pregunta {
  id?: number;
  texto: string;
  citaId?: number;
  creada: string;
  resuelta: 0 | 1; // número para poder indexar en Dexie
}
export interface Documento {
  id?: number;
  nombre: string;
  tipo: string; // MIME
  fecha: string;
  blob: Blob;
}
export interface SesionApoyo {
  id?: number;
  fecha: string;
  tipo: "terapia" | "psico-oncologia" | "otra";
  notas?: string;
  proximaSesion?: string;
}
export interface MensajeAsistente {
  id?: number;
  fecha: string; // ISO datetime
  rol: "user" | "assistant";
  texto: string;
}
export interface RadarPerfil {
  id?: number;
  tipoTumor?: string;
  localizacion?: string;
  palabrasClave?: string;
  ultimaBusqueda?: string; // ISO datetime
  ultimoResumen?: string;
}
export interface Ajustes {
  id?: number;
  tema: "claro" | "oscuro";
  pinHash?: string;
  pinSalt?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  apiModelo?: string;
  ultimoBackup?: string;      // ISO datetime
  registrosDesdeBackup: number;
  syncActivado: 0 | 1;
  onboardingVisto: 0 | 1;
}

export const db = new Dexie("oncotrack") as Dexie & {
  perfil: EntityTable<Perfil, "id">;
  marcadores: EntityTable<Marcador, "id">;
  sintomas: EntityTable<Sintoma, "id">;
  medicacion: EntityTable<Medicacion, "id">;
  citas: EntityTable<Cita, "id">;
  preguntas: EntityTable<Pregunta, "id">;
  documentos: EntityTable<Documento, "id">;
  sesionesApoyo: EntityTable<SesionApoyo, "id">;
  conversacionesAsistente: EntityTable<MensajeAsistente, "id">;
  radarPerfil: EntityTable<RadarPerfil, "id">;
  ajustes: EntityTable<Ajustes, "id">;
};

db.version(1).stores({
  perfil: "++id",
  marcadores: "++id, nombre, fecha",
  sintomas: "++id, fecha, tipo",
  medicacion: "++id, nombre, proximaFecha",
  citas: "++id, fecha",
  preguntas: "++id, citaId, resuelta",
  documentos: "++id, fecha, tipo",
  sesionesApoyo: "++id, fecha",
  conversacionesAsistente: "++id, fecha",
  radarPerfil: "++id",
  ajustes: "++id",
});

const AJUSTES_DEFAULT: Ajustes = {
  id: 1,
  tema: "claro",
  registrosDesdeBackup: 0,
  syncActivado: 0,
  onboardingVisto: 0,
};

export async function getAjustes(): Promise<Ajustes> {
  const a = await db.ajustes.get(1);
  return a ?? { ...AJUSTES_DEFAULT };
}

export async function saveAjustes(patch: Partial<Ajustes>): Promise<void> {
  const actual = await getAjustes();
  await db.ajustes.put({ ...actual, ...patch, id: 1 });
}

/** Cuenta un registro nuevo para el recordatorio de backup (§4.6). */
export async function contarRegistroNuevo(): Promise<void> {
  const a = await getAjustes();
  await db.ajustes.put({ ...a, id: 1, registrosDesdeBackup: a.registrosDesdeBackup + 1 });
}
```

- [ ] **Step 5: Correr tests — deben pasar** (`npm test`)

- [ ] **Step 6: Desmontar auth — la app abre directo**

- Borrar `src/proxy.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/(app)/perfil/actions.ts`.
- `src/app/(app)/layout.tsx` pasa a síncrono, sin Supabase, sin email ni botón "Salir":

```tsx
import { BottomNav } from "./_components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/80 px-5 py-3 backdrop-blur">
        <span className="font-display text-lg font-semibold tracking-tight text-fg">
          OncoTrack
        </span>
      </header>
      <main className="flex-1 px-5 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 7: `/hoy` y `/perfil` locales (client components)**

`src/app/(app)/hoy/page.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function HoyPage() {
  const perfil = useLiveQuery(() => db.perfil.get(1));
  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Hoy · <span className="text-muted">{hoy}</span>
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {perfil?.nombre ? `Hola, ${perfil.nombre}` : "Tu espacio"}
        </h1>
      </header>
      {!perfil?.nombre && (
        <Link href="/perfil" className="flex items-center justify-between rounded-2xl border border-line bg-surface/40 p-5 transition hover:border-jade/50">
          <span>
            <span className="block text-xs text-muted">Para empezar</span>
            <span className="mt-0.5 block text-sm text-fg">Cuéntanos tu nombre</span>
          </span>
          <span aria-hidden className="text-jade">→</span>
        </Link>
      )}
    </div>
  );
}
```
(Las tareas 5 y 6 añadirán a esta página el countdown de citas, el banner de preguntas y el recordatorio de backup.)

`src/app/(app)/perfil/page.tsx`: client component con formulario (nombre, fecha de nacimiento, diagnóstico) que hace `db.perfil.put({ id: 1, ... })`. Mismos estilos de inputs que la versión actual (border-line, focus jade). Sin roles, sin "Con acceso".

- [ ] **Step 8: Manifest PWA básico**

Leer antes `node_modules/next/dist/docs/` (convención manifest en Next 16). `src/app/manifest.ts` con `MetadataRoute.Manifest`: name "OncoTrack", `display: "standalone"`, `start_url: "/hoy"`, `background_color: "#f7f3ee"`, `theme_color: "#5fb6a6"`, icono `public/icon.svg` (crear: círculo jade con espina vertical crema, 512×512, `purpose: "any"`).

- [ ] **Step 9: `.env.example`** — añadir `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false` con comentario "sync opcional §4.11, apagado por defecto".

- [ ] **Step 10: Verificar** — `npm test` (verde), `npm run build` (sin errores), `npm run dev` + comprobar que `/` → `/hoy` SIN redirección a login, y que `/perfil` guarda y persiste tras recargar.

- [ ] **Step 11: Commit** — `feat(pivote): almacenamiento local Dexie, fuera login, la app abre directo`

---

### Task 2: Pantallas base de registro local (adición de alcance)

**Files:**
- Create: `src/app/(app)/salud/page.tsx` (hub), `src/app/(app)/salud/marcadores/page.tsx`, `src/app/(app)/salud/sintomas/page.tsx`, `src/app/(app)/salud/medicacion/page.tsx`, `src/app/(app)/salud/documentos/page.tsx`
- Modify: `src/app/(app)/_components/BottomNav.tsx` (items: Hoy · Salud · Perfil)

**Interfaces:**
- Consumes: `db`, tipos de T1, `contarRegistroNuevo()`.
- Produces: rutas `/salud/*` que T3 (estados vacíos), T6 (backup) y T7 (IA/OCR) tocarán.

- [ ] **Step 1: Hub `/salud`** — 4 tarjetas grandes (Marcadores, Síntomas, Medicación, Documentos), cada una con contador de registros (`useLiveQuery(() => db.marcadores.count())` etc.).

- [ ] **Step 2: `/salud/marcadores`** — client component: lista ordenada por fecha desc (`db.marcadores.orderBy("fecha").reverse().toArray()`) + formulario (nombre — datalist con Cromogranina A / NSE / Serotonina orina 24h / 5-HIAA —, fecha, valor, unidad). Al añadir: `db.marcadores.add(...)` + `contarRegistroNuevo()`. Cada valor muestra la variación vs. el registro anterior del MISMO marcador: *"un 12% menos que tu última analítica"* — texto neutro color muted, **nunca** color semáforo (restricción global).

- [ ] **Step 3: `/salud/sintomas`** — lista + formulario (fecha hoy por defecto, tipo — datalist diarrea/flushing/dolor abdominal/fatiga —, escala `<input type="range" min=0 max=10>` con valor visible grande, nota opcional).

- [ ] **Step 4: `/salud/medicacion`** — lista + formulario (nombre, dosis, última toma, próxima fecha estimada). Botón "Registrar toma de hoy" que empuja a `historial` y actualiza `ultimaToma`.

- [ ] **Step 5: `/salud/documentos`** — acción principal grande: `<input type="file" accept="image/*" capture="environment">` estilizada como botón "📷 Hacer foto a un documento" (cámara directa, §4.8) + opción secundaria de subir archivo. Guarda `{ nombre, tipo: file.type, fecha, blob: file }` en Dexie. Lista con miniatura (`URL.createObjectURL`, revocar en cleanup) y visor al tocar.

- [ ] **Step 6: BottomNav** → `[{href:"/hoy",label:"Hoy"},{href:"/salud",label:"Salud"},{href:"/perfil",label:"Perfil"}]`; `active` debe cubrir subrutas: `pathname.startsWith(it.href)`.

- [ ] **Step 7: Verificar** — build + dev: añadir un marcador, un síntoma, una medicación y una foto; recargar y comprobar persistencia; probar en viewport móvil (375px).

- [ ] **Step 8: Commit** — `feat(salud): pantallas locales de marcadores, sintomas, medicacion y documentos`

---

### Task 3: Tema claro por defecto + estados vacíos cálidos (§3, §4.1)

**Files:**
- Create: `src/app/_components/ThemeProvider.tsx`, `src/app/_components/EmptyState.tsx`, `src/app/(app)/ajustes/page.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(app)/_components/BottomNav.tsx`, las 5 pantallas con listas

- [ ] **Step 1: Tokens claros por defecto en `globals.css`** — mismos NOMBRES de token (ink sigue siendo "fondo base"), valores invertidos; oscuro vía `data-theme`:

```css
@theme {
  /* Tema claro cálido por defecto — crema/hueso, nada de blanco frío */
  --color-ink: #f7f3ee;
  --color-surface: #fffdf9;
  --color-surface2: #f0e9df;
  --color-line: #e2d8c9;
  --color-fg: #253238;
  --color-muted: #5f7370;
  /* jade/arcilla oscurecidos para AA sobre fondo claro */
  --color-jade: #2e7a6c;
  --color-jade-dim: #5fb6a6;
  --color-clay: #a96e42;

  --font-display: var(--font-fraunces);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

html[data-theme="oscuro"] {
  --color-ink: #0f1518;
  --color-surface: #172127;
  --color-surface2: #1e2a31;
  --color-line: #26363d;
  --color-fg: #e7edeb;
  --color-muted: #8ca09b;
  --color-jade: #5fb6a6;
  --color-jade-dim: #3e7e73;
  --color-clay: #d6a17a;
}
```
Verificar contraste (fg #253238 sobre #f7f3ee ≈ 12:1 ✓; jade #2e7a6c sobre #f7f3ee ≈ 4.6:1 ✓; muted #5f7370 ≈ 4.9:1 ✓). Revisar usos de `text-ink` sobre fondo jade (botones): en claro, botones jade llevan texto `#fffdf9` → cambiar clases de botón a `text-surface`.

- [ ] **Step 2: ThemeProvider** — client component montado en `src/app/layout.tsx`: lee `getAjustes().tema`, aplica `document.documentElement.dataset.theme`, y espeja en `localStorage("oncotrack-tema")`. En `layout.tsx`, `<script>` inline (beforeInteractive) que lee ese localStorage y pone `data-theme` antes de pintar (evitar flash).

- [ ] **Step 3: `/ajustes`** — nueva página con secciones que crecerán en T4/6/7/12. Ahora: toggle Claro/Oscuro (guarda con `saveAjustes({tema})`) + enlace a `/perfil` ("Tus datos"). BottomNav pasa a: Hoy · Salud · Ajustes (Perfil vive dentro de Ajustes).

- [ ] **Step 4: EmptyState** — componente `{ mensaje: string; accion?: ReactNode }`: icono suave (espina vertical jade), mensaje cálido en `text-muted`, sin bordes duros. Aplicar en marcadores (*"Aún no hay nada aquí — cuando subas tu primera analítica, esto se irá llenando."*), síntomas (*"Cuando registres cómo te encuentras, aquí verás tu evolución."*), medicación (*"Apunta aquí tu medicación para no tener que recordarlo todo de memoria."*), documentos (*"Tus informes y analíticas vivirán aquí, solo en tu móvil."*) y citas cuando exista (T5).

- [ ] **Step 5: Verificar** — build; dev: tema claro por defecto en visita nueva, toggle persiste tras recarga sin flash oscuro; estados vacíos visibles con DB limpia; contraste AA con el inspector.

- [ ] **Step 6: Commit** — `feat(tema): claro calido por defecto + toggle + estados vacios`

---

### Task 4: PIN local opcional (§4.2) — ⚠️ security-review autónomo al cerrar

**Files:**
- Create: `src/lib/pin.ts`, `tests/pin.test.ts`, `src/app/_components/LockGate.tsx`, `src/app/_components/PinPad.tsx`
- Modify: `src/app/layout.tsx` (envolver children con LockGate), `src/app/(app)/ajustes/page.tsx` (sección PIN)

**Interfaces:**
- Produces: `hashPin(pin: string, saltHex: string): Promise<string>`, `nuevoSalt(): string` (hex 16 bytes), `verifyPin(pin: string, saltHex: string, hashHex: string): Promise<boolean>`.

- [ ] **Step 1: Test que falla** — `tests/pin.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { hashPin, nuevoSalt, verifyPin } from "@/lib/pin";

describe("pin", () => {
  it("mismo pin + mismo salt → mismo hash; salt distinto → distinto", async () => {
    const s1 = nuevoSalt(); const s2 = nuevoSalt();
    expect(s1).not.toBe(s2);
    expect(await hashPin("1234", s1)).toBe(await hashPin("1234", s1));
    expect(await hashPin("1234", s1)).not.toBe(await hashPin("1234", s2));
  });
  it("verifyPin acepta el correcto y rechaza el incorrecto", async () => {
    const salt = nuevoSalt();
    const hash = await hashPin("0424", salt);
    expect(await verifyPin("0424", salt, hash)).toBe(true);
    expect(await verifyPin("0000", salt, hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar `src/lib/pin.ts`** — PBKDF2 (`crypto.subtle.deriveBits`), SHA-256, **310.000 iteraciones**, salt aleatorio de 16 bytes (`crypto.getRandomValues`), salida hex. Nunca texto plano (requisito §4.2). Correr `npm test` → verde.

- [ ] **Step 3: LockGate** — client component en el layout raíz: estado `"cargando" | "bloqueado" | "abierto"`. Al montar lee `getAjustes()`: sin `pinHash` → abierto; con él → bloqueado salvo `sessionStorage("oncotrack-abierto") === "1"`. Bloqueado renderiza `PinPad` a pantalla completa (teclado numérico grande propio, 4 puntos de progreso, botón borrar). PIN correcto → sessionStorage y abre. Enlace "He olvidado mi PIN" → diálogo de confirmación con texto: *"Restablecer el bloqueo borra solo el PIN. Tus datos clínicos NO se tocan — siguen aquí."* → `saveAjustes({ pinHash: undefined, pinSalt: undefined })` y abre.

- [ ] **Step 4: Ajustes → sección "Bloqueo con PIN"** — activar (pedir PIN dos veces, guardar hash+salt), cambiar, desactivar.

- [ ] **Step 5: Verificar** — tests verdes; build; dev: sin PIN abre directo; con PIN bloquea, PIN erróneo no pasa, restablecer conserva los datos (comprobar marcadores tras reset).

- [ ] **Step 6: 🔒 security-review autónomo** del bloque (hash correcto, sin PIN en logs/estado persistente, sessionStorage no localStorage, sin canal de recuperación remoto). Corregir hallazgos in situ y anotarlos para el resumen final.

- [ ] **Step 7: Commit** — `feat(pin): bloqueo local opcional con PBKDF2`

---

### Task 5: Citas con countdown + preparador de preguntas (§4.3, §4.4)

**Files:**
- Create: `src/lib/fechas.ts`, `tests/fechas.test.ts`, `src/app/(app)/citas/page.tsx`
- Modify: `src/app/(app)/hoy/page.tsx`, `src/app/(app)/_components/BottomNav.tsx` (+ Citas)

**Interfaces:**
- Produces: `diasHasta(fechaISO: string, hoy?: Date): number` (0 = hoy, negativo = pasada), `proximaCita(citas: Cita[], hoy?: Date): Cita | undefined`, `textoCountdown(dias: number): string` ("Hoy", "Mañana", "En N días").

- [ ] **Step 1: Test que falla** — `tests/fechas.test.ts`: `diasHasta` con hoy fijo (`new Date("2026-07-05T10:00:00")`): misma fecha → 0, mañana → 1, ayer → -1 (ignora la hora del día); `proximaCita` elige la futura más cercana incluyendo hoy e ignora pasadas; `textoCountdown(0)==="Hoy"`, `(1)==="Mañana"`, `(6)==="En 6 días"`.

- [ ] **Step 2: Implementar `src/lib/fechas.ts`** (comparar a medianoche local con `Date(y,m,d)`). Tests verdes.

- [ ] **Step 3: `/citas`** — lista de citas futuras (y pasadas colapsadas), formulario (fecha, hora, especialista, centro, notas). Debajo de cada cita: sus preguntas (`db.preguntas.where("citaId").equals(id)`) con checkbox "resuelta" (`resuelta: 1`) y campo para añadir. Bloque aparte "Dudas sueltas" para preguntas sin cita (`citaId` undefined) en cualquier momento, con opción de asignarlas a una cita. EmptyState cálido (*"Cuando apuntes tu próxima cita, aquí verás cuánto falta."*).

- [ ] **Step 4: `/hoy` — countdown y banner** — tarjeta con `proximaCita`: *"En 6 días: Dr. García, Oncología"* (formato §4.3, número en `.tabular`). Si `diasHasta === 0`: banner destacado *"Hoy tienes cita con {especialista} — tenías {n} preguntas anotadas"* con `<details>` desplegable listando las preguntas pendientes de esa cita y checkbox para marcarlas resueltas (§4.4).

- [ ] **Step 5: Verificar** — tests; build; dev: crear cita futura → countdown correcto; cita hoy con 2 preguntas → banner con desplegable; marcar resuelta persiste.

- [ ] **Step 6: Commit** — `feat(citas): countdown y preparador de preguntas`

---

### Task 6: Backup / exportación de datos (§4.6)

**Files:**
- Create: `src/lib/backup.ts`, `tests/backup.test.ts`
- Modify: `src/app/(app)/ajustes/page.tsx` (sección "Tu copia de seguridad"), `src/app/(app)/hoy/page.tsx` (recordatorio)

**Interfaces:**
- Produces: `exportarDatos(): Promise<{ contenido: string; resumen: string }>` — JSON con TODAS las tablas (blobs de documentos como base64 con `tipo`), `resumen` legible (nº de registros por tabla + rango de fechas); `necesitaRecordatorio(a: Ajustes, hoy?: Date): boolean` (true si nunca hubo backup y hay >0 registros nuevos, si han pasado >30 días del último, o si `registrosDesdeBackup >= 10`).

- [ ] **Step 1: Test que falla** — `tests/backup.test.ts`: sembrar 2 marcadores y 1 cita → `exportarDatos()` produce JSON parseable con esas tablas y `resumen` que contiene "2" y "marcadores"; `necesitaRecordatorio`: false recién hecho backup, true a los 31 días, true con 10 registros nuevos.

- [ ] **Step 2: Implementar `src/lib/backup.ts`** — `exportarDatos` recorre `db.tables`, serializa (blob → `{__blob: base64, tipo}` vía FileReader/arrayBuffer), añade `{ version: 1, exportado: ISO }`. Tests verdes.

- [ ] **Step 3: UI en Ajustes** — botón grande "Guardar copia de mis datos": genera `File` (`oncotrack-copia-YYYY-MM-DD.json`), intenta `navigator.share({ files })` y si no está disponible cae a descarga con `<a download>`. Al completar: `saveAjustes({ ultimoBackup: ahora, registrosDesdeBackup: 0 })`. Texto honesto: *"El archivo se guarda donde tú elijas. Nada se sube a ningún servidor."* Mostrar fecha del último backup.

- [ ] **Step 4: Recordatorio en `/hoy`** — si `necesitaRecordatorio`: tarjeta suave (no alarmista) *"Hace más de 30 días de tu última copia — guarda una nueva cuando tengas un momento"* con enlace a Ajustes.

- [ ] **Step 5: Verificar** — tests; build; dev: exportar con datos reales, abrir el JSON y comprobar contenido; recordatorio aparece/desaparece.

- [ ] **Step 6: Commit** — `feat(backup): exportacion local con resumen y recordatorio`

---

### Task 7: Configuración de IA propia del paciente (§4.7)

**Files:**
- Create: `src/lib/ia.ts`, `tests/ia.test.ts`, `src/app/(app)/ajustes/ia/page.tsx` (config + mini-tutorial)
- Modify: `src/app/(app)/ajustes/page.tsx` (enlace), `src/app/(app)/salud/marcadores/page.tsx` (foto + OCR si hay clave)

**Interfaces:**
- Produces: `tieneIA(a: Ajustes): boolean`; `chatCompletion(cfg: {apiKey,baseUrl,modelo}, mensajes: {role,content}[], opts?): Promise<string>` (POST `{baseUrl}/chat/completions`, OpenAI-compatible, content puede ser multimodal con `image_url` data-URI); `extraerMarcadores(cfg, imagenBase64: string): Promise<Array<{nombre,fecha?,valor,unidad}>>` (prompt de extracción, respuesta JSON, SIN interpretación).

- [ ] **Step 1: Test que falla** — `tests/ia.test.ts` con `fetch` mockeado (`vi.stubGlobal`): `chatCompletion` manda Authorization Bearer y devuelve `choices[0].message.content`; error HTTP → lanza con mensaje claro en español; `extraerMarcadores` parsea la respuesta JSON del modelo (incluida respuesta envuelta en ```json).

- [ ] **Step 2: Implementar `src/lib/ia.ts`.** Prompt de extracción: devolver SOLO JSON `[{nombre, fecha, valor, unidad}]`, sin valorar resultados. Defaults: `baseUrl: "https://api.openai.com/v1"`, `modelo: "gpt-4o-mini"` (editable — cualquier proveedor compatible). Tests verdes.

- [ ] **Step 3: `/ajustes/ia`** — campo de clave (input `type="password"` con mostrar/ocultar, guardado SOLO en `ajustes` local), proveedor/URL base y modelo opcionales. Mini-tutorial en 4 pasos (§4.7) con ilustraciones simples inline (SVG/emoji, no capturas externas): 1) entra en platform.openai.com → API keys, 2) crea una clave nueva, 3) cópiala, 4) pégala aquí. Aviso literal del doc: *"Cada foto que analices tiene un coste mínimo que pagas directamente al proveedor de la IA. Nosotros nunca vemos tu clave ni tus datos."* Botón "Probar conexión" (llamada mínima con manejo de error amable).

- [ ] **Step 4: OCR en marcadores** — en `/salud/marcadores`, si `tieneIA`: botón principal "📷 Foto a la analítica" → `extraerMarcadores` → **pantalla de revisión obligatoria** (tabla editable con los valores extraídos, nada se guarda sin pulsar "Confirmar") → alta en Dexie. Sin clave: solo entrada manual, con nota discreta "¿Quieres rellenar esto con una foto? Conecta tu IA en Ajustes".

- [ ] **Step 5: Verificar** — tests; build; dev: guardar clave falsa → "Probar conexión" da error amable; sin clave la app funciona igual (restricción global).

- [ ] **Step 6: Commit** — `feat(ia): clave propia del paciente + OCR con revision humana`

---

### Task 8: Enlace temporal para compartir, sin servidor (§4.5)

**Files:**
- Create: `src/lib/compartir.ts`, `tests/compartir.test.ts`, `src/app/(app)/compartir/page.tsx`, `src/app/compartido/page.tsx` (FUERA del grupo `(app)`: sin nav, pública)
- Modify: `src/app/(app)/ajustes/page.tsx` o `/hoy` (punto de entrada "Compartir")

**Interfaces:**
- Produces:
  - `codificarPaquete(p: PaqueteCompartido): Promise<string>` — JSON → deflate-raw (`CompressionStream`) → AES-GCM 256 con clave aleatoria → fragmento `datos.clave.iv` en base64url.
  - `decodificarPaquete(fragmento: string): Promise<PaqueteCompartido>` — inverso; lanza `PaqueteInvalidoError` si no descifra.
  - `haCaducado(p: PaqueteCompartido, ahora?: Date): boolean`.
  - `interface PaqueteCompartido { caducidad: string; ambito: "todo"|"marcadores"|"medicacion"; nombre?: string; datos: Record<string, unknown[]> }`.

- [ ] **Step 1: Test que falla** — `tests/compartir.test.ts`: ida y vuelta (codificar→decodificar) recupera el paquete idéntico; fragmento manipulado (cambiar 1 char del cifrado) → lanza; `haCaducado` true pasada la fecha, false antes; el fragmento no contiene el JSON en claro (`expect(frag).not.toContain("Cromogranina")`).

- [ ] **Step 2: Implementar `src/lib/compartir.ts`** — la caducidad viaja DENTRO del cifrado (§4.5: "codificada junto a los datos"). Base64url sin padding. Tests verdes.

- [ ] **Step 3: `/compartir`** — elegir ámbito (radio: todo / solo marcadores recientes (90 días) / solo medicación), caducidad (1 día / 7 días / 30 días), botón "Crear enlace". Construye URL `${origin}/compartido#${fragmento}` (fragmento nunca llega a ningún servidor). Botón "Compartir" con `navigator.share({ url })`, fallback copiar al portapapeles. Aviso honesto del doc: *"Pasada la fecha, la página deja de mostrar el contenido. No es un borrado garantizado: compártelo solo con personas de confianza."* Los documentos (blobs) NO se incluyen (URLs tienen límite de tamaño; anotar en UI).

- [ ] **Step 4: `/compartido`** — client component SIN layout de app: lee `location.hash`, descifra; caducado → *"Este enlace ha caducado"* y nada más (§4.5); válido → vista de solo lectura (marcadores con fechas/valores, medicación) con el mismo estilo cálido. Excluir esta ruta del LockGate (es para terceros; no expone la DB local — solo muestra lo que trae la URL).

- [ ] **Step 5: Verificar** — tests; build; dev: crear enlace de marcadores, abrirlo en ventana de incógnito (sin IndexedDB poblada) → se ven los datos; enlace con caducidad de ayer (forzar en consola) → mensaje de caducado.

- [ ] **Step 6: Commit** — `feat(compartir): enlace temporal cifrado sin servidor`

---

### Task 9: Ayuda / glosario emocional (§4.9)

**Files:**
- Create: `src/app/(app)/apoyo/page.tsx` (hub), `src/app/(app)/apoyo/ayuda/page.tsx`, `src/lib/contenido/glosario.ts`, `src/lib/contenido/recursos.ts`
- Modify: `src/app/(app)/_components/BottomNav.tsx` → 5 items finales: Hoy · Salud · Citas · Apoyo · Ajustes

**Interfaces:**
- Produces: `GLOSARIO: Array<{termino, queEs}>`; `RECURSOS_AYUDA: Array<{nombre, telefono?, url, descripcion}>` — **T13 reutiliza RECURSOS_AYUDA** (línea 024, Teléfono de la Esperanza 717 003 717, asociaciones).

- [ ] **Step 1: Contenido** — `glosario.ts`: Cromogranina A, NSE, Serotonina en orina 24h, 5-HIAA, Ki-67, octreoscán/PET-DOTA — 2-3 frases llanas cada uno, sin tecnicismos ni rangos "normales". `recursos.ts`: línea 024 (atención a la conducta suicida, 24h, gratuita), Teléfono de la Esperanza (717 003 717), NET España (pacientes con tumores neuroendocrinos), FEDER (enfermedades raras), AECC (apoyo psico-oncológico gratuito).

- [ ] **Step 2: `/apoyo` (hub)** — tarjetas: Guía y glosario · Radar de investigación (T11) · Espacio de acompañamiento (T13) · Mis sesiones de terapia (T13). **Bloque fijo SIEMPRE visible al pie del hub** con los teléfonos de ayuda (no escondido en submenú — §4.9/§4.13).

- [ ] **Step 3: `/apoyo/ayuda`** — secciones: (1) glosario expandible; (2) aviso fijo *"Esta información es general, no sustituye a tu equipo médico — coméntalo siempre con ellos."*; (3) privacidad en llano: *"Tus datos viven solo en este dispositivo. Nosotros no los vemos, no los guardamos, no los compartimos."*; (4) asociaciones y teléfonos (RECURSOS_AYUDA); (5) enlace "Ver la bienvenida de nuevo" (T10 lo conectará).

- [ ] **Step 4: Relación con histórico** — confirmar que marcadores (T2) muestran solo comparación con el propio histórico; si falta, corregir aquí. Sin semáforos (restricción global).

- [ ] **Step 5: Verificar** — build; dev: nav de 5 items en 375px sin desbordar; teléfonos visibles sin scroll excesivo en el hub.

- [ ] **Step 6: Commit** — `feat(apoyo): glosario en lenguaje llano y recursos de ayuda`

---

### Task 10: Onboarding / bienvenida (§4.12)

**Files:**
- Create: `src/app/onboarding/page.tsx` (fuera de `(app)`: pantalla completa sin nav)
- Modify: `src/app/_components/LockGate.tsx` o layout raíz (redirigir a onboarding en primer uso), `src/app/(app)/apoyo/ayuda/page.tsx` (enlace "Ver la bienvenida de nuevo")

- [ ] **Step 1: Detección de primer uso** — en el gate raíz: si `ajustes.onboardingVisto === 0` y la ruta no es `/onboarding` ni `/compartido` → redirigir a `/onboarding`. Al terminar o saltar TODO: `saveAjustes({ onboardingVisto: 1 })` → `/hoy`.

- [ ] **Step 2: 5 pantallas** (client, swipe/botones grandes Anterior·Siguiente, indicador de puntos, botón "Saltar" SIEMPRE visible — §4.12 "el onboarding informa, nunca bloquea"):
  1. Qué es OncoTrack: *tu evolución, tu medicación, tus citas — en un solo sitio, solo tuyo.*
  2. Privacidad: tus datos viven en tu móvil, nadie más los ve (mismo texto llano de §4.9).
  3. PIN opcional: explicación + botón "Activar ahora" (reutiliza el flujo de T4 inline o enlaza a Ajustes) + "Prefiero no ponerlo".
  4. Tu propia IA: resumen del mini-tutorial de T7 + "Configurar ahora" (enlace a `/ajustes/ia`) + "Lo haré más tarde".
  5. Cierre cálido: la app acompaña, no sustituye a tu equipo médico ni a apoyo profesional; teléfonos de RECURSOS_AYUDA visibles.

- [ ] **Step 3: Reacceso** — enlace en `/apoyo/ayuda` "Ver la bienvenida de nuevo" → `/onboarding?repaso=1` (en modo repaso no toca `onboardingVisto`, y "Salir" vuelve a Ayuda).

- [ ] **Step 4: Verificar** — build; dev: DB limpia → onboarding aparece; saltar en pantalla 1 → `/hoy` y no reaparece tras recargar; repaso desde Ayuda funciona.

- [ ] **Step 5: Commit** — `feat(onboarding): bienvenida guiada en 5 pasos, siempre saltable`

---

### Task 11: Radar de tratamientos y ensayos (§4.10)

**Files:**
- Create: `src/lib/radar.ts`, `tests/radar.test.ts`, `src/app/(app)/apoyo/radar/page.tsx`

**Interfaces:**
- Produces: `construirQueryEnsayos(p: RadarPerfil): string`; `buscarFuentes(p): Promise<{ ensayos: Fuente[]; articulos: Fuente[] }>` con `Fuente = {titulo, url, fecha?}` — ClinicalTrials.gov API v2 (`https://clinicaltrials.gov/api/v2/studies?query.cond=...&filter.overallStatus=RECRUITING`) y PubMed E-utilities (esearch+esummary, retmax 10, término + fecha); `resumirNovedades(cfg, fuentes, p): Promise<string>` — usa `chatCompletion` de T7 con prompt que EXIGE lenguaje llano y prohíbe recomendaciones médicas.

- [ ] **Step 1: Test que falla** — `tests/radar.test.ts`: `construirQueryEnsayos` combina tipo de tumor + palabras clave; `buscarFuentes` con fetch mockeado parsea respuestas reales de ejemplo (fixture JSON reducido de cada API) a `Fuente[]`; error de red en una fuente no tumba la otra (Promise.allSettled).

- [ ] **Step 2: Implementar `src/lib/radar.ts`.** Tests verdes.

- [ ] **Step 3: `/apoyo/radar`** — formulario del `radar_perfil` (tipo de tumor, localización, palabras clave — todo local). **Encabezado fijo** (siempre visible): *"Esto es información pública sobre investigación en curso — coméntalo con tu oncólogo antes de sacar conclusiones."* Botón "Buscar novedades" (SOLO bajo demanda, §4.10 — nada en segundo plano): requiere clave IA (si no hay → explica y enlaza a `/ajustes/ia`); busca fuentes → resume → guarda `ultimaBusqueda` y `ultimoResumen`. Mostrar resumen + lista de fuentes con enlaces + enlace externo a REEC con la búsqueda preparada. Si no hay resultados nuevos desde `ultimaBusqueda`: *"Sin novedades desde tu última consulta ({fecha}) — no hace falta mirar esto cada día."* (§4.10, anti-ansiedad).

- [ ] **Step 4: Verificar** — tests; build; dev con clave real si está disponible o mock: guardar perfil, buscar, ver resumen y fecha persistida.

- [ ] **Step 5: Commit** — `feat(radar): busqueda bajo demanda de ensayos y publicaciones`

---

### Task 12: Sync opcional oculto con Supabase (§4.11) — ⚠️ security-review autónomo al cerrar

**Files:**
- Create: `src/lib/sync.ts`, `supabase/migrations/0003_device_snapshots.sql`, `src/app/(app)/ajustes/avanzado/page.tsx`
- Modify: `src/app/(app)/ajustes/page.tsx` (enlace discreto "Avanzado" al final)

**Interfaces:**
- Consumes: `createClient` de `src/lib/supabase/client.ts` (browser), `exportarDatos` de T6.
- Produces: `subirSnapshot(): Promise<void>`, `descargarSnapshot(): Promise<{fecha: string} | null>` + import a Dexie.

- [ ] **Step 1: Migración `0003_device_snapshots.sql`**:
```sql
create table if not exists public.device_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.device_snapshots enable row level security;
create policy "device_snapshots_own"
  on public.device_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```
Aplicar vía Management API con el PAT de `.supabase-token` (mismo método que 0001/0002).

- [ ] **Step 2: Gate doble** — la sección Avanzado solo se renderiza si `process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === "true"`; además el toggle del usuario (`ajustes.syncActivado`) empieza en 0. Por defecto (`false` en `.env.example` y en Vercel) NADA de esto es visible. **Con el flag apagado la app no debe hacer NINGUNA petición a Supabase** (verificar en pestaña Network).

- [ ] **Step 3: `/ajustes/avanzado`** — toggle "Sincronizar entre mis dispositivos (opcional)". Al activar: explicación en una frase (*"Tus datos viajarán cifrados a un servidor para poder verlos desde otro móvil tuyo."*) + confirmación explícita (§4.11). Tras confirmar: login email/contraseña contra el Supabase existente (reutiliza `patient_profiles`... NO — solo auth + `device_snapshots`). Botones "Subir mi copia" / "Traer copia de otro dispositivo" (confirmación antes de sobrescribir local). Snapshot = `exportarDatos()` SIN blobs de documentos (aviso en UI: *"Los archivos y fotos no viajan — haz backup aparte."*).

- [ ] **Step 4: Verificar** — build con flag `false` → sin sección Avanzado y CERO llamadas de red a Supabase; con flag `true` en `.env.local`: activar, subir desde el navegador A, descargar en perfil de navegador B (o incógnito) y ver los mismos marcadores.

- [ ] **Step 5: 🔒 security-review autónomo** (RLS de la tabla correcta, sesión Supabase solo si opt-in, sin fuga del payload en logs, flag realmente apagado por defecto). Corregir y anotar.

- [ ] **Step 6: Commit** — `feat(sync): snapshot opcional entre dispositivos, apagado por defecto`

---

### Task 13: Asistente de acompañamiento + diario de sesiones (§4.13) — ⚠️ security-review autónomo al cerrar

**Files:**
- Create: `src/lib/asistente.ts`, `tests/asistente.test.ts`, `src/app/(app)/apoyo/asistente/page.tsx`, `src/app/(app)/apoyo/sesiones/page.tsx`

**Interfaces:**
- Consumes: `chatCompletion` (T7), `RECURSOS_AYUDA` (T9), tablas `conversacionesAsistente` y `sesionesApoyo` (T1).
- Produces: `SYSTEM_PROMPT_ASISTENTE: string`; `construirContexto(): Promise<string>` (resumen breve del registro local: últimos marcadores/síntomas/citas, para "repasar la propia evolución en tono cálido"); `enviarMensaje(cfg, historial, textoUsuario, contexto): Promise<string>`.

- [ ] **Step 1: SYSTEM_PROMPT (el corazón del bloque — requisitos NO negociables de §4.13, en el prompt de forma explícita):**
  - Identidad: espacio para pensar en voz alta y organizar ideas; acompaña con calidez.
  - PUEDE: ayudar a poner en palabras lo que se siente; repasar la evolución registrada (contexto adjunto) en tono cálido y SIN interpretar clínicamente; ayudar a preparar qué decir en la próxima consulta o sesión de terapia; sugerir con suavidad (sin insistencia invasiva) hablar con su equipo médico o un profesional si detecta angustia sostenida.
  - NUNCA: diagnosticar; dar pautas o cambios de medicación; minimizar lo que siente; presentarse como terapeuta; fomentar que hable solo con la app en vez de con personas reales. Si piden diagnóstico/pautas → redirigir amablemente al equipo médico, siempre.
  - Si aparecen ideas de hacerse daño → responder con calidez, sin sermonear, y recordar la línea 024 y el Teléfono de la Esperanza (los tiene en el prompt).
  - Español, frases cortas, sin jerga clínica.

- [ ] **Step 2: Test que falla** — `tests/asistente.test.ts`: el SYSTEM_PROMPT contiene las prohibiciones clave ("no diagnostic", "medicación", "024") — test de contenido, no de conducta; `construirContexto` con datos sembrados incluye el último marcador y NO incluye la clave de API; `enviarMensaje` (fetch mock) antepone system prompt + contexto y persiste ambos mensajes en `conversacionesAsistente`.

- [ ] **Step 3: `/apoyo/asistente`** — chat simple (burbujas, input grande, historial desde Dexie con `useLiveQuery`). **Elementos fijos SIEMPRE visibles en la pantalla** (no modal descartable, no submenú — §4.13):
  - Cabecera permanente: *"Esto es un espacio para pensar en voz alta y organizar tus ideas. No es un profesional, no diagnostica, no sustituye a tu psico-oncólogo ni a tu equipo médico."*
  - Pie fijo con ayuda real: **024** (conducta suicida) · **Teléfono de la Esperanza 717 003 717** · enlace a asociaciones (de RECURSOS_AYUDA).
  - Primera visita: pantalla previa con el texto anterior ampliado + "Entendido, entrar".
  - Sin clave de IA: la pantalla explica qué es y enlaza a `/ajustes/ia`; los recursos de ayuda se muestran IGUAL (no dependen de la IA).
  - Botón "Borrar conversación" (borra `conversacionesAsistente`; todo es local, §4.13).

- [ ] **Step 4: `/apoyo/sesiones`** — diario SEPARADO del chat (§4.13): lista + formulario (fecha, tipo terapia/psico-oncología/otra, notas breves, próxima sesión). EmptyState: *"Si vas a terapia o psico-oncología, aquí puedes llevar un registro sencillo de tus sesiones."* Si hay `proximaSesion` futura, mostrarla también en `/hoy` junto a las citas.

- [ ] **Step 5: Verificar** — tests; build; dev: disclaimer y teléfonos visibles con y sin clave; primera visita muestra la pantalla previa; conversación persiste en local y se puede borrar; sesiones separadas del chat.

- [ ] **Step 6: 🔒 security-review autónomo** (historial solo local; la clave no viaja más que al proveedor elegido; contexto enviado a la IA no incluye datos que el paciente no haya registrado; prompt-injection desde el propio historial no puede reescribir las prohibiciones — system prompt siempre primero y no editable). Corregir y anotar.

- [ ] **Step 7: Commit** — `feat(asistente): espacio de acompanamiento con guardarrailes + diario de sesiones`

---

### Task 14: Mobile-first / pulido PWA transversal (§4.8)

**Files:**
- Create: `public/sw.js`, `src/app/_components/RegistroSW.tsx`, `src/app/_components/PromptInstalar.tsx`
- Modify: `src/app/layout.tsx`, revisión transversal de todas las pantallas

- [ ] **Step 1: Service worker** — `public/sw.js`: precache del app shell en `install`, estrategia network-first con fallback a caché para navegaciones, cache-first para `/_next/static`. Registrarlo desde `RegistroSW` (client, `useEffect`, solo en producción). La app YA funciona offline en datos (IndexedDB); el SW cubre el shell.

- [ ] **Step 2: Prompt de instalación** — capturar `beforeinstallprompt`, mostrar tarjeta en `/hoy` "Añade OncoTrack a tu pantalla de inicio" con botón que dispara el prompt (+ instrucciones para iOS Safari: Compartir → Añadir a pantalla de inicio). Descartable, no reaparece en 30 días (localStorage).

- [ ] **Step 3: Auditoría transversal §4.8** (checklist por pantalla, viewport 375px): botones ≥44px de alto, una acción principal clara por pantalla, texto mínimo, inputs con `inputmode` correcto (numérico en PIN/valores), sin scroll horizontal, cámara como acción principal en documentos/marcadores. Corregir lo que falle.

- [ ] **Step 4: Verificar** — `npm run build` + `npm start`; Lighthouse PWA instalable; modo avión tras primera carga → el shell abre y los datos se ven; `npm test` completo (todas las suites verdes).

- [ ] **Step 5: Commit** — `feat(pwa): offline, instalacion y auditoria mobile-first`

---

## Verificación final del plan completo (antes del resumen al usuario)

- [ ] `npm test` — todas las suites verdes.
- [ ] `npm run build` — sin errores ni warnings nuevos.
- [ ] Flujo completo en dev (viewport móvil): onboarding → perfil → marcador → cita+pregunta → backup → compartir → tema oscuro → PIN on/off.
- [ ] Grep de restricciones: ninguna pantalla usa colores semáforo sobre valores clínicos; `NEXT_PUBLIC_ENABLE_CLOUD_SYNC` false por defecto; ningún import de `@/lib/supabase` fuera de `src/lib/sync.ts` y `/ajustes/avanzado`.
- [ ] Push de `dev` a origin.
- [ ] Redactar resumen final único: por bloque (qué se hizo), hallazgos y correcciones de los 3 security-reviews, lista de pruebas manuales recomendadas, desviaciones (las 3 declaradas arriba + las que surjan).
