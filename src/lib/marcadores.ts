import type { Marcador } from "@/lib/db";

/**
 * Agrupación y comparación de marcadores (§4.9).
 * Cada valor se relaciona SOLO con el propio histórico del paciente —
 * nunca rangos genéricos, nunca semáforos, nunca "normal/anormal".
 */

export interface PuntoMarcador {
  fecha: string; // ISO yyyy-mm-dd
  valor: number;
}

export interface GrupoMarcador {
  nombre: string;
  unidad: string;
  /** Orden ascendente por fecha (para la gráfica). */
  puntos: PuntoMarcador[];
  /** Los registros originales, ascendentes (para listar/borrar). */
  registros: Marcador[];
}

/** Agrupa por nombre; grupos ordenados por su registro más reciente. */
export function agruparPorNombre(marcadores: Marcador[]): GrupoMarcador[] {
  const mapa = new Map<string, Marcador[]>();
  for (const m of marcadores) {
    const lista = mapa.get(m.nombre) ?? [];
    lista.push(m);
    mapa.set(m.nombre, lista);
  }

  const grupos: GrupoMarcador[] = [];
  for (const [nombre, lista] of mapa) {
    lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    grupos.push({
      nombre,
      unidad: lista[lista.length - 1].unidad,
      puntos: lista.map((m) => ({ fecha: m.fecha, valor: m.valor })),
      registros: lista,
    });
  }

  grupos.sort((a, b) => {
    const ua = a.puntos[a.puntos.length - 1].fecha;
    const ub = b.puntos[b.puntos.length - 1].fecha;
    return ua < ub ? 1 : -1;
  });
  return grupos;
}

/**
 * Texto de comparación del último valor con el inmediatamente anterior.
 * Lenguaje llano, sin juicios: "un 13% más que la última vez".
 */
export function comparacionTexto(puntos: PuntoMarcador[]): string | null {
  if (puntos.length < 2) return null;
  const ultimo = puntos[puntos.length - 1];
  const previo = puntos[puntos.length - 2];
  if (previo.valor === 0) return null;

  const dif = ((ultimo.valor - previo.valor) / previo.valor) * 100;
  const pct = Math.abs(Math.round(dif));
  if (pct === 0) return "igual que la última vez";
  return dif < 0
    ? `un ${pct}% menos que la última vez`
    : `un ${pct}% más que la última vez`;
}
