import type { RadarPerfil } from "@/lib/db";
import { chatCompletion, type ConfigIA } from "@/lib/ia";

/**
 * Radar de tratamientos y ensayos (§4.10).
 * Consulta fuentes públicas SOLO bajo demanda (nunca en segundo plano) y
 * resume en lenguaje llano con la clave de IA del paciente.
 * Nunca es una recomendación médica.
 */

export interface Fuente {
  titulo: string;
  url: string;
  fecha?: string;
}

export function construirQueryEnsayos(p: RadarPerfil): string {
  return [p.tipoTumor, p.localizacion, p.palabrasClave]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
}

async function buscarEnsayos(query: string): Promise<Fuente[]> {
  const url =
    "https://clinicaltrials.gov/api/v2/studies?" +
    new URLSearchParams({
      "query.cond": query,
      "filter.overallStatus": "RECRUITING",
      pageSize: "10",
      sort: "LastUpdatePostDate:desc",
    });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ClinicalTrials ${res.status}`);
  const data = (await res.json()) as {
    studies?: Array<{
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        statusModule?: { lastUpdatePostDateStruct?: { date?: string } };
      };
    }>;
  };
  return (data.studies ?? [])
    .map((s): Fuente | null => {
      const id = s.protocolSection?.identificationModule;
      const nctId = id?.nctId;
      if (!nctId || !id?.briefTitle) return null;
      return {
        titulo: id.briefTitle,
        url: `https://clinicaltrials.gov/study/${nctId}`,
        fecha:
          s.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date,
      };
    })
    .filter((f): f is Fuente => f !== null);
}

async function buscarArticulos(query: string): Promise<Fuente[]> {
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const resBusqueda = await fetch(
    `${base}/esearch.fcgi?` +
      new URLSearchParams({
        db: "pubmed",
        term: query,
        retmode: "json",
        retmax: "10",
        sort: "date",
      })
  );
  if (!resBusqueda.ok) throw new Error(`PubMed ${resBusqueda.status}`);
  const busqueda = (await resBusqueda.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = busqueda.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const resResumen = await fetch(
    `${base}/esummary.fcgi?` +
      new URLSearchParams({ db: "pubmed", id: ids.join(","), retmode: "json" })
  );
  if (!resResumen.ok) throw new Error(`PubMed ${resResumen.status}`);
  const resumen = (await resResumen.json()) as {
    result?: Record<string, { title?: string; pubdate?: string }> & {
      uids?: string[];
    };
  };
  return ids
    .map((id): Fuente | null => {
      const art = resumen.result?.[id];
      if (!art?.title) return null;
      return {
        titulo: art.title,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        fecha: art.pubdate,
      };
    })
    .filter((f): f is Fuente => f !== null);
}

/** Busca en ambas fuentes; si una cae, la otra sigue. */
export async function buscarFuentes(
  p: RadarPerfil
): Promise<{ ensayos: Fuente[]; articulos: Fuente[] }> {
  const query = construirQueryEnsayos(p);
  const [ensayos, articulos] = await Promise.allSettled([
    buscarEnsayos(query),
    buscarArticulos(query),
  ]);
  return {
    ensayos: ensayos.status === "fulfilled" ? ensayos.value : [],
    articulos: articulos.status === "fulfilled" ? articulos.value : [],
  };
}

/** Enlace a REEC (sin API pública fiable con CORS: se abre fuera). */
export function urlREEC(): string {
  return "https://reec.aemps.es/reec/public/web.html";
}

const PROMPT_RESUMEN = `Eres un divulgador que resume investigación médica para pacientes sin formación técnica.
Reglas estrictas:
- Lenguaje llano, frases cortas, en español. Nada de jerga sin explicar.
- SOLO describe qué se está investigando. PROHIBIDO recomendar tratamientos, dar esperanzas concretas de curación o sugerir que el paciente pida algo a su médico.
- No inventes nada que no esté en los títulos proporcionados.
- Cierra siempre recordando en una frase que esto es información pública sobre investigación en curso y que cualquier duda se comenta con su oncólogo.
- Máximo 150 palabras.`;

export async function resumirNovedades(
  cfg: ConfigIA,
  fuentes: { ensayos: Fuente[]; articulos: Fuente[] },
  p: RadarPerfil
): Promise<string> {
  const listado = [
    ...fuentes.ensayos.map((f) => `[Ensayo] ${f.titulo} (${f.fecha ?? "s/f"})`),
    ...fuentes.articulos.map(
      (f) => `[Artículo] ${f.titulo} (${f.fecha ?? "s/f"})`
    ),
  ].join("\n");

  return chatCompletion(cfg, [
    { role: "system", content: PROMPT_RESUMEN },
    {
      role: "user",
      content: `Perfil del paciente (solo para contexto de búsqueda): ${construirQueryEnsayos(p)}\n\nResultados encontrados hoy:\n${listado}`,
    },
  ]);
}
