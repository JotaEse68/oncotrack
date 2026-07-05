# OncoTrack — Estado y hoja de ruta

_Actualizado: 2026-07-05_

Documento vivo con **qué es la app**, **qué está hecho**, **qué queda** y **cómo retomarlo**. Complementa la spec maestra (`docs/` + `Downloads/OncoTrack_especificacion_completa.md`).

---

## 1. Qué es OncoTrack

Expediente clínico oncológico **personal y privado** (PWA) para una paciente (**Ana**, tumor neuroendocrino) y su cuidador (**Jota**). Se construye la **spec V1 completa** (la ambiciosa, no la versión lean).

Principios (spec §5):
- El **documento original** es la fuente de verdad; cada dato guarda documento/página/fragmento/confianza.
- **Revisión humana obligatoria** antes de incorporar datos extraídos por IA.
- Sin diagnósticos ni semáforos clínicos; lenguaje neutral.
- **Móvil primero**, estética dark premium (no clínica/fría).

Idea central: cada documento subido **actualiza el expediente, compara la evolución y prepara la siguiente consulta**.

---

## 2. Stack e infraestructura

| Pieza | Detalle |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Tailwind v4) |
| Backend/DB | Supabase (Postgres + Auth + Storage privado + RLS) |
| Proyecto Supabase | `oncotrack` — ref `fujrjljpojfuzfhlwubu`, región **eu-west-1** (UE/RGPD) |
| Hosting | Vercel — proyecto `oncotrack-1jzc` (equipo `jsantospro`) |
| Repo | GitHub `JotaEse68/oncotrack` (**privado**), ramas `main` (prod) y `dev` |
| IA (Fase 2) | OpenAI multimodal (OCR) — presupuesto 10 €/mes |
| Correo | Solo el integrado de Supabase (auth); sin proveedor externo |

**Credenciales**: en `.env.local` (gitignored). Tokens de CLI en `.supabase-token` y `.vercel-token` (gitignored). **Nunca** subir estos archivos.

**Cuentas de la app**: Jota (`jsantospro3@gmail.com`, titular/owner) y Ana (`anygut71@gmail.com`, cuidadora). Contraseña acordada entre Jota y Ana.

---

## 3. Hecho (verificado)

- **Fase 0 — Infraestructura**
  - Repo en GitHub (privado), `main` + `dev`.
  - Esquema Supabase aplicado: migraciones `0001` (tablas base, RLS, bucket privado, `has_patient_access`) y `0002` (trigger de alta de `app_users`, política de co-miembros).
  - Variables de entorno cargadas en local y en Vercel (production + preview).
- **Fase 1 — Base clínica (parcial)**
  - **Auth**: login email/contraseña, logout, protección de rutas (`src/proxy.ts`), sesión SSR. Verificado end-to-end.
  - **Sistema de diseño**: tinta `#0f1518` + jade `#5fb6a6` + arcilla `#d6a17a`; Fraunces (display) + Geist (cuerpo) + Geist Mono (cifras); firma = espina vertical. Tokens en `src/app/globals.css`.
  - **Pantallas**: `/login`, `/hoy` (expediente del paciente + fecha), `/perfil` (ver/editar datos del paciente + lista de accesos), navegación inferior.
  - Datos sembrados: perfil de Ana + accesos (Jota owner, Ana caregiver).

---

## 4. Pendiente

### Cierre inmediato
- [ ] **Vercel desbloqueado y desplegado** — ver §6 (bloqueo de cuenta).
- [ ] Poner `OPENAI_API_KEY` cuando lleguemos a Fase 2.

### Fase 1 — Base clínica (lo que falta)
- [ ] Diagnóstico (spec §9.2)
- [ ] Especialistas y centros médicos
- [ ] Tratamientos
- [ ] Medicación (con historial; caso real: Lanreótida/Somatuline)
- [ ] Citas médicas (calendario + recordatorio in-app)
- [ ] **Línea de tiempo** (columna vertebral del expediente)
- [ ] Documentos privados (subida a Storage, sin OCR todavía)

### Fase 2 — Analíticas inteligentes
- [ ] OCR + clasificación + extracción (OpenAI multimodal)
- [ ] Revisión humana y confirmación (paciente o cuidador; auditoría de quién)
- [ ] Parámetros configurables, comparación automática, gráficas de evolución
- [ ] Controles de coste (caché, límite de páginas, avisos al 50/80 % del presupuesto)
- Caso real de marcadores: Cromogranina A, NSE, Serotonina en orina 24h.

### Fase 3 — Informes médicos
- [ ] Oncología, radiología, anatomía patológica; extracción, resumen, comparador, seguimiento de lesiones.

### Fase 4 — Consulta médica
- [ ] Resumen desde la última consulta, preparador de preguntas, PDF de una página, enlace temporal (30 días, revocable), historial de resúmenes.

### Fase 5 — Seguimiento cotidiano
- [ ] Síntomas (escala 0–10 configurable; caso real: diarrea, flushing, dolor abdominal, fatiga), peso, estado general, calendario, recordatorios, evolución.

### Fase 6 — Radar científico
- [ ] Perfil de búsqueda + fuentes (ClinicalTrials.gov, REEC, PubMed), radar semanal.

### Fase 7 — Asistente
- [ ] Asistente que responde solo desde los documentos almacenados ("No consta…").

### Fase 8 — Compartición y exportación
- [ ] Enlaces compartidos configurables/revocables, export ZIP, backups.

### Fase 9 — DICOM y funciones avanzadas
- [ ] Visor/lectura DICOM (fase lejana).

### Notificaciones (transversal)
- [ ] Push PWA + centro de avisos interno (sin canal de correo).

---

## 5. Decisiones cerradas (resumen)

Next.js · OCR solo OpenAI multimodal · confirman paciente y cuidador · nombre OncoTrack · correo solo Supabase auth · push PWA + avisos internos · presupuesto OpenAI 10 €/mes · enlaces 30 días · región UE · retención indefinida hasta borrado manual · escalas 0–10 · límite 25 MB/archivo · backups Supabase + export ZIP. Detalle en `docs/decisions.md`.

---

## 6. Bloqueos conocidos

- **Vercel — despliegues en estado `BLOCKED`**: el repo ya está conectado (los push a `main`/`dev` disparan deploys) y las variables están puestas, pero Vercel bloquea **todos** los despliegues antes de compilar. Es un bloqueo **a nivel de cuenta/equipo** (`jsantospro`), no un fallo de build. **Acción de Jota**: entrar al dashboard de Vercel y revisar el estado de la cuenta/equipo (facturación, verificación, límites o aviso de bloqueo). Una vez resuelto, un nuevo push o un redeploy publicará la app.

---

## 7. Cómo arrancar en local

```bash
npm install
npm run dev        # http://localhost:3000
```
Requiere `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Migraciones Supabase: en `supabase/migrations/`. Se aplicaron vía Management API; para una BD nueva, ejecutarlas en orden (`0001`, `0002`).
