# OncoTrack — Fase 0: Infraestructura base — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar OncoTrack desplegado vacío en staging y producción, con repo GitHub, esquema base de Supabase con RLS activa, storage privado y entornos separados.

**Architecture:** Monorepo Next.js (App Router, TypeScript, Tailwind) desplegado en Vercel con dos entornos (rama `staging` → preview, rama `main` → producción). Dos proyectos Supabase independientes (staging y producción) en región UE-Frankfurt, gestionados con migraciones SQL versionadas vía Supabase CLI (`npx supabase`). RLS en todas las tablas desde la primera migración; storage privado sin acceso público.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Storage), Vercel, GitHub + gh CLI, Supabase CLI vía npx.

**Decisiones ya cerradas (sección 40 de la spec):** Next.js · OCR solo OpenAI multimodal · confirman paciente y cuidador · nombre OncoTrack · correo solo Supabase auth · push PWA + avisos internos · presupuesto OpenAI 10 €/mes · enlaces 30 días · región UE Frankfurt · retención indefinida.

**Pasos que requieren al usuario (interactivos, no los puede hacer el agente):**
- `gh auth login` (autenticación GitHub)
- Crear los 2 proyectos Supabase en el dashboard y copiar claves
- `npx supabase login` (token de Supabase)
- Importar el repo en Vercel (dashboard) o `npx vercel login`

---

### Task 1: Instalar GitHub CLI y autenticar

**Files:** ninguno (instalación de herramientas)

- [ ] **Step 1: Instalar gh con winget**

Run: `winget install --id GitHub.cli --accept-source-agreements --accept-package-agreements`
Expected: "Successfully installed". Cerrar y reabrir la sesión de terminal si `gh` no se encuentra después.

- [ ] **Step 2 (USUARIO): Autenticar gh**

El usuario ejecuta en el prompt de Claude Code:

```
! gh auth login --web --git-protocol https
```

Elegir GitHub.com → HTTPS → Login with web browser, con la cuenta **JotaEse68**.

- [ ] **Step 3: Verificar autenticación**

Run: `gh auth status`
Expected: `Logged in to github.com account JotaEse68`

---

### Task 2: Scaffold del proyecto Next.js

**Files:**
- Create: `C:\Users\Jota\Desktop\oncotrack\` (proyecto completo generado por create-next-app)

- [ ] **Step 1: Generar el proyecto**

Desde `C:\Users\Jota\Desktop` (el directorio `oncotrack` ya existe con `docs/plans/`; create-next-app acepta directorio no vacío solo con archivos que no chocan — si se queja, generar en `oncotrack-tmp` y mover el contenido):

Run: `npx create-next-app@latest oncotrack --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes`
Expected: "Success! Created oncotrack"

- [ ] **Step 2: Verificar que arranca**

Run: `npm run dev` (en background) y luego `curl http://localhost:3000` o abrir en navegador.
Expected: HTTP 200 con la página por defecto de Next.js. Parar el servidor después.

- [ ] **Step 3: Verificar que el build pasa**

Run: `npm run build`
Expected: "Compiled successfully"

- [ ] **Step 4: Commit inicial**

