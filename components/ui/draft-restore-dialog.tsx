"use client";

import { FileText, X } from "lucide-react";
import { Button } from "./button";

interface DraftRestoreDialogProps {
  isOpen: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  draftDate?: Date;
}

export function DraftRestoreDialog({ isOpen, onRestore, onDiscard, draftDate }: DraftRestoreDialogProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-default bg-[rgba(255,255,255,0.02)] shadow-2xl">
        {/* Header */}
        <div className="border-b border-default/70 bg-[rgba(255,255,255,0.02)] px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[rgba(255,255,255,0.03)] p-2 shadow-sm">
              <FileText className="h-5 w-5 text-amber-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-default">Bozza Trovata</h2>
              <p className="mt-1 text-sm text-muted">
                È stata trovata una bozza non completata
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="rounded-lg border border-amber-700/20 bg-[rgba(250,215,170,0.03)] p-4">
            <p className="text-sm text-muted">
              Hai una bozza salvata automaticamente{" "}
              {draftDate && <span className="font-medium">il {formatDate(draftDate)}</span>}.
            </p>
            <p className="mt-2 text-sm text-muted">
              Vuoi ripristinarla o iniziare da zero?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-default/70 bg-[rgba(255,255,255,0.02)] px-6 py-4">
          <Button
            onClick={onDiscard}
            variant="outline"
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Scarta bozza
          </Button>
          <Button
            onClick={onRestore}
            className="flex-1 bg-sky-600 hover:bg-sky-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            Ripristina
          </Button>
        </div>
      </div>
    </div>
  );
}
