"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/registro", label: "Registro" },
  { href: "/storico", label: "Storico" },
  { href: "/statistiche", label: "Statistiche" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="animate-header border-b bg-slate-50/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-sky-600">
          <span className="text-xl">🏃‍♂️</span>
          <span>Tracker Velocista</span>
        </div>

        <nav className="surface-animated rounded-full border bg-white/90 p-1 shadow-sm">
          <ul className="flex gap-1 text-sm">
            {tabs.map(tab => {
              const active = pathname === tab.href;

              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={cn(
                      "rounded-full px-4 py-1.5 transition-all duration-300",
                      active
                        ? "bg-sky-600 text-white shadow-[0_14px_30px_-18px_rgba(14,165,233,0.8)]"
                        : "text-slate-600 hover:-translate-y-0.5 hover:bg-slate-100"
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
