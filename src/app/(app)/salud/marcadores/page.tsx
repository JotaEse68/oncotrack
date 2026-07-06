"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, type Marcador } from "@/lib/db";
import { colapsarDuplicado } from "@/lib/texto";
import {
  agruparPorNombre,
  comparacionTexto,
  ultimaUnidadDe,
  type GrupoMarcador,
} from "@/lib/marcadores";
import { GraficaMarcador } from "./GraficaMarcador";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  CARD_CLS,
  hoyISO,
  fechaLegible,
} from "../../_components/ui";
import { EmptyState } from "../../_components/EmptyState";
import { CapturaAnalitica } from "../../_components/CapturaAnalitica";

const MARCADORES_HABITUALES = [
  "Cromogranina A",
  "NSE",
  "Serotonina en orina 24h",
  "5-HIAA",
];

/** Tarjeta de un marcador: último valor, comparación (§4.9) y evolución. */
function TarjetaMarcador({
  grupo,
  onBorrar,
}: {
  grupo: GrupoMarcador;
  onBorrar: (m: Marcador) => void;
}) {
  const ultimo = grupo.puntos[grupo.puntos.length - 1];
  const comparacion = comparacionTexto(grupo.puntos);

  return (
    <li className="rounded-2xl border border-line bg-surface/60 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-fg">{grupo.nombre}</h2>
        <span className="tabular text-lg text-fg">
          {ultimo.valor}{" "}
          <span className="text-xs text-muted">{grupo.unidad}</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="tabular text-xs text-muted">
          {fechaLegible(ultimo.fecha)}
        </span>
        {comparacion && <span className="text-xs text-muted">{comparacion}</span>}
      </div>

      <GraficaMarcador puntos={grupo.puntos} unidad={grupo.unidad} />

      <details className="mt-2">
        <summary className="cursor-pointer py-1 text-xs text-muted">
          {grupo.registros.length === 1
            ? "Ver el registro"
            : `Ver los ${grupo.registros.length} valores`}
        </summary>
        <ul className="mt-1 divide-y divide-line">
          {[...grupo.registros].reverse().map((m) => (
            <li
              key={m.id}
              className="flex items-baseline justify-between gap-2 py-2"
            >
              <span className="tabular text-xs text-muted">
                {fechaLegible(m.fecha)}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="tabular text-sm text-fg">
                  {m.valor} <span className="text-muted">{m.unidad}</span>
                </span>
                <button
                  onClick={() => onBorrar(m)}
                  aria-label={`Borrar ${m.nombre} del ${fechaLegible(m.fecha)}`}
                  className="min-h-9 min-w-9 rounded text-muted/60 transition hover:text-error"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function MarcadoresPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("");
  const [unidadRecordada, setUnidadRecordada] = useState(false);
  const marcadores = useLiveQuery(() =>
    db.marcadores.orderBy("fecha").reverse().toArray()
  );

  // Memoria de unidad (spec §3): al reconocer el marcador, la unidad
  // de la última vez se rellena sola y el foco va directo al valor.
  useEffect(() => {
    const recordada = ultimaUnidadDe(nombre, marcadores ?? []);
    if (recordada) {
      setUnidad(recordada);
      setUnidadRecordada(true);
    } else {
      setUnidadRecordada(false);
    }
  }, [nombre, marcadores]);

  async function agregar(formData: FormData) {
    // colapsarDuplicado: blindaje contra el bug de autocompletado móvil
    // que concatenaba el nombre dos veces ("Cromogranina ACromogranina A").
    await db.marcadores.add({
      nombre: colapsarDuplicado(nombre),
      fecha: String(formData.get("fecha") ?? hoyISO()),
      valor: Number(formData.get("valor")),
      unidad: unidad.trim(),
    });
    await contarRegistroNuevo();
    formRef.current?.reset();
    setNombre("");
    setUnidad("");
    setUnidadRecordada(false);
  }

  async function borrar(m: Marcador) {
    if (confirm(`¿Borrar ${m.nombre} (${m.valor} ${m.unidad})?`)) {
      await db.marcadores.delete(m.id!);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Salud · Marcadores
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tus analíticas
        </h1>
      </header>

      <CapturaAnalitica origen="marcadores" />

      <form ref={formRef} action={agregar} className={`${CARD_CLS} space-y-4`}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Marcador
          </span>
          <input
            name="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Cromogranina A"
            autoComplete="off"
            className={INPUT_CLS}
          />
          {/* Chips en vez de datalist: en móvil el datalist podía concatenar
              el valor dos veces al elegir la sugerencia (bug reportado) */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MARCADORES_HABITUALES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setNombre(n);
                  valorRef.current?.focus();
                }}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-xs transition ${
                  nombre === n
                    ? "border-morado bg-morado/10 text-morado"
                    : "border-line text-muted hover:border-morado/50 hover:text-fg"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </label>
        {/* El input de Valor mantiene su identidad entre renders para no
            perder el foco cuando la unidad recordada reordena el formulario */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Valor
          </span>
          <div className="flex items-center gap-2">
            <input
              ref={valorRef}
              name="valor"
              type="number"
              step="any"
              inputMode="decimal"
              required
              className={`${INPUT_CLS}${unidadRecordada ? " text-lg" : ""}`}
            />
            {unidadRecordada && (
              <span className="whitespace-nowrap rounded-full border border-morado bg-morado/10 px-3 py-1.5 text-xs text-morado">
                {unidad} ✓
              </span>
            )}
          </div>
        </label>
        {unidadRecordada ? (
          <details>
            <summary className="cursor-pointer py-1 text-xs text-muted">
              ▸ cambiar fecha o unidad
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Unidad
                </span>
                <input
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  required
                  placeholder="ng/mL"
                  aria-label="Unidad"
                  className={INPUT_CLS}
                />
              </label>
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
            </div>
          </details>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Unidad
              </span>
              <input
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                required
                placeholder="ng/mL"
                aria-label="Unidad"
                className={INPUT_CLS}
              />
            </label>
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
          </>
        )}
        <button type="submit" className={BTN_PRIMARIO}>
          Añadir valor
        </button>
      </form>

      {marcadores && marcadores.length > 0 && (
        <ul className="space-y-3">
          {agruparPorNombre(marcadores).map((grupo) => (
            <TarjetaMarcador key={grupo.nombre} grupo={grupo} onBorrar={borrar} />
          ))}
        </ul>
      )}
      {marcadores && marcadores.length === 0 && (
        <EmptyState mensaje="Aún no hay nada aquí — cuando subas tu primera analítica, esto se irá llenando." />
      )}
    </div>
  );
}
