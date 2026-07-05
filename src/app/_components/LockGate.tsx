"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getAjustes, saveAjustes } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { PinPad } from "./PinPad";

const CLAVE_SESION = "oncotrack-abierto";

// /compartido es para terceros: no muestra la base local, solo lo que
// trae la URL, así que no pasa por el candado.
const RUTAS_SIN_CANDADO = ["/compartido"];

export function LockGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [estado, setEstado] = useState<"cargando" | "bloqueado" | "abierto">(
    "cargando"
  );
  const [confirmarReset, setConfirmarReset] = useState(false);
  // Hallazgo del security-review: retardo progresivo contra prueba manual
  // de PINs (hasta 5s por intento tras varios fallos).
  const [fallos, setFallos] = useState(0);

  useEffect(() => {
    getAjustes().then((a) => {
      const yaAbierto = sessionStorage.getItem(CLAVE_SESION) === "1";
      setEstado(a.pinHash && !yaAbierto ? "bloqueado" : "abierto");
    });
  }, []);

  if (RUTAS_SIN_CANDADO.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  if (estado === "cargando") {
    return <div className="min-h-dvh bg-ink" aria-busy="true" />;
  }

  if (estado === "bloqueado") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-ink px-6 py-10">
        <PinPad
          titulo="OncoTrack"
          subtitulo="Escribe tu PIN para entrar"
          onComplete={async (pin) => {
            if (fallos > 0) {
              await new Promise((r) =>
                setTimeout(r, Math.min(fallos * 1000, 5000))
              );
            }
            const a = await getAjustes();
            if (!a.pinHash || !a.pinSalt) return false;
            const ok = await verifyPin(pin, a.pinSalt, a.pinHash);
            if (ok) {
              sessionStorage.setItem(CLAVE_SESION, "1");
              setEstado("abierto");
            } else {
              setFallos((f) => f + 1);
            }
            return ok;
          }}
        />

        {confirmarReset ? (
          <div className="max-w-xs space-y-3 rounded-2xl border border-line bg-surface/60 p-4 text-center">
            <p className="text-sm leading-6 text-fg">
              Restablecer el bloqueo borra solo el PIN. Tus datos clínicos NO
              se tocan — siguen aquí.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmarReset(false)}
                className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await saveAjustes({ pinHash: undefined, pinSalt: undefined });
                  sessionStorage.setItem(CLAVE_SESION, "1");
                  setEstado("abierto");
                }}
                className="min-h-11 rounded-lg bg-jade px-3 py-2 text-sm font-semibold text-ink"
              >
                Quitar el PIN
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmarReset(true)}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            He olvidado mi PIN
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
