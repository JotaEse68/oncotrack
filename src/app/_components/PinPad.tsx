"use client";

import { useState } from "react";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/**
 * Teclado numérico grande para PIN de 4 dígitos (§4.2, §4.8: botones grandes).
 * onComplete devuelve false si el PIN no es válido → sacude y limpia.
 */
export function PinPad({
  titulo,
  subtitulo,
  onComplete,
}: {
  titulo: string;
  subtitulo?: string;
  onComplete: (pin: string) => Promise<boolean> | boolean;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function pulsar(tecla: string) {
    if (ocupado) return;
    setError(false);
    if (tecla === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const nuevo = pin + tecla;
    setPin(nuevo);
    if (nuevo.length === 4) {
      setOcupado(true);
      const ok = await onComplete(nuevo);
      setOcupado(false);
      setPin("");
      if (!ok) setError(true);
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold text-fg">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}
      </div>

      <div
        className={`flex gap-3 ${error ? "animate-pulse" : ""}`}
        role="status"
        aria-label={`${pin.length} de 4 dígitos`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition ${
              i < pin.length
                ? error
                  ? "border-clay bg-clay"
                  : "border-jade bg-jade"
                : "border-line bg-transparent"
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-clay" role="alert">
          Ese no es el PIN — prueba otra vez, con calma.
        </p>
      )}

      <div className="grid w-full grid-cols-3 gap-2">
        {TECLAS.map((t, i) =>
          t === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => pulsar(t)}
              disabled={ocupado}
              aria-label={t === "⌫" ? "Borrar" : t}
              className="min-h-14 rounded-xl border border-line bg-surface/60 text-xl font-medium text-fg transition hover:border-jade/50 active:bg-jade/10 disabled:opacity-50"
            >
              {t}
            </button>
          )
        )}
      </div>
    </div>
  );
}
