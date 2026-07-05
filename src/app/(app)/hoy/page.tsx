"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function HoyPage() {
  const perfil = useLiveQuery(() => db.perfil.get(1));
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
          {perfil?.nombre ? `Hola, ${perfil.nombre}` : "Tu espacio"}
        </h1>
      </header>

      {!perfil?.nombre && (
        <Link
          href="/perfil"
          className="flex items-center justify-between rounded-2xl border border-line bg-surface/40 p-5 transition hover:border-jade/50"
        >
          <span>
            <span className="block text-xs text-muted">Para empezar</span>
            <span className="mt-0.5 block text-sm text-fg">
              Cuéntanos tu nombre
            </span>
          </span>
          <span aria-hidden className="text-jade">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
