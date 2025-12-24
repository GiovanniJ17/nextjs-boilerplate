"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/theme-toggle";

const tabs = [
  { href: "/registro", label: "Aggiungi" },
  { href: "/storico", label: "Storico" },
  { href: "/statistiche", label: "Statistiche" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b dark:border-slate-700/60 bg-transparent backdrop-blur-sm shadow-sm hidden md:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-white font-bold text-lg">
              TV
            </div>
            <h1 className="text-lg font-semibold text-[rgb(var(--text))]">Tracker Velocista</h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center">
            <ul className="flex items-center gap-1 rounded-lg bg-[rgba(255,255,255,0.02)] p-1 backdrop-blur-sm">
                <li className="mr-3">
                  <ThemeToggle />
                </li>
              {tabs.map(tab => {
                const active = pathname === tab.href;

                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px]",
                        active
                          ? "bg-[rgba(255,255,255,0.06)] text-default shadow-sm"
                          : "text-muted hover:bg-[rgba(255,255,255,0.05)] hover:text-default"
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
      </div>
    </header>
  );
}
