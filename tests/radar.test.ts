import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarFuentes, construirQueryEnsayos } from "@/lib/radar";
import type { RadarPerfil } from "@/lib/db";

const PERFIL: RadarPerfil = {
  tipoTumor: "tumor neuroendocrino",
  localizacion: "intestino delgado",
  palabrasClave: "lanreotida",
};

// Fixtures reducidos con la forma real de cada API
const FIXTURE_CTGOV = {
  studies: [
    {
      protocolSection: {
        identificationModule: {
          nctId: "NCT01234567",
          briefTitle: "Estudio de ejemplo TNE",
        },
        statusModule: {
          lastUpdatePostDateStruct: { date: "2026-06-20" },
        },
      },
    },
  ],
};

const FIXTURE_ESEARCH = {
  esearchresult: { idlist: ["40000001"] },
};

const FIXTURE_ESUMMARY = {
  result: {
    uids: ["40000001"],
    "40000001": {
      title: "Articulo de ejemplo sobre NET",
      pubdate: "2026 Jun 15",
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("construirQueryEnsayos", () => {
  it("combina tipo de tumor, localización y palabras clave", () => {
    const q = construirQueryEnsayos(PERFIL);
    expect(q).toContain("tumor neuroendocrino");
    expect(q).toContain("intestino delgado");
    expect(q).toContain("lanreotida");
  });

  it("ignora campos vacíos", () => {
    expect(construirQueryEnsayos({ tipoTumor: "carcinoide" })).toBe(
      "carcinoide"
    );
  });
});

describe("buscarFuentes", () => {
  it("parsea ensayos de ClinicalTrials y artículos de PubMed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const cuerpo = url.includes("clinicaltrials")
          ? FIXTURE_CTGOV
          : url.includes("esearch")
            ? FIXTURE_ESEARCH
            : FIXTURE_ESUMMARY;
        return { ok: true, status: 200, json: async () => cuerpo };
      })
    );

    const { ensayos, articulos } = await buscarFuentes(PERFIL);
    expect(ensayos).toHaveLength(1);
    expect(ensayos[0].titulo).toBe("Estudio de ejemplo TNE");
    expect(ensayos[0].url).toContain("NCT01234567");
    expect(ensayos[0].fecha).toBe("2026-06-20");
    expect(articulos).toHaveLength(1);
    expect(articulos[0].url).toContain("40000001");
  });

  it("si una fuente falla, la otra sigue funcionando", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("clinicaltrials")) throw new Error("caída");
        const cuerpo = url.includes("esearch")
          ? FIXTURE_ESEARCH
          : FIXTURE_ESUMMARY;
        return { ok: true, status: 200, json: async () => cuerpo };
      })
    );

    const { ensayos, articulos } = await buscarFuentes(PERFIL);
    expect(ensayos).toHaveLength(0);
    expect(articulos).toHaveLength(1);
  });
});
