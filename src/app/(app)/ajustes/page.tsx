"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cambiarTema } from "@/lib/tema";
import { CARD_CLS } from "../_components/ui";
import { SeccionPin } from "./_components/SeccionPin";
import { SeccionBackup } from "./_components/SeccionBackup";

export default function AjustesPage() {
  const ajustes = useLiveQuery(() => db.ajustes.get(1));
  const tema = ajustes?.tema ?? "claro";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Ajustes
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tu app, a tu manera
        </h1>
      </header>

      <section className={CARD_CLS}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Apariencia
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(
            [
              ["claro", "Claro"],
              ["oscuro", "Oscuro"],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              onClick={() => cambiarTema(valor)}
              aria-pressed={tema === valor}
              className={`min-h-11 rounded-lg border px-4 py-2.5 text-sm transition ${
                tema === valor
                  ? "border-jade bg-jade/10 font-semibold text-jade"
                  : "border-line text-muted hover:border-jade/50 hover:text-fg"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </section>

      <SeccionPin />

      <SeccionBackup />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface/40">
        <Link
          href="/perfil"
          className="flex min-h-11 items-center justify-between px-5 py-4 transition hover:bg-surface"
        >
          <span>
            <span className="block text-sm text-fg">Tus datos</span>
            <span className="mt-0.5 block text-xs text-muted">
              Nombre, nacimiento, diagnóstico
            </span>
          </span>
          <span aria-hidden className="text-jade">
            →
          </span>
        </Link>
        <Link
          href="/ajustes/ia"
          className="flex min-h-11 items-center justify-between border-t border-line px-5 py-4 transition hover:bg-surface"
        >
          <span>
            <span className="block text-sm text-fg">Tu propia IA</span>
            <span className="mt-0.5 block text-xs text-muted">
              Para leer analíticas con la cámara (opcional)
            </span>
          </span>
          <span aria-hidden className="text-jade">
            →
          </span>
        </Link>
      </section>

      <p className="px-1 text-xs leading-5 text-muted">
        Tus datos viven solo en este dispositivo. Nosotros no los vemos, no los
        guardamos, no los compartimos.
      </p>
    </div>
  );
}
