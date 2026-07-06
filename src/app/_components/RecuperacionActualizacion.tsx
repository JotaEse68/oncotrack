"use client";

import { useEffect } from "react";
import { debeRecargar, esFalloDeCarga } from "@/lib/actualizacion";

const CLAVE_ULTIMA_RECARGA = "oncotrack-recarga-actualizacion";

function recargarConGuarda() {
  let ultima: number | null = null;
  try {
    const v = sessionStorage.getItem(CLAVE_ULTIMA_RECARGA);
    ultima = v ? Number(v) : null;
  } catch {
    /* sin sessionStorage recargamos igual; el patrón de fallo es específico */
  }
  if (!debeRecargar(Date.now(), ultima)) return;
  try {
    sessionStorage.setItem(CLAVE_ULTIMA_RECARGA, String(Date.now()));
  } catch {
    /* ídem */
  }
  location.reload();
}

/**
 * Si la app quedó desactualizada tras un deploy (chunks que ya no existen),
 * los toques que navegan fallan en silencio. Aquí lo detectamos y
 * recargamos una vez para traer la versión nueva. Ver lib/actualizacion.
 */
export function RecuperacionActualizacion() {
  useEffect(() => {
    const alError = (e: ErrorEvent) => {
      if (esFalloDeCarga(e.message ?? "")) recargarConGuarda();
    };
    const alRechazo = (e: PromiseRejectionEvent) => {
      const msg =
        e.reason instanceof Error ? e.reason.message : String(e.reason ?? "");
      if (esFalloDeCarga(msg)) recargarConGuarda();
    };
    window.addEventListener("error", alError);
    window.addEventListener("unhandledrejection", alRechazo);
    return () => {
      window.removeEventListener("error", alError);
      window.removeEventListener("unhandledrejection", alRechazo);
    };
  }, []);

  return null;
}
