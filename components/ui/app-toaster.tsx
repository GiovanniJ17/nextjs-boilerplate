"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className:
          "pointer-events-auto w-full max-w-sm rounded-3xl border border-transparent bg-transparent shadow-none",
      }}
    />
  );
}
