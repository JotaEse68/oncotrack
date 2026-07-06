"use client";

import { useState } from "react";
import type { PuntoMarcador } from "@/lib/marcadores";
import { fechaLegible } from "../../_components/ui";

/**
 * Evolución temporal de UN marcador (§4.9).
 * - Eje X proporcional al tiempo real entre analíticas.
 * - Un solo color (identidad), nunca semáforos: subir o bajar pinta igual.
 * - Etiquetas directas solo en primer y último punto; el resto, al tocar.
 */

const ANCHO = 320;
const ALTO = 110;
const M = { arriba: 22, abajo: 18, izq: 10, der: 10 };

function formatearValor(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export function GraficaMarcador({
  puntos,
  unidad,
}: {
  puntos: PuntoMarcador[];
  unidad: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  if (puntos.length < 2) return null;

  const tiempos = puntos.map((p) => new Date(p.fecha + "T00:00").getTime());
  const valores = puntos.map((p) => p.valor);
  const tMin = Math.min(...tiempos);
  const tMax = Math.max(...tiempos);
  const vMin = Math.min(...valores);
  const vMax = Math.max(...valores);
  const margenV = (vMax - vMin || Math.abs(vMax) || 1) * 0.15;

  const x = (t: number) =>
    tMax === tMin
      ? ANCHO / 2
      : M.izq + ((t - tMin) / (tMax - tMin)) * (ANCHO - M.izq - M.der);
  const y = (v: number) =>
    M.arriba +
    (1 - (v - (vMin - margenV)) / (vMax + margenV - (vMin - margenV))) *
      (ALTO - M.arriba - M.abajo);

  const coords = puntos.map((p, i) => ({
    px: x(tiempos[i]),
    py: y(p.valor),
    ...p,
  }));
  const camino = coords.map((c) => `${c.px},${c.py}`).join(" ");
  const ultimo = coords.length - 1;

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={`Evolución: de ${formatearValor(puntos[0].valor)} a ${formatearValor(puntos[ultimo].valor)} ${unidad}`}
      >
        {/* línea base recesiva */}
        <line
          x1={M.izq}
          x2={ANCHO - M.der}
          y1={ALTO - M.abajo}
          y2={ALTO - M.abajo}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
        <polyline
          points={camino}
          fill="none"
          stroke="var(--color-grafica)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <g key={c.fecha + i}>
            {/* anillo de superficie para separar el punto de la línea */}
            <circle
              cx={c.px}
              cy={c.py}
              r={4}
              fill="var(--color-grafica)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
            {/* zona táctil generosa (móvil) */}
            <circle
              cx={c.px}
              cy={c.py}
              r={16}
              fill="transparent"
              onClick={() => setActivo(activo === i ? null : i)}
              style={{ cursor: "pointer" }}
            >
              <title>{`${formatearValor(c.valor)} ${unidad} · ${fechaLegible(c.fecha)}`}</title>
            </circle>
            {/* etiquetas directas: solo primero y último (o el tocado) */}
            {(i === 0 || i === ultimo || activo === i) && (
              <text
                x={c.px}
                y={c.py - 9}
                textAnchor={i === 0 ? "start" : i === ultimo ? "end" : "middle"}
                className="tabular"
                fill="var(--color-fg)"
                fontSize="11"
              >
                {formatearValor(c.valor)}
              </text>
            )}
          </g>
        ))}
        {/* fechas de los extremos, recesivas */}
        <text
          x={M.izq}
          y={ALTO - 4}
          fill="var(--color-muted)"
          fontSize="9.5"
          className="tabular"
        >
          {fechaLegible(puntos[0].fecha)}
        </text>
        <text
          x={ANCHO - M.der}
          y={ALTO - 4}
          textAnchor="end"
          fill="var(--color-muted)"
          fontSize="9.5"
          className="tabular"
        >
          {fechaLegible(puntos[ultimo].fecha)}
        </text>
      </svg>
      {activo !== null && (
        <figcaption className="tabular text-center text-xs text-muted">
          {formatearValor(puntos[activo].valor)} {unidad} ·{" "}
          {fechaLegible(puntos[activo].fecha)}
        </figcaption>
      )}
    </figure>
  );
}
