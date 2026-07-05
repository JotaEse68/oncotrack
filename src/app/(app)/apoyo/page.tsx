import Link from "next/link";
import { BloqueAyudaReal } from "./_components/BloqueAyudaReal";

const SECCIONES = [
  {
    href: "/apoyo/ayuda",
    titulo: "Guía y glosario",
    detalle: "Qué significan los marcadores, en palabras normales",
  },
  {
    href: "/apoyo/radar",
    titulo: "Radar de investigación",
    detalle: "Ensayos y avances sobre tu perfil, cuando tú quieras",
  },
  {
    href: "/apoyo/asistente",
    titulo: "Espacio de acompañamiento",
    detalle: "Para pensar en voz alta — no sustituye a nadie real",
  },
  {
    href: "/apoyo/sesiones",
    titulo: "Mis sesiones",
    detalle: "Diario de terapia o psico-oncología, aparte del chat",
  },
];

export default function ApoyoPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Apoyo
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          No estás sola, no estás solo
        </h1>
      </header>

      <div className="space-y-3">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-surface/40 p-5 transition hover:border-jade/50"
          >
            <span>
              <span className="block text-sm font-medium text-fg">
                {s.titulo}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {s.detalle}
              </span>
            </span>
            <span aria-hidden className="text-jade">
              →
            </span>
          </Link>
        ))}
      </div>

      {/* Siempre visible al pie del hub — nunca en un submenú (§4.9) */}
      <BloqueAyudaReal />
    </div>
  );
}
