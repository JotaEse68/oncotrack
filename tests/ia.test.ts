import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chatCompletion,
  extraerJSON,
  extraerMarcadores,
  tieneIA,
  type ConfigIA,
} from "@/lib/ia";

const CFG: ConfigIA = {
  apiKey: "sk-test-123",
  baseUrl: "https://api.openai.com/v1",
  modelo: "gpt-4o-mini",
};

function mockFetchOk(contenido: string) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: contenido } }] }),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tieneIA", () => {
  it("true solo con clave no vacía", () => {
    expect(
      tieneIA({ apiKey: "sk-x", tema: "claro", registrosDesdeBackup: 0, syncActivado: 0, onboardingVisto: 0 })
    ).toBe(true);
    expect(
      tieneIA({ apiKey: "  ", tema: "claro", registrosDesdeBackup: 0, syncActivado: 0, onboardingVisto: 0 })
    ).toBe(false);
  });
});

describe("chatCompletion", () => {
  it("manda Authorization Bearer y devuelve el contenido", async () => {
    const f = mockFetchOk("hola");
    vi.stubGlobal("fetch", f);

    const res = await chatCompletion(CFG, [{ role: "user", content: "hola" }]);
    expect(res).toBe("hola");

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-test-123"
    );
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("gpt-4o-mini");
  });

  it("error HTTP → mensaje claro en español", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
    );
    await expect(
      chatCompletion(CFG, [{ role: "user", content: "x" }])
    ).rejects.toThrow(/clave|conexión|401/i);
  });
});

describe("extraerJSON", () => {
  it("parsea JSON directo y envuelto en ```json", () => {
    expect(extraerJSON('[{"a":1}]')).toEqual([{ a: 1 }]);
    expect(extraerJSON('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
  });
});

describe("extraerMarcadores", () => {
  it("devuelve los marcadores extraídos por el modelo", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        '```json\n[{"nombre":"Cromogranina A","fecha":"2026-07-01","valor":84,"unidad":"ng/mL"}]\n```'
      )
    );
    const res = await extraerMarcadores(CFG, "data:image/jpeg;base64,xxxx");
    expect(res).toHaveLength(1);
    expect(res[0].nombre).toBe("Cromogranina A");
    expect(res[0].valor).toBe(84);
  });
});
