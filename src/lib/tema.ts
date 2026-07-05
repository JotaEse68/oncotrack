import { saveAjustes, type Ajustes } from "@/lib/db";

const CLAVE_LOCAL = "oncotrack-tema";

/** Aplica el tema al DOM y lo espeja en localStorage (anti-flash). */
export function aplicarTema(tema: Ajustes["tema"]): void {
  if (tema === "oscuro") {
    document.documentElement.dataset.theme = "oscuro";
  } else {
    delete document.documentElement.dataset.theme;
  }
  try {
    localStorage.setItem(CLAVE_LOCAL, tema);
  } catch {
    /* localStorage puede no estar disponible; el tema sigue funcionando */
  }
}

/** Cambia el tema: fuente de verdad en Dexie, espejo en localStorage. */
export async function cambiarTema(tema: Ajustes["tema"]): Promise<void> {
  await saveAjustes({ tema });
  aplicarTema(tema);
}

/** Script inline para <body> — pinta el tema guardado antes de hidratar. */
export const SCRIPT_ANTIFLASH = `try{if(localStorage.getItem("${CLAVE_LOCAL}")==="oscuro")document.documentElement.dataset.theme="oscuro"}catch(e){}`;
