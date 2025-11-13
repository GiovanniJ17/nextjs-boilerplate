"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeSince } from "@/lib/useAutoSave";

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  className?: string;
}

export function AutoSaveIndicator({ lastSaved, isSaving, className }: AutoSaveIndicatorProps) {
  const [timeText, setTimeText] = useState("");

  // Aggiorna il testo del tempo ogni 10 secondi
  useEffect(() => {
    const updateTime = () => {
      setTimeText(formatTimeSince(lastSaved));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  if (!lastSaved && !isSaving) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-slate-400", className)}>
        <CloudOff className="h-3.5 w-3.5" />
        <span>Bozza non salvata</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-sky-600", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Salvataggio...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-xs text-emerald-600", className)}>
      <Check className="h-3.5 w-3.5" />
      <span>Salvato {timeText}</span>
    </div>
  );
}
