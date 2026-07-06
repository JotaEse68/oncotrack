# OncoTrack con alma — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecución acordada:** todas las tareas seguidas sin checkpoints; un commit por tarea (rama `dev`); verification-before-completion por tarea con navegador y datos reales (CgA 302.8→342); resumen final único.

**Goal:** Ejecutar el spec `docs/superpowers/specs/2026-07-06-oncotrack-con-alma-design.md` — 9 bloques UX que dan intuición y conexión emocional a OncoTrack.

**Architecture:** Toda la lógica nueva va en módulos puros (`src/lib/*`) con tests vitest; las pantallas son client components sobre Dexie/`useLiveQuery` que se recalculan solos al guardar. La IA (clave del paciente) solo añade automatismos (extraer/interpretar) siempre con revisión humana.

**Tech Stack:** el existente (Next 16, Dexie 4, Tailwind v4, vitest + fake-indexeddb). Sin dependencias nuevas.

## Global Constraints

- Móvil primero SIEMPRE: botones ≥44px, un gesto por acción, probar a 375px.
- Nada producido por IA se guarda sin pantalla de revisión editable.
- Sin semáforos ni juicios clínicos; tests de vocabulario prohibido en narrativa/frases/interpretar: "normal", "anormal", "bien", "mal", "preocupante", "peligro", "tranquila".
- Todo funciona sin clave de IA.
- Español cálido, sin positivismo de plástico.
- Tokens actuales: `ink/surface/surface2/line/fg/muted/morado/error/grafica`. Morado solo puntual.
- Rama `dev`. Antes de tocar routing/manifest: docs locales de Next 16.

---

### Task 1: Narrativa + frases + Hoy con alma (spec §1 y §8)

**Files:**
- Create: `src/lib/narrativa.ts`, `src/lib/contenido/frases.ts`, `tests/narrativa.test.ts`, `src/app/(app)/hoy/GuiaInicio.tsx`
- Modify: `src/app/(app)/hoy/page.tsx`

**Interfaces (Produces):**
- `interface FraseNarrativa { texto: string; href?: string }`
- `interface DatosNarrativa { nombre?: string; grupos: GrupoMarcador[]; citas: Cita[]; preguntas: Pregunta[]; sesiones: SesionApoyo[]; hoy?: Date }`
- `construirNarrativa(d: DatosNarrativa): FraseNarrativa[]` — máx. 4, orden: marcador reciente con comparación (+ coletilla "solo tu equipo médico puede valorarlo"), próxima cita con countdown y nº de preguntas pendientes, próxima sesión futura.
- `FRASES_CURADAS: string[]` (~20) y `fraseDelDia(d: DatosNarrativa & { totalRegistros: number }, hoy?: Date): string` — determinista por fecha (índice = díasDesdeEpoch % pool), mezcla curadas + generadas de datos ("Llevas N registros — tu historia está cada vez mejor contada.").

