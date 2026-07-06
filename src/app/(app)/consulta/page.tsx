"use client";

import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { agruparPorNombre, comparacionTexto } from "@/lib/marcadores";
import { proximaCita } from "@/lib/fechas";
import { GraficaMarcador } from "../salud/marcadores/GraficaMarcador";
import { CARD_CLS, fechaLegible } from "../_components/ui";

/**
 * Modo consulta (spec §5): la pantalla que se le enseña al equipo médico.
 * Letra grande, valores XL, nada se edita aquí — solo las preguntas se
 * pueden ir tachando en vivo mientras se habla.
 */
export default function ConsultaPage() {
  const router = useRouter();
  const datos = useLiveQuery(async () => {
    const [marcadores, medicacion, citas, preguntas] = await Promise.all([
      db.marcadores.toArray(),
      db.medicacion.toArray(),
      db.citas.toArray(),
      db.preguntas.toArray(),
    ]);
    return { marcadores, medicacion, citas, preguntas };
  });

  if (!datos) return null;

  const grupos = agruparPorNombre(datos.marcadores);
  const cita = proximaCita(datos.citas);
  const pendientes = cita
    ? datos.preguntas.filter((p) => p.citaId === cita.id)
    : [];

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
            Modo consulta
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
            Para enseñar — nada se edita aquí
          </h1>
        </div>
        <button
          onClick={() => router.back()}
          className="min-h-11 shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-morado/50 hover:text-fg"
        >
          ← Volver
        </button>
      </header>

      {grupos.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted">
            Analíticas
          </h2>
          {grupos.map((g) => {
            const ultimo = g.puntos[g.puntos.length - 1];
            const comparacion = comparacionTexto(g.puntos);
            return (
              <div key={g.nombre} className={CARD_CLS}>
                <p className="text-base font-medium text-fg">{g.nombre}</p>
                <p className="tabular mt-1 text-4xl font-semibold text-fg">
                  {ultimo.valor}{" "}
                  <span className="text-lg font-normal text-muted">
                    {g.unidad}
                  </span>
                </p>
                <p className="mt-1 text-base text-muted">
                  {fechaLegible(ultimo.fecha)}
                  {comparacion && <> · {comparacion}</>}
                </p>
                {g.puntos.length >= 2 && (
                  <GraficaMarcador puntos={g.puntos} unidad={g.unidad} />
                )}
              </div>
            );
          })}
        </section>
      )}

      {datos.medicacion.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted">
            Medicación actual
          </h2>
          <div className={`${CARD_CLS} divide-y divide-line`}>
            {datos.medicacion.map((m) => (
              <div key={m.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-lg font-medium text-fg">
                  {m.nombre}
                  {m.dosis && (
                    <span className="text-base text-muted"> · {m.dosis}</span>
                  )}
                </p>
                <p className="text-base text-muted">
                  Última toma:{" "}
                  <span className="tabular text-fg">
                    {fechaLegible(m.ultimaToma)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {cita && pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted">
            Tus preguntas para hoy
            {cita.especialista && <> — {cita.especialista}</>}
          </h2>
          <ul className={`${CARD_CLS} space-y-4`}>
            {pendientes.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={p.resuelta === 1}
                  onChange={(e) =>
                    db.preguntas.update(p.id!, {
                      resuelta: e.target.checked ? 1 : 0,
                    })
                  }
                  className="mt-1 h-7 w-7 shrink-0 accent-morado"
                  aria-label={`Marcar resuelta: ${p.texto}`}
                />
                <span
                  className={`text-lg leading-7 ${
                    p.resuelta === 1 ? "text-muted line-through" : "text-fg"
                  }`}
                >
                  {p.texto}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grupos.length === 0 &&
        datos.medicacion.length === 0 &&
        pendientes.length === 0 && (
          <p className={`${CARD_CLS} text-base leading-7 text-muted`}>
            Aún no hay nada que enseñar — cuando registres analíticas,
            medicación o preguntas, aparecerán aquí en letra grande.
          </p>
        )}
    </div>
  );
}
