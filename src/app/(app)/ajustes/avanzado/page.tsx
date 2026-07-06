"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveAjustes } from "@/lib/db";
import {
  cerrarSesion,
  descargarSnapshot,
  emailActual,
  iniciarSesion,
  subirSnapshot,
  syncDisponible,
} from "@/lib/sync";
import {
  INPUT_CLS,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CARD_CLS,
} from "../../_components/ui";

export default function AvanzadoPage() {
  const ajustes = useLiveQuery(() => db.ajustes.get(1));
  const [confirmando, setConfirmando] = useState(false);
  const [sesion, setSesion] = useState<string | null>(null);
  const [estado, setEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmarDescarga, setConfirmarDescarga] = useState(false);

  const activado = ajustes?.syncActivado === 1;

  useEffect(() => {
    if (syncDisponible() && activado) {
      emailActual().then(setSesion);
    }
  }, [activado]);

  // Sin el flag de build, esta pantalla no existe a efectos prácticos.
  if (!syncDisponible()) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-semibold text-fg">
          Avanzado
        </h1>
        <p className="mt-3 text-sm text-muted">
          No hay opciones avanzadas disponibles en esta instalación.
        </p>
      </div>
    );
  }

  if (ajustes === undefined) return null;

  async function entrar(formData: FormData) {
    setEstado("");
    const error = await iniciarSesion(
      String(formData.get("email")),
      String(formData.get("password"))
    );
    if (error) {
      setEstado("No se pudo iniciar sesión. Revisa el correo y la contraseña.");
    } else {
      setSesion(await emailActual());
    }
  }

  async function subir() {
    setOcupado(true);
    setEstado("");
    try {
      await subirSnapshot();
      setEstado("Copia subida. Ya puedes descargarla en tu otro dispositivo.");
    } catch (e) {
      setEstado(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setOcupado(false);
    }
  }

  async function descargar() {
    setOcupado(true);
    setEstado("");
    setConfirmarDescarga(false);
    try {
      const res = await descargarSnapshot();
      setEstado(
        res
          ? `Datos traídos (copia del ${new Date(res.fecha).toLocaleDateString("es-ES")}).`
          : "Todavía no hay ninguna copia subida desde otro dispositivo."
      );
    } catch (e) {
      setEstado(e instanceof Error ? e.message : "No se pudo descargar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Ajustes · Avanzado
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Sincronizar entre mis dispositivos
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Opcional. La app nunca lo necesita para funcionar.
        </p>
      </header>

      {!activado && !confirmando && (
        <section className={CARD_CLS}>
          <p className="text-sm leading-6 text-muted">
            Si lo activas, tus datos viajarán a un servidor cifrado para poder
            verlos desde otro móvil tuyo.
          </p>
          <button
            onClick={() => setConfirmando(true)}
            className={`${BTN_SECUNDARIO} mt-3 w-full`}
          >
            Quiero activarlo
          </button>
        </section>
      )}

      {!activado && confirmando && (
        <section className={`${CARD_CLS} space-y-3`}>
          <p className="text-sm leading-6 text-fg">
            Tus datos viajarán a un servidor cifrado para poder verlos desde
            otro móvil tuyo. ¿Seguro que quieres activarlo?
          </p>
          <p className="text-xs leading-5 text-muted">
            No viajan nunca: tus fotos y documentos, tus conversaciones del
            espacio de acompañamiento, tu PIN ni tu clave de IA.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirmando(false)}
              className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm text-muted"
            >
              No, dejarlo
            </button>
            <button
              onClick={async () => {
                await saveAjustes({ syncActivado: 1 });
                setConfirmando(false);
              }}
              className="min-h-11 rounded-lg bg-morado px-3 py-2 text-sm font-semibold text-ink"
            >
              Sí, activar
            </button>
          </div>
        </section>
      )}

      {activado && !sesion && (
        <form action={entrar} className={`${CARD_CLS} space-y-4`}>
          <p className="text-xs leading-5 text-muted">
            Necesitas una cuenta (la misma en tus dos dispositivos).
          </p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Correo
            </span>
            <input name="email" type="email" required className={INPUT_CLS} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Contraseña
            </span>
            <input
              name="password"
              type="password"
              required
              className={INPUT_CLS}
            />
          </label>
          <button type="submit" className={BTN_PRIMARIO}>
            Iniciar sesión
          </button>
        </form>
      )}

      {activado && sesion && (
        <section className={`${CARD_CLS} space-y-3`}>
          <p className="text-xs text-muted">
            Conectado como <span className="text-fg">{sesion}</span>
          </p>
          <button
            onClick={subir}
            disabled={ocupado}
            className={`${BTN_PRIMARIO} disabled:opacity-60`}
          >
            Subir mi copia
          </button>
          {confirmarDescarga ? (
            <div className="space-y-2 rounded-xl border border-error/40 bg-error/10 p-3">
              <p className="text-sm leading-6 text-fg">
                Esto reemplaza lo que hay en este móvil por la copia subida.
                ¿Continuar?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmarDescarga(false)}
                  className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm text-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={descargar}
                  disabled={ocupado}
                  className="min-h-11 rounded-lg bg-error px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  Sí, traer copia
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmarDescarga(true)}
              disabled={ocupado}
              className={`${BTN_SECUNDARIO} w-full disabled:opacity-60`}
            >
              Traer copia de otro dispositivo
            </button>
          )}
          <p className="text-xs leading-5 text-muted">
            Los archivos y fotos no viajan — haz backup aparte. Tus
            conversaciones del asistente tampoco salen de este móvil.
          </p>
          <div className="flex justify-between pt-1">
            <button
              onClick={async () => {
                await cerrarSesion();
                setSesion(null);
              }}
              className="text-xs text-muted underline-offset-2 hover:underline"
            >
              Cerrar sesión
            </button>
            <button
              onClick={async () => {
                await cerrarSesion();
                setSesion(null);
                await saveAjustes({ syncActivado: 0 });
              }}
              className="text-xs text-muted underline-offset-2 hover:underline"
            >
              Desactivar sincronización
            </button>
          </div>
        </section>
      )}

      {estado && <p className="px-1 text-xs text-morado">{estado}</p>}
    </div>
  );
}
