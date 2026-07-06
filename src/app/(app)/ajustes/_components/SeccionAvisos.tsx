"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getAjustes, saveAjustes } from "@/lib/db";
import { CARD_CLS } from "../../_components/ui";

interface RegistroConPeriodicSync extends ServiceWorkerRegistration {
  periodicSync: {
    register(tag: string, opts: { minInterval: number }): Promise<void>;
    unregister(tag: string): Promise<void>;
  };
}

const TAG = "avisos-oncotrack";

/**
 * Aviso best-effort de citas y tomas (spec avisos B2).
 * Solo aparece donde funciona (Android con la app instalada desde Chrome);
 * en el resto de plataformas la vía es el calendario del móvil.
 */
export function SeccionAvisos() {
  const ajustes = useLiveQuery(() => getAjustes());
  const [soportado, setSoportado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        if (vivo && "periodicSync" in reg) setSoportado(true);
      } catch {
        /* sin SW no hay avisos */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (!soportado || !ajustes) return null;
  const activo = ajustes.avisosActivados === 1;

  async function alternar() {
    setError("");
    const reg = (await navigator.serviceWorker.ready) as RegistroConPeriodicSync;
    if (activo) {
      try {
        await reg.periodicSync.unregister(TAG);
      } catch {
        /* si no estaba registrado, da igual */
      }
      await saveAjustes({ avisosActivados: 0 });
      return;
    }
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setError(
        "Sin permiso de notificaciones no puedo avisarte — puedes darlo en los ajustes del navegador."
      );
      return;
    }
    try {
      await reg.periodicSync.register(TAG, {
        minInterval: 12 * 60 * 60 * 1000,
      });
      await saveAjustes({ avisosActivados: 1 });
    } catch {
      setError(
        "Tu navegador no permite registrarlo ahora — instala la app en tu pantalla de inicio y vuelve a intentarlo."
      );
    }
  }

  return (
    <section className={CARD_CLS}>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Avisos
      </h2>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm leading-6 text-fg">
          Avisarme de citas y tomas aunque la app esté cerrada
        </span>
        <input
          type="checkbox"
          checked={activo}
          onChange={alternar}
          className="h-6 w-6 shrink-0 accent-morado"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-muted">
        Android decide el momento exacto del aviso; como refuerzo, añade
        también tus citas al calendario.
      </p>
      {error && <p className="mt-2 text-xs leading-5 text-error">{error}</p>}
    </section>
  );
}
