import { describe, expect, it } from "vitest";
import { diasHasta, proximaCita, textoCountdown } from "@/lib/fechas";
import type { Cita } from "@/lib/db";

const HOY = new Date("2026-07-05T10:23:00"); // hora del día irrelevante

describe("diasHasta", () => {
  it("misma fecha → 0, ignora la hora", () => {
    expect(diasHasta("2026-07-05", HOY)).toBe(0);
  });
  it("mañana → 1", () => {
    expect(diasHasta("2026-07-06", HOY)).toBe(1);
  });
  it("ayer → -1", () => {
    expect(diasHasta("2026-07-04", HOY)).toBe(-1);
  });
  it("cruza mes: en 6 días", () => {
    expect(diasHasta("2026-07-11", HOY)).toBe(6);
  });
});

describe("proximaCita", () => {
  const citas: Cita[] = [
    { id: 1, fecha: "2026-07-01", especialista: "Dra. Pasada" },
    { id: 2, fecha: "2026-07-11", especialista: "Dr. García" },
    { id: 3, fecha: "2026-08-01", especialista: "Dra. Lejos" },
  ];
  it("elige la futura más cercana e ignora pasadas", () => {
    expect(proximaCita(citas, HOY)?.id).toBe(2);
  });
  it("una cita hoy cuenta como próxima", () => {
    const conHoy = [...citas, { id: 4, fecha: "2026-07-05" } as Cita];
    expect(proximaCita(conHoy, HOY)?.id).toBe(4);
  });
  it("sin futuras → undefined", () => {
    expect(proximaCita([citas[0]], HOY)).toBeUndefined();
  });
});

describe("textoCountdown", () => {
  it("0 → Hoy, 1 → Mañana, 6 → En 6 días", () => {
    expect(textoCountdown(0)).toBe("Hoy");
    expect(textoCountdown(1)).toBe("Mañana");
    expect(textoCountdown(6)).toBe("En 6 días");
  });
});
