"use client";

import { useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, type Marcador } from "@/lib/db";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  CARD_CLS,
  hoyISO,
  fechaLegible,
} from "../../_components/ui";
import { EmptyState } from "../../_components/EmptyState";

const MARCADORES_HABITUALES = [
  "Cromogranina A",
  "NSE",
  "Serotonina en orina 24h",
  "5-HIAA",
];

/**
 * Compara un valor con el registro anterior del MISMO marcador.
 * Solo frente al propio histórico — nunca rangos genéricos ni semáforos (§4.9).
 */
function comparacion(m: Marcador, todos: Marcador[]): string | null {
  const anteriores = todos
    .filter((x) => x.nombre === m.nombre && x.fecha < m.fecha)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const previo = anteriores[0];
  if (!previo || previo.valor === 0) return null;
  const dif = ((m.valor - previo.valor) / previo.valor) * 100;
  const pct = Math.abs(Math.round(dif));
  if (pct === 0) return "igual que tu última analítica";
  return dif < 0
    ? `un ${pct}% menos que tu última analítica`
    : `un ${pct}% más que tu última analítica`;
}

export default function MarcadoresPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const marcadores = useLiveQuery(() =>
    db.marcadores.orderBy("fecha").reverse().toArray()
  );

  async function agregar(formData: FormData) {
    await db.marcadores.add({
      nombre: String(formData.get("nombre") ?? "").trim(),
      fecha: String(formData.get("fecha") ?? hoyISO()),
      valor: Number(formData.get("valor")),
      unidad: String(formData.get("unidad") ?? "").trim(),
    });
    await contarRegistroNuevo();
    formRef.current?.reset();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Salud · Marcadores
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tus analíticas
        </h1>
      </header>

      <form ref={formRef} action={agregar} className={`${CARD_CLS} space-y-4`}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Marcador
          </span>
          <input
            name="nombre"
            required
            list="marcadores-habituales"
            placeholder="Ej.: Cromogranina A"
            className={INPUT_CLS}
          />
          <datalist id="marcadores-habituales">
            {MARCADORES_HABITUALES.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Valor
            </span>
            <input
              name="valor"
              type="number"
              step="any"
              inputMode="decimal"
              required
              className={INPUT_CLS}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Unidad
            </span>
            <input
              name="unidad"
              required
              placeholder="ng/mL"
              className={INPUT_CLS}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Fecha de la analítica
          </span>
          <input
            name="fecha"
            type="date"
            defaultValue={hoyISO()}
            required
            className={INPUT_CLS}
          />
        </label>
        <button type="submit" className={BTN_PRIMARIO}>
          Añadir valor
        </button>
      </form>

      {marcadores && marcadores.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
          {marcadores.map((m) => (
            <li key={m.id} className="px-5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg">{m.nombre}</span>
                <span className="tabular text-sm text-fg">
                  {m.valor} <span className="text-muted">{m.unidad}</span>
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-xs text-muted">
                  {fechaLegible(m.fecha)}
                </span>
                <span className="text-xs text-muted">
                  {comparacion(m, marcadores) ?? ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {marcadores && marcadores.length === 0 && (
        <EmptyState mensaje="Aún no hay nada aquí — cuando subas tu primera analítica, esto se irá llenando." />
      )}
    </div>
  );
}
