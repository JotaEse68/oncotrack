// Clases y utilidades compartidas de la UI (móvil primero: mín. 44px de alto táctil)

export const INPUT_CLS =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg outline-none transition focus:border-morado/70 focus:ring-2 focus:ring-morado/20";

export const BTN_PRIMARIO =
  "min-h-11 w-full rounded-lg bg-morado px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-morado/90";

export const BTN_SECUNDARIO =
  "min-h-11 rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-morado/50 hover:text-fg";

export const CARD_CLS = "rounded-2xl border border-line bg-surface/60 p-5";

/** Fecha de hoy en ISO local (yyyy-mm-dd), sin sorpresas de zona horaria. */
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** dd/mm/yyyy legible a partir de ISO. */
export function fechaLegible(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