- [ ] **Step 1: Test que falla** — `tests/narrativa.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { construirNarrativa, type DatosNarrativa } from "@/lib/narrativa";
import { FRASES_CURADAS, fraseDelDia } from "@/lib/contenido/frases";
import { agruparPorNombre } from "@/lib/marcadores";

const HOY = new Date("2026-07-06T10:00:00");
const BASE: DatosNarrativa = {
  nombre: "Ana",
  grupos: agruparPorNombre([
    { id: 1, nombre: "Cromogranina A", fecha: "2023-02-15", valor: 302.8, unidad: "ng/mL" },
    { id: 2, nombre: "Cromogranina A", fecha: "2023-03-15", valor: 342, unidad: "ng/mL" },
  ]),
  citas: [{ id: 1, fecha: "2026-07-12", especialista: "Dr. García" }],
  preguntas: [
    { id: 1, texto: "¿…?", citaId: 1, creada: "2026-07-01", resuelta: 0 },
    { id: 2, texto: "¿…?", citaId: 1, creada: "2026-07-01", resuelta: 0 },
  ],
  sesiones: [],
  hoy: HOY,
};
const PROHIBIDAS = ["normal", "anormal", " bien", " mal", "preocupante", "peligro", "tranquila"];

describe("construirNarrativa", () => {
  it("narra el marcador con su comparación y la coletilla médica", () => {
    const f = construirNarrativa(BASE);
    const m = f.find((x) => x.texto.includes("Cromogranina A"))!;
    expect(m.texto).toContain("un 13% más");
    expect(m.texto).toContain("equipo médico");
    expect(m.href).toBe("/salud/marcadores");
  });
  it("narra la próxima cita con countdown y preguntas listas", () => {
    const c = construirNarrativa(BASE).find((x) => x.href === "/citas")!;
    expect(c.texto).toContain("En 6 días");
    expect(c.texto).toContain("Dr. García");
    expect(c.texto).toContain("2 preguntas");
  });
  it("sin datos devuelve vacío y nunca inventa", () => {
    expect(construirNarrativa({ grupos: [], citas: [], preguntas: [], sesiones: [], hoy: HOY })).toEqual([]);
  });
  it("vocabulario prohibido fuera", () => {
    for (const f of construirNarrativa(BASE)) {
      for (const p of PROHIBIDAS) expect(f.texto.toLowerCase()).not.toContain(p);
    }
  });
});

describe("fraseDelDia", () => {
  it("es determinista para una misma fecha", () => {
    const d = { ...BASE, totalRegistros: 14 };
    expect(fraseDelDia(d, HOY)).toBe(fraseDelDia(d, HOY));
  });
  it("cambia entre días distintos (con pool > 1)", () => {
    const d = { ...BASE, totalRegistros: 14 };
    const a = fraseDelDia(d, new Date("2026-07-06"));
    const b = fraseDelDia(d, new Date("2026-07-07"));
    expect(FRASES_CURADAS.length).toBeGreaterThanOrEqual(15);
    expect(a === b).toBe(false); // pools contiguos ≥15: colisión improbable elegida a propósito
  });
  it("todas las curadas pasan el filtro de vocabulario", () => {
    for (const f of FRASES_CURADAS) {
      for (const p of PROHIBIDAS) expect(f.toLowerCase()).not.toContain(p);
    }
  });
});
```

- [ ] **Step 2: correr → falla** (`npm test`)
- [ ] **Step 3: implementar** `src/lib/narrativa.ts` (usa `comparacionTexto` de lib/marcadores, `proximaCita/diasHasta/textoCountdown` de lib/fechas; frase marcador: `"Tu {nombre}: {comparacion} — solo tu equipo médico puede valorarlo."`; cita: `"{countdown}: {especialista} — tienes {n} preguntas listas."` con singular/plural y omitiendo la coda si n=0; sesión futura más próxima: `"{countdown}: tu sesión de {tipo}."`) y `src/lib/contenido/frases.ts` (20 curadas serenas — ej.: "No hace falta entenderlo todo hoy.", "Apuntarlo ya es cuidarte.", "Los datos son tuyos. Las decisiones, de tu equipo. El día, tuyo otra vez." — + generadas si `totalRegistros >= 5` y/o última analítica hace >25 días).
- [ ] **Step 4: tests verdes**
- [ ] **Step 5: GuiaInicio.tsx** — client; `useLiveQuery` sobre perfil/marcadores.count/citas.count; 3 filas con ○/✓ y Link (`/perfil`, `/salud/marcadores`, `/citas`), subtítulos del spec; si los 3 completos → null. Cabecera: "Esto es OncoTrack — tu evolución, en tu móvil, solo tuya."
- [ ] **Step 6: hoy/page.tsx** — montar `<GuiaInicio/>` tras el header; debajo, narrativa: cargar datos con un `useLiveQuery` conjunto y pintar `construirNarrativa` como tarjetas-Link (texto en `text-fg`, sin colores de juicio); al pie, `fraseDelDia` en `text-muted` itálica discreta. Mantener banner de cita-hoy, countdown (ya cubierto por narrativa — retirar la tarjeta countdown duplicada), recordatorio backup y PromptInstalar.
- [ ] **Step 7: verificar** — build; navegador: DB con datos reales → frase "un 13% más…" y cita con "2 preguntas listas"; DB limpia → guía con 3 pasos y check al completar perfil. 375px.
- [ ] **Step 8: commit** `feat(hoy): guia viva, narrativa humana y frase del dia`

### Task 2: Captura por foto/archivo que alimenta los datos (spec §2)

