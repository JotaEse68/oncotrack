"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { diasHasta, proximaCita } from "@/lib/fechas";
import { agruparPorNombre } from "@/lib/marcadores";
import { construirNarrativa } from "@/lib/narrativa";
import { fraseDelDia } from "@/lib/contenido/frases";
import { necesitaRecordatorio } from "@/lib/backup";
import { CARD_CLS } from "../_components/ui";
import { PromptInstalar } from "../_components/PromptInstalar";
import { GuiaInicio } from "./GuiaInicio";

export default function HoyPage() {
  const perfil = useLiveQuery(() => db.perfil.get(1));
  const ajustes = useLiveQuery(() => db.ajustes.get(1));
  const datos = useLiveQuery(async () => {
    const [marcadores, citas, preguntas, sesiones, nSintomas] =
      await Promise.all([
        db.marcadores.toArray(),
        db.citas.toArray(),
        db.preguntas.toArray(),
        db.sesionesApoyo.toArray(),
        db.sintomas.count(),
      ]);
    return { marcadores, citas, preguntas, sesiones, nSintomas };
  });

  const hoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const proxima = datos ? proximaCita(datos.citas) : undefined;
  const esHoy = proxima ? diasHasta(proxima.fecha) === 0 : false;
  const pendientesDeHoy =
    esHoy && proxima
      ? (datos?.preguntas ?? []).filter(
          (p) => p.citaId === proxima.id && p.resuelta === 0
        )
      : [];

  const narrativa = datos
    ? construirNarrativa({
        nombre: perfil?.nombre,
        grupos: agruparPorNombre(datos.marcadores),
        citas: datos.citas,
        preguntas: datos.preguntas,
        sesiones: datos.sesiones,
      })
    : [];

  const frase = datos
    ? fraseDelDia({
        nombre: perfil?.nombre,
        grupos: agruparPorNombre(datos.marcadores),
        citas: datos.citas,
        preguntas: datos.preguntas,
        sesiones: datos.sesiones,
        totalRegistros:
          datos.marcadores.length +
          datos.nSintomas +
          datos.citas.length +
          datos.sesiones.length,
      })
    : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Hoy · <span className="text-muted">{hoy}</span>
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {perfil?.nombre ? `Hola, ${perfil.nombre}` : "Tu espacio"}
        </h1>
      </header>

      <GuiaInicio />

      {/* Banner del día de la cita con las preguntas anotadas (§4.4) */}
      {esHoy && proxima && (
        <div className="rounded-2xl border border-line bg-surface2 p-5">
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
              <summary className="cursor-pointer text-xs text-morado">
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
                      className="mt-0.5 h-5 w-5 accent-morado"
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

      {/* Narrativa: los datos contados en frases humanas (spec §1) */}
      {narrativa.length > 0 && (
        <section className="space-y-3">
          {narrativa.map((f) =>
            f.href ? (
              <Link
                key={f.texto}
                href={f.href}
                className={`block ${CARD_CLS} transition hover:border-morado/50`}
              >
                <p className="text-sm leading-6 text-fg">{f.texto}</p>
              </Link>
            ) : (
              <div key={f.texto} className={CARD_CLS}>
                <p className="text-sm leading-6 text-fg">{f.texto}</p>
              </div>
            )
          )}
        </section>
      )}

      {/* Recordatorio suave de backup (§4.6) */}
      {ajustes && necesitaRecordatorio(ajustes) && (
        <Link
          href="/ajustes"
          className="block rounded-2xl border border-line bg-surface2 p-5 transition hover:border-morado/50"
        >
          <p className="text-xs text-muted">Cuando tengas un momento</p>
          <p className="mt-1 text-sm leading-6 text-fg">
            {ajustes.ultimoBackup
              ? "Hace más de 30 días de tu última copia — guarda una nueva cuando tengas un momento."
              : "Ya tienes datos guardados aquí — guarda una copia por si cambias de móvil."}
          </p>
        </Link>
      )}

      <PromptInstalar />

      {/* Frase del día (spec §8) — discreta, al pie */}
      {frase && (
        <p className="px-1 text-center text-xs italic leading-5 text-muted">
          {frase}
        </p>
      )}
    </div>
  );
}
