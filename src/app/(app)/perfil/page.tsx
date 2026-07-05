import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  owner: "Titular",
  caregiver: "Cuidador/a",
};

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("patient_profiles")
    .select("id, full_name, birth_date, language, timezone")
    .limit(1);
  const profile = profiles?.[0];

  const { data: accesses } = await supabase
    .from("patient_access")
    .select("user_id, access_role, app_users!patient_access_user_id_fkey(display_name)")
    .is("revoked_at", null);

  const myRole = accesses?.find((a) => a.user_id === user?.id)?.access_role;
  const canEdit = myRole === "owner";

  if (!profile) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-semibold text-fg">Perfil</h1>
        <p className="mt-3 text-sm text-muted">
          No hay ningún expediente al que tengas acceso todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Perfil clínico
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {profile.full_name}
        </h1>
      </header>

      {canEdit ? (
        <form
          action={updateProfile}
          className="space-y-4 rounded-2xl border border-line bg-surface/60 p-5"
        >
          <input type="hidden" name="id" value={profile.id} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Nombre completo
            </span>
            <input
              name="full_name"
              defaultValue={profile.full_name}
              required
              className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg outline-none transition focus:border-jade/70 focus:ring-2 focus:ring-jade/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Fecha de nacimiento
            </span>
            <input
              name="birth_date"
              type="date"
              defaultValue={profile.birth_date ?? ""}
              className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg outline-none transition focus:border-jade/70 focus:ring-2 focus:ring-jade/20"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-jade px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-jade/90"
          >
            Guardar cambios
          </button>
        </form>
      ) : (
        <dl className="space-y-3 rounded-2xl border border-line bg-surface/60 p-5">
          <div className="flex justify-between">
            <dt className="text-xs text-muted">Nombre</dt>
            <dd className="text-sm text-fg">{profile.full_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-muted">Nacimiento</dt>
            <dd className="tabular text-sm text-fg">
              {profile.birth_date ?? "—"}
            </dd>
          </div>
          <p className="pt-1 text-xs text-muted/80">
            Solo el titular del expediente puede editar estos datos.
          </p>
        </dl>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Con acceso
        </h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
          {accesses?.map((a) => {
            const appUser = a.app_users as { display_name?: string } | null;
            return (
              <li
                key={a.user_id}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-sm text-fg">
                  {appUser?.display_name ?? "—"}
                </span>
                <span className="text-xs text-jade">
                  {ROLE_LABEL[a.access_role] ?? a.access_role}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
