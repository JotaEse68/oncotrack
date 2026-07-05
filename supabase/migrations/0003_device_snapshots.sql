-- Sync opcional entre dispositivos propios (§4.11).
-- Un snapshot por usuario, protegido por RLS: cada uno solo ve el suyo.

create table if not exists public.device_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.device_snapshots enable row level security;

drop policy if exists "device_snapshots_own" on public.device_snapshots;
create policy "device_snapshots_own"
  on public.device_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
