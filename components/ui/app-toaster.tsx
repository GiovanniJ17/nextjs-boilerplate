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
          toast: 'shadow-lg border-2',
          title: 'font-semibold',
          description: 'text-sm opacity-90',
          actionButton: 'bg-slate-900 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-800',
          cancelButton: 'bg-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-300',
          closeButton: 'bg-white border-slate-200 hover:bg-slate-50 rounded-full',
          success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
          error: 'border-rose-200 bg-rose-50 text-rose-900',
          warning: 'border-amber-200 bg-amber-50 text-amber-900',
          info: 'border-sky-200 bg-sky-50 text-sky-900',
        },
      }}
    />
  );
}
