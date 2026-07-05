import type { Cita } from "@/lib/db";

/** Medianoche local de una fecha ISO (yyyy-mm-dd). */
function medianoche(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Días completos hasta la fecha (0 = hoy, negativo = pasada). Ignora horas. */
export function diasHasta(fechaISO: string, hoy: Date = new Date()): number {
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const MS_DIA = 24 * 60 * 60 * 1000;
  return Math.round((medianoche(fechaISO) - medianoche(hoyISO)) / MS_DIA);
}

/** La cita futura más cercana (incluye hoy), o undefined. */
export function proximaCita(
  citas: Cita[],
  hoy: Date = new Date()
): Cita | undefined {
  return citas
    .filter((c) => diasHasta(c.fecha, hoy) >= 0)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
}

/** "Hoy", "Mañana", "En N días" (§4.3). */
export function textoCountdown(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}
