"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { codificarPaquete, type PaqueteCompartido } from "@/lib/compartir";
import { hoyISO } from "../_components/ui";
import { BTN_PRIMARIO, BTN_SECUNDARIO, CARD_CLS } from "../_components/ui";

const AMBITOS = [
  {
    valor: "todo",
    titulo: "Todo lo importante",
    detalle: "Marcadores, medicación, síntomas y citas",
  },
  {
    valor: "marcadores",
    titulo: "Solo marcadores recientes",
    detalle: "Analíticas de los últimos 90 días",
  },
  {
    valor: "medicacion",
    titulo: "Solo medicación",
    detalle: "Nombres, dosis y fechas",
  },
] as const;

const CADUCIDADES = [
  { dias: 1, etiqueta: "1 día" },
  { dias: 7, etiqueta: "7 días" },
  { dias: 30, etiqueta: "30 días" },
] as const;

function fechaMasDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export default function CompartirPage() {
  const [ambito, setAmbito] =
    useState<PaqueteCompartido["ambito"]>("marcadores");
  const [dias, setDias] = useState(7);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  async function crearEnlace() {
    setAviso("");
    const datos: PaqueteCompartido["datos"] = {};

    if (ambito === "todo" || ambito === "marcadores") {
      let marcadores = await db.marcadores.orderBy("fecha").reverse().toArray();
      if (ambito === "marcadores") {
        const limite = fechaMasDias(-90);
        marcadores = marcadores.filter((m) => m.fecha >= limite);
      }
      datos.marcadores = marcadores;
    }
    if (ambito === "todo" || ambito === "medicacion") {
      datos.medicacion = await db.medicacion.toArray();
    }
    if (ambito === "todo") {
      datos.sintomas = await db.sintomas.orderBy("fecha").reverse().toArray();
      datos.citas = await db.citas.orderBy("fecha").toArray();
    }

    const total = Object.values(datos).reduce((n, l) => n + l.length, 0);
    if (total === 0) {
      setAviso("No hay nada que compartir todavía con esa selección.");
      return;
    }

    const perfil = await db.perfil.get(1);
    const fragmento = await codificarPaquete({
      caducidad: fechaMasDias(dias),
      ambito,
      nombre: perfil?.nombre,
      datos,
    });
    setEnlace(`${location.origin}/compartido#${fragmento}`);
  }

  async function compartirEnlace() {
    if (!enlace) return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ url: enlace, title: "Datos de OncoTrack" });
      } else {
        await navigator.clipboard.writeText(enlace);
        setAviso("Enlace copiado al portapapeles.");
      }
    } catch {
      /* cancelado por el usuario */
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-jade">
          Compartir
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Con alguien de confianza
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Los datos van cifrados dentro del propio enlace. No se suben a
          ningún servidor.
        </p>
      </header>

      <section className={`${CARD_CLS} space-y-2`}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Qué compartir
        </h2>
        {AMBITOS.map((a) => (
          <label
            key={a.valor}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
              ambito === a.valor ? "border-jade bg-jade/10" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="ambito"
              checked={ambito === a.valor}
              onChange={() => {
                setAmbito(a.valor);
                setEnlace(null);
              }}
              className="h-5 w-5 accent-jade"
            />
            <span>
              <span className="block text-sm text-fg">{a.titulo}</span>
              <span className="block text-xs text-muted">{a.detalle}</span>
            </span>
          </label>
        ))}
        <p className="pt-1 text-xs leading-5 text-muted">
          Nunca se incluyen: fotos de documentos, tus conversaciones del
          asistente ni tu diario de sesiones.
        </p>
      </section>

      <section className={CARD_CLS}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Válido durante
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {CADUCIDADES.map((c) => (
            <button
              key={c.dias}
              onClick={() => {
                setDias(c.dias);
                setEnlace(null);
              }}
              aria-pressed={dias === c.dias}
              className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition ${
                dias === c.dias
                  ? "border-jade bg-jade/10 font-semibold text-jade"
                  : "border-line text-muted"
              }`}
            >
              {c.etiqueta}
            </button>
          ))}
        </div>
      </section>

      {!enlace ? (
        <button onClick={crearEnlace} className={BTN_PRIMARIO}>
          Crear enlace
        </button>
      ) : (
        <div className="space-y-3">
          <button onClick={compartirEnlace} className={BTN_PRIMARIO}>
            Compartir
          </button>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(enlace);
              setAviso("Enlace copiado al portapapeles.");
            }}
            className={`${BTN_SECUNDARIO} w-full`}
          >
            Copiar enlace
          </button>
        </div>
      )}
      {aviso && <p className="px-1 text-xs text-jade">{aviso}</p>}

      <p className="px-1 text-xs leading-5 text-muted">
        Pasada la fecha, la página deja de mostrar el contenido. No es un
        borrado garantizado: compártelo solo con personas de confianza, como
        tu pareja o tu médico.
      </p>
    </div>
  );
}
