# Modelo de datos

## Esquema actual (migración 0001 — Fase 0)

Principio central: **`patient_access` es la única fuente de autorización.** Toda policy RLS de datos clínicos pasa por `has_patient_access(patient_profile_id)`.

### app_users
Una fila por usuario autenticado (extiende `auth.users`).
- `id` uuid PK → `auth.users(id)`
- `display_name` text
- `created_at`

### patient_profiles
El expediente de una paciente. `owner_user_id` es la paciente (dueña de sus datos).
- `id` uuid PK
- `owner_user_id` → app_users
- `full_name`, `birth_date`, `language` ('es'), `timezone` ('Europe/Madrid')
- `created_at`, `updated_at`

### patient_access
Quién puede acceder a qué expediente. Roles: `owner` | `caregiver`. Revocación con `revoked_at` (no se borra: trazabilidad).
- `patient_profile_id` + `user_id` únicos
- `access_role`, `granted_by`, `granted_at`, `revoked_at`

### documents
Metadatos de cada documento; el archivo vive en el bucket privado `documents`.
- `patient_profile_id`, `title`, `doc_type`, `doc_date`
- `storage_path` (`{patient_profile_id}/{document_id}/{filename}`), `mime_type`, `size_bytes`, `sha256`
- `status`: subido → en_cola → procesando → ocr_completado → extraccion_completada → revision_necesaria → confirmado | error | archivado | eliminado
- `uploaded_by`

### timeline_events
Eje central del expediente (sección 15 de la spec).
- `patient_profile_id`, `event_type`, `title`, `summary`, `event_date`, `event_time`
- `document_id` (nullable), `created_by`, `confirmed_by`

### audit_logs
Solo inserta el servidor (service_role). Lectura por acceso al perfil.
- `user_id`, `patient_profile_id`, `action`, `entity`, `entity_id`, `detail` jsonb

## Entidades futuras (sección 28 de la spec — fases posteriores)

Fase 1: diagnoses, care_teams, healthcare_centers, treatments, treatment_cycles, medications, appointments, clinical_notes.
Fase 2: document_pages, document_extractions, extraction_fields, laboratory_reports, laboratory_observations, ai_runs.
Fase 3: imaging_reports, imaging_findings, lesions, pathology_reports.
Fase 4: questions, consultation_summaries.
Fase 5: symptoms, symptom_entries, reminders, notifications, user_preferences.
Fase 6: research_profiles, research_items, clinical_trials, alerts.
Fase 8: shared_links, exports.

Regla: cada fase añade sus tablas con su propia migración numerada, siempre con RLS desde el primer momento.
