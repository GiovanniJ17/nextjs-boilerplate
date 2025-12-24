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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary p-2 shadow-sm">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-card-foreground">Bozza Trovata</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                È stata trovata una bozza non completata
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-card">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-card-foreground">
              Hai una bozza salvata automaticamente{" "}
              {draftDate && <span className="font-medium text-primary">il {formatDate(draftDate)}</span>}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vuoi ripristinarla o iniziare da zero?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <Button
            onClick={onDiscard}
            variant="outline"
            className="flex-1 border-border hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Scarta bozza
          </Button>
          <Button
            onClick={onRestore}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="mr-2 h-4 w-4" />
            Ripristina
          </Button>
        </div>
      </div>
    </div>
  );
}
