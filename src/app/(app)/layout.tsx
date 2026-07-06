import { BottomNav } from "./_components/BottomNav";
import { BotonTema } from "./_components/BotonTema";
import { PiePagina } from "./_components/PiePagina";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/80 px-5 py-3 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="OncoTrack …by Jota!"
          className="h-9 w-auto"
        />
        <BotonTema />
      </header>

      <main className="flex-1 px-5 py-6">
        {children}
        <PiePagina />
      </main>

      <BottomNav />
    </div>
  );
}
