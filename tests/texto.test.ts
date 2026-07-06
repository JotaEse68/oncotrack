import { describe, expect, it } from "vitest";
import { colapsarDuplicado } from "@/lib/texto";

describe("colapsarDuplicado — bug del datalist móvil", () => {
  it("colapsa el caso real reportado", () => {
    expect(colapsarDuplicado("Cromogranina ACromogranina A")).toBe(
      "Cromogranina A"
    );
  });
  it("no toca nombres normales", () => {
    expect(colapsarDuplicado("Cromogranina A")).toBe("Cromogranina A");
    expect(colapsarDuplicado("NSE")).toBe("NSE");
    expect(colapsarDuplicado("Serotonina en orina 24h")).toBe(
      "Serotonina en orina 24h"
    );
  });
  it("recorta espacios", () => {
    expect(colapsarDuplicado("  NSE  ")).toBe("NSE");
  });
});