**Files:**
- Create: `src/app/(app)/_components/CapturaAnalitica.tsx` (generalización de OcrAnalitica)
- Modify: `src/app/(app)/hoy/page.tsx` (bloque 📷/📎/🎤), `src/app/(app)/salud/marcadores/page.tsx` (usar el componente nuevo), Delete: `src/app/(app)/salud/marcadores/OcrAnalitica.tsx`

**Interfaces:**
- `<CapturaAnalitica origen="hoy" | "marcadores" />` — inputs ocultos cámara y archivo + API imperativa vía props `render` sencillo: expone `abrirCamara()`, `abrirArchivo()` mediante `forwardRef`? NO — más simple: el componente pinta sus propios botones según `origen` ("hoy": dos botones grandes 📷 Hacer foto / 📎 Subir archivo; "marcadores": botón único actual).
- Flujo: SIEMPRE guarda `Documento` (blob) primero → si `tipo.startsWith("image/")` y `tieneIA` → `extraerMarcadores` → revisión editable (la existente) → confirmar hace `bulkAdd` de marcadores **con `documentoId`** + `contarRegistroNuevo`. PDF u otros: guardar y avisar "Guardado en Documentos — los PDF aún no se leen automáticamente". Sin IA: guardar y avisar "Guardado en Documentos" + link a /ajustes/ia.

- [ ] **Step 1:** crear `CapturaAnalitica.tsx` moviendo la lógica de OcrAnalitica y añadiendo: guardado previo del documento (`db.documentos.add` con blob) capturando su id; `bulkAdd` con `documentoId`; input de archivo `accept="image/*,application/pdf"`; estados/avisos anteriores.
- [ ] **Step 2:** marcadores/page.tsx importa `CapturaAnalitica origen="marcadores"`; borrar OcrAnalitica.tsx.
- [ ] **Step 3:** hoy/page.tsx: sección "Añadir ahora" bajo la guía: `<CapturaAnalitica origen="hoy"/>` + tercer botón 🎤/⌨️ "Contar" → Link a `/capturar` (la ruta llega en T3; crear ya la página placeholder NO — en su lugar T2 enlaza y T3 la crea: para no romper build, T2 crea `/capturar` con la pantalla sin IA (textarea + botones a formularios) y T3 le añade la interpretación). Corrección: crear en T2 `src/app/(app)/capturar/page.tsx` versión base (textarea + hint dictado + botones "Apuntar como síntoma/analítica/toma/cita" que navegan) y T3 la completa.
- [ ] **Step 4:** verificar — navegador: desde Hoy, subir imagen (sin clave IA: queda en Documentos con aviso); en marcadores el flujo sigue igual; documento visible en /salud/documentos. Build + tests.
- [ ] **Step 5:** commit `feat(captura): foto y archivo desde hoy alimentan documentos y marcadores`

### Task 3: Contar con voz/texto → registros (spec §2 🎤)

**Files:**
- Create: `src/lib/interpretar.ts`, `tests/interpretar.test.ts`
- Modify: `src/app/(app)/capturar/page.tsx`

**Interfaces (Produces):**
```ts
export type RegistroPropuesto =
  | { tipo: "sintoma"; datos: { tipo: string; escala: number; nota?: string } }
  | { tipo: "toma"; datos: { nombre: string } }
  | { tipo: "marcador"; datos: { nombre: string; valor: number; unidad: string; fecha?: string } }
  | { tipo: "cita"; datos: { fecha: string; hora?: string; especialista?: string } };
export async function interpretarTexto(cfg: ConfigIA, texto: string, ctx: { medicaciones: string[] }): Promise<RegistroPropuesto[]>;
export async function aplicarPropuestas(props: RegistroPropuesto[]): Promise<number>; // devuelve nº guardados
```

