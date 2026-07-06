import { describe, expect, it } from "vitest";
import { construirNarrativa, type DatosNarrativa } from "@/lib/narrativa";
import { FRASES_CURADAS, fraseDelDia } from "@/lib/contenido/frases";
import { agruparPorNombre } from "@/lib/marcadores";

const HOY = new Date("2026-07-06T10:00:00");
const BASE: DatosNarrativa = {
  nombre: "Ana",
  grupos: agruparPorNombre([
    { id: 1, nombre: "Cromogranina A", fecha: "2023-02-15", valor: 302.8, unidad: "ng/mL" },
    { id: 2, nombre: "Cromogranina A", fecha: "2023-03-15", valor: 342, unidad: "ng/mL" },
  ]),
  citas: [{ id: 1, fecha: "2026-07-12", especialista: "Dr. García" }],
  preguntas: [
    { id: 1, texto: "¿…?", citaId: 1, creada: "2026-07-01", resuelta: 0 },
    { id: 2, texto: "¿…?", citaId: 1, creada: "2026-07-01", resuelta: 0 },
  ],
  sesiones: [],
  hoy: HOY,
};
const PROHIBIDAS = ["normal", "anormal", " bien", " mal", "preocupante", "peligro", "tranquila"];

describe("construirNarrativa", () => {
  it("narra el marcador con su comparación y la coletilla médica", () => {
    const f = construirNarrativa(BASE);
    const m = f.find((x) => x.texto.includes("Cromogranina A"))!;
    expect(m.texto).toContain("un 13% más");
    expect(m.texto).toContain("equipo médico");
    expect(m.href).toBe("/salud/marcadores");
  });
  it("narra la próxima cita con countdown y preguntas listas", () => {
    const c = construirNarrativa(BASE).find((x) => x.href === "/citas")!;
    expect(c.texto).toContain("En 6 días");
    expect(c.texto).toContain("Dr. García");
    expect(c.texto).toContain("2 preguntas");
  });
  it("sin datos devuelve vacío y nunca inventa", () => {
    expect(construirNarrativa({ grupos: [], citas: [], preguntas: [], sesiones: [], hoy: HOY })).toEqual([]);
  });
  it("vocabulario prohibido fuera", () => {
    for (const f of construirNarrativa(BASE)) {
      for (const p of PROHIBIDAS) expect(f.texto.toLowerCase()).not.toContain(p);
    }
  });
});

describe("fraseDelDia", () => {
  it("es determinista para una misma fecha", () => {
    const d = { ...BASE, totalRegistros: 14 };
    expect(fraseDelDia(d, HOY)).toBe(fraseDelDia(d, HOY));
  });
  it("cambia entre días distintos (con pool > 1)", () => {
    const d = { ...BASE, totalRegistros: 14 };
    const a = fraseDelDia(d, new Date("2026-07-06"));
    const b = fraseDelDia(d, new Date("2026-07-07"));
    expect(FRASES_CURADAS.length).toBeGreaterThanOrEqual(15);
    expect(a === b).toBe(false); // pools contiguos ≥15: colisión improbable elegida a propósito
  });
  it("todas las curadas pasan el filtro de vocabulario", () => {
    for (const f of FRASES_CURADAS) {
      for (const p of PROHIBIDAS) expect(f.toLowerCase()).not.toContain(p);
    }
  });
});
