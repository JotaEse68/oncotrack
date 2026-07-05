import Link from "next/link";
import { GLOSARIO } from "@/lib/contenido/glosario";
import { BloqueAyudaReal } from "../_components/BloqueAyudaReal";

export default function AyudaPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Apoyo · Guía
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Entender, sin agobios
        </h1>
      </header>

      <div className="rounded-2xl border border-line bg-surface/60 p-4">
        <p className="text-xs leading-5 text-muted">
          Esta información es general, no sustituye a tu equipo médico —
          coméntalo siempre con ellos.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Glosario en palabras normales
        </h2>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
          {GLOSARIO.map((t) => (
            <details key={t.termino} className="group">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between px-5 py-3.5 text-sm text-fg transition hover:bg-surface">
                {t.termino}
                <span
                  aria-hidden
                  className="text-jade transition group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-6 text-muted">
                {t.queEs}
              </p>
            </details>
          ))}
        </div>
        <p className="mt-3 px-1 text-xs leading-5 text-muted">
          En tus marcadores, cada valor nuevo se compara solo con tu propio
          histórico — nunca con rangos genéricos, porque cada persona y cada
          caso son distintos.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface/60 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Tu privacidad, en corto
        </h2>
        <p className="mt-2 text-sm leading-6 text-fg">
          Tus datos viven solo en este dispositivo. Nosotros no los vemos, no
          los guardamos, no los compartimos.
        </p>
      </section>

      <BloqueAyudaReal />

      <Link
        href="/onboarding?repaso=1"
        className="block py-1 text-center text-xs text-muted underline-offset-2 hover:underline"
      >
        Ver la bienvenida de nuevo
      </Link>
    </div>
  );
}
