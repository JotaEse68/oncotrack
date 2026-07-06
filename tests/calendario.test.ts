import { describe, expect, it } from "vitest";
import { icsCita, icsToma } from "@/lib/calendario";

const CITA = {
  id: 5,
  fecha: "2026-07-12",
  hora: "09:30",
  especialista: "Dr. García",
  centro: "Hospital, planta 3",
};

describe("icsCita", () => {
  it("evento con hora: DTSTART local, 1h, dos avisos y UID estable", () => {
    const ics = icsCita(CITA);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:cita-5@oncotrack");
    expect(ics).toContain("DTSTART:20260712T093000");
    expect(ics).toContain("DTEND:20260712T103000");
    expect(ics).toContain("SUMMARY:Cita: Dr. García");
    expect(ics).toContain("LOCATION:Hospital\\, planta 3"); // coma escapada
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.includes("\n") && !ics.includes("\r\n")).toBe(false); // CRLF
  });

  it("evento sin hora: dia completo y un solo aviso", () => {
    const ics = icsCita({ id: 6, fecha: "2026-08-01" });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260801");
    expect(ics).toContain("DTEND;VALUE=DATE:20260802");
    expect(ics).toContain("SUMMARY:Cita: cita médica");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).not.toContain("TRIGGER:-PT2H");
  });
});

describe("icsToma", () => {
  it("dia completo en proximaFecha con aviso a las 9:00", () => {
    const ics = icsToma({
      id: 1,
      nombre: "Lanreotida",
      dosis: "120 mg",
      proximaFecha: "2026-08-03",
      historial: [],
    });
    expect(ics).toContain("UID:toma-1@oncotrack");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260803");
    expect(ics).toContain("SUMMARY:Toma: Lanreotida");
    expect(ics).toContain("DESCRIPTION:120 mg");
    expect(ics).toContain("TRIGGER:PT9H");
  });
});
