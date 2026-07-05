/**
 * Enlace temporal para compartir SIN servidor (§4.5).
 * Los datos viajan comprimidos (deflate) y cifrados (AES-GCM 256) dentro del
 * fragmento de la URL (#…), que el navegador nunca envía a ningún servidor.
 * La caducidad viaja DENTRO del cifrado, junto a los datos.
 */

export interface PaqueteCompartido {
  caducidad: string; // ISO yyyy-mm-dd — válido hasta el final de ese día
  ambito: "todo" | "marcadores" | "medicacion";
  nombre?: string;
  datos: Record<string, unknown[]>;
}

export class PaqueteInvalidoError extends Error {
  constructor() {
    super("El enlace no es válido o está dañado.");
    this.name = "PaqueteInvalidoError";
  }
}

// ---------- utilidades binarias ----------

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function comprimir(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function descomprimir(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---------- codec ----------

/** JSON → deflate → AES-GCM → "datos.clave.iv" en base64url. */
export async function codificarPaquete(p: PaqueteCompartido): Promise<string> {
  const plano = new TextEncoder().encode(JSON.stringify(p));
  const comprimido = await comprimir(plano);

  const clave = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      clave,
      comprimido as BufferSource
    )
  );
  const claveCruda = new Uint8Array(
    await crypto.subtle.exportKey("raw", clave)
  );

  return `${aBase64Url(cifrado)}.${aBase64Url(claveCruda)}.${aBase64Url(iv)}`;
}

/** Inverso de codificarPaquete. Lanza PaqueteInvalidoError si algo no cuadra. */
export async function decodificarPaquete(
  fragmento: string
): Promise<PaqueteCompartido> {
  try {
    const [datosB64, claveB64, ivB64] = fragmento.split(".");
    if (!datosB64 || !claveB64 || !ivB64) throw new Error("formato");

    const clave = await crypto.subtle.importKey(
      "raw",
      deBase64Url(claveB64) as BufferSource,
      "AES-GCM",
      false,
      ["decrypt"]
    );
    const descifrado = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: deBase64Url(ivB64) as BufferSource },
        clave,
        deBase64Url(datosB64) as BufferSource
      )
    );
    const plano = await descomprimir(descifrado);
    const p = JSON.parse(new TextDecoder().decode(plano));
    if (!p || typeof p.caducidad !== "string" || typeof p.datos !== "object") {
      throw new Error("estructura");
    }
    return p as PaqueteCompartido;
  } catch {
    throw new PaqueteInvalidoError();
  }
}

/** El enlace vale hasta el final del día de caducidad (hora local). */
export function haCaducado(
  p: PaqueteCompartido,
  ahora: Date = new Date()
): boolean {
  const [y, m, d] = p.caducidad.split("-").map(Number);
  const finDelDia = new Date(y, m - 1, d, 23, 59, 59, 999);
  return ahora.getTime() > finDelDia.getTime();
}
