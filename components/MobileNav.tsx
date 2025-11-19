"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PlusCircle, List, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/registro", label: "Aggiungi", icon: PlusCircle },
  { href: "/storico", label: "Storico", icon: List },
  { href: "/statistiche", label: "Statistiche", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg md:hidden">
      <div 
        className="flex justify-around items-center"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingTop: '0.5rem'
        }}
      >
        {tabs.map(tab => {
          const active = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[44px] min-h-[44px] transition-colors",
                active
                  ? "text-orange-500"
                  : "text-slate-600 active:text-orange-400"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6 transition-transform",
                  active && "scale-110"
                )} 
                strokeWidth={active ? 2.5 : 2}
              />
              <span 
                className={cn(
                  "text-xs font-medium",
                  active && "font-semibold"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
