import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportClientError } from '../services/adminApi';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({
      message: error.message || 'Erro inesperado de renderização',
      stack: `${error.stack || ''}\n${info.componentStack || ''}`.trim(),
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      category: 'RUNTIME',
      severity: 'CRITICAL',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-zinc-900">
              Ops! Algo saiu do esperado
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Nossa equipe já foi avisada automaticamente. Recarregue a página para continuar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function registerGlobalErrorListeners(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (event: ErrorEvent) => {
    const msg = event.message || event.error?.message || 'Erro de execução';
    reportClientError({
      message: String(msg),
      stack: event.error?.stack || `${event.filename || ''}:${event.lineno || 0}`,
      route: window.location.pathname,
      category: 'RUNTIME',
      severity: 'ERROR',
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Promessa rejeitada sem tratamento';
    reportClientError({
      message: msg,
      stack: reason instanceof Error ? reason.stack : undefined,
      route: window.location.pathname,
      category: 'RUNTIME',
      severity: 'ERROR',
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
