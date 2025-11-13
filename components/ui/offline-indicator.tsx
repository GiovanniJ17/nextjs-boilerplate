"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useServiceWorker } from "@/lib/useServiceWorker";

export function OfflineIndicator() {
  const { isOnline, isInstalled } = useServiceWorker();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-in">
      <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 shadow-lg">
        <WifiOff className="h-4 w-4 text-orange-600" />
        <div className="text-sm">
          <p className="font-semibold text-orange-900">Modalità Offline</p>
          <p className="text-xs text-orange-700">
            {isInstalled
              ? "I dati locali sono disponibili"
              : "Connessione limitata"}
          </p>
        </div>
      </div>
    </div>
  );
}
