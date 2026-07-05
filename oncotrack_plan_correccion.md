# OncoTrack — Plan de corrección y desarrollo

_Documento para Claude Code. Sustituye el enfoque anterior (cuidador-céntrico, con Supabase obligatorio) por el descrito aquí. Léelo entero antes de tocar código — hay un pivote de arquitectura, no solo features nuevas._

---

## 0. Contexto — por qué cambia el rumbo

OncoTrack nació como expediente privado para Ana (paciente de tumor neuroendocrino) y Jota (su pareja/cuidador), con Next.js + Supabase (auth, RLS, multi-usuario con roles owner/caregiver).

Decisión nueva: **OncoTrack se regala a cualquier paciente oncológico que lo necesite**, no solo a Ana. Eso cambia los requisitos de raíz:

- No debe existir un backend centralizado que almacene datos de salud de terceros (implicaría responsabilidad legal RGPD sobre datos de categoría especial que Jota no quiere asumir).
- No debe haber registro de usuarios ni cuentas. Cada paciente usa la app de forma completamente aislada, en su propio dispositivo.
- No debe haber IA pagada por Jota. Si el paciente quiere usar IA (OCR de analíticas, asistente de acompañamiento), conecta su propia clave de API.
- El público real: pacientes con ansiedad por no entender su propia evolución clínica (marcadores, medicación, citas), mayoritariamente **no técnicos**, que usarán esto **casi siempre desde el móvil**.
- La app aspira a ser algo más que un cuaderno de datos: un **espacio de apoyo** — que ayude a entender, a no olvidar preguntas, a acompañar el miedo — sin sustituir nunca a un profesional.

Ana y Jota pueden seguir usando su instancia actual si quieren compartir datos entre los dos — pero esa ya no es la prioridad ni el producto a construir. **El producto es la versión individual, local, sin registro.**

---

## 1. Arquitectura — qué se corrige

| Antes | Ahora |
|---|---|
| Supabase obligatorio (auth + Postgres + RLS) | **Almacenamiento local** (IndexedDB vía Dexie.js) por defecto. Supabase se mantiene en el repo como **sync opcional oculto**, apagado por defecto (ver §4.11). |
| Login con email/contraseña | **Sin login.** La app abre directo. Opcionalmente, PIN local de 4 dígitos (ver §4.2). |
| Modelo `patient_profiles` + `patient_access` con roles owner/caregiver, pensado para un único paciente compartido entre varias cuentas | **Un dispositivo = un paciente.** Todo el almacenamiento es de la persona que usa ese móvil. No hay concepto de "acceso" ni "roles" ni tablas de permisos por defecto. |
| `.limit(1)` hardcodeado en `/hoy` y `/perfil` asumiendo un solo paciente en toda la base de datos | Ya no aplica — cada instalación de la app en cada móvil es su propio mundo de datos aislado por definición, sin necesidad de filtrar nada. |
| Tema oscuro premium por defecto | **Tema claro cálido por defecto** (crema/hueso de fondo, acentos jade `#5fb6a6` y arcilla `#d6a17a` que ya existen — se mantiene la paleta, se invierte el fondo). Oscuro disponible como opción en Ajustes, no como default. |
| Sin pantalla de bienvenida | **Onboarding guiado** la primera vez que se abre la app (ver §4.12). |

---

## 2. Persistencia local — base técnica

- Sustituir todas las llamadas a Supabase (`createClient`, queries de `patient_profiles`, `patient_access`, etc.) por una capa de datos local usando **Dexie.js** sobre IndexedDB.
- Esquema local sugerido (una sola "base" por dispositivo, sin concepto de usuario):
  - `perfil` (datos básicos del paciente: nombre, fecha de nacimiento, diagnóstico, idioma)
  - `marcadores` (nombre del marcador, fecha, valor, unidad, documento de origen si aplica)
  - `sintomas` (fecha, tipo, escala 0-10, nota)
  - `medicacion` (nombre, dosis, fecha última toma/inyección, próxima fecha estimada, historial)
  - `citas` (fecha, hora, especialista, centro, notas)
  - `preguntas` (texto, `cita_id` asociado, fecha creación, resuelta: sí/no)
  - `documentos` (metadatos + blob del archivo/foto guardado localmente)
  - `sesiones_apoyo` (fecha, tipo: terapia/psico-oncología/otra, notas breves, próxima sesión si aplica)
  - `conversaciones_asistente` (mensajes del asistente de acompañamiento, solo local — ver §4.13)
  - `radar_perfil` (términos de búsqueda guardados para el radar de ensayos, ver §4.10)
  - `ajustes` (tema claro/oscuro, PIN activado/hash, clave de API del usuario, recordatorio de backup, sync con Supabase activado/desactivado)
