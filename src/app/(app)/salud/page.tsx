"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const SECCIONES = [
  {
    href: "/salud/marcadores",
    titulo: "Marcadores",
    detalle: "Tus analíticas y su evolución",
  },
  {
    href: "/salud/sintomas",
    titulo: "Síntomas",
    detalle: "Cómo te vas encontrando",
  },
  {
    href: "/salud/medicacion",
    titulo: "Medicación",
    detalle: "Tomas, dosis y próximas fechas",
  },
  {
    href: "/salud/documentos",
    titulo: "Documentos",
    detalle: "Informes y analíticas, en fotos",
  },
] as const;

export default function SaludPage() {
  const contadores = useLiveQuery(async () => ({
    "/salud/marcadores": await db.marcadores.count(),
    "/salud/sintomas": await db.sintomas.count(),
    "/salud/medicacion": await db.medicacion.count(),
    "/salud/documentos": await db.documentos.count(),
  }));

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Salud
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tu registro
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
            <span className="tabular text-sm text-jade">
              {contadores?.[s.href] ?? ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
