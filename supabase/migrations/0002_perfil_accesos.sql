-- 0002_perfil_accesos.sql — alta automática de app_users y visibilidad de co-miembros

-- Al registrarse un usuario en auth.users, crea su fila en app_users.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users(id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Los usuarios que comparten acceso a un mismo paciente pueden ver el nombre
-- de los demás miembros (para la lista "Con acceso" del perfil).
drop policy if exists "ver co-miembros del expediente" on public.app_users;
create policy "ver co-miembros del expediente" on public.app_users
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.patient_access a1
      join public.patient_access a2
        on a1.patient_profile_id = a2.patient_profile_id
      where a1.user_id = auth.uid()
        and a2.user_id = app_users.id
        and a1.revoked_at is null
        and a2.revoked_at is null
    )
  );
