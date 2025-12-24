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
          backgroundColor: 'rgba(15,23,42,0.92)',
          color: 'rgb(241,245,249)',
        },
        classNames: {
          toast: 'shadow-xl border border-default bg-[rgba(15,23,42,0.92)] text-default',
          title: 'font-semibold text-default',
          description: 'text-sm text-muted',
          actionButton: 'bg-[rgba(255,255,255,0.06)] text-default rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[rgba(255,255,255,0.1)]',
          cancelButton: 'bg-[rgba(255,255,255,0.06)] text-muted rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[rgba(255,255,255,0.1)]',
          closeButton: 'bg-[rgba(255,255,255,0.06)] border-default hover:bg-[rgba(255,255,255,0.1)] rounded-full text-muted',
          success: 'border-emerald-400/50 bg-[rgba(16,185,129,0.08)] text-default',
          error: 'border-rose-400/50 bg-[rgba(244,63,94,0.08)] text-default',
          warning: 'border-amber-400/50 bg-[rgba(251,146,60,0.08)] text-default',
          info: 'border-sky-400/50 bg-[rgba(56,189,248,0.08)] text-default',
        },
      }}
    />
  );
}
