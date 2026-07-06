"use client";

import { useEffect, useState } from "react";

const CLAVE_DESCARTE = "oncotrack-instalar-descartado";
const DIAS_SILENCIO = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function descartadoHacePoco(): boolean {
  try {
    const t = localStorage.getItem(CLAVE_DESCARTE);
    if (!t) return false;
    return Date.now() - Number(t) < DIAS_SILENCIO * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function esIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function yaInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true)
  );
}

/** Tarjeta "Añadir a pantalla de inicio" (§4.8). Descartable 30 días. */
export function PromptInstalar() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [mostrarIOS, setMostrarIOS] = useState(false);

  useEffect(() => {
    if (yaInstalada() || descartadoHacePoco()) return;

    if (esIOS()) {
      setMostrarIOS(true);
      return;
    }
    const alCapturar = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", alCapturar);
    return () => window.removeEventListener("beforeinstallprompt", alCapturar);
  }, []);

  if (!evento && !mostrarIOS) return null;

  function descartar() {
    try {
      localStorage.setItem(CLAVE_DESCARTE, String(Date.now()));
    } catch {
      /* sin localStorage simplemente reaparecerá */
    }
    setEvento(null);
    setMostrarIOS(false);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5">
      <p className="text-sm font-medium text-fg">
        Lleva OncoTrack en tu pantalla de inicio
      </p>
      {mostrarIOS ? (
        <p className="mt-1 text-xs leading-5 text-muted">
          En Safari: toca el botón de Compartir y elige{" "}
          <span className="text-fg">"Añadir a pantalla de inicio"</span>.
        </p>
      ) : (
        <p className="mt-1 text-xs leading-5 text-muted">
          Se abre como una app, también sin conexión.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {evento && (
          <button
            onClick={async () => {
              await evento.prompt();
              setEvento(null);
            }}
            className="min-h-11 flex-1 rounded-lg bg-morado px-4 py-2 text-sm font-semibold text-ink transition hover:bg-morado/90"
          >
            Añadir
          </button>
        )}
        <button
          onClick={descartar}
          className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm text-muted"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
