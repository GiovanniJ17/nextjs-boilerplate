import { useEffect, useRef, useState } from 'react';

export interface AutoSaveOptions {
  key: string;
  interval?: number; // millisecondi
  enabled?: boolean;
}

/**
 * Hook per auto-save in localStorage
 * Salva automaticamente i dati ogni X secondi
 */
export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
): {
  lastSaved: Date | null;
  hasDraft: boolean;
  loadDraft: () => T | null;
  clearDraft: () => void;
  isSaving: boolean;
} {
  const { key, interval = 30000, enabled = true } = options; // 30 secondi default
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Salva i dati in localStorage
  const saveDraft = (dataToSave: T) => {
    if (!enabled) return;
    
    try {
      setIsSaving(true);
      localStorage.setItem(key, JSON.stringify({
        data: dataToSave,
        timestamp: new Date().toISOString(),
      }));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  // Carica i dati salvati
  const loadDraft = (): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      
      const { data: savedData } = JSON.parse(saved);
      return savedData;
    } catch (error) {
      console.error('Load draft error:', error);
      return null;
    }
  };

  // Cancella i dati salvati
  const clearDraft = () => {
    try {
      localStorage.removeItem(key);
      setLastSaved(null);
    } catch (error) {
      console.error('Clear draft error:', error);
    }
  };

  // Controlla se esiste una bozza
  const hasDraft = (): boolean => {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  };

  // Auto-save periodico
  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveDraft(data);
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, interval, enabled]);

  return {
    lastSaved,
    hasDraft: hasDraft(),
    loadDraft,
    clearDraft,
    isSaving,
  };
}

/**
 * Formatta il tempo trascorso dall'ultimo salvataggio
 */
export function formatTimeSince(date: Date | null): string {
  if (!date) return '';

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'pochi secondi fa';
  if (seconds < 120) return '1 minuto fa';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minuti fa`;
  if (seconds < 7200) return '1 ora fa';
  return `${Math.floor(seconds / 3600)} ore fa`;
}
