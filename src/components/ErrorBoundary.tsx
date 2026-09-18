import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, Home } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('registapp_active_user');
      localStorage.removeItem('registapp_active_lang');
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-fallback" 
          className="min-h-screen bg-[#111414] text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6"
        >
          <div className="max-w-lg w-full rounded-2xl border border-zinc-800 bg-[#171A1A] p-6 sm:p-8 shadow-2xl text-center">
            
            <div className="flex justify-center mb-6">
              <BrandLogo size="md" />
            </div>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">
              Произошла непредвиденная ошибка отображения
            </h1>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Приложение RegistApp столкнулось с системной ошибкой отрисовки. Вы можете перезагрузить экран или сбросить сохраненную сессию, чтобы вернуться в нормальный режим работы.
            </p>

            {this.state.error && (
              <div className="mb-6 text-left rounded-xl border border-red-900/50 bg-red-950/30 p-3.5 text-[11px] font-mono text-red-300 overflow-x-auto max-h-32">
                <div className="font-bold mb-1">Ошибка: {this.state.error.name}</div>
                <div>{this.state.error.message}</div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-error-reload"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7A9A3C] hover:bg-[#a2e635] text-black text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Перезагрузить страницу</span>
              </button>

              <button
                id="btn-error-reset"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Сбросить сессию</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-4 text-xs text-zinc-400">
              <a href="/privacy" className="hover:text-white transition">Политика конфиденциальности</a>
              <span>•</span>
              <a href="/terms" className="hover:text-white transition">Оферта</a>
              <span>•</span>
              <a href="/contacts" className="hover:text-white transition">Контакты</a>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
