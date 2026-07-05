import { describe, expect, it } from "vitest";
import { hashPin, nuevoSalt, verifyPin } from "@/lib/pin";

describe("pin", () => {
  it("mismo pin + mismo salt → mismo hash; salt distinto → distinto", async () => {
    const s1 = nuevoSalt();
    const s2 = nuevoSalt();
    expect(s1).not.toBe(s2);
    expect(await hashPin("1234", s1)).toBe(await hashPin("1234", s1));
    expect(await hashPin("1234", s1)).not.toBe(await hashPin("1234", s2));
  });

  it("el hash no contiene el pin y no es texto plano", async () => {
    const salt = nuevoSalt();
    const hash = await hashPin("1234", salt);
    expect(hash).not.toContain("1234");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyPin acepta el correcto y rechaza el incorrecto", async () => {
    const salt = nuevoSalt();
    const hash = await hashPin("0424", salt);
    expect(await verifyPin("0424", salt, hash)).toBe(true);
    expect(await verifyPin("0000", salt, hash)).toBe(false);
  });
});
