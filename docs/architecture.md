# Arquitectura

## Entornos

| Entorno | Rama | Vercel | Supabase |
|---|---|---|---|
| local | — | `npm run dev` | oncotrack-staging (vía `.env.local`) |
| staging | `staging` | Preview deployment | oncotrack-staging |
| production | `main` | Production deployment | oncotrack-production |

Los dos proyectos Supabase son independientes (datos, claves, storage) y están en **Frankfurt (eu-central-1)**.

## Flujo de despliegue

1. El trabajo se hace en ramas a partir de `staging`.
2. Push a `staging` → Vercel crea un preview conectado a Supabase staging → se prueba ahí.
3. PR de `staging` a `main` (main está protegida: no hay push directo).
4. Merge a `main` → despliegue automático a producción contra Supabase production.
5. Las migraciones de BD se aplican con `npx supabase db push` primero a staging, y a producción solo cuando están verificadas.

## Dónde viven las claves

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: públicas por diseño (la seguridad real es RLS).
- `SUPABASE_SERVICE_ROLE_KEY` y `OPENAI_API_KEY`: **solo** en variables de entorno de Vercel y `.env.local`; nunca con prefijo `NEXT_PUBLIC`, nunca en el cliente, nunca commiteadas.

## Flujo de procesamiento de documentos (se implementa en Fase 2)

1. La app sube el archivo al bucket privado `documents` (path `{patient_profile_id}/{document_id}/{filename}`).
2. Se crea la fila en `documents` con estado `subido` y hash SHA-256.
3. Una API route serverless procesa el documento: lo envía a OpenAI (multimodal) y recibe extracción estructurada JSON con confianza por campo.
4. El resultado queda en estado `revision_necesaria`: **nada entra al expediente sin confirmación humana** (paciente o cuidador).
5. Al confirmar, los datos pasan al expediente, se actualizan comparaciones y línea de tiempo, y se registra en `audit_logs` quién confirmó.

## Principios no negociables (de la spec)

- El documento original es la fuente de verdad: todo dato conserva documento, página y fragmento.
- La IA no diagnostica, no recomienda tratamiento, no inventa: ante falta de datos responde "No consta en los documentos almacenados".
- RLS activa en todas las tablas desde la primera migración.
- Móvil primero; PWA.
