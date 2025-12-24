"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { toast } from "sonner";

type NotificationOptions = {
  description?: string;
  duration?: number;
};

type Variant = "success" | "error" | "info";

const variantStyles: Record<Variant, { icon: typeof CheckCircle2; wrapper: string; iconWrapper: string; accent: string }> = {
  success: {
    icon: CheckCircle2,
    wrapper:
      "border-slate-700 bg-[rgba(255,255,255,0.02)] text-emerald-300 shadow-[0_10px_40px_-24px_rgba(16,185,129,0.12)]",
    iconWrapper: "bg-emerald-900/20 text-emerald-300",
    accent: "from-emerald-600/15 via-emerald-500/08 to-emerald-600/15",
  },
  error: {
    icon: XCircle,
    wrapper:
      "border-slate-700 bg-[rgba(255,255,255,0.02)] text-rose-300 shadow-[0_10px_40px_-24px_rgba(244,63,94,0.12)]",
    iconWrapper: "bg-rose-900/20 text-rose-300",
    accent: "from-rose-600/15 via-rose-500/08 to-rose-600/15",
  },
  info: {
    icon: Info,
    wrapper:
      "border-slate-700 bg-[rgba(255,255,255,0.02)] text-sky-300 shadow-[0_10px_40px_-24px_rgba(14,165,233,0.12)]",
    iconWrapper: "bg-sky-900/20 text-sky-300",
    accent: "from-sky-600/15 via-sky-500/08 to-sky-600/15",
  },
};

function showToast(variant: Variant, title: string, options?: NotificationOptions) {
  const { description, duration = 4000 } = options ?? {};
  const styles = variantStyles[variant];
      const id = toast.custom(
    t => {
      const Icon = styles.icon;
      return (
        <div
          className={`relative overflow-hidden rounded-3xl border px-4 py-3 backdrop-blur transition-all duration-300 ${styles.wrapper}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${styles.accent}`} />
          <div className="relative flex items-start gap-3">
            <span className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${styles.iconWrapper}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold leading-none">{title}</p>
              {description ? <p className="text-xs text-muted/80">{description}</p> : null}
            </div>
              <button
                type="button"
                onClick={() => toast.dismiss(t)}
                className="rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[10px] font-semibold uppercase text-muted transition hover:bg-[rgba(255,255,255,0.06)] hover:text-default"
            >
              Chiudi
            </button>
          </div>
        </div>
      );
    },
    { duration }
  );
  return id;
}

export function notifySuccess(title: string, options?: NotificationOptions) {
  return showToast("success", title, options);
}

export function notifyError(title: string, options?: NotificationOptions) {
  return showToast("error", title, options);
}

export function notifyInfo(title: string, options?: NotificationOptions) {
  return showToast("info", title, options);
}

/**
 * Notifiche specifiche per operazioni comuni
 */
export const notify = {
  // Export operations
  exportSuccess: (format: 'CSV' | 'PDF' | 'PNG') =>
    notifySuccess(`Export ${format} completato!`, {
      description: 'Controlla la cartella download',
      duration: 4000,
    }),
  
  exportError: (format: 'CSV' | 'PDF' | 'PNG', error?: string) =>
    notifyError(`Errore export ${format}`, {
      description: error ?? 'Riprova più tardi',
      duration: 5000,
    }),

  exportNoData: () =>
    notifyInfo('Nessun dato da esportare', {
      description: 'Aggiungi dati prima di esportare',
      duration: 4000,
    }),

  // CRUD Operations
  saveSuccess: (item: string) =>
    notifySuccess(`${item} salvato!`, {
      duration: 3000,
    }),

  saveError: (item: string, error?: string) =>
    notifyError(`Errore salvataggio ${item}`, {
      description: error ?? 'Riprova più tardi',
      duration: 5000,
    }),

  deleteSuccess: (item: string) =>
    notifySuccess(`${item} eliminato!`, {
      duration: 3000,
    }),

  deleteError: (item: string, error?: string) =>
    notifyError(`Errore eliminazione ${item}`, {
      description: error ?? 'Riprova più tardi',
      duration: 5000,
    }),

  updateSuccess: (item: string) =>
    notifySuccess(`${item} aggiornato!`, {
      duration: 3000,
    }),

  // Validation
  validationError: (message: string) =>
    notifyInfo('Validazione fallita', {
      description: message,
      duration: 4500,
    }),

  // Network
  networkError: () =>
    notifyError('Errore di connessione', {
      description: 'Controlla la tua connessione internet',
      duration: 5000,
    }),

  // Permissions
  popupBlocked: () =>
    notifyInfo('Popup bloccati', {
      description: 'Abilita i popup per questa operazione',
      duration: 5000,
    }),

  // Loading state
  loading: (message: string = 'Operazione in corso...') =>
    toast.loading(message, {
      style: {
        borderRadius: '1.5rem',
        padding: '0.75rem 1rem',
      },
    }),

  dismiss: (toastId?: string | number) =>
    toast.dismiss(toastId),
};
