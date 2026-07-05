"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type RadarPerfil } from "@/lib/db";
import { configDesdeAjustes, tieneIA } from "@/lib/ia";
import {
  buscarFuentes,
  resumirNovedades,
  urlREEC,
  type Fuente,
} from "@/lib/radar";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  CARD_CLS,
} from "../../_components/ui";

function ListaFuentes({ titulo, fuentes }: { titulo: string; fuentes: Fuente[] }) {
  if (fuentes.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
        {titulo}
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
        {fuentes.map((f) => (
          <li key={f.url}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-5 py-3 transition hover:bg-surface"
            >
              <span className="block text-sm leading-5 text-fg">{f.titulo}</span>
              {f.fecha && (
                <span className="tabular mt-0.5 block text-xs text-muted">
                  {f.fecha}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function RadarPage() {
  const ajustes = useLiveQuery(() => db.ajustes.get(1));
  const radar = useLiveQuery(() => db.radarPerfil.get(1));
  const [estado, setEstado] = useState<"" | "buscando" | string>("");
  const [resultado, setResultado] = useState<{
    resumen: string;
    ensayos: Fuente[];
    articulos: Fuente[];
  } | null>(null);
  const [guardado, setGuardado] = useState(false);

  const hayIA = ajustes ? tieneIA(ajustes) : false;

  async function guardarPerfil(formData: FormData) {
    const perfil: RadarPerfil = {
      id: 1,
      tipoTumor: String(formData.get("tipoTumor") ?? "").trim() || undefined,
      localizacion:
        String(formData.get("localizacion") ?? "").trim() || undefined,
      palabrasClave:
        String(formData.get("palabrasClave") ?? "").trim() || undefined,
      ultimaBusqueda: radar?.ultimaBusqueda,
      ultimoResumen: radar?.ultimoResumen,
    };
    await db.radarPerfil.put(perfil);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  async function buscar() {
    const p = await db.radarPerfil.get(1);
    if (!p || (!p.tipoTumor && !p.palabrasClave)) {
      setEstado("Guarda primero tu perfil de búsqueda aquí arriba.");
      return;
    }
    const a = await db.ajustes.get(1);
    const cfg = a && configDesdeAjustes(a);
    if (!cfg) return;

    setEstado("buscando");
    setResultado(null);
    try {
      const fuentes = await buscarFuentes(p);
      const total = fuentes.ensayos.length + fuentes.articulos.length;
      let resumen: string;
      if (total === 0) {
        resumen = p.ultimaBusqueda
          ? `Sin novedades desde tu última consulta — no hace falta mirar esto cada día.`
          : "No se han encontrado resultados con ese perfil. Prueba con menos palabras o términos más generales.";
      } else {
        resumen = await resumirNovedades(cfg, fuentes, p);
      }
      setResultado({ resumen, ...fuentes });
      await db.radarPerfil.put({
        ...p,
        id: 1,
        ultimaBusqueda: new Date().toISOString(),
        ultimoResumen: resumen,
      });
      setEstado("");
    } catch (e) {
      setEstado(
        e instanceof Error ? e.message : "No se pudo completar la búsqueda."
      );
    }
  }

  if (ajustes === undefined || radar === undefined) return null;

  const fechaUltima = radar?.ultimaBusqueda
    ? new Date(radar.ultimaBusqueda).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Apoyo · Radar
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Investigación en curso
        </h1>
      </header>

      {/* Encabezado fijo, no negociable (§4.10) */}
      <div className="rounded-2xl border border-line bg-surface/60 p-4">
        <p className="text-xs leading-5 text-muted">
          Esto es información pública sobre investigación en curso — coméntalo
          con tu oncólogo antes de sacar conclusiones.
        </p>
      </div>

      <form action={guardarPerfil} className={`${CARD_CLS} space-y-4`}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Tu perfil de búsqueda (solo vive aquí)
        </h2>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Tipo de tumor
          </span>
          <input
            name="tipoTumor"
            defaultValue={radar?.tipoTumor ?? ""}
            placeholder="Ej.: tumor neuroendocrino"
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Localización (opcional)
          </span>
          <input
            name="localizacion"
            defaultValue={radar?.localizacion ?? ""}
            placeholder="Ej.: intestino delgado"
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Palabras clave (opcional)
          </span>
          <input
            name="palabrasClave"
            defaultValue={radar?.palabrasClave ?? ""}
            placeholder="Ej.: lanreotida, PRRT"
            className={INPUT_CLS}
          />
        </label>
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-jade/50 hover:text-fg"
        >
          {guardado ? "Guardado ✓" : "Guardar perfil"}
        </button>
      </form>

      {hayIA ? (
        <div className="space-y-2">
          <button
            onClick={buscar}
            disabled={estado === "buscando"}
            className={`${BTN_PRIMARIO} disabled:opacity-60`}
          >
            {estado === "buscando" ? "Buscando…" : "Buscar novedades"}
          </button>
          {fechaUltima && (
            <p className="text-center text-xs text-muted">
              Última búsqueda: {fechaUltima} — no hace falta mirar esto cada
              día.
            </p>
          )}
        </div>
      ) : (
        <div className={CARD_CLS}>
          <p className="text-sm leading-6 text-muted">
            Para resumir las novedades en lenguaje llano hace falta tu propia
            IA.{" "}
            <Link
              href="/ajustes/ia"
              className="text-jade underline-offset-2 hover:underline"
            >
              Conéctala en Ajustes
            </Link>{" "}
            (hay guía paso a paso).
          </p>
        </div>
      )}
      {estado && estado !== "buscando" && (
        <p className="px-1 text-xs text-clay">{estado}</p>
      )}

      {(resultado || radar?.ultimoResumen) && (
        <div className="rounded-2xl border border-jade/30 bg-jade/5 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-jade">
            En palabras normales
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-fg">
            {resultado?.resumen ?? radar?.ultimoResumen}
          </p>
        </div>
      )}

      {resultado && (
        <>
          <ListaFuentes titulo="Ensayos clínicos" fuentes={resultado.ensayos} />
          <ListaFuentes titulo="Publicaciones" fuentes={resultado.articulos} />
        </>
      )}

      <a
        href={urlREEC()}
        target="_blank"
        rel="noopener noreferrer"
        className="block py-1 text-center text-xs text-muted underline-offset-2 hover:underline"
      >
        Buscar también en el Registro Español de Estudios Clínicos (REEC) →
      </a>
    </div>
  );
}
