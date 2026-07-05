/**
 * Recursos de ayuda reales (§4.9, §4.13).
 * Siempre visibles donde tocan — nunca escondidos en un submenú.
 */

export interface RecursoAyuda {
  nombre: string;
  telefono?: string;
  url?: string;
  descripcion: string;
}

/** Líneas de ayuda inmediata — se muestran SIEMPRE en el asistente. */
export const LINEAS_AYUDA: RecursoAyuda[] = [
  {
    nombre: "Línea 024",
    telefono: "024",
    descripcion:
      "Atención a la conducta suicida. Gratuita, confidencial, 24 horas, toda España.",
  },
  {
    nombre: "Teléfono de la Esperanza",
    telefono: "717 003 717",
    url: "https://telefonodelaesperanza.org",
    descripcion: "Apoyo emocional en crisis, 24 horas.",
  },
];

/** Asociaciones de pacientes y apoyo psico-oncológico. */
export const ASOCIACIONES: RecursoAyuda[] = [
  {
    nombre: "NET España",
    url: "https://www.netespana.org",
    descripcion:
      "Asociación española de pacientes con tumores neuroendocrinos.",
  },
  {
    nombre: "FEDER",
    url: "https://www.enfermedades-raras.org",
    descripcion: "Federación Española de Enfermedades Raras.",
  },
  {
    nombre: "Asociación Española Contra el Cáncer",
    telefono: "900 100 036",
    url: "https://www.contraelcancer.es",
    descripcion:
      "Apoyo psicológico gratuito para pacientes y familiares, 24 horas.",
  },
];

export const RECURSOS_AYUDA: RecursoAyuda[] = [
  ...LINEAS_AYUDA,
  ...ASOCIACIONES,
];
