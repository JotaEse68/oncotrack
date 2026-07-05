/**
 * PIN local opcional (§4.2).
 * PBKDF2-SHA256 con salt aleatorio — nunca se guarda el PIN en texto plano.
 * Es un candado de pantalla frente a miradas ajenas, no cifrado de datos.
 */

const ITERACIONES = 310_000;

function aHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function deHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Salt aleatorio de 16 bytes, en hex. */
export function nuevoSalt(): string {
  return aHex(crypto.getRandomValues(new Uint8Array(16)));
}

/** Deriva un hash hex de 32 bytes a partir del PIN y el salt. */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: deHex(saltHex) as BufferSource,
      iterations: ITERACIONES,
    },
    material,
    256
  );
  return aHex(new Uint8Array(bits));
}

/** Comprueba un PIN contra el hash guardado (comparación en tiempo constante). */
export async function verifyPin(
  pin: string,
  saltHex: string,
  hashHex: string
): Promise<boolean> {
  const candidato = await hashPin(pin, saltHex);
  if (candidato.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidato.length; i++) {
    diff |= candidato.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
