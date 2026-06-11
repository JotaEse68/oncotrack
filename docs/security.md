# Seguridad

## Principios

1. **RLS siempre activa.** Toda tabla nueva se crea con `enable row level security` en la misma migración. Sin excepciones.
2. **Storage privado.** El bucket `documents` no es público; el acceso pasa por policies basadas en `has_patient_access` y URLs firmadas con caducidad. Nada indexable, ningún enlace público permanente.
3. **Claves solo en servidor.** `service_role` y `OPENAI_API_KEY` solo existen en variables de entorno de Vercel y `.env.local`. Prohibido el prefijo `NEXT_PUBLIC` para secretos.
4. **Auditoría.** Acciones sensibles (subida, apertura, modificación, compartición, exportación, eliminación, ejecución de IA, cambio de permisos) se registran en `audit_logs` desde el servidor.
5. **Mínimo privilegio.** El cuidador accede solo si la paciente lo autoriza (`patient_access`); la revocación es inmediata (`revoked_at`) y conserva el historial.

## Modelo de acceso

`patient_access` es la única fuente de autorización. La función `has_patient_access(profile_id)` (security definer) comprueba acceso vigente (no revocado) del `auth.uid()` actual. Todas las policies de datos clínicos y de storage la usan. Los enlaces temporales para profesionales (Fase 8) tendrán su propia tabla `shared_links` con caducidad de 30 días por defecto, código opcional y registro de accesos.

## Retención y borrado

- Retención **indefinida hasta borrado manual** por la paciente (es su expediente personal).
- El borrado de un documento elimina el archivo del storage y marca la fila como `eliminado` (la auditoría se conserva).
- Exportación completa (ZIP con datos + documentos + metadatos) disponible para la paciente — Fase 8.

## Backups

- **Supabase:** backups automáticos del proyecto (en plan Free son limitados — verificar cobertura; en plan Pro, diarios con 7 días de retención). Pendiente decidir si producción pasa a Pro antes de contener datos reales.
- **Propio:** dump periódico del esquema y datos con `npx supabase db dump` guardado fuera de Supabase, más la exportación ZIP de la app cuando exista (Fase 8).

## Cumplimiento (RGPD)

- Datos sanitarios alojados en la UE (Frankfurt).
- Consentimiento explícito de la paciente y autorización expresa del cuidador (flujos de Fase 1).
- Sin analítica comercial, sin trackers, sin envío de datos sanitarios a terceros fuera de Supabase/OpenAI/Vercel.
- Hacia OpenAI se envía el mínimo necesario por documento; logs de IA sin datos clínicos innecesarios.
