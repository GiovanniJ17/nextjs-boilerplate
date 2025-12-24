/**
 * Tema colori centralizzato per l'intera applicazione
 * Sky Blue theme - Azzurro tenue e professionale
 */

export const theme = {
  // Primary - Sky Blue
  primary: {
    50: 'sky-50',
    100: 'sky-100',
    200: 'sky-200',
    300: 'sky-300',
    400: 'sky-400',
    500: 'sky-500',
    600: 'sky-600',
    700: 'sky-700',
    800: 'sky-800',
    900: 'sky-900',
  },
  
  // Secondary - Cyan (complementare)
  secondary: {
    50: 'cyan-50',
    100: 'cyan-100',
    500: 'cyan-500',
    600: 'cyan-600',
    700: 'cyan-700',
  },
  
  // Accents
  success: 'emerald-500',
  warning: 'amber-500',
  error: 'rose-500',
  info: 'blue-500',
  
  // Gradienti standard
  gradients: {
    // Dark-friendly gradients (muted, lower saturation)
    hero: 'bg-gradient-to-br from-sky-700 to-cyan-700',
    heroLight: 'bg-gradient-to-r from-slate-800 to-slate-700',
    button: 'bg-gradient-to-br from-sky-600 to-sky-700',
  },
  
  // Stati
  states: {
    active: {
      border: 'border-sky-600',
      bg: 'bg-slate-800',
      text: 'text-sky-300',
    },
    hover: {
      border: 'border-slate-600',
      bg: 'bg-slate-800',
      text: 'text-sky-300',
    },
    inactive: {
      border: 'border-slate-700',
      bg: 'bg-slate-800',
      text: 'text-slate-400',
    },
  },
} as const;

/**
 * Helper per classi Tailwind dinamiche
 */
export const getActiveClass = (isActive: boolean) => {
  if (isActive) {
    return 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm';
  }
  return 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50';
};

export const getHoverClass = () => {
  return 'hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600';
};
