"use client";

import { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortcut, type ShortcutConfig, useKeyPress } from "@/lib/keyboard-shortcuts";

interface ShortcutsHelp {
  shortcuts: ShortcutConfig[];
}

export function ShortcutsHelp({ shortcuts }: ShortcutsHelp) {
  const [isOpen, setIsOpen] = useState(false);

  // Chiudi con Escape
  useKeyPress("Escape", () => setIsOpen(false), { enabled: isOpen });

  // Apri con ? (Shift+/)
  useKeyPress("?", () => setIsOpen(true), { shift: true, enabled: !isOpen });

  if (shortcuts.length === 0) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-default bg-[rgba(255,255,255,0.02)] text-muted shadow-lg transition-all hover:bg-[rgba(255,255,255,0.03)] hover:shadow-xl"
        title="Scorciatoie tastiera (Shift+?)"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-default bg-[rgba(255,255,255,0.02)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-default/70 bg-[rgba(255,255,255,0.02)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[rgba(255,255,255,0.03)] p-2 shadow-sm">
                  <Keyboard className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-default">Scorciatoie Tastiera</h2>
                  <p className="text-xs text-muted">Usa la tastiera per lavorare più velocemente</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[rgba(255,255,255,0.03)] hover:text-default"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-default bg-[rgba(255,255,255,0.02)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    <span className="text-sm text-muted">{shortcut.description}</span>
                    <kbd className="inline-flex items-center gap-1 rounded-md border border-default/70 bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs font-mono font-semibold text-muted shadow-sm">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

              <div className="border-t border-default/70 bg-[rgba(255,255,255,0.02)] px-6 py-3">
                <p className="text-xs text-muted">
                  Premi <kbd className="rounded bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 text-xs font-mono font-semibold text-muted shadow-sm">Esc</kbd> per chiudere
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
