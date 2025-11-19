/**
 * Field Validation Component
 * Fornisce feedback visivo real-time per i campi del form
 */

import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ValidationState = 'idle' | 'valid' | 'invalid';

interface FieldValidationProps {
  state: ValidationState;
  message?: string;
  showSuccess?: boolean; // Mostra checkmark verde quando valido
}

export function FieldValidation({ state, message, showSuccess = true }: FieldValidationProps) {
  if (state === 'idle') return null;

  return (
    <div className={cn(
      'flex items-start gap-1.5 text-xs mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200',
      state === 'valid' ? 'text-green-600' : 'text-red-600'
    )}>
      {state === 'valid' && showSuccess ? (
        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      ) : state === 'invalid' ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      ) : null}
      {message && <span className="leading-tight">{message}</span>}
    </div>
  );
}

/**
 * Input wrapper con validazione integrata
 */
interface ValidatedInputWrapperProps {
  children: React.ReactNode;
  validationState: ValidationState;
  validationMessage?: string;
  showSuccess?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

export function ValidatedInputWrapper({
  children,
  validationState,
  validationMessage,
  showSuccess = true,
  label,
  required,
  className,
}: ValidatedInputWrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {children}
        
        {/* Validation Icon - dentro l'input sulla destra */}
        {validationState !== 'idle' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {validationState === 'valid' && showSuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : validationState === 'invalid' ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : null}
          </div>
        )}
      </div>

      <FieldValidation
        state={validationState}
        message={validationMessage}
        showSuccess={showSuccess}
      />
    </div>
  );
}

/**
 * Character counter per textarea
 */
interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn(
      'text-xs transition-colors',
      isAtLimit ? 'text-red-600 font-medium' : isNearLimit ? 'text-amber-600' : 'text-slate-500',
      className
    )}>
      {current} / {max}
    </div>
  );
}

/**
 * Hook per validazione campo singolo
 */
export function useFieldValidation(
  value: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => boolean;
  }
): { state: ValidationState; message?: string } {
  // Se il campo è vuoto
  if (!value || value.trim() === '') {
    if (rules.required) {
      return { state: 'invalid', message: 'Campo obbligatorio' };
    }
    return { state: 'idle' };
  }

  // Validazione lunghezza minima
  if (rules.minLength && value.length < rules.minLength) {
    return {
      state: 'invalid',
      message: `Minimo ${rules.minLength} caratteri`,
    };
  }

  // Validazione lunghezza massima
  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      state: 'invalid',
      message: `Massimo ${rules.maxLength} caratteri`,
    };
  }

  // Validazione pattern
  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      state: 'invalid',
      message: 'Formato non valido',
    };
  }

  // Validazione custom
  if (rules.custom && !rules.custom(value)) {
    return {
      state: 'invalid',
      message: 'Valore non valido',
    };
  }

  // Tutto OK
  return { state: 'valid' };
}

/**
 * Validatori comuni
 */
export const validators = {
  required: (value: string) => value.trim().length > 0,
  
  number: (value: string) => {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  },
  
  positiveNumber: (value: string) => {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && num > 0;
  },
  
  integer: (value: string) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && isFinite(num) && num.toString() === value;
  },
  
  date: (value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  
  futureDate: (value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date > new Date();
  },
  
  pastDate: (value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date <= new Date();
  },
};
