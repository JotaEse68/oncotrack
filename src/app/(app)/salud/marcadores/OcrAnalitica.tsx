"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, getAjustes } from "@/lib/db";
import {
  configDesdeAjustes,
  extraerMarcadores,
  tieneIA,
  type MarcadorExtraido,
} from "@/lib/ia";
import { INPUT_CLS, BTN_PRIMARIO, CARD_CLS, hoyISO } from "../../_components/ui";

function archivoADataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Foto a la analítica → extracción por IA → REVISIÓN HUMANA OBLIGATORIA
 * antes de guardar (§4.7). Sin clave configurada, solo se sugiere la opción.
 */
export function OcrAnalitica() {
  const ajustes = useLiveQuery(() => getAjustes());
  const camaraRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"" | "leyendo" | string>("");
  const [revision, setRevision] = useState<MarcadorExtraido[] | null>(null);

  if (!ajustes) return null;

  if (!tieneIA(ajustes)) {
    return (
      <p className="px-1 text-xs leading-5 text-muted">
        ¿Quieres rellenar esto con una foto?{" "}
        <Link href="/ajustes/ia" className="text-morado underline-offset-2 hover:underline">
          Conecta tu IA en Ajustes
        </Link>
        .
      </p>
    );
  }

  async function analizar(file: File | undefined | null) {
    if (!file) return;
    const cfg = configDesdeAjustes(ajustes!);
    if (!cfg) return;
    setEstado("leyendo");
    setRevision(null);
    try {
      const dataUrl = await archivoADataUrl(file);
      const extraidos = await extraerMarcadores(cfg, dataUrl);
      if (extraidos.length === 0) {
        setEstado(
          "No se distinguen marcadores en esa foto. Prueba con más luz o escribe el valor a mano."
        );
      } else {
        setEstado("");
        setRevision(extraidos);
      }
    } catch (e) {
      setEstado(e instanceof Error ? e.message : "No se pudo leer la foto.");
    }
  }

  function editar(i: number, campo: keyof MarcadorExtraido, valor: string) {
    setRevision((prev) => {
      if (!prev) return prev;
      const copia = [...prev];
      copia[i] = {
        ...copia[i],
        [campo]: campo === "valor" ? Number(valor) : valor,
      };
      return copia;
    });
  }

  async function confirmar() {
    if (!revision) return;
    await db.marcadores.bulkAdd(
      revision.map((m) => ({
        nombre: m.nombre.trim(),
        fecha: m.fecha || hoyISO(),
        valor: m.valor,
        unidad: m.unidad.trim(),
      }))
    );
    await contarRegistroNuevo();
    setRevision(null);
    setEstado("");
  }

  return (
    <div className="space-y-3">
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          analizar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => camaraRef.current?.click()}
        disabled={estado === "leyendo"}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-morado px-4 py-4 text-base font-semibold text-ink transition hover:bg-morado/90 disabled:opacity-60"
      >
        {estado === "leyendo" ? "Leyendo la foto…" : "📷 Foto a la analítica"}
      </button>
      {estado && estado !== "leyendo" && (
        <p className="px-1 text-xs text-error">{estado}</p>
      )}

      {revision && (
        <div className={`${CARD_CLS} space-y-3`}>
          <p className="text-sm font-medium text-fg">
            Revisa antes de guardar
          </p>
          <p className="text-xs leading-5 text-muted">
            La IA puede equivocarse. Comprueba cada valor con el papel delante
            — no se guarda nada hasta que confirmes.
          </p>
          {revision.map((m, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-line p-3">
              <input
                value={m.nombre}
                onChange={(e) => editar(i, "nombre", e.target.value)}
                aria-label="Nombre del marcador"
                className={INPUT_CLS}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={m.valor}
                  onChange={(e) => editar(i, "valor", e.target.value)}
                  aria-label="Valor"
                  className={INPUT_CLS}
                />
                <input
                  value={m.unidad}
                  onChange={(e) => editar(i, "unidad", e.target.value)}
                  aria-label="Unidad"
                  className={INPUT_CLS}
                />
                <input
                  type="date"
                  value={m.fecha ?? hoyISO()}
                  onChange={(e) => editar(i, "fecha", e.target.value)}
                  aria-label="Fecha"
                  className={INPUT_CLS}
                />
              </div>
              <button
                onClick={() =>
                  setRevision((prev) =>
                    prev ? prev.filter((_, j) => j !== i) : prev
                  )
                }
                className="text-xs text-muted underline-offset-2 hover:underline"
              >
                Quitar esta fila
              </button>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRevision(null)}
              className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm text-muted"
            >
              Descartar
            </button>
            <button onClick={confirmar} className={BTN_PRIMARIO}>
              Confirmar y guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
