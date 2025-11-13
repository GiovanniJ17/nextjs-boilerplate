"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const tabs = [
  { href: "/registro", label: "Registro" },
  { href: "/storico", label: "Storico" },
  { href: "/statistiche", label: "Statistiche" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm dark:bg-slate-900/95 dark:border-slate-700/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Navigation */}
          <nav className="flex items-center">
            <ul className="flex items-center gap-1 rounded-lg bg-slate-100/80 dark:bg-slate-800 p-1">
              {tabs.map(tab => {
                const active = pathname === tab.href;

                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100"
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
