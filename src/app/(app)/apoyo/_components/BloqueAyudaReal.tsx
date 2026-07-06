import { LINEAS_AYUDA, ASOCIACIONES } from "@/lib/contenido/recursos";

/**
 * Bloque de ayuda real SIEMPRE visible (§4.9, §4.13).
 * No depende de menús ni de que el paciente lo busque.
 */
export function BloqueAyudaReal({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface2 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Si la ansiedad aprieta, hay personas reales
      </p>
      <ul className="mt-2 space-y-1.5">
        {LINEAS_AYUDA.map((r) => (
          <li key={r.nombre} className="text-sm leading-5 text-fg">
            <a
              href={`tel:${r.telefono?.replace(/\s/g, "")}`}
              className="font-semibold text-morado underline-offset-2 hover:underline"
            >
              {r.nombre} · {r.telefono}
            </a>
            {!compacto && (
              <span className="block text-xs text-muted">{r.descripcion}</span>
            )}
          </li>
        ))}
        {!compacto &&
          ASOCIACIONES.map((r) => (
            <li key={r.nombre} className="text-sm leading-5 text-fg">
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-morado underline-offset-2 hover:underline"
                >
                  {r.nombre}
                </a>
              ) : (
                r.nombre
              )}
              {r.telefono && (
                <a
                  href={`tel:${r.telefono.replace(/\s/g, "")}`}
                  className="tabular text-morado"
                >
                  {" "}
                  · {r.telefono}
                </a>
              )}
              <span className="block text-xs text-muted">{r.descripcion}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
