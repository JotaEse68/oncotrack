"use client";

import { useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, type SesionApoyo } from "@/lib/db";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  CARD_CLS,
  hoyISO,
  fechaLegible,
} from "../../_components/ui";
import { EmptyState } from "../../_components/EmptyState";

const TIPOS: Array<{ valor: SesionApoyo["tipo"]; etiqueta: string }> = [
  { valor: "terapia", etiqueta: "Terapia" },
  { valor: "psico-oncologia", etiqueta: "Psico-oncología" },
  { valor: "otra", etiqueta: "Otra" },
];

const ETIQUETA_TIPO: Record<SesionApoyo["tipo"], string> = {
  terapia: "Terapia",
  "psico-oncologia": "Psico-oncología",
  otra: "Otra",
};

/**
 * Diario simple de sesiones (§4.13) — separado a propósito del espacio de
 * acompañamiento: una cosa es tu proceso terapéutico real y otra el chat.
 */
export default function SesionesPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const sesiones = useLiveQuery(() =>
    db.sesionesApoyo.orderBy("fecha").reverse().toArray()
  );

  async function agregar(formData: FormData) {
    await db.sesionesApoyo.add({
      fecha: String(formData.get("fecha")),
      tipo: String(formData.get("tipo")) as SesionApoyo["tipo"],
      notas: String(formData.get("notas") ?? "").trim() || undefined,
      proximaSesion: String(formData.get("proximaSesion") ?? "") || undefined,
    });
    await contarRegistroNuevo();
    formRef.current?.reset();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Apoyo · Mis sesiones
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tu proceso, con los tuyos
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Un registro sencillo de tus sesiones de terapia o psico-oncología.
        </p>
      </header>

      <form ref={formRef} action={agregar} className={`${CARD_CLS} space-y-4`}>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Fecha
            </span>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={hoyISO()}
              className={INPUT_CLS}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Tipo
            </span>
            <select name="tipo" className={INPUT_CLS}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Notas breves (opcional)
          </span>
          <textarea
            name="notas"
            rows={2}
            placeholder="Lo que quieras recordar de la sesión"
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Próxima sesión (opcional)
          </span>
          <input name="proximaSesion" type="date" className={INPUT_CLS} />
        </label>
        <button type="submit" className={BTN_PRIMARIO}>
          Guardar sesión
        </button>
      </form>

      {sesiones && sesiones.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
          {sesiones.map((s) => (
            <li key={s.id} className="px-5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg">{ETIQUETA_TIPO[s.tipo]}</span>
                <span className="tabular text-xs text-muted">
                  {fechaLegible(s.fecha)}
                </span>
              </div>
              {s.notas && (
                <p className="mt-1 text-xs leading-5 text-muted">{s.notas}</p>
              )}
              {s.proximaSesion && (
                <p className="tabular mt-1 text-xs text-jade">
                  Próxima: {fechaLegible(s.proximaSesion)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {sesiones && sesiones.length === 0 && (
        <EmptyState mensaje="Si vas a terapia o psico-oncología, aquí puedes llevar un registro sencillo de tus sesiones." />
      )}
    </div>
  );
}
