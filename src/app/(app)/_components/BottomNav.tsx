"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/hoy", label: "Hoy" },
  { href: "/salud", label: "Salud" },
  { href: "/citas", label: "Citas" },
  { href: "/ajustes", label: "Ajustes" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-10 grid border-t border-line bg-ink/90 backdrop-blur"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`relative py-3.5 text-center text-xs font-medium transition ${
              active ? "text-jade" : "text-muted hover:text-fg"
            }`}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 mx-auto h-px w-8 bg-jade"
              />
            )}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