- Toda la lógica de queries debe operar sobre esta única base local, sin filtros de usuario (no hacen falta: solo hay un paciente por instalación).

---

## 3. Tema visual

- Cambiar el valor por defecto de los tokens en `src/app/globals.css`: fondo base pasa de tinta oscura (`#0f1518`) a un crema/hueso cálido (ej. `#f7f3ee` o similar tono cálido, no blanco frío de hospital).
- Mantener jade (`#5fb6a6`) y arcilla (`#d6a17a`) como acentos — funcionan igual de bien sobre fondo claro.
- Añadir toggle claro/oscuro en Ajustes, guardado en `ajustes` local, aplicado vía clase en `<html>` o `data-theme`.
- Revisar contraste de textos sobre el nuevo fondo claro (WCAG AA mínimo).

---

## 4. Funcionalidades

### 4.1 Estado vacío cálido
En cada pantalla con listas (citas, medicación, síntomas, documentos, marcadores) que no tenga datos todavía, mostrar un mensaje cálido y humano en vez de una tabla/lista vacía sin más.
Ejemplo de tono: *"Aún no hay nada aquí — cuando subas tu primera analítica, esto se irá llenando."*

### 4.2 PIN local opcional
- Pantalla de bloqueo antes de renderizar la app, solo si el usuario lo activó en Ajustes.
- PIN de 4 dígitos. Hash con Web Crypto API (`crypto.subtle`), nunca guardado en texto plano.
- Si no está activado, la app abre directo sin pedir nada.
- Sin recuperación por email (no hay backend): opción de "restablecer" que borra el PIN guardado (con aviso claro de que no borra los datos clínicos, solo el bloqueo).

### 4.3 Countdown a la próxima cita
- En `/hoy`, leer la tabla local `citas`, filtrar las futuras, mostrar la más próxima con cuenta atrás en días.
- Formato: *"En 6 días: Dr. García, Oncología"*.

### 4.4 Preparador de preguntas para la consulta
- Tabla local `preguntas`, ligada opcionalmente a una `cita_id`.
- Formulario simple para anotar dudas en cualquier momento.
- El día de la cita, banner en `/hoy`: *"Hoy tienes cita con el Dr. García — tenías 3 preguntas anotadas"*, con listado desplegable y opción de marcar como resueltas.

### 4.5 Enlace temporal para compartir (sin servidor)
- Pantalla para elegir qué compartir (todo / solo marcadores recientes / solo medicación) y una fecha de caducidad.
- El link lleva los datos **comprimidos y cifrados dentro de la propia URL** — nada se sube a ningún servidor.
- Botón "Compartir" con Web Share API (`navigator.share`).
- Página de solo lectura (`/compartido`) que descifra en el cliente y respeta la caducidad codificada junto a los datos; pasada la fecha, muestra *"Este enlace ha caducado"* sin revelar nada.
- Aviso honesto en la UI: no es borrado garantizado tras la fecha, es que la página deja de mostrar el contenido — suficiente para compartir con pareja o médico de confianza.

### 4.6 Backup / exportación de datos
- Botón "Guardar copia de mis datos" (Ajustes o `/hoy`).
- Genera un archivo (JSON + resumen legible) ofrecido vía `navigator.share` — el paciente decide dónde guardarlo. Nada se sube a ningún servidor de Jota.
- Recordatorio local (sin servidor) si pasan más de 30 días desde el último backup o se añaden varios registros nuevos.

