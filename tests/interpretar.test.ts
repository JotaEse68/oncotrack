import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  aplicarPropuestas,
  interpretarTexto,
  type RegistroPropuesto,
} from "@/lib/interpretar";
import type { ConfigIA } from "@/lib/ia";

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

describe("interpretarTexto", () => {
  it("convierte el relato en propuestas tipadas y manda contexto al modelo", async () => {
    const f = mockFetchOk(
      '```json\n[{"tipo":"sintoma","datos":{"tipo":"Flushing","escala":7}},{"tipo":"toma","datos":{"nombre":"Lanreotida"}}]\n```'
    );
    vi.stubGlobal("fetch", f);

    const props = await interpretarTexto(
      CFG,
      "hoy flushing fuerte, un 7, y me puse la lanreotida",
      { medicaciones: ["Lanreotida", "Everolimus"] }
    );

    expect(props).toHaveLength(2);
    expect(props[0].tipo).toBe("sintoma");
    expect(props[1].tipo).toBe("toma");

    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    const body = String(init.body);
    expect(body).toContain("Lanreotida");
    expect(body).toContain("Everolimus");
    expect(body).toContain("JSON");
  });

  it("respuesta malformada → error claro", async () => {
    vi.stubGlobal("fetch", mockFetchOk("no soy json"));
    await expect(
      interpretarTexto(CFG, "algo", { medicaciones: [] })
    ).rejects.toThrow(/no se pudo entender/i);
  });

  it("respuesta que no es array → error claro", async () => {
    vi.stubGlobal("fetch", mockFetchOk('{"tipo":"sintoma"}'));
    await expect(
      interpretarTexto(CFG, "algo", { medicaciones: [] })
    ).rejects.toThrow(/no se pudo entender/i);
  });
});

describe("aplicarPropuestas", () => {
  beforeEach(async () => {
    await Promise.all([
      db.sintomas.clear(),
      db.medicacion.clear(),
      db.marcadores.clear(),
      db.citas.clear(),
    ]);
  });

  it("guarda el síntoma con fecha de hoy", async () => {
    const props: RegistroPropuesto[] = [
      { tipo: "sintoma", datos: { tipo: "Flushing", escala: 7 } },
    ];
    const n = await aplicarPropuestas(props);
    expect(n).toBe(1);

    const sintomas = await db.sintomas.toArray();
    expect(sintomas).toHaveLength(1);
    expect(sintomas[0].tipo).toBe("Flushing");
    expect(sintomas[0].escala).toBe(7);
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    expect(sintomas[0].fecha).toBe(hoyISO);
  });

  it("la toma actualiza ultimaToma e historial de la medicación existente (case-insensitive)", async () => {
    await db.medicacion.add({ nombre: "Lanreotida", historial: [] });
    const n = await aplicarPropuestas([
      { tipo: "toma", datos: { nombre: "lanreotida" } },
    ]);
    expect(n).toBe(1);

    const meds = await db.medicacion.toArray();
    expect(meds).toHaveLength(1);
    expect(meds[0].ultimaToma).toBeTruthy();
    expect(meds[0].historial).toHaveLength(1);
  });

  it("si la medicación no existe, la crea con su primera toma", async () => {
    await aplicarPropuestas([
      { tipo: "toma", datos: { nombre: "Octreotida" } },
    ]);
    const meds = await db.medicacion.toArray();
    expect(meds).toHaveLength(1);
    expect(meds[0].nombre).toBe("Octreotida");
    expect(meds[0].historial).toHaveLength(1);
    expect(meds[0].ultimaToma).toBeTruthy();
  });
});
