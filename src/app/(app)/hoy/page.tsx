import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HoyPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("patient_profiles")
    .select("full_name")
    .limit(1);
  const patient = profiles?.[0]?.full_name;

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Hoy · <span className="text-muted">{hoy}</span>
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {patient ? `Expediente de ${patient}` : "Expediente"}
        </h1>
      </header>

      <div className="rounded-2xl border border-line bg-surface/60 p-5">
        <p className="text-sm leading-6 text-muted">
          El expediente está listo. Los siguientes pasos de la Fase 1 irán
          sumando diagnóstico, tratamientos, medicación, citas y la línea de
          tiempo.
        </p>
      </div>

      <Link
        href="/perfil"
        className="flex items-center justify-between rounded-2xl border border-line bg-surface/40 p-5 transition hover:border-jade/50"
      >
        <span>
          <span className="block text-xs text-muted">Siguiente</span>
          <span className="mt-0.5 block text-sm text-fg">
            Completar el perfil clínico
          </span>
        </span>
        <span aria-hidden className="text-jade">
          →
        </span>
      </Link>
    </div>
  );
}
