import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      {/* Firma: la espina de la línea de tiempo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-jade/25 to-transparent"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-jade">
            Expediente personal
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-fg">
            OncoTrack
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Entra para consultar el expediente y preparar la próxima consulta.
          </p>
        </div>

        <form
          action={login}
          className="space-y-4 rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Correo
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg outline-none transition focus:border-jade/70 focus:ring-2 focus:ring-jade/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">
              Contraseña
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg outline-none transition focus:border-jade/70 focus:ring-2 focus:ring-jade/20"
            />
          </label>

          {error ? <p className="text-sm text-clay">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-jade px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-jade/90"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted/70">
          Acceso privado · paciente y cuidador
        </p>
      </div>
    </main>
  );
}
