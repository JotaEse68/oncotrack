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
import { INPUT_CLS, BTN_PRIMARIO, CARD_CLS, hoyISO } from "./ui";

function archivoADataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

interface Aviso {
  texto: string;
  tipo: "info" | "error";
  /** Ofrecer el enlace a /ajustes/ia (cuando falta la clave). */
  sugerirIA?: boolean;
}

/**
 * Captura de analíticas por foto o archivo (spec §2).
 * SIEMPRE guarda primero el documento (nada se pierde); si además es una
 * imagen y hay clave de IA, propone marcadores con REVISIÓN HUMANA
 * OBLIGATORIA antes de guardarlos — enlazados al documento de origen.
 */
export function CapturaAnalitica({
  origen,
}: {
  origen: "hoy" | "marcadores";
}) {
  const ajustes = useLiveQuery(() => getAjustes());
  const camaraRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [revision, setRevision] = useState<{
    documentoId: number;
    filas: MarcadorExtraido[];
  } | null>(null);

  if (!ajustes) return null;

  async function capturar(file: File | undefined | null) {
    if (!file) return;
    setAviso(null);
    setRevision(null);

    // 1. El documento se guarda siempre, pase lo que pase después.
    const documentoId = (await db.documentos.add({
      nombre: file.name || `Analítica ${hoyISO()}`,
      tipo: file.type,
      fecha: hoyISO(),
      blob: file,
    })) as number;
    await contarRegistroNuevo();

    const esImagen = file.type.startsWith("image/");
    if (!esImagen) {
      setAviso({
        tipo: "info",
        texto:
          "Guardado en Documentos — los PDF aún no se leen automáticamente.",
      });
      return;
    }
    if (!tieneIA(ajustes!)) {
      setAviso({
        tipo: "info",
        texto: "Guardado en Documentos.",
        sugerirIA: true,
      });
      return;
    }

    // 2. Con IA: proponer marcadores para revisión.
    const cfg = configDesdeAjustes(ajustes!);
    if (!cfg) return;
    setLeyendo(true);
    try {
      const dataUrl = await archivoADataUrl(file);
      const extraidos = await extraerMarcadores(cfg, dataUrl);
      if (extraidos.length === 0) {
        setAviso({
          tipo: "info",
          texto:
            "La foto quedó en Documentos, pero no se distinguen marcadores. Prueba con más luz o escribe el valor a mano.",
        });
      } else {
        setRevision({ documentoId, filas: extraidos });
      }
    } catch (e) {
      setAviso({
        tipo: "error",
        texto: `${e instanceof Error ? e.message : "No se pudo leer la foto."} La foto quedó guardada en Documentos.`,
      });
    } finally {
      setLeyendo(false);
    }
  }

  function editar(i: number, campo: keyof MarcadorExtraido, valor: string) {
    setRevision((prev) => {
      if (!prev) return prev;
      const filas = [...prev.filas];
      filas[i] = {
        ...filas[i],
        [campo]: campo === "valor" ? Number(valor) : valor,
      };
      return { ...prev, filas };
    });
  }

  async function confirmar() {
    if (!revision) return;
    await db.marcadores.bulkAdd(
      revision.filas.map((m) => ({
        nombre: m.nombre.trim(),
        fecha: m.fecha || hoyISO(),
        valor: m.valor,
        unidad: m.unidad.trim(),
        documentoId: revision.documentoId,
      }))
    );
    await contarRegistroNuevo();
    setRevision(null);
    setAviso({ tipo: "info", texto: "Guardado — foto en Documentos y valores en Marcadores." });
  }

  const BTN_CAPTURA =
    "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-semibold transition disabled:opacity-60";

  return (
    <div className="space-y-3">
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          capturar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={archivoRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          capturar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {origen === "hoy" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => camaraRef.current?.click()}
            disabled={leyendo}
            className={`${BTN_CAPTURA} bg-morado text-ink hover:bg-morado/90`}
          >
            {leyendo ? "Leyendo…" : "📷 Hacer foto"}
          </button>
          <button
            onClick={() => archivoRef.current?.click()}
            disabled={leyendo}
            className={`${BTN_CAPTURA} border border-line text-fg hover:border-morado/50`}
          >
            📎 Subir archivo
          </button>
        </div>
      ) : (
        <button
          onClick={() => camaraRef.current?.click()}
          disabled={leyendo}
          className={`${BTN_CAPTURA} bg-morado text-ink hover:bg-morado/90`}
        >
          {leyendo ? "Leyendo la foto…" : "📷 Foto a la analítica"}
        </button>
      )}

      {aviso && (
        <p
          className={`px-1 text-xs leading-5 ${aviso.tipo === "error" ? "text-error" : "text-muted"}`}
        >
          {aviso.texto}
          {aviso.sugerirIA && (
            <>
              {" "}
              ¿Quieres que las fotos se lean solas?{" "}
              <Link
                href="/ajustes/ia"
                className="text-morado underline-offset-2 hover:underline"
              >
                Conecta tu IA en Ajustes
              </Link>
              .
            </>
          )}
        </p>
      )}

      {revision && (
        <div className={`${CARD_CLS} space-y-3`}>
          <p className="text-sm font-medium text-fg">Revisa antes de guardar</p>
          <p className="text-xs leading-5 text-muted">
            La IA puede equivocarse. Comprueba cada valor con el papel delante
            — no se guarda nada hasta que confirmes.
          </p>
          {revision.filas.map((m, i) => (
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
                    prev
                      ? { ...prev, filas: prev.filas.filter((_, j) => j !== i) }
                      : prev
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
