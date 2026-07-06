"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveAjustes } from "@/lib/db";
import { exportarDatos } from "@/lib/backup";
import { hoyISO } from "../../_components/ui";
import { BTN_PRIMARIO, CARD_CLS } from "../../_components/ui";

/** Sección "Tu copia de seguridad" (§4.6) — nada sale a ningún servidor. */
export function SeccionBackup() {
  const ajustes = useLiveQuery(() => db.ajustes.get(1));
  const [estado, setEstado] = useState<"" | "generando" | "hecho" | "error">("");

  async function guardarCopia() {
    setEstado("generando");
    try {
      const { contenido } = await exportarDatos();
      const archivo = new File(
        [contenido],
        `oncotrack-copia-${hoyISO()}.json`,
        { type: "application/json" }
      );

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [archivo] })
      ) {
        await navigator.share({
          files: [archivo],
          title: "Copia de mis datos de OncoTrack",
        });
      } else {
        const url = URL.createObjectURL(archivo);
        const a = document.createElement("a");
        a.href = url;
        a.download = archivo.name;
        a.click();
        URL.revokeObjectURL(url);
      }

      await saveAjustes({
        ultimoBackup: new Date().toISOString(),
        registrosDesdeBackup: 0,
      });
      setEstado("hecho");
    } catch (e) {
      // El usuario puede cancelar el diálogo de compartir: no es un error
      if (e instanceof DOMException && e.name === "AbortError") {
        setEstado("");
      } else {
        setEstado("error");
      }
    }
  }

  const fechaUltimo = ajustes?.ultimoBackup
    ? new Date(ajustes.ultimoBackup).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className={CARD_CLS}>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Tu copia de seguridad
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted">
        El archivo se guarda donde tú elijas. Nada se sube a ningún servidor.
      </p>
      <button
        onClick={guardarCopia}
        disabled={estado === "generando"}
        className={`${BTN_PRIMARIO} mt-3 disabled:opacity-60`}
      >
        {estado === "generando" ? "Preparando…" : "Guardar copia de mis datos"}
      </button>
      {estado === "hecho" && (
        <p className="mt-2 text-xs text-morado">Copia guardada. Bien hecho.</p>
      )}
      {estado === "error" && (
        <p className="mt-2 text-xs text-error">
          No se pudo generar la copia — inténtalo de nuevo.
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        {fechaUltimo
          ? `Última copia: ${fechaUltimo}`
          : "Todavía no has guardado ninguna copia."}
      </p>
    </section>
  );
}
