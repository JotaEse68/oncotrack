"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getAjustes } from "@/lib/db";
import { configDesdeAjustes, tieneIA } from "@/lib/ia";
import {
  aplicarPropuestas,
  interpretarTexto,
  type RegistroPropuesto,
} from "@/lib/interpretar";
import { BTN_PRIMARIO, CARD_CLS, INPUT_CLS, hoyISO } from "../_components/ui";

const ATAJOS = [
  { etiqueta: "Apuntar como síntoma", href: "/salud/sintomas" },
  { etiqueta: "Apuntar como analítica", href: "/salud/marcadores" },
  { etiqueta: "Apuntar como toma", href: "/salud/medicacion" },
  { etiqueta: "Apuntar como cita", href: "/citas" },
];

const ETIQUETA_TIPO: Record<RegistroPropuesto["tipo"], string> = {
  sintoma: "Síntoma",
  toma: "Toma de medicación",
  marcador: "Marcador",
  cita: "Cita",
};

/* Reconocimiento de voz del navegador (si existe) — tipado mínimo. */
interface ReconocimientoVoz {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: {
    resultIndex: number;
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
  }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function crearReconocimiento(): ReconocimientoVoz | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => ReconocimientoVoz;
    webkitSpeechRecognition?: new () => ReconocimientoVoz;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Editor de una propuesta: inputs por campo según su tipo. */
function FilaPropuesta({
  propuesta,
  onCambiar,
  onQuitar,
}: {
  propuesta: RegistroPropuesto;
  onCambiar: (p: RegistroPropuesto) => void;
  onQuitar: () => void;
}) {
  const d = propuesta.datos as Record<string, string | number | undefined>;
  const campo = (
    nombre: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <input
      value={d[nombre] === undefined ? "" : String(d[nombre])}
      onChange={(e) =>
        onCambiar({
          ...propuesta,
          datos: {
            ...propuesta.datos,
            [nombre]:
              props.type === "number"
                ? Number(e.target.value)
                : e.target.value,
          },
        } as RegistroPropuesto)
      }
      aria-label={nombre}
      className={INPUT_CLS}
      {...props}
    />
  );

  return (
    <div className="space-y-2 rounded-xl border border-line p-3">
      <p className="text-xs font-medium text-morado">
        {ETIQUETA_TIPO[propuesta.tipo]}
      </p>
      {propuesta.tipo === "sintoma" && (
        <div className="grid grid-cols-2 gap-2">
          {campo("tipo", { placeholder: "Síntoma" })}
          {campo("escala", { type: "number", min: 0, max: 10, inputMode: "numeric" })}
        </div>
      )}
      {propuesta.tipo === "toma" && campo("nombre", { placeholder: "Medicación" })}
      {propuesta.tipo === "marcador" && (
        <>
          {campo("nombre", { placeholder: "Marcador" })}
          <div className="grid grid-cols-3 gap-2">
            {campo("valor", { type: "number", step: "any", inputMode: "decimal" })}
            {campo("unidad", { placeholder: "ng/mL" })}
            {campo("fecha", { type: "date" })}
          </div>
        </>
      )}
      {propuesta.tipo === "cita" && (
        <div className="grid grid-cols-3 gap-2">
          {campo("fecha", { type: "date" })}
          {campo("hora", { type: "time" })}
          {campo("especialista", { placeholder: "Especialista" })}
        </div>
      )}
      <button
        onClick={onQuitar}
        className="text-xs text-muted underline-offset-2 hover:underline"
      >
        Quitar esta fila
      </button>
    </div>
  );
}

/**
 * Contar lo del día con tus palabras (spec §2 🎤).
 * Con clave de IA: interpretación a registros con revisión editable.
 * Sin clave: el texto se escribe igual y los atajos llevan al formulario.
 */
export default function CapturarPage() {
  const router = useRouter();
  const ajustes = useLiveQuery(() => getAjustes());
  const [texto, setTexto] = useState("");
  const [dictando, setDictando] = useState(false);
  const [interpretando, setInterpretando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [propuestas, setPropuestas] = useState<RegistroPropuesto[] | null>(
    null
  );
  const recRef = useRef<ReconocimientoVoz | null>(null);
  const [hayVoz, setHayVoz] = useState(false);

  useEffect(() => {
    recRef.current = crearReconocimiento();
    setHayVoz(Boolean(recRef.current));
    return () => recRef.current?.stop();
  }, []);

  function alternarDictado() {
    const rec = recRef.current;
    if (!rec) return;
    if (dictando) {
      rec.stop();
      setDictando(false);
      return;
    }
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let nuevo = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) nuevo += e.results[i][0].transcript;
      }
      if (nuevo) setTexto((t) => (t ? `${t} ${nuevo.trim()}` : nuevo.trim()));
    };
    rec.onend = () => setDictando(false);
    rec.onerror = () => setDictando(false);
    rec.start();
    setDictando(true);
  }

  async function entender() {
    if (!ajustes || !texto.trim()) return;
    const cfg = configDesdeAjustes(ajustes);
    if (!cfg) return;
    setInterpretando(true);
    setError("");
    try {
      const medicaciones = (await db.medicacion.toArray()).map(
        (m) => m.nombre
      );
      const props = await interpretarTexto(cfg, texto, { medicaciones });
      if (props.length === 0) {
        setError(
          "No se reconoció ningún registro en el texto. Puedes usar los formularios de abajo."
        );
      } else {
        setPropuestas(props);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo interpretar el texto."
      );
    } finally {
      setInterpretando(false);
    }
  }

  async function guardar() {
    if (!propuestas || propuestas.length === 0) return;
    const n = await aplicarPropuestas(propuestas);
    setPropuestas(null);
    setGuardado(true);
    setTimeout(() => router.push("/hoy"), 900);
    return n;
  }

  if (!ajustes) return null;
  const conIA = tieneIA(ajustes);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Hoy · Contar
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Cuéntalo con tus palabras
        </h1>
      </header>

      {guardado && (
        <div className={`${CARD_CLS} text-center`} role="status">
          <p className="text-sm text-fg">Guardado ✓ — volviendo a Hoy…</p>
        </div>
      )}

      {!guardado && (
        <div className={`${CARD_CLS} space-y-3`}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
            rows={5}
            placeholder="Ej.: hoy flushing fuerte, un 7, y me puse la lanreotida"
            aria-label="Cuenta cómo fue tu día"
            className={`${INPUT_CLS} resize-y text-base leading-6`}
          />
          <div className="flex items-center gap-2">
            {hayVoz && (
              <button
                onClick={alternarDictado}
                aria-label={dictando ? "Parar el dictado" : "Dictar con la voz"}
                className={`min-h-11 min-w-11 rounded-lg border px-3 text-lg transition ${
                  dictando
                    ? "border-morado bg-morado/10 text-morado"
                    : "border-line text-muted hover:border-morado/50"
                }`}
              >
                {dictando ? "◼" : "🎤"}
              </button>
            )}
            {conIA && (
              <button
                onClick={entender}
                disabled={interpretando || !texto.trim()}
                className={`${BTN_PRIMARIO} flex-1`}
              >
                {interpretando ? "Leyendo lo que contaste…" : "Entender lo que conté"}
              </button>
            )}
          </div>
          <p className="text-xs leading-5 text-muted">
            También puedes dictar con el micrófono de tu teclado.
          </p>
          {error && <p className="text-xs leading-5 text-error">{error}</p>}
        </div>
      )}

      {propuestas && (
        <div className={`${CARD_CLS} space-y-3`}>
          <p className="text-sm font-medium text-fg">Revisa antes de guardar</p>
          <p className="text-xs leading-5 text-muted">
            La IA puede equivocarse. Corrige lo que haga falta — no se guarda
            nada hasta que confirmes.
          </p>
          {propuestas.map((p, i) => (
            <FilaPropuesta
              key={i}
              propuesta={p}
              onCambiar={(nueva) =>
                setPropuestas((prev) =>
                  prev ? prev.map((x, j) => (j === i ? nueva : x)) : prev
                )
              }
              onQuitar={() =>
                setPropuestas((prev) =>
                  prev ? prev.filter((_, j) => j !== i) : prev
                )
              }
            />
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPropuestas(null)}
              className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm text-muted"
            >
              Descartar
            </button>
            <button onClick={guardar} className={BTN_PRIMARIO}>
              Guardar{" "}
              {propuestas.length === 1
                ? "1 registro"
                : `${propuestas.length} registros`}
            </button>
          </div>
        </div>
      )}

      {!guardado && !propuestas && (
        <section className="space-y-2">
          <p className="px-1 text-xs text-muted">
            ¿Prefieres el formulario de siempre?
          </p>
          {ATAJOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-surface/60 px-4 py-3 text-sm text-fg transition hover:border-morado/50"
            >
              {a.etiqueta}
              <span aria-hidden className="text-morado">
                →
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