- [ ] **Step 1: test que falla** — fetch mockeado devuelve `[{"tipo":"sintoma","datos":{"tipo":"Flushing","escala":7}},{"tipo":"toma","datos":{"nombre":"Lanreotida"}}]` (con cercas ```json) para el texto "hoy flushing fuerte, un 7, y me puse la lanreotida"; asserts: 2 propuestas, tipos correctos, el prompt enviado contiene la lista de medicaciones del contexto y la palabra "JSON"; respuestas malformadas → lanza error claro; `aplicarPropuestas` con fake-indexeddb: sintoma queda en `db.sintomas` (fecha hoy), toma actualiza `ultimaToma` + historial de la medicación con nombre coincidente (case-insensitive) y si no existe la crea.
- [ ] **Step 2: rojo → implementar** — prompt del intérprete: convertir texto libre del paciente a array JSON de registros; escala 0-10 si la menciona (si no, omitir el síntoma no: usar 5 y marcar nota "intensidad no dicha"— NO: mejor exigir escala solo si aparece; si falta, `escala: 5` y `nota: "(intensidad estimada)"`); NUNCA diagnosticar ni comentar; fechas relativas ("ayer") → ISO respecto a hoy; medicaciones: casar contra `ctx.medicaciones`. Reusar `chatCompletion` + `extraerJSON` de lib/ia.
- [ ] **Step 3: verde**
- [ ] **Step 4: /capturar completo** — textarea grande autofocus; botón 🎤 solo si `"webkitSpeechRecognition" in window || "SpeechRecognition" in window` (es-ES, resultados → append al texto, toggle empieza/para, aria-label); hint permanente "también puedes dictar con el micrófono de tu teclado"; con IA: botón "Entender lo que conté" → lista de propuestas en tarjetas editables (inputs por campo según tipo) con quitar-fila → "Guardar N registros" → `aplicarPropuestas` + toast + volver a /hoy; sin IA: los 4 botones-atajo a formularios (ya de T2).
- [ ] **Step 5: verificar** — navegador sin clave: pantalla y atajos; con fetch real no (sin clave del agente): probar interpretación vía test unitario + revisión manual del flujo con IA queda anotada para Jota. Build/tests. 375px.
- [ ] **Step 6: commit** `feat(capturar): entrada por voz o texto con interpretacion revisada`

### Task 4: Formularios con memoria (spec §3)

**Files:**
- Modify: `src/lib/marcadores.ts` (+`ultimaUnidadDe`), `tests/marcadores.test.ts` (+casos), `src/app/(app)/salud/marcadores/page.tsx`, `src/app/(app)/salud/sintomas/page.tsx`, `src/app/(app)/salud/medicacion/page.tsx`

**Interfaces:** `ultimaUnidadDe(nombre: string, marcadores: Marcador[]): string | undefined` (case-insensitive, registro más reciente).

- [ ] **Step 1: test que falla** — `ultimaUnidadDe("cromogranina a", [302.8 ng/mL, 342 ng/mL])` → "ng/mL"; sin coincidencia → undefined.
- [ ] **Step 2: implementar + verde.**
- [ ] **Step 3: marcadores/page.tsx** — `unidad` pasa a estado controlado; efecto: al cambiar `nombre`, si `ultimaUnidadDe` da valor → setUnidad y `unidadRecordada=true`; layout: campo Valor grande (`text-lg`, autofocus tras chip vía ref) + junto la unidad como chip "ng/mL ✓" cuando recordada; `<details>` "▸ cambiar fecha o unidad" con fecha+unidad; sin memoria, unidad visible fuera como hasta ahora.
- [ ] **Step 4: sintomas** — fecha y nota dentro de `<details>` "▸ fecha o nota" (fecha default hoy se mantiene). **medicacion** — dosis/última/próxima dentro de `<details>` "▸ detalles (dosis y fechas)"; nombre + botón fuera.
- [ ] **Step 5: verificar** — navegador con datos reales: tocar chip CgA → unidad "ng/mL ✓" sola y foco en valor; añadir 350 sin tocar nada más; gráfica se actualiza. Build/tests.
- [ ] **Step 6: commit** `feat(formularios): memoria de unidad y opcionales plegados`

### Task 5: Clave de API sin fricción (spec §4)

**Files:** Modify: `src/app/(app)/ajustes/ia/page.tsx`, `src/app/onboarding/page.tsx`

- [ ] **Step 1:** en /ajustes/ia — paso 1 del tutorial pasa a ser botón-enlace grande: `<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">Abrir la página de claves de OpenAI →</a>` (estilo BTN_SECUNDARIO con borde morado); pasos 2-4 renumerados (crear → copiar → pegar abajo).
- [ ] **Step 2:** onboarding paso 4: añadir el mismo enlace debajo del botón "Configurar ahora".
- [ ] **Step 3:** verificar (navegador: el enlace abre pestaña nueva) + build; commit `feat(ia): enlace directo a la pagina de claves con microayuda`

### Task 6: Modo consulta (spec §5)

**Files:**
- Create: `src/app/(app)/consulta/page.tsx`
- Modify: `src/app/(app)/citas/page.tsx` (botón), `src/app/(app)/hoy/page.tsx` (botón en banner cita-hoy)

- [ ] **Step 1: /consulta** — client; letra grande (`text-base`/`text-lg`); secciones: (1) por cada `GrupoMarcador`: nombre, último valor XL `.tabular`, comparación, `GraficaMarcador` si ≥2; (2) medicación actual (nombre, dosis, última toma); (3) preguntas pendientes de la cita más próxima (hoy o futura) con checkbox grande para tachar en vivo (`db.preguntas.update`); cabecera "Para enseñar — nada se edita aquí" + botón "← Volver".
- [ ] **Step 2:** botón "Estoy en la consulta" (BTN_PRIMARIO) arriba en /citas y dentro del banner cita-hoy de /hoy.
- [ ] **Step 3:** verificar — navegador con datos reales: valores XL, gráfica, tachar pregunta persiste; 375px. Build/tests. Commit `feat(consulta): modo consulta con letra grande y preguntas tachables`

### Task 7: ¿Cómo estás hoy? de un toque (spec §6)

**Files:** Create: `src/app/(app)/hoy/EstadoHoy.tsx`; Modify: `src/app/(app)/hoy/page.tsx`

- [ ] **Step 1: EstadoHoy** — fila de 5 botones grandes `[😌 0][🙂 2][😐 5][😣 7][😞 9]` etiquetas aria "Muy tranquila…Muy dura" (día, no persona); `useLiveQuery` busca `db.sintomas` con `tipo === "Estado general"` y `fecha === hoyISO()`; toque → add o update (nunca duplica); seleccionado = borde morado; texto "¿Cómo está siendo el día?" — neutro, sin colores por nivel (todos surface).
- [ ] **Step 2:** montar bajo el header de Hoy (encima de la guía). El registro alimenta /salud/sintomas normal.
- [ ] **Step 3:** verificar — dos toques seguidos → un solo registro actualizado (comprobar en /salud/sintomas). Build/tests. Commit `feat(hoy): estado del dia de un toque`

### Task 8: Aviso de próxima toma (spec §7)

**Files:** Modify: `src/app/(app)/hoy/page.tsx` (o componente `AvisoToma.tsx` en hoy/), `src/lib/narrativa.ts` NO (queda como tarjeta propia)

- [ ] **Step 1: AvisoToma.tsx** — meds con `proximaFecha` y `diasHasta(proximaFecha) <= 0` → tarjeta por cada una: "Hoy toca {nombre}" (si días<0: "Tenías apuntada {nombre} para el {fecha}") + botón "Registrar toma" → `historial.push({fecha: hoyISO()})`, `ultimaToma=hoyISO()`, `proximaFecha=undefined` (sin adivinar pautas) + `contarRegistroNuevo`.
- [ ] **Step 2:** montar en Hoy entre narrativa y captura; verificar en navegador (crear med con proximaFecha=hoy → aviso → registrar → desaparece y ultimaToma actualizada). Commit `feat(hoy): aviso de proxima toma registrable de un toque`

### Task 9: Toggle claro/oscuro en cabecera (spec §9)

**Files:** Create: `src/app/(app)/_components/BotonTema.tsx`; Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: BotonTema** — client; `useLiveQuery(getAjustes)`; botón icono (SVG sol si oscuro activo / luna si claro) `aria-label="Cambiar a tema {claro|oscuro}"`, min 44px, `onClick={() => cambiarTema(tema === "claro" ? "oscuro" : "claro")}`.
- [ ] **Step 2:** en el header del layout `(app)`, a la derecha del logo.
- [ ] **Step 3:** verificar en navegador (toque alterna y persiste tras recarga; visible en /hoy). Commit `feat(tema): toggle claro/oscuro en la cabecera`

### Task 10: Verificación final transversal + push

- [ ] `npm test` completo verde; `npm run build` limpio.
- [ ] Navegador 375px, pasada entera: guía viva → estado 1 toque → foto desde Hoy → /capturar → marcador con memoria → narrativa correcta → modo consulta → toggle header → frase del día.
- [ ] Grep vocabulario prohibido en `src/lib/narrativa.ts`, `frases.ts`, prompts de `interpretar.ts`.
- [ ] Push `dev`; resumen final único (por bloque, qué probar Jota, desviaciones).
