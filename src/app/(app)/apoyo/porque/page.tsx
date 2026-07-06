import { FormularioSugerencias } from "../../_components/FormularioSugerencias";

/**
 * Por qué hice OncoTrack — en la voz de Jota (spec avisos-y-porque B3).
 * Contenido estático: la historia de la app y cómo sacarle partido.
 */
export default function PorquePage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted">
          Apoyo · Por qué
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-fg">
          Por qué hice OncoTrack
        </h1>
      </header>

      <section className="space-y-3">
        <p className="text-sm leading-6 text-fg">
          Los tumores neuroendocrinos son enfermedades crónicas, de evolución
          lenta. Se siguen durante años con los mismos marcadores, entre
          varios especialistas y en consultas que duran minutos.
        </p>
        <p className="text-sm leading-6 text-fg">
          Eso hace tres cosas: los papeles se desperdigan, la pregunta
          importante se olvida justo en la consulta, y un número suelto empuja
          a buscar en internet respuestas que no están ahí.
        </p>
        <p className="text-sm leading-6 text-fg">
          OncoTrack existe para esas tres cosas: tu historia en un solo sitio,
          tus preguntas listas el día que importan, y tus valores comparados
          solo con tu propio camino — nunca con tablas genéricas.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface/60 p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Cómo sacarle partido
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-6 text-fg">
          <li>
            No es un diario con deberes. Cuando llegue una analítica, hazle
            una foto y confirma los valores — con eso basta.
          </li>
          <li>Las preguntas, apúntalas en el momento en que surjan.</li>
          <li>
            El día de la cita, abre el modo consulta y enséñalo: letra grande
            y tus dudas a mano.
          </li>
          <li>El estado del día es un toque — y solo si te apetece.</li>
          <li>
            Añade tus citas al calendario para que el móvil te avise por ti.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted">
          Lo que esta app no es
        </h2>
        <p className="text-sm leading-6 text-muted">
          No sustituye a tu equipo médico ni a sus indicaciones. Aquí no hay
          diagnósticos ni valoraciones: los datos son tuyos, las decisiones
          son de tu equipo.
        </p>
      </section>

      <section className="border-t border-line pt-5">
        <p className="text-sm leading-6 text-muted">
          Sin ánimo de lucro. Tus datos viven solo en tu móvil. Hecha con
          cariño para apoyar a pacientes con tumores neuroendocrinos y a
          quienes los acompañan.
        </p>
        <p className="mt-3 text-sm text-fg">
          — Jota! ·{" "}
          <a
            href="https://jsantos.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-morado underline-offset-2 hover:underline"
          >
            jsantos.pro
          </a>
        </p>
      </section>

      <FormularioSugerencias />
    </div>
  );
}
