"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  processing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  tone = "default",
  processing = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.8)] backdrop-blur-md">
      <div className="w-full max-w-md scale-100 animate-fade-up rounded-3xl border border-default bg-[rgba(15,23,42,0.92)] p-6 shadow-2xl">
        <div className="space-y-3 text-center text-default">
          <h2 className="text-lg font-semibold text-default">{title}</h2>
          {description ? (
            <p className="text-sm text-muted">{description}</p>
          ) : null}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-full px-5"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full px-5 shadow-sm transition-transform hover:-translate-y-0.5",
              tone === "danger"
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-sky-600 text-white hover:bg-sky-700"
            )}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {processing ? 'Attendi...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
