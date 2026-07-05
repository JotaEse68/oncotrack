"use client";

import { useEffect, useState } from "react";
import {
  decodificarPaquete,
  haCaducado,
  type PaqueteCompartido,
} from "@/lib/compartir";

/**
 * Vista de solo lectura de un enlace compartido (§4.5).
 * Descifra en el cliente lo que viene en el fragmento de la URL.
 * No toca la base local: solo muestra lo que trae el propio enlace.
 */

type Estado =
  | { fase: "cargando" }
  | { fase: "invalido" }
  | { fase: "caducado" }
  | { fase: "ok"; paquete: PaqueteCompartido };

function fechaLegible(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function CompartidoPage() {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  useEffect(() => {
    const fragmento = location.hash.slice(1);
    if (!fragmento) {
      setEstado({ fase: "invalido" });
      return;
    }
    decodificarPaquete(fragmento)
      .then((paquete) => {
        setEstado(
          haCaducado(paquete) ? { fase: "caducado" } : { fase: "ok", paquete }
        );
      })
      .catch(() => setEstado({ fase: "invalido" }));
  }, []);

  if (estado.fase === "cargando") {
    return <div className="min-h-dvh bg-ink" aria-busy="true" />;
  }

  if (estado.fase === "caducado" || estado.fase === "invalido") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink px-6">
        <p className="text-center text-sm text-muted">
          {estado.fase === "caducado"
            ? "Este enlace ha caducado."
            : "Este enlace no es válido."}
        </p>
      </main>
    );
  }

  const { paquete } = estado;
  const marcadores = (paquete.datos.marcadores ?? []) as Array<{
    nombre: string;
    fecha: string;
    valor: number;
    unidad: string;
  }>;
  const medicacion = (paquete.datos.medicacion ?? []) as Array<{
    nombre: string;
    dosis?: string;
    ultimaToma?: string;
    proximaFecha?: string;
  }>;
  const sintomas = (paquete.datos.sintomas ?? []) as Array<{
    fecha: string;
    tipo: string;
    escala: number;
  }>;
  const citas = (paquete.datos.citas ?? []) as Array<{
    fecha: string;
    hora?: string;
    especialista?: string;
    centro?: string;
  }>;

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-6 px-5 py-8">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          OncoTrack · Compartido
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {paquete.nombre ? `Datos de ${paquete.nombre}` : "Datos compartidos"}
        </h1>
        <p className="mt-1 text-xs text-muted">
          Solo lectura · válido hasta el {fechaLegible(paquete.caducidad)}
        </p>
      </header>

      {marcadores.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Marcadores
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
            {marcadores.map((m, i) => (
              <li key={i} className="flex items-baseline justify-between px-5 py-3">
                <span>
                  <span className="block text-sm text-fg">{m.nombre}</span>
                  <span className="tabular text-xs text-muted">
                    {fechaLegible(m.fecha)}
                  </span>
                </span>
                <span className="tabular text-sm text-fg">
                  {m.valor} <span className="text-muted">{m.unidad}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {medicacion.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Medicación
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
            {medicacion.map((m, i) => (
              <li key={i} className="px-5 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-fg">{m.nombre}</span>
                  {m.dosis && <span className="text-xs text-muted">{m.dosis}</span>}
                </div>
                <p className="tabular mt-0.5 text-xs text-muted">
                  Última: {fechaLegible(m.ultimaToma)} · Próxima:{" "}
                  {fechaLegible(m.proximaFecha)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sintomas.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Síntomas
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
            {sintomas.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between px-5 py-3">
                <span className="text-sm text-fg">{s.tipo}</span>
                <span className="tabular text-xs text-muted">
                  {fechaLegible(s.fecha)} · {s.escala}/10
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {citas.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Citas
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
            {citas.map((c, i) => (
              <li key={i} className="px-5 py-3">
                <span className="block text-sm text-fg">
                  {c.especialista || "Cita médica"}
                </span>
                <span className="tabular text-xs text-muted">
                  {fechaLegible(c.fecha)}
                  {c.hora && ` · ${c.hora}`}
                  {c.centro && ` · ${c.centro}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pb-4 text-center text-xs text-muted">
        Compartido de forma privada desde OncoTrack — los datos viajan dentro
        del propio enlace, sin servidores.
      </p>
    </main>
  );
}
