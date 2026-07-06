# OncoTrack con alma — Diseño (ronda UX 2026-07-06)

Origen: feedback de Jota tras probar el pivote — "me falta intuición, compleja
de rellenar, no hay conexión con el paciente al punto de 'esto me ayuda'".
Decisiones tomadas en brainstorming con el usuario el 2026-07-06.

Principios transversales (heredan del doc de corrección):
- Móvil primero SIEMPRE; botones grandes, un gesto por acción.
- Nada se guarda sin revisión humana cuando lo produce la IA.
- Sin semáforos ni juicios clínicos; las estadísticas se recalculan, no opinan.
- Todo funciona sin clave de IA (la clave solo añade automatismos).
- Español cálido, sin positivismo de plástico.

## 1. Hoy con alma

**Sin datos aún (guía viva):** bloque de acogida "Esto es OncoTrack — tu
evolución, en tu móvil, solo tuya" + checklist de 3 pasos, cada uno con enlace
directo y check automático al detectar datos reales:
1. Cuéntanos quién eres → /perfil (check: perfil.nombre existe)
2. Apunta tu primera analítica → /salud/marcadores (check: ≥1 marcador) — "verás tu evolución"
3. Tu próxima cita → /citas (check: ≥1 cita) — "cuenta atrás y tus dudas listas"
El bloque desaparece al completar los 3 (o plegable "ocultar guía").

**Con datos (narrativa):** frases humanas generadas de los registros, en orden
de relevancia (máx. 3-4):
- Último marcador con comparación: "Tu Cromogranina A subió un 13% desde
  febrero — recuerda que solo tu equipo médico puede valorarlo."
- Próxima cita: countdown + "tienes N preguntas listas".
- Próxima sesión de terapia si existe.
- Toma de medicación de hoy (ver §7).
Implementación: `src/lib/narrativa.ts` puro (datos → frases) con tests que
prohíben vocabulario de juicio ("normal", "bien", "mal", "preocupante"…).

## 2. Captura rápida universal (como AlergenIA)

Bloque principal en Hoy con tres acciones grandes:
- **📷 Hacer foto**: guarda el Documento Y, con IA, extrae marcadores →
  pantalla de revisión editable → confirmar crea marcadores con `documentoId`
  → gráficas/comparaciones/narrativa se actualizan solas (liveQuery).
- **📎 Subir archivo**: mismo flujo. Extracción solo para imágenes; PDF se
  guarda como documento sin extraer, con aviso honesto.
- **🎤/⌨️ Contar**: campo de texto grande. Dictado: botón de micro propio
  (Web Speech API) donde el navegador lo soporte + SIEMPRE el micro del
  teclado como vía universal (hint visible). Con IA: el texto se convierte en
  registros estructurados (síntoma, toma, marcador, cita) → revisión →
  guardar. Sin IA: botones que llevan al formulario adecuado.
Foto y archivo disparan sus inputs directamente desde Hoy (sin navegar);
"Contar" abre la ruta nueva `/capturar` (campo grande + revisión). Módulo
`src/lib/interpretar.ts` (texto → registros propuestos, prompt sin
diagnósticos) con tests de parsing sobre fetch mockeado.

## 3. Formularios con memoria

- Marcadores: elegir chip (o nombre ya conocido) → unidad autorrellenada con
  la del último registro de ese marcador; foco al campo valor. Fecha (hoy) y
  unidad plegadas bajo "▸ cambiar fecha o unidad" cuando hay memoria.
- Síntomas: fecha y nota plegadas.
- Medicación: opcionales plegados en el alta.

## 4. Clave de API sin fricción

En /ajustes/ia y en el paso 4 del onboarding: botón-enlace directo
"Abrir la página de claves de OpenAI →" (https://platform.openai.com/api-keys,
target _blank). El tutorial existente se reordena: paso 1 = ese botón.

## 5. Modo consulta

Botón "Estoy en la consulta" (en Hoy cuando la cita es hoy, y siempre en
/citas). Pantalla única, letra grande, scroll simple:
- Últimos valores de cada marcador con su comparación (y mini-gráfica).
- Medicación actual (nombre, dosis, última toma).
- Preguntas pendientes de la cita con checkbox para ir tachando en vivo.
Sin edición (salvo tachar preguntas); pensada para enseñar al médico.
Ruta: `/consulta`.

## 6. ¿Cómo estás hoy? (1 toque)

En Hoy, fila de 5 niveles (0-2-5-7-9 con caritas neutras, sin colores
semáforo). Un toque → registra Sintoma { tipo: "Estado general", escala,
fecha: hoy }. Si ya hay uno hoy, muestra el elegido y permite cambiarlo
(update, no duplicado).

## 7. Aviso de próxima toma

Si alguna medicación tiene `proximaFecha` <= hoy: tarjeta en Hoy
"Hoy toca {nombre}" con botón "Registrar toma" (1 toque: historial + fechas,
y si la pauta es periódica se deja `proximaFecha` vacía para que el paciente
la ajuste — sin adivinar pautas). Solo al abrir la app; sin push (honesto con
lo que la PWA hace bien hoy).

## 8. Frases que acompañan

Frase discreta al pie de Hoy, rotación diaria (determinista por fecha, sin
aleatorio que cambie al re-render). Dos fuentes:
- Curadas (~20): serenas, reales, sin positivismo de plástico ni consejo
  médico. Ej.: "No hace falta entenderlo todo hoy."
- De sus datos: "Llevas N registros — tu historia está cada vez mejor
  contada." / "Mañana hace un mes de tu última analítica."
En `src/lib/contenido/frases.ts` + selector en narrativa.ts, con test de
vocabulario prohibido.

## 9. Toggle claro/oscuro en cabecera

Icono simple (sol/luna) arriba a la derecha en la cabecera de la app, un
toque, con `aria-label`. Reusa `cambiarTema`; el control de Ajustes se queda.

## Fuera de alcance en esta ronda
- Notificaciones push.
- Extracción de PDF.
- Cambios en asistente, radar, sync, compartir, PIN.

## Verificación
- Tests unitarios: narrativa, frases (vocabulario prohibido), interpretar
  (parsing), memoria de unidad (helper), estado-de-hoy sin duplicados.
- Verificación en navegador con datos reales (CgA 302.8→342) por bloque.
- Revisión transversal móvil 375px por bloque.
