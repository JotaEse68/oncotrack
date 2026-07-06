"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getAjustes, saveAjustes } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { PinPad } from "./PinPad";

const CLAVE_SESION = "oncotrack-abierto";

// /compartido es para terceros: no muestra la base local, solo lo que
// trae la URL, así que no pasa por el candado ni por el onboarding.
const RUTAS_LIBRES = ["/compartido"];

export function LockGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // null = cargando (evita decidir antes de leer Dexie)
  const ajustes = useLiveQuery(() => getAjustes(), [], null);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [confirmarReset, setConfirmarReset] = useState(false);
  // Hallazgo del security-review: retardo progresivo contra prueba manual
  // de PINs (hasta 5s por intento tras varios fallos).
  const [fallos, setFallos] = useState(0);

  useEffect(() => {
    setDesbloqueado(sessionStorage.getItem(CLAVE_SESION) === "1");
  }, []);

  const esLibre = RUTAS_LIBRES.some((r) => pathname.startsWith(r));
  const esOnboarding = pathname.startsWith("/onboarding");
  const bloqueado =
    !esLibre && ajustes !== null && Boolean(ajustes.pinHash) && !desbloqueado;

  // Primer uso: a la bienvenida (§4.12) — informa, nunca bloquea (se puede saltar).
  const onboardingPendiente =
    !esLibre &&
    !esOnboarding &&
    ajustes !== null &&
    ajustes.onboardingVisto === 0;

  useEffect(() => {
    if (!bloqueado && onboardingPendiente) {
      router.replace("/onboarding");
    }
  }, [bloqueado, onboardingPendiente, router]);

  if (esLibre) return <>{children}</>;

  if (ajustes === null || onboardingPendiente) {
    return <div className="min-h-dvh bg-ink" aria-busy="true" />;
  }

  if (bloqueado) {
    return (
      <div className="textura-cebra flex min-h-dvh flex-col items-center justify-center gap-8 bg-ink px-6 py-10">
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
              setDesbloqueado(true);
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
                  setDesbloqueado(true);
                }}
                className="min-h-11 rounded-lg bg-morado px-3 py-2 text-sm font-semibold text-ink"
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
