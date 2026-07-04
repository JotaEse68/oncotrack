export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">
        Expediente oncológico personal
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">OncoTrack</h1>
      <p className="max-w-sm text-sm leading-6 text-zinc-400">
        Cada documento actualiza el expediente, compara la evolución y prepara la
        siguiente consulta. La revisión humana confirma cada dato.
      </p>
      <p className="mt-6 text-xs text-zinc-600">Fase 1 — Base clínica · en construcción</p>
    </main>
  );
}
