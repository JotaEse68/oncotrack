import { beforeEach, describe, expect, it } from "vitest";
import { db, type Ajustes } from "@/lib/db";
import { exportarDatos, necesitaRecordatorio } from "@/lib/backup";

const AJUSTES_BASE: Ajustes = {
  id: 1,
  tema: "claro",
  registrosDesdeBackup: 0,
  syncActivado: 0,
  onboardingVisto: 0,
};

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("exportarDatos", () => {
  it("incluye todas las tablas con sus registros y un resumen legible", async () => {
    await db.marcadores.bulkAdd([
      { nombre: "Cromogranina A", fecha: "2026-06-01", valor: 90, unidad: "ng/mL" },
      { nombre: "Cromogranina A", fecha: "2026-07-01", valor: 84, unidad: "ng/mL" },
    ]);
    await db.citas.add({ fecha: "2026-07-11", especialista: "Dr. García" });

    const { contenido, resumen } = await exportarDatos();
    const json = JSON.parse(contenido);

    expect(json.version).toBe(1);
    expect(json.exportado).toBeTruthy();
    expect(json.tablas.marcadores).toHaveLength(2);
    expect(json.tablas.citas[0].especialista).toBe("Dr. García");
    expect(resumen).toContain("2");
    expect(resumen.toLowerCase()).toContain("marcadores");
  });

  it("serializa blobs de documentos como base64", async () => {
    const blob = new Blob(["hola-analitica"], { type: "text/plain" });
    await db.documentos.add({
      nombre: "analitica.txt",
      tipo: "text/plain",
      fecha: "2026-07-01",
      blob,
    });
    const { contenido } = await exportarDatos();
    const json = JSON.parse(contenido);
    const doc = json.tablas.documentos[0];
    expect(doc.blob.__base64).toBeTruthy();
    expect(atob(doc.blob.__base64)).toBe("hola-analitica");
  });
});

describe("necesitaRecordatorio", () => {
  const HOY = new Date("2026-07-05T10:00:00");

  it("false recién hecho el backup", () => {
    const a = { ...AJUSTES_BASE, ultimoBackup: "2026-07-04T09:00:00Z" };
    expect(necesitaRecordatorio(a, HOY)).toBe(false);
  });

  it("true pasados más de 30 días", () => {
    const a = { ...AJUSTES_BASE, ultimoBackup: "2026-06-01T09:00:00Z" };
    expect(necesitaRecordatorio(a, HOY)).toBe(true);
  });

  it("true con 10+ registros nuevos aunque el backup sea reciente", () => {
    const a = {
      ...AJUSTES_BASE,
      ultimoBackup: "2026-07-04T09:00:00Z",
      registrosDesdeBackup: 10,
    };
    expect(necesitaRecordatorio(a, HOY)).toBe(true);
  });

  it("true si nunca hubo backup y ya hay registros", () => {
    const a = { ...AJUSTES_BASE, registrosDesdeBackup: 1 };
    expect(necesitaRecordatorio(a, HOY)).toBe(true);
  });

  it("false si nunca hubo backup pero tampoco hay nada que guardar", () => {
    expect(necesitaRecordatorio(AJUSTES_BASE, HOY)).toBe(false);
  });
});
