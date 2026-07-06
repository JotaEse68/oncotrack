"use client";

import { useState } from "react";
import Link from "next/link";
import { CARD_CLS, INPUT_CLS } from "../_components/ui";

const ATAJOS = [
  { etiqueta: "Apuntar como síntoma", href: "/salud/sintomas" },
  { etiqueta: "Apuntar como analítica", href: "/salud/marcadores" },
  { etiqueta: "Apuntar como toma", href: "/salud/medicacion" },
  { etiqueta: "Apuntar como cita", href: "/citas" },
];

/**
 * Contar lo del día con tus palabras (spec §2 🎤).
 * Versión base: texto libre + atajos a los formularios.
 */
export default function CapturarPage() {
  const [texto, setTexto] = useState("");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Hoy · Contar
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Cuéntalo con tus palabras
        </h1>
      </header>

      <div className={`${CARD_CLS} space-y-3`}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          rows={5}
          placeholder="Ej.: hoy flushing fuerte, un 7, y me puse la lanreotida"
          aria-label="Cuenta cómo fue tu día"
          className={`${INPUT_CLS} resize-y text-base leading-6`}
        />
        <p className="text-xs leading-5 text-muted">
          También puedes dictar con el micrófono de tu teclado.
        </p>
      </div>

      <section className="space-y-2">
        <p className="px-1 text-xs text-muted">
          ¿Prefieres el formulario de siempre?
        </p>
        {ATAJOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-surface/60 px-4 py-3 text-sm text-fg transition hover:border-morado/50"
          >
            {a.etiqueta}
            <span aria-hidden className="text-morado">
              →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
