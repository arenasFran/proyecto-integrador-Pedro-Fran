import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-[16px] border border-red-500/30 bg-red-500/10 p-6">
          <div className="text-center">
            <p className="text-[14px] font-medium text-red-400">Algo salió mal</p>
            <p className="mt-1 text-[12px] text-[#8A8A8A]">Ocurrió un error inesperado. Recargá la página para continuar.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
