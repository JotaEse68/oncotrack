import type { Ajustes } from "@/lib/db";

/**
 * IA con la clave propia del paciente (§4.7).
 * La clave vive solo en el dispositivo y viaja únicamente al proveedor
 * que el paciente eligió (API compatible con OpenAI). Jota nunca la ve.
 */

export interface ConfigIA {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

export const IA_DEFAULTS = {
  baseUrl: "https://api.openai.com/v1",
  modelo: "gpt-4o-mini",
} as const;

export function tieneIA(a: Ajustes): boolean {
  return Boolean(a.apiKey?.trim());
}

export function configDesdeAjustes(a: Ajustes): ConfigIA | null {
  if (!tieneIA(a)) return null;
  return {
    apiKey: a.apiKey!.trim(),
    baseUrl: (a.apiBaseUrl?.trim() || IA_DEFAULTS.baseUrl).replace(/\/$/, ""),
    modelo: a.apiModelo?.trim() || IA_DEFAULTS.modelo,
  };
}

type ContenidoMultimodal =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface MensajeIA {
  role: "system" | "user" | "assistant";
  content: ContenidoMultimodal;
}

/** Llamada mínima a /chat/completions (OpenAI-compatible). */
export async function chatCompletion(
  cfg: ConfigIA,
  mensajes: MensajeIA[],
  opts?: { maxTokens?: number }
): Promise<string> {
  let res: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.modelo,
        messages: mensajes,
        ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el proveedor de IA — revisa tu conexión."
    );
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "El proveedor rechazó la clave (401). Revisa que esté bien copiada."
      );
    }
    throw new Error(
      `El proveedor de IA respondió con un error (${res.status}). Inténtalo de nuevo en un momento.`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const contenido = data.choices?.[0]?.message?.content;
  if (!contenido) {
    throw new Error("El proveedor de IA devolvió una respuesta vacía.");
  }
  return contenido;
}

/** Saca el JSON de una respuesta que puede venir envuelta en ```json. */
export function extraerJSON(texto: string): unknown {
  const sinCercas = texto
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  return JSON.parse(sinCercas);
}

export interface MarcadorExtraido {
  nombre: string;
  fecha?: string;
  valor: number;
  unidad: string;
}

const PROMPT_EXTRACCION = `Eres un extractor de datos de analíticas clínicas.
Devuelve SOLO un array JSON con los marcadores de laboratorio visibles en la imagen:
[{"nombre": "...", "fecha": "yyyy-mm-dd", "valor": 0, "unidad": "..."}]
Reglas estrictas:
- No interpretes ni valores los resultados. Nada de "alto", "bajo" o rangos.
- Si la fecha no se ve, omite el campo "fecha".
- Si no hay marcadores legibles, devuelve [].
- Nada de texto fuera del JSON.`;

/** OCR de analíticas (§4.7). La revisión humana posterior es obligatoria. */
export async function extraerMarcadores(
  cfg: ConfigIA,
  imagenDataUrl: string
): Promise<MarcadorExtraido[]> {
  const respuesta = await chatCompletion(cfg, [
    {
      role: "user",
      content: [
        { type: "text", text: PROMPT_EXTRACCION },
        { type: "image_url", image_url: { url: imagenDataUrl } },
      ],
    },
  ]);
  const datos = extraerJSON(respuesta);
  if (!Array.isArray(datos)) return [];
  return datos.filter(
    (d): d is MarcadorExtraido =>
      d &&
      typeof d.nombre === "string" &&
      typeof d.valor === "number" &&
      typeof d.unidad === "string"
  );
}
