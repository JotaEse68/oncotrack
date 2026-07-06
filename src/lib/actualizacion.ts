/**
 * Recuperación tras un deploy (fix "botones muertos").
 * La app instalada puede quedarse con HTML viejo que referencia chunks de
 * JS que ya no existen en el servidor: los toques que navegan a pantallas
 * nuevas fallan en silencio. Detectamos ese fallo y recargamos una vez
 * (con guarda anti-bucle) para traer la versión nueva.
 */

const PATRONES_FALLO = [
  /chunkloaderror/i,
  /loading chunk .* failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
];

/** ¿Es este mensaje un fallo de carga de código (app desactualizada)? */
export function esFalloDeCarga(mensaje: string): boolean {
  return PATRONES_FALLO.some((p) => p.test(mensaje));
}

const MS_ENTRE_RECARGAS = 60_000;

/** Solo una recarga automática por minuto — nunca un bucle de recargas. */
export function debeRecargar(
  ahora: number,
  ultimaRecarga: number | null
): boolean {
  if (ultimaRecarga === null) return true;
  return ahora - ultimaRecarga > MS_ENTRE_RECARGAS;
}
