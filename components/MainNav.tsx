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
    <header className="animate-header sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl justify-center px-4 py-3">
        <nav className="rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm">
          <ul className="flex gap-1 text-sm">
            {tabs.map(tab => {
              const active = pathname === tab.href;

              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={cn(
                      "rounded-full px-4 py-1.5 transition-colors duration-200",
                      active
                        ? "bg-sky-600 text-white shadow-[0_14px_30px_-18px_rgba(14,165,233,0.8)]"
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
