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
