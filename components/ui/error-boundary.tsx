'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary Component
 * Cattura errori React e mostra UI di fallback
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <div className="rounded-full bg-red-100 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-semibold text-default mb-2">
            Qualcosa è andato storto
          </h2>
          <p className="text-sm text-muted mb-6 max-w-md">
            Si è verificato un errore imprevisto. Prova a ricaricare la pagina o contatta il supporto se il problema persiste.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-xs text-left bg-red-100 p-4 rounded-lg mb-6 max-w-2xl overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Ricarica pagina
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
