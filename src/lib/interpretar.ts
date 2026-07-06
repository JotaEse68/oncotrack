import { db, contarRegistroNuevo } from "@/lib/db";
import { chatCompletion, extraerJSON, type ConfigIA } from "@/lib/ia";
import { hoyISO } from "@/app/(app)/_components/ui";

/**
 * Intérprete de texto libre del paciente (spec §2 🎤).
 * Convierte "hoy flushing fuerte, un 7, y me puse la lanreotida" en
 * registros propuestos — que SIEMPRE pasan por revisión humana antes
 * de guardarse. Nunca diagnostica ni comenta.
 */

export type RegistroPropuesto =
  | { tipo: "sintoma"; datos: { tipo: string; escala: number; nota?: string } }
  | { tipo: "toma"; datos: { nombre: string } }
  | {
      tipo: "marcador";
      datos: { nombre: string; valor: number; unidad: string; fecha?: string };
    }
  | { tipo: "cita"; datos: { fecha: string; hora?: string; especialista?: string } };

function promptInterprete(medicaciones: string[], hoy: string): string {
  return `Eres un intérprete de notas de un paciente oncológico. Convierte su texto libre en un array JSON de registros, sin comentar nada.
Tipos posibles (usa solo los que el texto mencione de verdad):
[{"tipo":"sintoma","datos":{"tipo":"...","escala":0,"nota":"..."}},
 {"tipo":"toma","datos":{"nombre":"..."}},
 {"tipo":"marcador","datos":{"nombre":"...","valor":0,"unidad":"...","fecha":"yyyy-mm-dd"}},
 {"tipo":"cita","datos":{"fecha":"yyyy-mm-dd","hora":"HH:mm","especialista":"..."}}]
Reglas estrictas:
- NUNCA diagnostiques, valores ni comentes los datos. Solo transcribe.
- Escala del síntoma: 0-10 solo si el texto la menciona; si falta, usa 5 y añade "nota":"(intensidad estimada)".
- Fechas relativas ("ayer", "el martes") → ISO respecto a hoy, que es ${hoy}.
- Medicaciones del paciente: ${medicaciones.length > 0 ? medicaciones.join(", ") : "(ninguna registrada)"}. Si una toma se parece a una de ellas, usa el nombre exacto de la lista.
- Si no hay nada registrable, devuelve [].
- Nada de texto fuera del array JSON.`;
}

function esPropuesta(x: unknown): x is RegistroPropuesto {
  if (!x || typeof x !== "object") return false;
  const p = x as { tipo?: unknown; datos?: unknown };
  if (typeof p.tipo !== "string" || !p.datos || typeof p.datos !== "object")
    return false;
  const d = p.datos as Record<string, unknown>;
  switch (p.tipo) {
    case "sintoma":
      return typeof d.tipo === "string" && typeof d.escala === "number";
    case "toma":
      return typeof d.nombre === "string";
    case "marcador":
      return (
        typeof d.nombre === "string" &&
        typeof d.valor === "number" &&
        typeof d.unidad === "string"
      );
    case "cita":
      return typeof d.fecha === "string";
    default:
      return false;
  }
}

export async function interpretarTexto(
  cfg: ConfigIA,
  texto: string,
  ctx: { medicaciones: string[] }
): Promise<RegistroPropuesto[]> {
  const respuesta = await chatCompletion(cfg, [
    { role: "system", content: promptInterprete(ctx.medicaciones, hoyISO()) },
    { role: "user", content: texto },
  ]);

  let datos: unknown;
  try {
    datos = extraerJSON(respuesta);
  } catch {
    throw new Error(
      "No se pudo entender la respuesta de la IA. Inténtalo de nuevo o usa los formularios."
    );
  }
  if (!Array.isArray(datos)) {
    throw new Error(
      "No se pudo entender la respuesta de la IA. Inténtalo de nuevo o usa los formularios."
    );
  }
  return datos.filter(esPropuesta);
}

/** Guarda las propuestas ya revisadas por el paciente. Devuelve nº guardados. */
export async function aplicarPropuestas(
  props: RegistroPropuesto[]
): Promise<number> {
  let guardados = 0;
  for (const p of props) {
    if (p.tipo === "sintoma") {
      await db.sintomas.add({
        fecha: hoyISO(),
        tipo: p.datos.tipo,
        escala: p.datos.escala,
        ...(p.datos.nota ? { nota: p.datos.nota } : {}),
      });
    } else if (p.tipo === "toma") {
      const nombre = p.datos.nombre.trim();
      const existente = (await db.medicacion.toArray()).find(
        (m) => m.nombre.toLowerCase() === nombre.toLowerCase()
      );
      const toma = { fecha: hoyISO() };
      if (existente) {
        await db.medicacion.update(existente.id!, {
          ultimaToma: hoyISO(),
          historial: [...existente.historial, toma],
        });
      } else {
        await db.medicacion.add({
          nombre,
          ultimaToma: hoyISO(),
          historial: [toma],
        });
      }
    } else if (p.tipo === "marcador") {
      await db.marcadores.add({
        nombre: p.datos.nombre.trim(),
        fecha: p.datos.fecha || hoyISO(),
        valor: p.datos.valor,
        unidad: p.datos.unidad.trim(),
      });
    } else {
      await db.citas.add({
        fecha: p.datos.fecha,
        ...(p.datos.hora ? { hora: p.datos.hora } : {}),
        ...(p.datos.especialista
          ? { especialista: p.datos.especialista }
          : {}),
      });
    }
    guardados++;
    await contarRegistroNuevo();
  }
  return guardados;
}
