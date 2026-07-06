"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getAjustes, saveAjustes } from "@/lib/db";
import {
  chatCompletion,
  configDesdeAjustes,
  IA_DEFAULTS,
} from "@/lib/ia";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CARD_CLS,
} from "../../_components/ui";

const PASOS_TUTORIAL = [
  {
    n: "1",
    titulo: "Entra en la web del proveedor",
    detalle:
      "Por ejemplo platform.openai.com → inicia sesión → menú \"API keys\".",
  },
  {
    n: "2",
    titulo: "Crea una clave nueva",
    detalle: "Botón \"Create new secret key\". Ponle el nombre que quieras.",
  },
  {
    n: "3",
    titulo: "Cópiala",
    detalle:
      "Empieza por \"sk-\". Cópiala entera en ese momento (luego no se vuelve a mostrar).",
  },
  {
    n: "4",
    titulo: "Pégala aquí abajo",
    detalle: "Y pulsa Guardar. Ya está — no hay que hacer nada más.",
  },
];

export default function AjustesIAPage() {
  const ajustes = useLiveQuery(() => getAjustes());
  const [verClave, setVerClave] = useState(false);
  const [prueba, setPrueba] = useState<"" | "probando" | "ok" | string>("");
  const [guardado, setGuardado] = useState(false);

  async function guardar(formData: FormData) {
    await saveAjustes({
      apiKey: String(formData.get("apiKey") ?? "").trim() || undefined,
      apiBaseUrl: String(formData.get("apiBaseUrl") ?? "").trim() || undefined,
      apiModelo: String(formData.get("apiModelo") ?? "").trim() || undefined,
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  async function probar() {
    const a = await db.ajustes.get(1);
    const cfg = a && configDesdeAjustes(a);
    if (!cfg) {
      setPrueba("Primero guarda una clave.");
      return;
    }
    setPrueba("probando");
    try {
      await chatCompletion(cfg, [{ role: "user", content: "Di solo: ok" }], {
        maxTokens: 5,
      });
      setPrueba("ok");
    } catch (e) {
      setPrueba(e instanceof Error ? e.message : "No se pudo conectar.");
    }
  }

  if (ajustes === undefined) return null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Ajustes · Tu propia IA
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Conecta tu IA, si quieres
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          La app funciona perfectamente sin esto. Con una clave propia, además
          podrás hacer una foto a una analítica y que se rellene sola (tú
          siempre revisas antes de guardar).
        </p>
      </header>

      <section className={CARD_CLS}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Cómo conseguir tu clave
        </h2>
        <ol className="mt-3 space-y-3">
          {PASOS_TUTORIAL.map((p) => (
            <li key={p.n} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-morado/15 text-sm font-semibold text-morado">
                {p.n}
              </span>
              <span>
                <span className="block text-sm font-medium text-fg">
                  {p.titulo}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">
                  {p.detalle}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <form action={guardar} className={`${CARD_CLS} space-y-4`}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Tu clave de API
          </span>
          <div className="flex gap-2">
            <input
              name="apiKey"
              type={verClave ? "text" : "password"}
              defaultValue={ajustes?.apiKey ?? ""}
              placeholder="sk-…"
              autoComplete="off"
              className={INPUT_CLS}
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-xs text-muted"
            >
              {verClave ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>
        <details>
          <summary className="cursor-pointer text-xs text-muted">
            Opciones avanzadas (otro proveedor compatible)
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                URL base
              </span>
              <input
                name="apiBaseUrl"
                defaultValue={ajustes?.apiBaseUrl ?? ""}
                placeholder={IA_DEFAULTS.baseUrl}
                className={INPUT_CLS}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Modelo
              </span>
              <input
                name="apiModelo"
                defaultValue={ajustes?.apiModelo ?? ""}
                placeholder={IA_DEFAULTS.modelo}
                className={INPUT_CLS}
              />
            </label>
          </div>
        </details>
        <button type="submit" className={BTN_PRIMARIO}>
          {guardado ? "Guardado ✓" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={probar}
          disabled={prueba === "probando"}
          className={`${BTN_SECUNDARIO} w-full disabled:opacity-60`}
        >
          {prueba === "probando" ? "Probando…" : "Probar conexión"}
        </button>
        {prueba === "ok" && (
          <p className="text-xs text-morado">
            Conexión correcta. Todo listo para usar la cámara.
          </p>
        )}
        {prueba && prueba !== "ok" && prueba !== "probando" && (
          <p className="text-xs text-error">{prueba}</p>
        )}
      </form>

      <p className="px-1 text-xs leading-5 text-muted">
        Cada foto que analices tiene un coste mínimo que pagas directamente al
        proveedor de la IA. Nosotros nunca vemos tu clave ni tus datos.
      </p>
    </div>
  );
}
