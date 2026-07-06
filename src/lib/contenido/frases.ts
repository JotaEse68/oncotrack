import type { DatosNarrativa } from "@/lib/narrativa";
import { diasHasta } from "@/lib/fechas";

/**
 * Frase del día (§8 del spec "con alma").
 * Serena, sin positivismo de plástico y sin juicios clínicos.
 * Determinista por fecha: mismo día, misma frase.
 */

export const FRASES_CURADAS: string[] = [
  "No hace falta entenderlo todo hoy.",
  "Apuntarlo ya es cuidarte.",
  "Los datos son tuyos. Las decisiones, de tu equipo. El día, tuyo otra vez.",
  "Un registro pequeño hoy es una respuesta clara mañana.",
  "Hoy solo hace falta lo de hoy.",
  "Cada dato que guardas es una pregunta menos en la consulta.",
  "Tu historia se escribe a tu ritmo.",
  "Descansar también cuenta.",
  "No tienes que poder con todo — solo con este momento.",
  "Lo que sientes hoy merece un sitio donde quedarse.",
  "Paso a paso también se llega.",
  "Tus números no te definen; te acompañan.",
  "Preguntar es una forma de cuidarse.",
  "Hoy puede ser simplemente un día más — y eso está permitido.",
  "Guardar lo de hoy es un regalo para quien serás mañana.",
  "La constancia no necesita perfección.",
  "También los días grises quedan contados — y pasan.",
  "Nadie lleva tu historia mejor que tú.",
  "Si hoy pesa, suéltalo aquí — para eso está.",
  "Lo importante no es el dato de un día, sino el camino que dibujan juntos.",
];

/** Fecha ISO de la analítica más reciente entre todos los grupos. */
function ultimaAnalitica(d: DatosNarrativa): string | undefined {
  let ultima: string | undefined;
  for (const g of d.grupos) {
    const f = g.puntos[g.puntos.length - 1]?.fecha;
    if (f && (!ultima || f > ultima)) ultima = f;
  }
  return ultima;
}

function diasDesdeEpoch(hoy: Date): number {
  const MS_DIA = 24 * 60 * 60 * 1000;
  const medianoche = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  ).getTime();
  return Math.floor(medianoche / MS_DIA);
}

/**
 * Mezcla curadas + generadas de los datos y elige por fecha
 * (índice = días desde epoch % tamaño del pool).
 */
export function fraseDelDia(
  d: DatosNarrativa & { totalRegistros: number },
  hoy: Date = d.hoy ?? new Date()
): string {
  const pool = [...FRASES_CURADAS];

  if (d.totalRegistros >= 5) {
    pool.push(
      `Llevas ${d.totalRegistros} registros — tu historia está cada vez mejor contada.`
    );
  }

  const ultima = ultimaAnalitica(d);
  if (ultima && diasHasta(ultima, hoy) < -25) {
    pool.push("Cuando llegue la próxima analítica, aquí tiene su sitio.");
  }

  return pool[diasDesdeEpoch(hoy) % pool.length];
}