### 4.7 Configuración de IA propia del paciente
- Ajustes: campo para pegar su propia clave de API (OpenAI u otro proveedor compatible), guardada solo en local.
- Mini-tutorial visual (3-4 pasos con capturas): dónde conseguir la clave, cómo copiarla, dónde pegarla. Integrado también en el onboarding (§4.12).
- Aviso honesto: *"Cada foto que analices tiene un coste mínimo que pagas directamente al proveedor de la IA. Nosotros nunca vemos tu clave ni tus datos."*
- La app funciona sin esa clave: sin ella, entrada manual; con ella, además foto + extracción automática por OCR/IA, siempre con revisión humana obligatoria antes de guardar.

### 4.8 Mobile-first real
- Entrada de datos con **cámara directa** como acción principal.
- PWA instalable con prompt claro de "Añadir a pantalla de inicio".
- Funciona offline.
- Botones grandes, una acción principal por pantalla, texto mínimo.

### 4.9 Sección de ayuda / glosario emocional
- Glosario en lenguaje llano de los marcadores relevantes (Cromogranina A, NSE, Serotonina en orina 24h, etc.): qué son, en 2-3 frases sin tecnicismos.
- Aviso claro: *"Esta información es general, no sustituye a tu equipo médico — coméntalo siempre con ellos."*
- Cada valor nuevo se muestra en relación al propio histórico del paciente (*"un 12% menos que tu última analítica"*), nunca contra un rango genérico. Sin semáforos ni diagnósticos automáticos.
- Enlaces a asociaciones reales de pacientes de tumores neuroendocrinos y enfermedades raras en España.
- Explicación de privacidad en lenguaje simple: *"Tus datos viven solo en este dispositivo. Nosotros no los vemos, no los guardamos, no los compartimos."*
- Enlace visible y permanente a recursos de apoyo psicológico y líneas de ayuda (ver también §4.13) — no escondido en un submenú.

### 4.10 Radar de tratamientos y ensayos clínicos
- Pantalla nueva: el paciente guarda un `radar_perfil` simple (tipo de tumor, localización, palabras clave) — todo local, nada se envía a ningún servidor de Jota.
- Con la clave de API propia configurada (§4.7), un proceso bajo demanda (botón "Buscar novedades", no automático en segundo plano, para no generar coste sin que el paciente lo pida) consulta fuentes públicas relevantes (ClinicalTrials.gov, REEC — Registro Español de Estudios Clínicos, PubMed) y devuelve un resumen en lenguaje llano de resultados nuevos relacionados con su perfil.
- Nunca presentado como recomendación médica: encabezado fijo tipo *"Esto es información pública sobre investigación en curso — coméntalo con tu oncólogo antes de sacar conclusiones."*
- Guardar la fecha de la última búsqueda para mostrar "sin novedades desde tu última consulta" cuando aplique, evitando ansiedad de sentir que hay que mirarlo constantemente.

### 4.11 Sync opcional oculto con Supabase
- El código de Supabase/migraciones no se borra: queda disponible tras un ajuste avanzado, **apagado por defecto** (`ENABLE_CLOUD_SYNC=false`).
- En Ajustes → sección "Avanzado" (no en el flujo principal, no visible para quien no la busque): opción "Sincronizar entre mis dispositivos (opcional)". Si el paciente la activa, se le explica en una frase simple qué implica (sus datos viajan a un servidor cifrado para poder verlos desde otro móvil) y se le pide confirmación explícita.
- Pensado para el caso Ana+Jota o cualquiera que quiera compartir entre dos dispositivos propios — nunca activado por defecto, nunca necesario para usar la app.

### 4.12 Pantalla de bienvenida / onboarding paso a paso
- Se muestra automáticamente la primera vez que se abre la app (y queda accesible después desde Ayuda → "Ver la bienvenida de nuevo").
- Contenido, en 4-5 pantallas cortas, lenguaje cálido y sin jerga:
  1. Qué es OncoTrack y para qué sirve (tu evolución, tu medicación, tus citas, en un solo sitio, solo tuyo).
  2. Tus datos son solo tuyos — viven en tu móvil, nadie más los ve (enlaza con §4.9).
  3. Cómo activar el PIN si quieres proteger la app (paso a paso, con opción de saltarlo).
  4. Cómo conectar tu propia IA si quieres usar la cámara para leer analíticas automáticamente (paso a paso con capturas, con opción de saltarlo y hacerlo más tarde desde Ajustes).
  5. Cierre cálido: recuerda que la app acompaña, no sustituye a su equipo médico ni a apoyo profesional, y dónde encontrar ayuda si la ansiedad aprieta.
