import { useState, useEffect } from 'react';

/**
 * Hook personalizzato per sincronizzare stato con localStorage
 * @param key - Chiave localStorage
 * @param initialValue - Valore iniziale se non presente in localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Stato per memorizzare il valore
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
      return initialValue;
    }
  });

  // Funzione per aggiornare il valore
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }
  };

  return [storedValue, setValue];
}
