/**
 * Saneado de texto de formularios.
 * Algunos navegadores móviles, al elegir una sugerencia de autocompletado
 * con el teclado en composición, AÑADEN el texto en vez de reemplazarlo
 * ("Cromogranina A" → "Cromogranina ACromogranina A"). Si el valor es
 * exactamente una cadena repetida dos veces, se colapsa a una.
 */
export function colapsarDuplicado(texto: string): string {
  const t = texto.trim();
  if (t.length >= 2 && t.length % 2 === 0) {
    const mitad = t.length / 2;
    if (t.slice(0, mitad) === t.slice(mitad)) return t.slice(0, mitad);
  }
  return t;
}
