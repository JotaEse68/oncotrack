"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveAjustes } from "@/lib/db";
import { hashPin, nuevoSalt, verifyPin } from "@/lib/pin";
import { PinPad } from "@/app/_components/PinPad";
import { BTN_SECUNDARIO, CARD_CLS } from "../../_components/ui";

type Paso = "actual" | "nuevo" | "repite";

/** Sección "Bloqueo con PIN" de Ajustes (§4.2). */
export function SeccionPin() {
  const ajustes = useLiveQuery(() => db.ajustes.get(1));
  const tienePin = Boolean(ajustes?.pinHash);

  // Flujo activo: lista de pasos pendientes + qué hacer al acabar
  const [flujo, setFlujo] = useState<{
    pasos: Paso[];
    accion: "activar" | "cambiar" | "quitar";
    nuevoPin?: string;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function abrirFlujo(accion: "activar" | "cambiar" | "quitar") {
    setAviso(null);
    const pasos: Paso[] =
      accion === "activar"
        ? ["nuevo", "repite"]
        : accion === "cambiar"
          ? ["actual", "nuevo", "repite"]
          : ["actual"];
    setFlujo({ pasos, accion });
  }

  async function completarPaso(pin: string): Promise<boolean> {
    if (!flujo) return false;
    const [paso, ...resto] = flujo.pasos;

    if (paso === "actual") {
      const a = await db.ajustes.get(1);
      if (!a?.pinHash || !a.pinSalt) return false;
      if (!(await verifyPin(pin, a.pinSalt, a.pinHash))) return false;
      if (flujo.accion === "quitar") {
        await saveAjustes({ pinHash: undefined, pinSalt: undefined });
        setFlujo(null);
        setAviso("PIN desactivado. La app abrirá directa.");
        return true;
      }
      setFlujo({ ...flujo, pasos: resto });
      return true;
    }

    if (paso === "nuevo") {
      setFlujo({ ...flujo, pasos: resto, nuevoPin: pin });
      return true;
    }

    // paso === "repite"
    if (pin !== flujo.nuevoPin) return false;
    const salt = nuevoSalt();
    await saveAjustes({ pinSalt: salt, pinHash: await hashPin(pin, salt) });
    sessionStorage.setItem("oncotrack-abierto", "1");
    setFlujo(null);
    setAviso("PIN guardado. Se pedirá al abrir la app.");
    return true;
  }

  const TITULOS: Record<Paso, string> = {
    actual: "Escribe tu PIN actual",
    nuevo: "Elige un PIN de 4 dígitos",
    repite: "Repítelo para confirmar",
  };

  return (
    <section className={CARD_CLS}>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Bloqueo con PIN
      </h2>
      <p className="mt-2 text-xs leading-5 text-muted">
        Un candado sencillo frente a miradas ajenas. Si lo olvidas, podrás
        quitarlo sin perder ningún dato.
      </p>

      {flujo ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <PinPad titulo={TITULOS[flujo.pasos[0]]} onComplete={completarPaso} />
          <button
            onClick={() => setFlujo(null)}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {tienePin ? (
            <>
              <button
                onClick={() => abrirFlujo("cambiar")}
                className={BTN_SECUNDARIO}
              >
                Cambiar PIN
              </button>
              <button
                onClick={() => abrirFlujo("quitar")}
                className={BTN_SECUNDARIO}
              >
                Quitar PIN
              </button>
            </>
          ) : (
            <button
              onClick={() => abrirFlujo("activar")}
              className={BTN_SECUNDARIO}
            >
              Activar PIN
            </button>
          )}
        </div>
      )}

      {aviso && <p className="mt-3 text-xs text-jade">{aviso}</p>}
    </section>
  );
}
