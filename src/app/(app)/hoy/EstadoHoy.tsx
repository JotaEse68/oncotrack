"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo } from "@/lib/db";
import { hoyISO } from "../_components/ui";

/**
 * ¿Cómo está siendo el día? de un toque (spec §6).
 * Un registro por día en db.sintomas (tipo "Estado general"): tocar otra
 * carita actualiza el mismo registro, nunca duplica. Sin colores por nivel
 * — se pregunta por el día, no se juzga a la persona.
 */

const NIVELES = [
  { emoji: "😌", escala: 0, etiqueta: "Muy tranquila" },
  { emoji: "🙂", escala: 2, etiqueta: "Llevadera" },
  { emoji: "😐", escala: 5, etiqueta: "Regular" },
  { emoji: "😣", escala: 7, etiqueta: "Difícil" },
  { emoji: "😞", escala: 9, etiqueta: "Muy dura" },
];

const TIPO_ESTADO = "Estado general";

export function EstadoHoy() {
  const registroHoy = useLiveQuery(async () => {
    const deHoy = await db.sintomas
      .where("fecha")
      .equals(hoyISO())
      .and((s) => s.tipo === TIPO_ESTADO)
      .toArray();
    return deHoy[0] ?? null;
  });

  if (registroHoy === undefined) return null;

  async function elegir(escala: number) {
    if (registroHoy) {
      await db.sintomas.update(registroHoy.id!, { escala });
    } else {
      await db.sintomas.add({
        fecha: hoyISO(),
        tipo: TIPO_ESTADO,
        escala,
      });
      await contarRegistroNuevo();
    }
  }

  return (
    <section>
      <p className="px-1 text-xs text-muted">¿Cómo está siendo el día?</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {NIVELES.map((n) => (
          <button
            key={n.escala}
            onClick={() => elegir(n.escala)}
            aria-label={n.etiqueta}
            aria-pressed={registroHoy?.escala === n.escala}
            className={`flex min-h-12 items-center justify-center rounded-2xl border bg-surface/60 text-2xl transition ${
              registroHoy?.escala === n.escala
                ? "border-morado"
                : "border-line hover:border-morado/50"
            }`}
          >
            {n.emoji}
          </button>
        ))}
      </div>
    </section>
  );
}
