"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getAjustes } from "@/lib/db";
import { cambiarTema } from "@/lib/tema";

/** Toggle claro/oscuro en la cabecera (spec §9). */
export function BotonTema() {
  const ajustes = useLiveQuery(() => getAjustes());
  if (!ajustes) return null;

  const oscuro = ajustes.tema === "oscuro";

  return (
    <button
      onClick={() => cambiarTema(oscuro ? "claro" : "oscuro")}
      aria-label={`Cambiar a tema ${oscuro ? "claro" : "oscuro"}`}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition hover:text-fg"
    >
      {oscuro ? (
        /* Sol: el toque lleva al tema claro */
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
        </svg>
      ) : (
        /* Luna: el toque lleva al tema oscuro */
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
        </svg>
      )}
    </button>
  );
}
