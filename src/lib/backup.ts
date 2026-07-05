import { db, type Ajustes } from "@/lib/db";

/**
 * Backup / exportación local (§4.6).
 * Todo se genera en el dispositivo; nada se sube a ningún servidor.
 */

const NOMBRES_LEGIBLES: Record<string, string> = {
  perfil: "perfil",
  marcadores: "marcadores",
  sintomas: "síntomas",
  medicacion: "medicación",
  citas: "citas",
  preguntas: "preguntas",
  documentos: "documentos",
  sesionesApoyo: "sesiones de apoyo",
  conversacionesAsistente: "mensajes del asistente",
  radarPerfil: "perfil del radar",
  ajustes: "ajustes",
};

function aBase64(bytes: Uint8Array): string {
  let binario = "";
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario);
}

async function serializarRegistro(registro: unknown): Promise<unknown> {
  if (registro && typeof registro === "object") {
    const copia: Record<string, unknown> = {
      ...(registro as Record<string, unknown>),
    };
    for (const [clave, valor] of Object.entries(copia)) {
      if (valor instanceof Blob) {
        const bytes = new Uint8Array(await valor.arrayBuffer());
        copia[clave] = { __base64: aBase64(bytes), tipo: valor.type };
      }
    }
    return copia;
  }
  return registro;
}

/** Exporta toda la base local: JSON completo + resumen legible. */
export async function exportarDatos(): Promise<{
  contenido: string;
  resumen: string;
}> {
  const tablas: Record<string, unknown[]> = {};
  const lineas: string[] = [];

  for (const tabla of db.tables) {
    const registros = await tabla.toArray();
    tablas[tabla.name] = await Promise.all(registros.map(serializarRegistro));
    if (registros.length > 0 && tabla.name !== "ajustes") {
      lineas.push(
        `- ${registros.length} ${NOMBRES_LEGIBLES[tabla.name] ?? tabla.name}`
      );
    }
  }

  const exportado = new Date().toISOString();
  const resumen = [
    `Copia de tus datos de OncoTrack — ${exportado.slice(0, 10)}`,
    ...(lineas.length > 0 ? lineas : ["- (sin registros todavía)"]),
    "Guarda este archivo donde tú decidas. Nadie más tiene acceso a él.",
  ].join("\n");

  const contenido = JSON.stringify({ version: 1, exportado, resumen, tablas });
  return { contenido, resumen };
}

const MS_DIA = 24 * 60 * 60 * 1000;
const DIAS_LIMITE = 30;
const REGISTROS_LIMITE = 10;

/** ¿Toca recordar al paciente que guarde una copia? (§4.6) */
export function necesitaRecordatorio(
  a: Ajustes,
  hoy: Date = new Date()
): boolean {
  if (a.registrosDesdeBackup >= REGISTROS_LIMITE) return true;
  if (!a.ultimoBackup) return a.registrosDesdeBackup > 0;
  const dias = (hoy.getTime() - new Date(a.ultimoBackup).getTime()) / MS_DIA;
  return dias > DIAS_LIMITE;
}
