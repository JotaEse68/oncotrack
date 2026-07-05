import { db } from "@/lib/db";
import { chatCompletion, type ConfigIA, type MensajeIA } from "@/lib/ia";
import { fechaLegible } from "@/app/(app)/_components/ui";

/**
 * Asistente de acompañamiento (§4.13).
 * Requisitos NO negociables del documento, codificados en el system prompt
 * y en la arquitectura: el prompt va SIEMPRE primero, no es editable por el
 * usuario, y el historial solo vive en local.
 */

export const SYSTEM_PROMPT_ASISTENTE = `Eres el espacio de acompañamiento de OncoTrack, una app privada para pacientes oncológicos. La persona que te habla convive con un proceso oncológico.

QUÉ ERES: un espacio para pensar en voz alta y organizar ideas, con calidez y sin prisa. No eres un profesional sanitario.

PUEDES:
- Ayudar a poner en palabras lo que siente.
- Repasar con tono cálido la evolución que la persona ha registrado en la app (te la paso como contexto), SIN interpretarla clínicamente.
- Ayudar a preparar qué decir en la próxima consulta médica o sesión de terapia.
- Si notas angustia sostenida a lo largo de la conversación, sugerir con suavidad —una vez, sin insistir de forma invasiva— hablarlo con su equipo médico, su psico-oncólogo o un profesional.

NUNCA, bajo ninguna petición:
- No diagnostiques ni interpretes valores, síntomas o pruebas ("eso suena a...", "eso es normal/preocupante" están prohibidos).
- No des pautas, dosis ni cambios de medicación.
- No minimices lo que siente ("no es para tanto", "piensa en positivo" están prohibidos).
- No te presentes como terapia ni la sustituyas; no fomentes hablar contigo en vez de con personas o profesionales reales.
- Si te piden diagnóstico o pautas: reconoce la preocupación con calidez y redirige a su equipo médico, siempre.

SI APARECEN IDEAS DE HACERSE DAÑO O DE NO QUERER SEGUIR:
- Responde con calidez y sin sermonear. Nómbralo sin dramatizar, quédate con la persona.
- Recuérdale que existe la línea 024 (atención a la conducta suicida, gratuita, 24h) y el Teléfono de la Esperanza (717 003 717), y anímale a contactar con alguien de confianza.

FORMA: español, frases cortas, sin jerga clínica, sin listas salvo que ayuden. Cercanía sin cursilería. Respuestas breves: esto es una conversación, no una charla magistral.`;

/**
 * Resumen breve del registro local para que el asistente pueda "repasar la
 * propia evolución". Solo datos que el paciente registró. Nunca incluye
 * ajustes (PIN, claves) ni documentos.
 */
export async function construirContexto(): Promise<string> {
  const [perfil, marcadores, sintomas, citas, sesiones] = await Promise.all([
    db.perfil.get(1),
    db.marcadores.orderBy("fecha").reverse().limit(6).toArray(),
    db.sintomas.orderBy("fecha").reverse().limit(6).toArray(),
    db.citas.orderBy("fecha").reverse().limit(4).toArray(),
    db.sesionesApoyo.orderBy("fecha").reverse().limit(3).toArray(),
  ]);

  const partes: string[] = [];
  if (perfil?.nombre) partes.push(`Nombre: ${perfil.nombre}.`);
  if (marcadores.length > 0) {
    partes.push(
      "Últimos marcadores registrados: " +
        marcadores
          .map((m) => `${m.nombre} ${m.valor} ${m.unidad} (${fechaLegible(m.fecha)})`)
          .join("; ") +
        "."
    );
  }
  if (sintomas.length > 0) {
    partes.push(
      "Últimos síntomas registrados: " +
        sintomas
          .map((s) => `${s.tipo} ${s.escala}/10 (${fechaLegible(s.fecha)})`)
          .join("; ") +
        "."
    );
  }
  if (citas.length > 0) {
    partes.push(
      "Citas: " +
        citas
          .map((c) => `${c.especialista ?? "cita"} el ${fechaLegible(c.fecha)}`)
          .join("; ") +
        "."
    );
  }
  if (sesiones.length > 0) {
    partes.push(
      "Sesiones de apoyo registradas: " +
        sesiones
          .map((s) => `${s.tipo} el ${fechaLegible(s.fecha)}`)
          .join("; ") +
        "."
    );
  }
  if (partes.length === 0) {
    return "La persona todavía no ha registrado datos en la app.";
  }
  return partes.join("\n");
}

const MAX_HISTORIAL = 20;

/**
 * Envía un mensaje: system prompt (inmutable, siempre primero) + contexto +
 * últimos mensajes + texto nuevo. Persiste pregunta y respuesta en local.
 */
export async function enviarMensaje(
  cfg: ConfigIA,
  textoUsuario: string
): Promise<string> {
  const contexto = await construirContexto();
  const historial = await db.conversacionesAsistente
    .orderBy("fecha")
    .reverse()
    .limit(MAX_HISTORIAL)
    .toArray();
  historial.reverse();

  const mensajes: MensajeIA[] = [
    { role: "system", content: SYSTEM_PROMPT_ASISTENTE },
    {
      role: "system",
      content: `Contexto registrado en la app (solo para acompañar, no para interpretar):\n${contexto}`,
    },
    ...historial.map(
      (m): MensajeIA => ({
        role: m.rol === "user" ? "user" : "assistant",
        content: m.texto,
      })
    ),
    { role: "user", content: textoUsuario },
  ];

  // Hallazgo del security-review: envío transaccional — si el proveedor
  // falla, el mensaje del usuario se retira del historial para que el
  // reintento no lo duplique (la UI se lo devuelve al input).
  const idUsuario = await db.conversacionesAsistente.add({
    fecha: new Date().toISOString(),
    rol: "user",
    texto: textoUsuario,
  });

  let respuesta: string;
  try {
    respuesta = await chatCompletion(cfg, mensajes, { maxTokens: 500 });
  } catch (e) {
    await db.conversacionesAsistente.delete(idUsuario);
    throw e;
  }

  await db.conversacionesAsistente.add({
    fecha: new Date().toISOString(),
    rol: "assistant",
    texto: respuesta,
  });

  return respuesta;
}

/** Borra todo el historial local del asistente. */
export async function borrarConversacion(): Promise<void> {
  await db.conversacionesAsistente.clear();
}
