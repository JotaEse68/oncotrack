"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo } from "@/lib/db";
import { colapsarDuplicado } from "@/lib/texto";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  CARD_CLS,
  hoyISO,
  fechaLegible,
} from "../../_components/ui";
import { EmptyState } from "../../_components/EmptyState";

const SINTOMAS_HABITUALES = [
  "Diarrea",
  "Flushing",
  "Dolor abdominal",
  "Fatiga",
];

export default function SintomasPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [escala, setEscala] = useState(5);
  const [tipo, setTipo] = useState("");
  const sintomas = useLiveQuery(() =>
    db.sintomas.orderBy("fecha").reverse().toArray()
  );

  async function agregar(formData: FormData) {
    await db.sintomas.add({
      fecha: String(formData.get("fecha") ?? hoyISO()),
      tipo: colapsarDuplicado(tipo),
      escala: Number(formData.get("escala")),
      nota: String(formData.get("nota") ?? "").trim() || undefined,
    });
    await contarRegistroNuevo();
    formRef.current?.reset();
    setEscala(5);
    setTipo("");
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Salud · Síntomas
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Cómo te encuentras
        </h1>
      </header>

      <form ref={formRef} action={agregar} className={`${CARD_CLS} space-y-4`}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Síntoma
          </span>
          <input
            name="tipo"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Ej.: Fatiga"
            autoComplete="off"
            className={INPUT_CLS}
          />
          {/* Chips en vez de datalist (mismo bug móvil que en marcadores) */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SINTOMAS_HABITUALES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTipo(n)}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-xs transition ${
                  tipo === n
                    ? "border-morado bg-morado/10 text-morado"
                    : "border-line text-muted hover:border-morado/50 hover:text-fg"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-muted">
            <span>Intensidad (0 = nada · 10 = lo peor)</span>
            <span className="tabular text-xl font-semibold text-morado">
              {escala}
            </span>
          </span>
          <input
            name="escala"
            type="range"
            min={0}
            max={10}
            value={escala}
            onChange={(e) => setEscala(Number(e.target.value))}
            className="h-11 w-full accent-morado"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Fecha
          </span>
          <input
            name="fecha"
            type="date"
            defaultValue={hoyISO()}
            required
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Nota (opcional)
          </span>
          <textarea name="nota" rows={2} className={INPUT_CLS} />
        </label>
        <button type="submit" className={BTN_PRIMARIO}>
          Registrar
        </button>
      </form>

      {sintomas && sintomas.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
          {sintomas.map((s) => (
            <li key={s.id} className="px-5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg">{s.tipo}</span>
                <span className="tabular text-sm text-fg">
                  {s.escala}
                  <span className="text-muted">/10</span>
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-xs text-muted">
                  {fechaLegible(s.fecha)}
                </span>
                {s.nota && (
                  <span className="max-w-[60%] truncate text-xs text-muted">
                    {s.nota}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {sintomas && sintomas.length === 0 && (
        <EmptyState mensaje="Cuando registres cómo te encuentras, aquí verás tu evolución." />
      )}
    </div>
  );
}
