import type { ReactNode } from "react";

/**
 * Estado vacío cálido (§4.1): un mensaje humano en vez de una lista vacía.
 * La espina vertical con nodos es la firma visual de OncoTrack.
 */
export function EmptyState({
  mensaje,
  accion,
}: {
  mensaje: string;
  accion?: ReactNode;
}) {
  return (
    <div className="textura-cebra flex flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center">
      <svg
        width="18"
        height="56"
        viewBox="0 0 18 56"
        aria-hidden
        className="text-muted/60"
      >
        <line
          x1="9"
          y1="4"
          x2="9"
          y2="52"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="9" cy="12" r="3.5" fill="currentColor" />
        <circle cx="9" cy="28" r="4.5" fill="currentColor" />
        <circle cx="9" cy="44" r="3.5" fill="currentColor" />
      </svg>
      <p className="max-w-xs text-sm leading-6 text-muted">{mensaje}</p>
      {accion}
    </div>
  );
}
