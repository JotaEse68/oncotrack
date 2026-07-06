"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

/**
 * Guía viva de arranque (§1 del spec "con alma").
 * Tres pasos con check automático al detectar datos reales;
 * desaparece sola cuando los tres están completos.
 */
export function GuiaInicio() {
  // Una sola query con objeto siempre definido: así "cargando" (undefined)
  // se distingue de "instalación nueva sin datos" (§ fix pantalla en blanco).
  const estado = useLiveQuery(async () => ({
    perfil: (await db.perfil.get(1)) ?? null,
    nMarcadores: await db.marcadores.count(),
    nCitas: await db.citas.count(),
  }));

  if (!estado) return null;
  const { perfil, nMarcadores, nCitas } = estado;

  const pasos = [
    {
      hecho: Boolean(perfil?.nombre),
      titulo: "Cuéntanos quién eres",
      subtitulo: "tu nombre basta para empezar",
      href: "/perfil",
    },
    {
      hecho: nMarcadores > 0,
      titulo: "Apunta tu primera analítica",
      subtitulo: "verás tu evolución",
      href: "/salud/marcadores",
    },
    {
      hecho: nCitas > 0,
      titulo: "Tu próxima cita",
      subtitulo: "cuenta atrás y tus dudas listas",
      href: "/citas",
    },
  ];

  if (pasos.every((p) => p.hecho)) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface/60 p-5">
      <p className="text-sm leading-6 text-fg">
        Esto es OncoTrack — tu evolución, en tu móvil, solo tuya.
      </p>
      <ul className="mt-4 space-y-1">
        {pasos.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface2"
            >
              <span
                aria-hidden
                className={p.hecho ? "text-morado" : "text-muted"}
              >
                {p.hecho ? "✓" : "○"}
              </span>
              <span className="flex-1">
                <span
                  className={`block text-sm ${p.hecho ? "text-muted line-through" : "text-fg"}`}
                >
                  {p.titulo}
                </span>
                {!p.hecho && (
                  <span className="block text-xs text-muted">
                    {p.subtitulo}
                  </span>
                )}
              </span>
              {!p.hecho && (
                <span aria-hidden className="text-morado">
                  →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
