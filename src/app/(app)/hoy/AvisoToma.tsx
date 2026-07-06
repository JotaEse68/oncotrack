"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, type Medicacion } from "@/lib/db";
import { diasHasta } from "@/lib/fechas";
import { hoyISO, fechaLegible, CARD_CLS } from "../_components/ui";

/**
 * Aviso de próxima toma (spec §7): si una medicación tenía apuntada una
 * próxima fecha que ya llegó (o pasó), se ofrece registrarla de un toque.
 * No se adivinan pautas: al registrar, proximaFecha se limpia.
 */
export function AvisoToma() {
  const pendientes = useLiveQuery(async () => {
    const meds = await db.medicacion.toArray();
    return meds.filter(
      (m) => m.proximaFecha && diasHasta(m.proximaFecha) <= 0
    );
  });

  if (!pendientes || pendientes.length === 0) return null;

  async function registrar(m: Medicacion) {
    await db.medicacion.update(m.id!, {
      ultimaToma: hoyISO(),
      proximaFecha: undefined,
      historial: [...m.historial, { fecha: hoyISO() }],
    });
    await contarRegistroNuevo();
  }

  return (
    <section className="space-y-3">
      {pendientes.map((m) => {
        const dias = diasHasta(m.proximaFecha!);
        return (
          <div key={m.id} className={CARD_CLS}>
            <p className="text-sm leading-6 text-fg">
              {dias === 0
                ? `Hoy toca ${m.nombre}`
                : `Tenías apuntada ${m.nombre} para el ${fechaLegible(m.proximaFecha)}`}
              {m.dosis && <span className="text-muted"> · {m.dosis}</span>}
            </p>
            <button
              onClick={() => registrar(m)}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-morado/60 px-4 py-2.5 text-sm font-medium text-morado transition hover:bg-morado/10"
            >
              Registrar toma
            </button>
          </div>
        );
      })}
    </section>
  );
}
