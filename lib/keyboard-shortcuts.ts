/**
 * Keyboard Shortcuts Utilities
 * Gestione centralizzata degli shortcuts da tastiera
 */

import { useEffect, useCallback } from 'react';

export type ShortcutConfig = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd su Mac
  description: string;
  action: () => void;
  preventDefault?: boolean;
};

/**
 * Hook per registrare shortcuts da tastiera
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : true;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook per shortcut semplice (es. Escape)
 */
export function useKeyPress(
  key: string,
  action: () => void,
  options: { ctrl?: boolean; shift?: boolean; enabled?: boolean } = {}
) {
  const { ctrl = false, shift = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && shiftMatch) {
        event.preventDefault();
        action();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [key, action, ctrl, shift, enabled]);
}

/**
 * Formatta shortcut per display (es. "Ctrl+S" o "⌘S" su Mac)
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const isMac = typeof window !== 'undefined' && /Mac|iPad|iPhone/.test(navigator.userAgent);
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}

/**
 * Common shortcuts definitions
 */
export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true, description: 'Salva' },
  CANCEL: { key: 'Escape', description: 'Chiudi/Annulla' },
  SUBMIT: { key: 'Enter', ctrl: true, description: 'Conferma' },
  NEW: { key: 'n', ctrl: true, description: 'Nuovo' },
  DELETE: { key: 'Delete', description: 'Elimina' },
  SEARCH: { key: 'k', ctrl: true, description: 'Cerca' },
  HELP: { key: '?', shift: true, description: 'Aiuto' },
} as const;
