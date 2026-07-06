"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getAjustes } from "@/lib/db";
import { configDesdeAjustes, tieneIA } from "@/lib/ia";
import { borrarConversacion, enviarMensaje } from "@/lib/asistente";
import { BloqueAyudaReal } from "../_components/BloqueAyudaReal";
import { INPUT_CLS, CARD_CLS } from "../../_components/ui";

const CLAVE_PRIMERA_VEZ = "oncotrack-asistente-visto";

const AVISO_CORTO =
  "Esto es un espacio para pensar en voz alta y organizar tus ideas. No es un profesional, no diagnostica, no sustituye a tu psico-oncólogo ni a tu equipo médico.";

export default function AsistentePage() {
  const ajustes = useLiveQuery(() => getAjustes());
  const mensajes = useLiveQuery(() =>
    db.conversacionesAsistente.orderBy("fecha").toArray()
  );
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrimeraVez(localStorage.getItem(CLAVE_PRIMERA_VEZ) !== "1");
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes?.length]);

  if (ajustes === undefined || primeraVez === null) return null;

  // Primera visita: el aviso ampliado, antes de entrar (§4.13)
  if (primeraVez) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <header>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
            Apoyo · Acompañamiento
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
            Antes de entrar
          </h1>
        </header>
        <div className={`${CARD_CLS} space-y-3`}>
          <p className="text-sm leading-7 text-fg">{AVISO_CORTO}</p>
          <p className="text-sm leading-7 text-muted">
            Puede ayudarte a poner en palabras lo que sientes, a repasar tu
            evolución con calma o a preparar qué decir en tu próxima consulta
            o sesión. Todo lo que escribas se queda en este dispositivo.
          </p>
          <p className="text-sm leading-7 text-muted">
            Las personas de verdad — tu equipo médico, tu psico-oncólogo, los
            tuyos — van siempre primero.
          </p>
        </div>
        <BloqueAyudaReal />
        <button
          onClick={() => {
            localStorage.setItem(CLAVE_PRIMERA_VEZ, "1");
            setPrimeraVez(false);
          }}
          className="min-h-12 w-full rounded-lg bg-morado px-4 py-3 text-sm font-semibold text-ink transition hover:bg-morado/90"
        >
          Entendido, entrar
        </button>
      </div>
    );
  }

  const hayIA = tieneIA(ajustes);

  async function mandar() {
    const t = texto.trim();
    if (!t || ocupado) return;
    const cfg = configDesdeAjustes(ajustes!);
    if (!cfg) return;
    setTexto("");
    setError("");
    setOcupado(true);
    try {
      await enviarMensaje(cfg, t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
      setTexto(t); // que no pierda lo que escribió
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      {/* Aviso permanente, visible SIEMPRE en la propia pantalla (§4.13) */}
      <div className="rounded-2xl border border-line bg-surface/60 p-4">
        <p className="text-xs leading-5 text-muted">{AVISO_CORTO}</p>
      </div>

      {!hayIA ? (
        <div className={CARD_CLS}>
          <p className="text-sm leading-6 text-muted">
            Este espacio usa tu propia IA para conversar.{" "}
            <Link
              href="/ajustes/ia"
              className="text-morado underline-offset-2 hover:underline"
            >
              Conéctala en Ajustes
            </Link>{" "}
            (hay guía paso a paso). Los teléfonos de ayuda de aquí abajo
            funcionan siempre, con o sin IA.
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-[30dvh] space-y-3">
            {(mensajes ?? []).length === 0 && (
              <p className="px-2 py-6 text-center text-sm leading-6 text-muted">
                Escribe lo que te ronde — un miedo, una duda, o simplemente
                cómo ha ido el día.
              </p>
            )}
            {(mensajes ?? []).map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  m.rol === "user"
                    ? "ml-auto bg-morado/15 text-fg"
                    : "mr-auto border border-line bg-surface/60 text-fg"
                }`}
              >
                <p className="whitespace-pre-line">{m.texto}</p>
              </div>
            ))}
            {ocupado && (
              <p className="px-2 text-xs text-muted">Escribiendo…</p>
            )}
            <div ref={finRef} />
          </div>

          {error && <p className="px-1 text-xs text-error">{error}</p>}

          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  mandar();
                }
              }}
              rows={2}
              placeholder="Escribe aquí…"
              className={INPUT_CLS}
            />
            <button
              onClick={mandar}
              disabled={ocupado || !texto.trim()}
              className="min-h-11 shrink-0 self-end rounded-lg bg-morado px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-morado/90 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>

          {(mensajes ?? []).length > 0 && (
            <button
              onClick={() => {
                if (confirm("¿Borrar toda la conversación de este dispositivo?")) {
                  borrarConversacion();
                }
              }}
              className="text-center text-xs text-muted underline-offset-2 hover:underline"
            >
              Borrar conversación (solo vive aquí)
            </button>
          )}
        </>
      )}

      {/* Ayuda real SIEMPRE visible desde esta pantalla (§4.13) */}
      <BloqueAyudaReal compacto />
    </div>
  );
}
