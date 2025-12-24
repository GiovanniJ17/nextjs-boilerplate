"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          borderRadius: '1rem',
          padding: '1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        classNames: {
          toast: 'shadow-xl border border-border bg-card text-foreground',
          title: 'font-semibold text-foreground',
          description: 'text-sm text-muted-foreground',
          actionButton: 'bg-secondary text-foreground rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-secondary/80',
          cancelButton: 'bg-secondary text-muted-foreground rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-secondary/80',
          closeButton: 'bg-secondary border-border hover:bg-secondary/80 rounded-full text-muted-foreground',
          success: 'border-emerald-500/50 bg-emerald-500/10 text-foreground',
          error: 'border-destructive/50 bg-destructive/10 text-foreground',
          warning: 'border-amber-500/50 bg-amber-500/10 text-foreground',
          info: 'border-primary/50 bg-primary/10 text-foreground',
        },
      }}
    />
  );
}
