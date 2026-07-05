import { createClient } from "@/lib/supabase/server";

export default async function HoyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-md">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
        Hoy
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
        Expediente en preparación
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Has entrado como <span className="text-fg">{user?.email}</span>. El perfil
        clínico, los tratamientos y la línea de tiempo llegan en los próximos
        pasos de la Fase 1.
      </p>

      <div className="mt-6 rounded-xl border border-line bg-surface/60 p-4">
        <p className="text-xs text-muted">Siguiente</p>
        <p className="mt-1 text-sm text-fg">
          Crear el perfil clínico del paciente.
        </p>
      </div>
    </div>
  );
}
