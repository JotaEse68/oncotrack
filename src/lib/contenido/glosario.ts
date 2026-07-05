/**
 * Glosario en lenguaje llano (§4.9).
 * Sin tecnicismos, sin rangos "normales", sin interpretación diagnóstica:
 * cada término se explica en 2-3 frases para quitar miedo, no para valorar.
 */

export interface TerminoGlosario {
  termino: string;
  queEs: string;
}

export const GLOSARIO: TerminoGlosario[] = [
  {
    termino: "Cromogranina A",
    queEs:
      "Es una proteína que producen ciertas células del cuerpo, entre ellas las de los tumores neuroendocrinos. Se mide en sangre y a tu equipo médico le sirve para seguir la evolución a lo largo del tiempo. Puede subir o bajar por muchos motivos (incluso por algunos medicamentos del estómago), así que un valor suelto dice poco: lo que importa es la tendencia, y eso lo valora tu médico.",
  },
  {
    termino: "NSE (enolasa neuronal específica)",
    queEs:
      "Otra proteína que se mide en sangre y que puede acompañar a los tumores neuroendocrinos. Como la Cromogranina A, es una pieza más del seguimiento — nunca un veredicto por sí sola.",
  },
  {
    termino: "Serotonina en orina de 24 horas",
    queEs:
      "Algunos tumores neuroendocrinos producen serotonina de más. Para medirla bien se recoge toda la orina de un día entero. Es una prueba incómoda pero útil para que tu equipo vea cómo se comporta el tumor.",
  },
  {
    termino: "5-HIAA",
    queEs:
      "Es el 'resto' que queda cuando el cuerpo procesa la serotonina, y también se mide en la orina de 24 horas. Cuenta una historia parecida a la de la serotonina: ayuda al seguimiento, no da diagnósticos por sí solo.",
  },
  {
    termino: "Ki-67",
    queEs:
      "Aparece en los informes de biopsia. Indica qué proporción de células del tumor estaban dividiéndose en ese momento — una forma de describir su ritmo. Tu oncólogo lo usa junto a muchas otras cosas para decidir el mejor plan.",
  },
  {
    termino: "Octreoscán / PET-DOTA",
    queEs:
      "Son pruebas de imagen pensadas especialmente para los tumores neuroendocrinos. Usan una sustancia que se pega a las células del tumor y las hace visibles en la imagen, para saber dónde está y cómo responde.",
  },
];
