import type { Cita, Pregunta, SesionApoyo } from "@/lib/db";
import { comparacionTexto, type GrupoMarcador } from "@/lib/marcadores";
import { diasHasta, proximaCita, textoCountdown } from "@/lib/fechas";

/**
 * Narrativa de la pantalla Hoy (§1 del spec "con alma").
 * Cuenta los datos del paciente en frases humanas — nunca los juzga:
 * la valoración clínica es siempre del equipo médico.
 */

export interface FraseNarrativa {
  texto: string;
  href?: string;
}

export interface DatosNarrativa {
  nombre?: string;
  grupos: GrupoMarcador[];
  citas: Cita[];
  preguntas: Pregunta[];
  sesiones: SesionApoyo[];
  hoy?: Date;
}

const TIPO_SESION: Record<SesionApoyo["tipo"], string> = {
  terapia: "terapia",
  "psico-oncologia": "psico-oncología",
  otra: "apoyo",
};

/** La sesión futura más cercana, mirando fecha y proximaSesion. */
function proximaSesion(
  sesiones: SesionApoyo[],
  hoy: Date
): { fecha: string; tipo: SesionApoyo["tipo"] } | undefined {
  const candidatas = sesiones
    .flatMap((s) =>
      [s.fecha, s.proximaSesion]
        .filter((f): f is string => Boolean(f))
        .map((fecha) => ({ fecha, tipo: s.tipo }))
    )
    .filter((c) => diasHasta(c.fecha, hoy) >= 0);
  candidatas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return candidatas[0];
}

/**
 * Máx. 4 frases, en orden: marcador más reciente con comparación,
 * próxima cita con countdown y preguntas listas, próxima sesión de apoyo.
 * Sin datos suficientes no inventa nada: devuelve [].
 */
export function construirNarrativa(d: DatosNarrativa): FraseNarrativa[] {
  const hoy = d.hoy ?? new Date();
  const frases: FraseNarrativa[] = [];

  const grupo = d.grupos[0];
  const comparacion = grupo ? comparacionTexto(grupo.puntos) : null;
  if (grupo && comparacion) {
    frases.push({
      texto: `Tu ${grupo.nombre}: ${comparacion} — solo tu equipo médico puede valorarlo.`,
      href: "/salud/marcadores",
    });
  }

  const cita = proximaCita(d.citas, hoy);
  if (cita) {
    const dias = diasHasta(cita.fecha, hoy);
    const pendientes = d.preguntas.filter(
      (p) => p.citaId === cita.id && p.resuelta === 0
    ).length;
    const quien = cita.especialista ?? "tu próxima cita";
    const coda =
      pendientes === 0
        ? ""
        : pendientes === 1
          ? " — tienes 1 pregunta lista"
          : ` — tienes ${pendientes} preguntas listas`;
    frases.push({
      texto: `${textoCountdown(dias)}: ${quien}${coda}.`,
      href: "/citas",
    });
  }

  const sesion = proximaSesion(d.sesiones, hoy);
  if (sesion) {
    frases.push({
      texto: `${textoCountdown(diasHasta(sesion.fecha, hoy))}: tu sesión de ${TIPO_SESION[sesion.tipo]}.`,
      href: "/apoyo/sesiones",
    });
  }

  return frases.slice(0, 4);
}
