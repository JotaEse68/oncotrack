import Link from "next/link";

/**
 * Pie de página: disclaimer médico y créditos.
 * OncoTrack acompaña y ordena — la valoración clínica es siempre
 * del equipo médico. Proyecto sin ánimo de lucro.
 */
export function PiePagina() {
  return (
    <footer className="mx-auto mt-12 max-w-md space-y-3 border-t border-line px-1 pb-4 pt-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="OncoTrack …by Jota!"
        className="mx-auto h-10 w-auto"
      />
      <p className="text-xs leading-5 text-muted">
        OncoTrack es una herramienta personal de seguimiento. No sustituye a tu
        equipo médico ni a sus indicaciones: ante cualquier duda o cambio,
        acude siempre a él.
      </p>
      <p className="text-xs leading-5 text-muted">
        App sin ánimo de lucro, creada para apoyar a pacientes con tumores
        neuroendocrinos.{" "}
        <Link
          href="/apoyo/porque"
          className="text-morado underline-offset-2 hover:underline"
        >
          ¿Por qué OncoTrack?
        </Link>
      </p>
      <p className="text-xs leading-5 text-muted">
        Desarrollada por{" "}
        <a
          href="https://jsantos.pro"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-morado underline-offset-2 hover:underline"
        >
          Jota! · jsantos.pro
        </a>
      </p>
    </footer>
  );
}
