"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const INPUT_CLS =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg outline-none transition focus:border-morado/70 focus:ring-2 focus:ring-morado/20";

export default function PerfilPage() {
  const perfil = useLiveQuery(() => db.perfil.get(1));
  const [guardado, setGuardado] = useState(false);

  async function guardar(formData: FormData) {
    await db.perfil.put({
      id: 1,
      nombre: String(formData.get("nombre") ?? "").trim(),
      fechaNacimiento: String(formData.get("fechaNacimiento") ?? "") || undefined,
      diagnostico: String(formData.get("diagnostico") ?? "").trim() || undefined,
      idioma: "es",
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  // Evitar pisar los defaultValue antes de que cargue la query
  if (perfil === undefined) return null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Tus datos
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          {perfil?.nombre || "Perfil"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Esto vive solo en tu dispositivo. Nadie más lo ve.
        </p>
      </header>

      <form
        action={guardar}
        className="space-y-4 rounded-2xl border border-line bg-surface/60 p-5"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Tu nombre
          </span>
          <input
            name="nombre"
            defaultValue={perfil?.nombre ?? ""}
            required
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Fecha de nacimiento (opcional)
          </span>
          <input
            name="fechaNacimiento"
            type="date"
            defaultValue={perfil?.fechaNacimiento ?? ""}
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Diagnóstico, en tus palabras (opcional)
          </span>
          <textarea
            name="diagnostico"
            rows={3}
            defaultValue={perfil?.diagnostico ?? ""}
            className={INPUT_CLS}
          />
        </label>
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg bg-morado px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-morado/90"
        >
          {guardado ? "Guardado ✓" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
