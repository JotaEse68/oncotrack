import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

/**
 * Sync opcional oculto con Supabase (§4.11).
 * - Doble puerta: flag de build (NEXT_PUBLIC_ENABLE_CLOUD_SYNC) + opt-in
 *   explícito del paciente. Por defecto, la app no habla con Supabase JAMÁS.
 * - Snapshot manual (subir/descargar), pensado para dos dispositivos propios.
 * - NO viajan: fotos/documentos (tamaño), conversaciones del asistente
 *   (§4.13: solo salen en backup explícito) ni ajustes (contienen el PIN
 *   y la clave de API de este dispositivo).
 */

const TABLAS_SYNC = [
  "perfil",
  "marcadores",
  "sintomas",
  "medicacion",
  "citas",
  "preguntas",
  "sesionesApoyo",
  "radarPerfil",
] as const;

export function syncDisponible(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === "true";
}

export async function iniciarSesion(
  email: string,
  password: string
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function cerrarSesion(): Promise<void> {
  await createClient().auth.signOut();
}

export async function emailActual(): Promise<string | null> {
  const { data } = await createClient().auth.getUser();
  return data.user?.email ?? null;
}

/** Sube el snapshot local (sin documentos, asistente ni ajustes). */
export async function subirSnapshot(): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Inicia sesión primero.");

  const payload: Record<string, unknown[]> = {};
  for (const nombre of TABLAS_SYNC) {
    payload[nombre] = await db.table(nombre).toArray();
  }

  const { error } = await supabase.from("device_snapshots").upsert({
    user_id: auth.user.id,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`No se pudo subir la copia: ${error.message}`);
}

/** Descarga el snapshot y REEMPLAZA las tablas sincronizables locales. */
export async function descargarSnapshot(): Promise<{ fecha: string } | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Inicia sesión primero.");

  const { data, error } = await supabase
    .from("device_snapshots")
    .select("payload, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo descargar: ${error.message}`);
  if (!data) return null;

  const payload = data.payload as Record<string, unknown[]>;
  await db.transaction(
    "rw",
    TABLAS_SYNC.map((n) => db.table(n)),
    async () => {
      for (const nombre of TABLAS_SYNC) {
        const tabla = db.table(nombre);
        await tabla.clear();
        const registros = payload[nombre];
        if (Array.isArray(registros) && registros.length > 0) {
          await tabla.bulkPut(registros);
        }
      }
    }
  );
  return { fecha: data.updated_at as string };
}
