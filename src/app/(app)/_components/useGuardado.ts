"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Confirmación temporal de guardado (fix "no avisa y lo repito").
 * `confirmar()` enciende el estado ~2s para que el botón diga "Guardado ✓".
 */
export function useGuardado(ms = 2000): [boolean, () => void] {
  const [guardado, setGuardado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function confirmar() {
    setGuardado(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setGuardado(false), ms);
  }

  return [guardado, confirmar];
}
