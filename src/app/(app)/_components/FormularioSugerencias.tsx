"use client";

import { useState } from "react";
import { BTN_PRIMARIO, INPUT_CLS } from "./ui";

const CORREO = "jsantospro3@gmail.com";

const TIPOS = [
  { clave: "sugerencia", etiqueta: "Una sugerencia" },
  { clave: "gracias", etiqueta: "Dar las gracias" },
  { clave: "fallo", etiqueta: "Algo no va" },
] as const;

/**
 * Sugerencias sin servidor: el botón abre el correo del propio usuario
 * ya dirigido y rellenado — sus datos siguen sin pasar por ningún sitio.
 */
export function FormularioSugerencias() {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["clave"]>("sugerencia");
  const [texto, setTexto] = useState("");

  const asunto = `OncoTrack — ${TIPOS.find((t) => t.clave === tipo)!.etiqueta.toLowerCase()}`;
  const cuerpo = `${texto}\n\n(Enviado desde OncoTrack)`;
  const mailto = `mailto:${CORREO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;

  return (
    <section
      id="sugerencias"
      className="rounded-2xl border border-line bg-surface/60 p-5"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        ¿Me cuentas algo?
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Una sugerencia, un fallo o simplemente cómo te va con la app — me
        llega directo y me ayuda a mejorarla.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <button
            key={t.clave}
            type="button"
            onClick={() => setTipo(t.clave)}
            className={`min-h-9 rounded-full border px-3 py-1.5 text-xs transition ${
              tipo === t.clave
                ? "border-morado bg-morado/10 text-morado"
                : "border-line text-muted hover:border-morado/50 hover:text-fg"
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Escríbelo con tus palabras…"
        aria-label="Tu mensaje"
        className={`${INPUT_CLS} mt-3 resize-y`}
      />
      <a
        href={mailto}
        aria-disabled={!texto.trim()}
        onClick={(e) => {
          if (!texto.trim()) e.preventDefault();
        }}
        className={`${BTN_PRIMARIO} mt-3 flex items-center justify-center ${
          texto.trim() ? "" : "pointer-events-auto opacity-50"
        }`}
      >
        Enviar por correo
      </a>
      <p className="mt-2 text-xs leading-5 text-muted">
        Se abre tu app de correo con el mensaje ya escrito — tú le das a
        enviar.
      </p>
    </section>
  );
}
