"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content','dark');
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content','light');
    }
  }, [isDark]);

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setIsDark(v => !v)}>
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}
