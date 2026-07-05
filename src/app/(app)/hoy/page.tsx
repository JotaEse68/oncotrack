"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { diasHasta, proximaCita, textoCountdown } from "@/lib/fechas";
import { necesitaRecordatorio } from "@/lib/backup";
import { CARD_CLS } from "../_components/ui";

export default function HoyPage() {
  const perfil = useLiveQuery(() => db.perfil.get(1));
  const citas = useLiveQuery(() => db.citas.toArray());
  const preguntas = useLiveQuery(() => db.preguntas.toArray());
  const ajustes = useLiveQuery(() => db.ajustes.get(1));

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const proxima = citas ? proximaCita(citas) : undefined;
  const diasProxima = proxima ? diasHasta(proxima.fecha) : undefined;
  const esHoy = diasProxima === 0;
  const pendientesDeHoy =
    esHoy && proxima
      ? (preguntas ?? []).filter(
          (p) => p.citaId === proxima.id && p.resuelta === 0
        )
      : [];

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Hoy · <span className="text-muted">{hoy}</span>
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {perfil?.nombre ? `Hola, ${perfil.nombre}` : "Tu espacio"}
        </h1>
      </header>

      {/* Banner del día de la cita con las preguntas anotadas (§4.4) */}
      {esHoy && proxima && (
        <div className="rounded-2xl border border-jade/40 bg-jade/10 p-5">
          <p className="text-sm font-medium text-fg">
            Hoy tienes cita
            {proxima.especialista && <> con {proxima.especialista}</>}
            {proxima.hora && (
              <span className="tabular text-muted"> · {proxima.hora}</span>
            )}
            {pendientesDeHoy.length > 0 && (
              <>
                {" "}
                — tenías {pendientesDeHoy.length}{" "}
                {pendientesDeHoy.length === 1
                  ? "pregunta anotada"
                  : "preguntas anotadas"}
              </>
            )}
          </p>
          {pendientesDeHoy.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-jade">
                Ver tus preguntas
              </summary>
              <ul className="mt-2 space-y-2">
                {pendientesDeHoy.map((p) => (
                  <li key={p.id} className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        db.preguntas.update(p.id!, {
                          resuelta: e.target.checked ? 1 : 0,
                        })
                      }
                      className="mt-0.5 h-5 w-5 accent-jade"
                      aria-label={`Marcar resuelta: ${p.texto}`}
                    />
                    <span className="text-sm leading-5 text-fg">{p.texto}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Countdown a la próxima cita (§4.3) */}
      {proxima && !esHoy && diasProxima !== undefined && (
        <Link href="/citas" className={`block ${CARD_CLS} transition hover:border-jade/50`}>
          <p className="text-xs text-muted">Próxima cita</p>
          <p className="mt-1 text-sm text-fg">
            <span className="font-semibold text-jade">
              {textoCountdown(diasProxima)}
            </span>
            {proxima.especialista && <>: {proxima.especialista}</>}
            {proxima.centro && (
              <span className="text-muted"> · {proxima.centro}</span>
            )}
          </p>
        </Link>
      )}

      {/* Recordatorio suave de backup (§4.6) */}
      {ajustes && necesitaRecordatorio(ajustes) && (
        <Link
          href="/ajustes"
          className="block rounded-2xl border border-clay/40 bg-clay/10 p-5 transition hover:border-clay/60"
        >
          <p className="text-xs text-muted">Cuando tengas un momento</p>
          <p className="mt-1 text-sm leading-6 text-fg">
            {ajustes.ultimoBackup
              ? "Hace más de 30 días de tu última copia — guarda una nueva cuando tengas un momento."
              : "Ya tienes datos guardados aquí — guarda una copia por si cambias de móvil."}
          </p>
        </Link>
      )}

      {!perfil?.nombre && (
        <Link
          href="/perfil"
          className="flex items-center justify-between rounded-2xl border border-line bg-surface/40 p-5 transition hover:border-jade/50"
        >
          <span>
            <span className="block text-xs text-muted">Para empezar</span>
            <span className="mt-0.5 block text-sm text-fg">
              Cuéntanos tu nombre
            </span>
          </span>
          <span aria-hidden className="text-jade">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
