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
    <header className="border-b bg-slate-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-sky-600">
          <span className="text-xl">🏃‍♂️</span>
          <span>Tracker Velocista</span>
        </div>

        <nav className="rounded-full border bg-white p-1 shadow-sm">
          <ul className="flex gap-1 text-sm">
            {tabs.map((tab) => {
              const active = pathname === tab.href;

              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={cn(
                      "rounded-full px-4 py-1.5 transition-colors",
                      active
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
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
