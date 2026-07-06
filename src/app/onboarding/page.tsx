"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveAjustes } from "@/lib/db";
import { BloqueAyudaReal } from "@/app/(app)/apoyo/_components/BloqueAyudaReal";

/**
 * Bienvenida en 5 pasos (§4.12). Informa, nunca bloquea:
 * todo se puede saltar, y queda accesible después desde Apoyo → Guía.
 */

const TOTAL = 5;

function Contenido() {
  const router = useRouter();
  const esRepaso = useSearchParams().get("repaso") === "1";
  const [paso, setPaso] = useState(0);

  async function terminar(destino: string = "/hoy") {
    if (!esRepaso) await saveAjustes({ onboardingVisto: 1 });
    router.push(esRepaso && destino === "/hoy" ? "/apoyo/ayuda" : destino);
  }

  const PASOS = [
    {
      titulo: "Esto es OncoTrack",
      cuerpo: (
        <p className="text-sm leading-7 text-muted">
          Tu evolución, tu medicación y tus citas — en un solo sitio,{" "}
          <span className="text-fg">solo tuyo</span>. Para entender lo que va
          pasando sin tener que recordarlo todo de memoria, y llegar a cada
          consulta con las ideas ordenadas.
        </p>
      ),
    },
    {
      titulo: "Tus datos son solo tuyos",
      cuerpo: (
        <p className="text-sm leading-7 text-muted">
          Todo lo que apuntes vive <span className="text-fg">en tu móvil</span>
          . No hay cuentas, no hay registro, no hay ningún servidor nuestro
          mirando. Nosotros no vemos tus datos, no los guardamos, no los
          compartimos. Nadie más los ve, salvo que tú decidas compartirlos.
        </p>
      ),
    },
    {
      titulo: "Un candado, si quieres",
      cuerpo: (
        <div className="space-y-4">
          <p className="text-sm leading-7 text-muted">
            Puedes proteger la app con un PIN de 4 dígitos, por si alguien
            coge tu móvil. Es opcional y puedes activarlo o quitarlo cuando
            quieras desde Ajustes.
          </p>
          <button
            onClick={() => terminar("/ajustes")}
            className="min-h-11 w-full rounded-lg border border-morado/50 px-4 py-2.5 text-sm font-medium text-morado transition hover:bg-morado/10"
          >
            Activar ahora en Ajustes
          </button>
          <p className="text-center text-xs text-muted">
            o sigue — puedes hacerlo en cualquier momento
          </p>
        </div>
      ),
    },
    {
      titulo: "Tu propia IA, si quieres",
      cuerpo: (
        <div className="space-y-4">
          <p className="text-sm leading-7 text-muted">
            Si conectas una clave de IA tuya, podrás hacer una foto a una
            analítica y que los valores se rellenen solos (tú siempre revisas
            antes de guardar). La app funciona perfectamente sin esto, con
            entrada manual.
          </p>
          <button
            onClick={() => terminar("/ajustes/ia")}
            className="min-h-11 w-full rounded-lg border border-morado/50 px-4 py-2.5 text-sm font-medium text-morado transition hover:bg-morado/10"
          >
            Configurar ahora (hay guía paso a paso)
          </button>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-morado/50 hover:text-fg"
          >
            Abrir la página de claves de OpenAI →
          </a>
          <p className="text-center text-xs text-muted">
            o déjalo para más tarde, desde Ajustes
          </p>
        </div>
      ),
    },
    {
      titulo: "Una cosa más, importante",
      cuerpo: (
        <div className="space-y-4">
          <p className="text-sm leading-7 text-muted">
            OncoTrack <span className="text-fg">acompaña</span> — no sustituye
            a tu equipo médico ni al apoyo profesional. Ante cualquier duda,
            ellos son siempre la referencia. Y si un día la ansiedad aprieta,
            aquí tienes personas reales:
          </p>
          <BloqueAyudaReal compacto />
        </div>
      ),
    },
  ];

  const esUltimo = paso === TOTAL - 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`Paso ${paso + 1} de ${TOTAL}`}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === paso ? "w-6 bg-morado" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => terminar()}
          className="min-h-11 px-2 text-xs text-muted underline-offset-2 hover:underline"
        >
          {esRepaso ? "Salir" : "Saltar"}
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Bienvenida · {paso + 1} de {TOTAL}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-fg">
          {PASOS[paso].titulo}
        </h1>
        <div className="mt-5">{PASOS[paso].cuerpo}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-4">
        <button
          onClick={() => setPaso((p) => Math.max(0, p - 1))}
          disabled={paso === 0}
          className="min-h-12 rounded-lg border border-line px-4 py-3 text-sm text-muted transition disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          onClick={() => (esUltimo ? terminar() : setPaso((p) => p + 1))}
          className="min-h-12 rounded-lg bg-morado px-4 py-3 text-sm font-semibold text-ink transition hover:bg-morado/90"
        >
          {esUltimo ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ink" />}>
      <Contenido />
    </Suspense>
  );
}
