"use client";

import { useEffect } from "react";
import { getAjustes } from "@/lib/db";
import { aplicarTema } from "@/lib/tema";

/** Sincroniza el tema guardado en Dexie con el DOM al arrancar. */
export function ThemeProvider() {
  useEffect(() => {
    getAjustes().then((a) => aplicarTema(a.tema));
  }, []);

  return null;
}