- Cada paso debe poder saltarse — el onboarding informa, nunca bloquea el uso de la app.

### 4.13 Asistente de acompañamiento (apoyo emocional y de evolución)
Un espacio de conversación dentro de la app donde el paciente puede hablar de sus miedos, repasar su evolución o simplemente pensar en voz alta — usando su propia clave de API (§4.7), nunca una IA pagada por Jota.

Requisitos de diseño, no negociables:
- **No es terapia ni la sustituye.** En la primera vez que se abre esta sección, y de forma visible y permanente en la propia pantalla (no solo en un aviso legal escondido), debe constar: *"Esto es un espacio para pensar en voz alta y organizar tus ideas. No es un profesional, no diagnostica, no sustituye a tu psico-oncólogo ni a tu equipo médico."*
- El asistente puede ayudar a: poner en palabras lo que se siente, repasar la propia evolución registrada en la app en tono cálido, preparar qué decir en la próxima sesión de terapia o consulta, sugerir — sin insistir de forma invasiva — hablarlo con su equipo médico o un profesional cuando el tono de la conversación indique angustia sostenida.
- El asistente **nunca** debe: diagnosticar, dar pautas de medicación, minimizar lo que el paciente siente, ni fomentar que hable solo con la app en vez de con personas o profesionales reales.
- Debe existir en todo momento, de forma visible desde esa misma pantalla (no en un menú aparte), un enlace directo a recursos de ayuda reales: línea 024 (atención a la conducta suicida, España), Teléfono de la Esperanza, y enlace a asociaciones de apoyo psico-oncológico. Esto no debe depender de que el paciente lo busque.
- El módulo `sesiones_apoyo` (terapia, psico-oncología) vive aparte, como un diario simple de sesiones (fecha, notas breves, próxima sesión) — no mezclado con el chat del asistente, para que quede claro que una cosa es su proceso terapéutico real y otra el espacio de acompañamiento dentro de la app.
- Todo el historial de conversación se guarda solo en local, nunca sale del dispositivo salvo que el paciente lo incluya explícitamente en un backup o enlace de compartir.

---

## 5. Orden de ejecución recomendado

1. **Pivote de arquitectura** (§1 y §2): quitar Supabase del flujo obligatorio, montar Dexie/IndexedDB, quitar login, la app abre directo.
2. **Tema claro por defecto** (§3) + estado vacío cálido (§4.1).
3. **PIN local** (§4.2).
4. **Citas + countdown** (§4.3) y **preguntas para consulta** (§4.4).
5. **Backup/exportación** (§4.6).
6. **Configuración de IA propia** (§4.7).
7. **Enlace temporal para compartir** (§4.5).
8. **Ayuda/glosario emocional** (§4.9).
9. **Onboarding/bienvenida** (§4.12) — apóyate en el contenido y tutoriales ya escritos en 4.7 y 4.9.
10. **Radar de tratamientos y ensayos** (§4.10).
11. **Sync opcional oculto con Supabase** (§4.11).
12. **Asistente de acompañamiento** (§4.13) — el más delicado, hazlo al final y con especial cuidado en los requisitos no negociables de esa sección.
13. **Mobile-first / pulido PWA** (§4.8) — revisar de forma transversal en cada bloque, no como tarea aparte al final.

---

## 6. Lo que NO hay que hacer en esta ronda

- No construir registro de usuarios ni ningún tipo de login por defecto.
- No reactivar Supabase como requisito — solo como opción avanzada, apagada por defecto (§4.11).
- No añadir semáforos, alertas de "valor anormal" ni ningún tipo de interpretación diagnóstica automática, ni en los marcadores ni en el asistente de acompañamiento.
- No obligar a configurar una clave de IA para poder usar la app.
- No perseguir integración con portales de salud autonómicos (La Meva Salut u otros) — no existe API pública para terceros y no es una vía viable ni legal de construir.
- No permitir que el asistente de acompañamiento (§4.13) actúe como sustituto de terapia, dé pautas médicas, o minimice al paciente — los requisitos de esa sección son obligatorios, no sugerencias.
