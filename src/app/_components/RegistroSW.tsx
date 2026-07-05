"use client";

import { useEffect } from "react";

/** Registra el service worker (solo producción — en dev estorba). */
export function RegistroSW() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sin SW la app sigue funcionando; solo pierde el shell offline */
      });
    }
  }, []);

  return null;
}
