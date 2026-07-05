import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/80 px-5 py-3 backdrop-blur">
        <span className="font-display text-lg font-semibold tracking-tight text-fg">
          OncoTrack
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[12rem] truncate text-xs text-muted sm:inline">
            {user.email}
          </span>
          <form action={logout}>
            <button className="rounded-md border border-line px-2.5 py-1 text-xs text-muted transition hover:border-jade/50 hover:text-fg">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">{children}</main>
    </div>
  );
}