```powershell
git init
git add -A
git commit -m "chore: scaffold Next.js 15 con TypeScript y Tailwind

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Repo GitHub, ramas y protección

**Files:** ninguno (configuración remota)

- [ ] **Step 1: Crear repo privado y push**

```powershell
gh repo create JotaEse68/oncotrack --private --source . --remote origin --push
```

Expected: repo creado y rama `main` subida.

- [ ] **Step 2: Crear rama staging**

```powershell
git checkout -b staging
git push -u origin staging
git checkout main
```

- [ ] **Step 3: Proteger main (PRs obligatorias)**

```powershell
gh api -X PUT "repos/JotaEse68/oncotrack/branches/main/protection" -H "Accept: application/vnd.github+json" --input - <<'JSON'
{"required_status_checks":null,"enforce_admins":false,"required_pull_request_reviews":{"required_approving_review_count":0},"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
JSON
```

(En PowerShell 5.1 no hay heredoc `<<`: guardar el JSON en `protection.json` con `Set-Content -Encoding utf8` y usar `--input protection.json`, luego borrar el archivo.)

Expected: respuesta JSON con `"allow_force_pushes": {"enabled": false}`.

- [ ] **Step 4: Verificar**

Run: `gh repo view JotaEse68/oncotrack --json visibility,defaultBranchRef`
Expected: `"visibility": "PRIVATE"`, default branch `main`.

---

### Task 4: Documentación de arquitectura (entregable de cierre de Fase 0)

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/data-model.md`
- Create: `docs/security.md`
- Create: `docs/decisions.md`

- [ ] **Step 1: Escribir docs/decisions.md**

Contenido: las decisiones cerradas de la sección 40 (copiar el bloque "Decisiones ya cerradas" de la cabecera de este plan, con fecha 2026-06-11 y una línea por decisión con su motivo).

- [ ] **Step 2: Escribir docs/architecture.md**

Contenido mínimo: diagrama de entornos (local → staging → production), flujo de despliegue (PR a staging → preview Vercel + Supabase staging; merge a main → producción), dónde viven las claves (solo Vercel env vars, nunca en frontend), y el flujo de procesamiento de documentos previsto para Fase 2 (subida → storage privado → función serverless → OpenAI → revisión humana → confirmación).

- [ ] **Step 3: Escribir docs/data-model.md**

Contenido: las 6 tablas de la migración 0001 (Task 6) con sus columnas y relaciones, y la lista de entidades futuras de la sección 28 de la spec marcadas como "fase posterior".

- [ ] **Step 4: Escribir docs/security.md**

Contenido: principios (RLS siempre activa, storage privado, claves solo en servidor, auditoría de acciones sensibles), el modelo de acceso (tabla `patient_access` como única fuente de autorización), la política de retención (indefinida hasta borrado manual) y la estrategia de backups: backups automáticos de Supabase (diarios en plan Pro; en plan Free, verificar qué incluye y compensar con exportación manual) + exportación periódica del esquema con `npx supabase db dump` guardada fuera de Supabase.

- [ ] **Step 5: Commit**

```powershell
git add docs/
git commit -m "docs: arquitectura, modelo de datos, seguridad y decisiones de Fase 0

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Crear proyectos Supabase (USUARIO) e inicializar CLI

**Files:**
- Create: `supabase/config.toml` (generado por supabase init)

- [ ] **Step 1 (USUARIO): Crear dos proyectos en el dashboard de Supabase**

En https://supabase.com/dashboard, organización personal:
1. **oncotrack-staging** — región **Central EU (Frankfurt)** — contraseña de BD generada y guardada.
2. **oncotrack-production** — región **Central EU (Frankfurt)** — contraseña de BD distinta, guardada.

Copiar de cada proyecto (Settings → API): `Project URL`, `anon key`, `service_role key`, y el `project ref` (el id de la URL).

- [ ] **Step 2 (USUARIO): Autenticar la CLI**

```
! npx supabase login
```

- [ ] **Step 3: Inicializar supabase en el repo**

Run: `npx supabase init`
Expected: crea `supabase/config.toml`.

- [ ] **Step 4: Vincular al proyecto staging**

Run: `npx supabase link --project-ref <REF_STAGING>` (pedirá la contraseña de BD de staging)
Expected: "Finished supabase link."

- [ ] **Step 5: Commit**

```powershell
git add supabase/
git commit -m "chore: inicializar Supabase CLI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Migración 0001 — esquema base con RLS

**Files:**
- Create: `supabase/migrations/0001_base_schema.sql`

- [ ] **Step 1: Escribir la migración completa**

```sql
-- 0001_base_schema.sql — esquema base de OncoTrack (Fase 0)
-- Principio: patient_access es la ÚNICA fuente de autorización.

create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id),
  full_name text not null,
  birth_date date,
  language text not null default 'es',
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patient_access (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  access_role text not null check (access_role in ('owner', 'caregiver')),
  granted_by uuid references public.app_users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (patient_profile_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  title text not null,
  doc_type text not null default 'otro',
  doc_date date,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  status text not null default 'subido'
    check (status in ('subido','en_cola','procesando','ocr_completado','extraccion_completada','revision_necesaria','confirmado','error','archivado','eliminado')),
  uploaded_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  summary text,
  event_date date not null,
  event_time time,
  document_id uuid references public.documents(id) on delete set null,
  created_by uuid not null references public.app_users(id),
  confirmed_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.app_users(id),
  patient_profile_id uuid references public.patient_profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_patient_access_lookup on public.patient_access (user_id, patient_profile_id) where revoked_at is null;
create index idx_documents_profile on public.documents (patient_profile_id, created_at desc);
create index idx_timeline_profile_date on public.timeline_events (patient_profile_id, event_date desc);
create index idx_audit_profile on public.audit_logs (patient_profile_id, created_at desc);

-- Función de autorización central
create or replace function public.has_patient_access(profile_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.patient_access
    where patient_profile_id = profile_id
      and user_id = auth.uid()
      and revoked_at is null
  );
$$;

-- RLS activa en TODAS las tablas
alter table public.app_users enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.patient_access enable row level security;
alter table public.documents enable row level security;
alter table public.timeline_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "usuarios ven y editan su propia fila" on public.app_users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "acceso a perfiles via patient_access" on public.patient_profiles
  for select using (public.has_patient_access(id));
create policy "solo owner edita perfil" on public.patient_profiles
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "usuario autenticado crea su perfil" on public.patient_profiles
  for insert with check (owner_user_id = auth.uid());

create policy "ver accesos de mis perfiles" on public.patient_access
  for select using (user_id = auth.uid() or public.has_patient_access(patient_profile_id));
create policy "solo owner del perfil gestiona accesos" on public.patient_access
  for insert with check (
    exists (select 1 from public.patient_profiles p
            where p.id = patient_profile_id and p.owner_user_id = auth.uid())
  );
create policy "solo owner revoca accesos" on public.patient_access
  for update using (
    exists (select 1 from public.patient_profiles p
            where p.id = patient_profile_id and p.owner_user_id = auth.uid())
  );

create policy "documentos por acceso" on public.documents
  for select using (public.has_patient_access(patient_profile_id));
create policy "subir documentos por acceso" on public.documents
  for insert with check (public.has_patient_access(patient_profile_id) and uploaded_by = auth.uid());
create policy "editar documentos por acceso" on public.documents
  for update using (public.has_patient_access(patient_profile_id));

create policy "timeline por acceso" on public.timeline_events
  for select using (public.has_patient_access(patient_profile_id));
create policy "crear eventos por acceso" on public.timeline_events
  for insert with check (public.has_patient_access(patient_profile_id) and created_by = auth.uid());
create policy "editar eventos por acceso" on public.timeline_events
  for update using (public.has_patient_access(patient_profile_id));

create policy "auditoria visible por acceso" on public.audit_logs
  for select using (patient_profile_id is not null and public.has_patient_access(patient_profile_id));
-- audit_logs solo se inserta desde el servidor con service_role (sin policy de insert para usuarios)

-- Storage: bucket privado de documentos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 26214400,
        array['application/pdf','image/jpeg','image/png','image/heic','image/webp']);

-- Convención de path: {patient_profile_id}/{document_id}/{filename}
create policy "leer archivos por acceso al perfil" on storage.objects
  for select using (
    bucket_id = 'documents'
    and public.has_patient_access(((storage.foldername(name))[1])::uuid)
  );
create policy "subir archivos por acceso al perfil" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and public.has_patient_access(((storage.foldername(name))[1])::uuid)
  );
create policy "borrar archivos por acceso al perfil" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and public.has_patient_access(((storage.foldername(name))[1])::uuid)
  );
```

- [ ] **Step 2: Aplicar a staging**

Run: `npx supabase db push`
Expected: "Applying migration 0001_base_schema.sql... Finished supabase db push."

- [ ] **Step 3: Verificar RLS en staging**

En el SQL Editor del dashboard de staging (o `npx supabase db remote query` si está disponible):

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

Expected: las 6 tablas con `rowsecurity = true`.

- [ ] **Step 4: Verificar que anon no ve nada**

Con la `anon key` de staging:

```powershell
curl -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" "https://<REF_STAGING>.supabase.co/rest/v1/patient_profiles?select=*"
```

Expected: `[]` (lista vacía, no error 401 ni datos).

- [ ] **Step 5: Aplicar a producción**

Run: `npx supabase link --project-ref <REF_PRODUCTION>` y luego `npx supabase db push`
Después volver a vincular staging: `npx supabase link --project-ref <REF_STAGING>` (staging queda como entorno de trabajo por defecto).

- [ ] **Step 6: Commit**

```powershell
git add supabase/migrations/
git commit -m "feat: esquema base con RLS y storage privado (migracion 0001)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Cliente Supabase y variables de entorno

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `.env.example`
- Modify: `.env.local` (no se commitea)

- [ ] **Step 1: Instalar dependencias**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: añadidas a package.json sin errores.

- [ ] **Step 2: Escribir .env.example**

```bash
# Supabase (proyecto del entorno correspondiente)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # SOLO servidor, nunca NEXT_PUBLIC

# OpenAI (Fase 2; presupuesto 10 EUR/mes)
OPENAI_API_KEY=sk-...

# Entorno: local | development | staging | production
APP_ENV=local
```

- [ ] **Step 3: Crear .env.local con los valores de staging** (no se commitea; verificar que `.gitignore` ya incluye `.env*`)

- [ ] **Step 4: Escribir src/lib/supabase/client.ts**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Escribir src/lib/supabase/server.ts**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // llamado desde un Server Component: el middleware refresca la sesión
          }
        },
      },
    }
  );
}
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: "Compiled successfully"

- [ ] **Step 7: Commit**

```powershell
git add src/lib/supabase/ .env.example package.json package-lock.json
git commit -m "feat: clientes Supabase (browser y server) y plantilla de variables

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: CI con GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Escribir el workflow**

```yaml
name: CI
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
```

- [ ] **Step 2: Commit y push, verificar que el workflow pasa**

```powershell
git add .github/
git commit -m "ci: lint y build en push y PR

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

Run: `gh run watch` (o `gh run list --limit 1`)
Expected: conclusión `success`.

---

### Task 9: Vercel — proyecto, entornos y despliegue

**Files:** ninguno (configuración Vercel)

- [ ] **Step 1 (USUARIO): Importar el repo en Vercel**

En https://vercel.com/new (cuenta jsantospro): importar `JotaEse68/oncotrack`, framework Next.js detectado automáticamente. **Antes de desplegar**, añadir variables de entorno:

| Variable | Production (main) | Preview (staging) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de oncotrack-production | URL de oncotrack-staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon de production | anon de staging |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role de production | service_role de staging |
| `APP_ENV` | `production` | `staging` |

- [ ] **Step 2: Verificar despliegue de producción**

Tras el import, Vercel despliega `main`.
Run: `curl -s -o NUL -w "%{http_code}" https://oncotrack-<sufijo>.vercel.app` (URL real del dashboard)
Expected: `200`.

- [ ] **Step 3: Verificar despliegue de preview (staging)**

```powershell
git checkout staging
git merge main
git push origin staging
```

Expected: Vercel crea un preview deployment de la rama staging; comprobar URL de preview con HTTP 200.

- [ ] **Step 4: Verificar que las claves NO están en el frontend**

Abrir la URL de producción → ver código fuente → buscar `service_role`.
Expected: cero resultados (solo la anon key puede aparecer, eso es correcto).

---

### Task 10: Cierre de Fase 0 — verificación de criterios

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Reescribir README.md**

Contenido: qué es OncoTrack (una frase de la sección 44 de la spec), aviso de que es una app personal privada no diagnóstica, stack, entornos (tabla main→producción, staging→preview), cómo arrancar en local (`npm install`, copiar `.env.example` a `.env.local`, `npm run dev`), y enlace a `docs/`.

- [ ] **Step 2: Checklist de criterios de cierre de Fase 0 (de la spec, sección 37)**

Verificar y anotar resultado de cada uno:
- [ ] Arquitectura aprobada → `docs/architecture.md` commiteado
- [ ] Modelo de datos aprobado → `docs/data-model.md` + migración 0001 aplicada en ambos entornos
- [ ] Seguridad base diseñada → RLS verificada (Task 6 Step 4), storage privado, claves solo en Vercel
- [ ] Flujos definidos → `docs/architecture.md` incluye flujo de despliegue y de documentos
- [ ] Proyecto desplegado vacío → URLs de producción y staging responden 200

- [ ] **Step 3: Commit final y merge a staging**

```powershell
git add README.md
git commit -m "docs: README con entornos y arranque local — cierre de Fase 0

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
git checkout staging
git merge main
git push origin staging
git checkout main
```

Expected: ambas ramas sincronizadas, CI verde, Fase 0 cerrada.
