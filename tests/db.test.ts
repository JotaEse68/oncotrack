import { beforeEach, describe, expect, it } from "vitest";
import { db, getAjustes, saveAjustes } from "@/lib/db";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("esquema local", () => {
  it("tiene las 11 tablas del documento §2", () => {
    const nombres = db.tables.map((t) => t.name).sort();
    expect(nombres).toEqual(
      [
        "ajustes",
        "citas",
        "conversacionesAsistente",
        "documentos",
        "marcadores",
        "medicacion",
        "perfil",
        "preguntas",
        "radarPerfil",
        "sesionesApoyo",
        "sintomas",
      ].sort()
    );
  });

  it("guarda y recupera un marcador", async () => {
    const id = await db.marcadores.add({
      nombre: "Cromogranina A",
      fecha: "2026-07-01",
      valor: 84,
      unidad: "ng/mL",
    });
    const m = await db.marcadores.get(id);
    expect(m?.valor).toBe(84);
  });

  it("getAjustes crea defaults (tema claro, sin PIN, sync apagado)", async () => {
    const a = await getAjustes();
    expect(a.tema).toBe("claro");
    expect(a.pinHash).toBeUndefined();
    expect(a.syncActivado).toBe(0);
    expect(a.onboardingVisto).toBe(0);
  });

  it("saveAjustes hace merge parcial", async () => {
    await saveAjustes({ tema: "oscuro" });
    const a = await getAjustes();
    expect(a.tema).toBe("oscuro");
    expect(a.syncActivado).toBe(0);
  });
});
