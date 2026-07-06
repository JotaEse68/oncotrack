"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo } from "@/lib/db";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CARD_CLS,
  hoyISO,
  fechaLegible,
} from "../../_components/ui";
import { EmptyState } from "../../_components/EmptyState";
import { useGuardado } from "../../_components/useGuardado";

export default function MedicacionPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [guardado, confirmarGuardado] = useGuardado();
  // Feedback por tarjeta: id de la medicación cuya toma se acaba de apuntar
  const [tomaConfirmada, setTomaConfirmada] = useState<number | null>(null);
  const timerToma = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerToma.current) clearTimeout(timerToma.current);
    },
    []
  );
  const medicaciones = useLiveQuery(() => db.medicacion.toArray());

  async function agregar(formData: FormData) {
    await db.medicacion.add({
      nombre: String(formData.get("nombre") ?? "").trim(),
      dosis: String(formData.get("dosis") ?? "").trim() || undefined,
      ultimaToma: String(formData.get("ultimaToma") ?? "") || undefined,
      proximaFecha: String(formData.get("proximaFecha") ?? "") || undefined,
      historial: [],
    });
    await contarRegistroNuevo();
    formRef.current?.reset();
    confirmarGuardado();
  }

  async function registrarToma(id: number) {
    const med = await db.medicacion.get(id);
    if (!med) return;
    const fecha = hoyISO();
    await db.medicacion.update(id, {
      ultimaToma: fecha,
      historial: [...med.historial, { fecha }],
    });
    await contarRegistroNuevo();
    setTomaConfirmada(id);
    if (timerToma.current) clearTimeout(timerToma.current);
    timerToma.current = setTimeout(() => setTomaConfirmada(null), 2000);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Salud · Medicación
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tu medicación
        </h1>
      </header>

      <form ref={formRef} action={agregar} className={`${CARD_CLS} space-y-4`}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Nombre
          </span>
          <input
            name="nombre"
            required
            placeholder="Ej.: Lanreótida (Somatuline)"
            className={INPUT_CLS}
          />
        </label>
        {/* Opcionales plegados (spec §3): el nombre basta para empezar */}
        <details>
          <summary className="cursor-pointer py-1 text-xs text-muted">
            ▸ detalles (dosis y fechas)
          </summary>
          <div className="mt-2 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Dosis (opcional)
              </span>
              <input
                name="dosis"
                placeholder="Ej.: 120 mg"
                className={INPUT_CLS}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Última toma
                </span>
                <input name="ultimaToma" type="date" className={INPUT_CLS} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Próxima (estimada)
                </span>
                <input name="proximaFecha" type="date" className={INPUT_CLS} />
              </label>
            </div>
          </div>
        </details>
        <button type="submit" className={BTN_PRIMARIO} aria-live="polite">
          {guardado ? "Guardado ✓" : "Añadir medicación"}
        </button>
      </form>

      {medicaciones && medicaciones.length > 0 && (
        <ul className="space-y-3">
          {medicaciones.map((m) => (
            <li key={m.id} className={CARD_CLS}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-fg">{m.nombre}</span>
                {m.dosis && (
                  <span className="text-xs text-muted">{m.dosis}</span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                <span>
                  Última toma:{" "}
                  <span className="tabular text-fg">
                    {fechaLegible(m.ultimaToma)}
                  </span>
                </span>
                <span>
                  Próxima:{" "}
                  <span className="tabular text-fg">
                    {fechaLegible(m.proximaFecha)}
                  </span>
                </span>
              </div>
              <button
                onClick={() => registrarToma(m.id!)}
                className={`${BTN_SECUNDARIO} mt-3 w-full ${
                  tomaConfirmada === m.id ? "border-morado text-morado" : ""
                }`}
                aria-live="polite"
              >
                {tomaConfirmada === m.id
                  ? "Toma registrada ✓"
                  : "Registrar toma de hoy"}
              </button>
              {m.historial.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  {m.historial.length}{" "}
                  {m.historial.length === 1
                    ? "toma registrada"
                    : "tomas registradas"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {medicaciones && medicaciones.length === 0 && (
        <EmptyState mensaje="Apunta aquí tu medicación para no tener que recordarlo todo de memoria." />
      )}
    </div>
  );
}
