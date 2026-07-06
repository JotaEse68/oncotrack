import { describe, expect, it } from "vitest";
import { esFalloDeCarga, debeRecargar } from "@/lib/actualizacion";

describe("esFalloDeCarga — detecta la app atascada tras un deploy", () => {
  it("reconoce los mensajes típicos de chunk desaparecido", () => {
    expect(esFalloDeCarga("ChunkLoadError: Loading chunk 123 failed")).toBe(true);
    expect(
      esFalloDeCarga("Failed to fetch dynamically imported module: https://x/_next/static/chunks/app/capturar/page-abc.js")
    ).toBe(true);
    expect(esFalloDeCarga("Importing a module script failed.")).toBe(true);
    expect(esFalloDeCarga("error loading dynamically imported module")).toBe(true);
  });

  it("ignora errores normales de la app", () => {
    expect(esFalloDeCarga("TypeError: x is not a function")).toBe(false);
    expect(esFalloDeCarga("No se pudo conectar con el proveedor de IA")).toBe(false);
    expect(esFalloDeCarga("")).toBe(false);
  });
});

describe("debeRecargar — guarda anti-bucle", () => {
  it("recarga si nunca se recargó antes", () => {
    expect(debeRecargar(1_000_000, null)).toBe(true);
  });
  it("no recarga dos veces en menos de un minuto", () => {
    expect(debeRecargar(1_000_000, 1_000_000 - 30_000)).toBe(false);
  });
  it("vuelve a permitir recargar pasado el minuto", () => {
    expect(debeRecargar(1_000_000, 1_000_000 - 61_000)).toBe(true);
  });
});
