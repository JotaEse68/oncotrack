import { describe, expect, it } from "vitest";
import {
  codificarPaquete,
  decodificarPaquete,
  haCaducado,
  PaqueteInvalidoError,
  type PaqueteCompartido,
} from "@/lib/compartir";

const PAQUETE: PaqueteCompartido = {
  caducidad: "2026-07-12",
  ambito: "marcadores",
  nombre: "Ana",
  datos: {
    marcadores: [
      { nombre: "Cromogranina A", fecha: "2026-07-01", valor: 84, unidad: "ng/mL" },
    ],
  },
};

describe("codec de compartir", () => {
  it("ida y vuelta recupera el paquete idéntico", async () => {
    const frag = await codificarPaquete(PAQUETE);
    const recuperado = await decodificarPaquete(frag);
    expect(recuperado).toEqual(PAQUETE);
  });

  it("el fragmento no contiene los datos en claro", async () => {
    const frag = await codificarPaquete(PAQUETE);
    expect(frag).not.toContain("Cromogranina");
    expect(frag).not.toContain("Ana");
    expect(frag).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("fragmento manipulado → PaqueteInvalidoError", async () => {
    const frag = await codificarPaquete(PAQUETE);
    const [datos, clave, iv] = frag.split(".");
    const alterado =
      (datos[0] === "A" ? "B" : "A") + datos.slice(1) + "." + clave + "." + iv;
    await expect(decodificarPaquete(alterado)).rejects.toThrow(
      PaqueteInvalidoError
    );
  });

  it("fragmento sin formato válido → PaqueteInvalidoError", async () => {
    await expect(decodificarPaquete("basura")).rejects.toThrow(
      PaqueteInvalidoError
    );
  });
});

describe("haCaducado", () => {
  it("false antes de la fecha, true después", () => {
    expect(haCaducado(PAQUETE, new Date("2026-07-12T23:00:00"))).toBe(false);
    expect(haCaducado(PAQUETE, new Date("2026-07-13T00:10:00"))).toBe(true);
  });
});
