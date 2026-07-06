"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, contarRegistroNuevo, type Documento } from "@/lib/db";
import { hoyISO, fechaLegible } from "../../_components/ui";
import { EmptyState } from "../../_components/EmptyState";

function Miniatura({ doc, onOpen }: { doc: Documento; onOpen: () => void }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!doc.tipo.startsWith("image/")) return;
    const u = URL.createObjectURL(doc.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [doc]);

  return (
    <button
      onClick={onOpen}
      className="overflow-hidden rounded-xl border border-line bg-surface/40 text-left transition hover:border-morado/50"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={doc.nombre}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center text-2xl">
          📄
        </span>
      )}
      <span className="block truncate px-2 py-1.5 text-[0.65rem] text-muted">
        {fechaLegible(doc.fecha)}
      </span>
    </button>
  );
}

function Visor({ doc, onClose }: { doc: Documento; onClose: () => void }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const u = URL.createObjectURL(doc.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [doc]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4"
      onClick={onClose}
    >
      <div className="flex items-center justify-between pb-3">
        <span className="truncate text-sm text-fg">{doc.nombre}</span>
        <button className="min-h-11 px-3 text-sm text-morado">Cerrar</button>
      </div>
      {url &&
        (doc.tipo.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={doc.nombre}
            className="min-h-0 flex-1 object-contain"
          />
        ) : (
          <iframe src={url} title={doc.nombre} className="min-h-0 flex-1" />
        ))}
    </div>
  );
}

export default function DocumentosPage() {
  const camaraRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState<Documento | null>(null);
  const documentos = useLiveQuery(() =>
    db.documentos.orderBy("fecha").reverse().toArray()
  );

  async function guardarArchivo(file: File | undefined | null) {
    if (!file) return;
    await db.documentos.add({
      nombre: file.name || `foto-${hoyISO()}`,
      tipo: file.type || "application/octet-stream",
      fecha: hoyISO(),
      blob: file,
    });
    await contarRegistroNuevo();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Salud · Documentos
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Tus documentos
        </h1>
      </header>

      {/* Cámara directa como acción principal (§4.8) */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => guardarArchivo(e.target.files?.[0])}
      />
      <input
        ref={archivoRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => guardarArchivo(e.target.files?.[0])}
      />
      <button
        onClick={() => camaraRef.current?.click()}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-morado px-4 py-4 text-base font-semibold text-ink transition hover:bg-morado/90"
      >
        📷 Hacer foto a un documento
      </button>
      <button
        onClick={() => archivoRef.current?.click()}
        className="w-full py-1 text-center text-xs text-muted underline-offset-2 hover:underline"
      >
        …o subir un archivo del dispositivo
      </button>

      {documentos && documentos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {documentos.map((d) => (
            <Miniatura key={d.id} doc={d} onOpen={() => setAbierto(d)} />
          ))}
        </div>
      )}
      {documentos && documentos.length === 0 && (
        <EmptyState mensaje="Tus informes y analíticas vivirán aquí, solo en tu móvil." />
      )}

      {abierto && <Visor doc={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}
