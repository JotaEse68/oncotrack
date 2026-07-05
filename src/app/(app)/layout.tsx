import { BottomNav } from "./_components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/80 px-5 py-3 backdrop-blur">
        <span className="font-display text-lg font-semibold tracking-tight text-fg">
          OncoTrack
        </span>
      </header>

      <main className="flex-1 px-5 py-6">{children}</main>

      <BottomNav />
    </div>
  );
}
