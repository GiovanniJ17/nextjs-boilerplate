"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light" as const, icon: Sun, label: "Chiaro" },
    { value: "dark" as const, icon: Moon, label: "Scuro" },
    { value: "system" as const, icon: Monitor, label: "Sistema" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            theme === value
              ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60"
          )}
          aria-label={label}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
