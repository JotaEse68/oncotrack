import { describe, expect, it } from "vitest";
import { agruparPorNombre, comparacionTexto } from "@/lib/marcadores";
import type { Marcador } from "@/lib/db";

// Datos reales del caso de prueba del usuario
const CGA_FEB: Marcador = {
  id: 1,
  nombre: "Cromogranina A",
  fecha: "2023-02-15",
  valor: 302.8,
  unidad: "ng/mL",
};
const CGA_MAR: Marcador = {
  id: 2,
  nombre: "Cromogranina A",
  fecha: "2023-03-15",
  valor: 342,
  unidad: "ng/mL",
};
const NSE: Marcador = {
  id: 3,
  nombre: "NSE",
  fecha: "2023-03-01",
  valor: 12,
  unidad: "µg/L",
};

describe("agruparPorNombre", () => {
  it("agrupa por marcador con puntos ordenados por fecha ascendente", () => {
    const grupos = agruparPorNombre([CGA_MAR, NSE, CGA_FEB]);
    const cga = grupos.find((g) => g.nombre === "Cromogranina A")!;
    expect(cga.puntos.map((p) => p.valor)).toEqual([302.8, 342]);
    expect(cga.unidad).toBe("ng/mL");
    expect(grupos.find((g) => g.nombre === "NSE")!.puntos).toHaveLength(1);
  });

  it("ordena los grupos por su registro más reciente", () => {
    const grupos = agruparPorNombre([NSE, CGA_FEB, CGA_MAR]);
    expect(grupos[0].nombre).toBe("Cromogranina A"); // 15/03 > 01/03
  });

  it("no mezcla marcadores de nombre distinto", () => {
    const grupos = agruparPorNombre([CGA_FEB, NSE]);
    expect(grupos).toHaveLength(2);
  });
});

describe("comparacionTexto — §4.9, lenguaje llano sin juicios", () => {
  it("302.8 → 342 = un 13% más que la última vez", () => {
    expect(comparacionTexto([CGA_FEB, CGA_MAR].map(aPunto))).toBe(
      "un 13% más que la última vez"
    );
  });

  it("bajada → un X% menos", () => {
    const puntos = [
      { fecha: "2023-02-15", valor: 342 },
      { fecha: "2023-03-15", valor: 302.8 },
    ];
    expect(comparacionTexto(puntos)).toBe("un 11% menos que la última vez");
  });

  it("igual → mensaje neutro; un solo punto → null", () => {
    expect(
      comparacionTexto([
        { fecha: "2023-02-15", valor: 300 },
        { fecha: "2023-03-15", valor: 300 },
      ])
    ).toBe("igual que la última vez");
    expect(comparacionTexto([aPunto(CGA_FEB)])).toBeNull();
  });

  it("nunca contiene juicios clínicos", () => {
    const texto = comparacionTexto([CGA_FEB, CGA_MAR].map(aPunto))!;
    for (const prohibida of ["normal", "anormal", "alto", "bajo", "peligro"]) {
      expect(texto.toLowerCase()).not.toContain(prohibida);
    }
  });
});

function aPunto(m: Marcador) {
  return { fecha: m.fecha, valor: m.valor };
}
