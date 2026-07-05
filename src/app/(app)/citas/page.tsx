"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, type Cita, type Pregunta } from "@/lib/db";
import { diasHasta, textoCountdown } from "@/lib/fechas";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  CARD_CLS,
  hoyISO,
  fechaLegible,
} from "../_components/ui";
import { EmptyState } from "../_components/EmptyState";

function ListaPreguntas({ preguntas }: { preguntas: Pregunta[] }) {
  if (preguntas.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-line pt-3">
      {preguntas.map((p) => (
        <li key={p.id} className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={p.resuelta === 1}
            onChange={(e) =>
              db.preguntas.update(p.id!, { resuelta: e.target.checked ? 1 : 0 })
            }
            className="mt-0.5 h-5 w-5 accent-jade"
            aria-label={`Marcar resuelta: ${p.texto}`}
          />
          <span
            className={`text-sm leading-5 ${
              p.resuelta === 1 ? "text-muted line-through" : "text-fg"
            }`}
          >
            {p.texto}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FormPregunta({ citaId }: { citaId?: number }) {
  const ref = useRef<HTMLInputElement>(null);

  async function agregar() {
    const texto = ref.current?.value.trim();
    if (!texto) return;
    await db.preguntas.add({
      texto,
      citaId,
      creada: hoyISO(),
      resuelta: 0,
    });
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        ref={ref}
        placeholder="Anota una duda…"
        className={INPUT_CLS}
        onKeyDown={(e) => e.key === "Enter" && agregar()}
      />
      <button
        onClick={agregar}
        aria-label="Añadir pregunta"
        className="min-h-11 shrink-0 rounded-lg border border-line px-4 text-sm text-jade transition hover:border-jade/50"
      >
        +
      </button>
    </div>
  );
}

function TarjetaCita({
  cita,
  preguntas,
}: {
  cita: Cita;
  preguntas: Pregunta[];
}) {
  const dias = diasHasta(cita.fecha);
  const deEsta = preguntas.filter((p) => p.citaId === cita.id);

  return (
    <li className={CARD_CLS}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-fg">
          {cita.especialista || "Cita médica"}
        </span>
        {dias >= 0 && (
          <span className="text-xs font-medium text-jade">
            {textoCountdown(dias)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        <span className="tabular">{fechaLegible(cita.fecha)}</span>
        {cita.hora && <span className="tabular"> · {cita.hora}</span>}
        {cita.centro && <> · {cita.centro}</>}
      </p>
      {cita.notas && (
        <p className="mt-2 text-xs leading-5 text-muted">{cita.notas}</p>
      )}
      <ListaPreguntas preguntas={deEsta} />
      <FormPregunta citaId={cita.id} />
    </li>
  );
}

export default function CitasPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [verPasadas, setVerPasadas] = useState(false);
  const citas = useLiveQuery(() => db.citas.orderBy("fecha").toArray());
  const preguntas = useLiveQuery(() => db.preguntas.toArray());

  async function agregarCita(formData: FormData) {
    await db.citas.add({
      fecha: String(formData.get("fecha")),
      hora: String(formData.get("hora") ?? "") || undefined,
      especialista: String(formData.get("especialista") ?? "").trim() || undefined,
      centro: String(formData.get("centro") ?? "").trim() || undefined,
      notas: String(formData.get("notas") ?? "").trim() || undefined,
    });
    await contarRegistroNuevo();
    formRef.current?.reset();
  }

  const futuras = citas?.filter((c) => diasHasta(c.fecha) >= 0) ?? [];
  const pasadas = (citas?.filter((c) => diasHasta(c.fecha) < 0) ?? []).reverse();
  const sueltas = preguntas?.filter((p) => p.citaId === undefined) ?? [];

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Citas
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tus citas y tus dudas
        </h1>
      </header>

      <form
        ref={formRef}
        action={agregarCita}
        className={`${CARD_CLS} space-y-4`}
      >
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
              Hora (opcional)
            </span>
            <input name="hora" type="time" className={INPUT_CLS} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Especialista
          </span>
          <input
            name="especialista"
            placeholder="Ej.: Dr. García, Oncología"
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Centro (opcional)
          </span>
          <input name="centro" className={INPUT_CLS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Notas (opcional)
          </span>
          <textarea name="notas" rows={2} className={INPUT_CLS} />
        </label>
        <button type="submit" className={BTN_PRIMARIO}>
          Guardar cita
        </button>
      </form>

      {futuras.length > 0 && (
        <ul className="space-y-3">
          {futuras.map((c) => (
            <TarjetaCita key={c.id} cita={c} preguntas={preguntas ?? []} />
          ))}
        </ul>
      )}
      {citas && citas.length === 0 && (
        <EmptyState mensaje="Cuando apuntes tu próxima cita, aquí verás cuánto falta." />
      )}

      <section className={CARD_CLS}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Dudas sueltas
        </h2>
        <p className="mt-1 text-xs text-muted">
          Apunta aquí lo que te ronde la cabeza — luego podrás repasarlo antes
          de cualquier consulta.
        </p>
        <ListaPreguntas preguntas={sueltas} />
        <FormPregunta />
      </section>

      {pasadas.length > 0 && (
        <div>
          <button
            onClick={() => setVerPasadas((v) => !v)}
            className="w-full py-2 text-center text-xs text-muted underline-offset-2 hover:underline"
          >
            {verPasadas
              ? "Ocultar citas pasadas"
              : `Ver citas pasadas (${pasadas.length})`}
          </button>
          {verPasadas && (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
              {pasadas.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-fg">
                      {c.especialista || "Cita médica"}
                    </span>
                    <span className="tabular text-xs text-muted">
                      {fechaLegible(c.fecha)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
