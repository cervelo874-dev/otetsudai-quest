import React, { Component, type ReactNode } from 'react';
import { STORAGE_KEY } from '../store';
import { RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
    window.location.href = window.location.pathname;
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF8EC] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-4 border-amber-300 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4 shadow-inner">
              <AlertTriangle size={36} />
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-2">
              がめんの ひょうじで<br />エラーが おきました
            </h2>

            <p className="text-sm font-bold text-slate-500 mb-6">
              古い保存データとの不整合が発生した可能性があります。
              下のボタンを押してデータをリセットするか、再読み込みをお試しください。
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="btn-pop flex items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 text-base font-black text-amber-950 shadow-[0_4px_0_#d97706] hover:bg-amber-300"
              >
                <RotateCcw size={18} />
                <span>データを初期化して再起動</span>
              </button>

              <button
                onClick={this.handleReload}
                className="btn-pop flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
              >
                <RefreshCw size={16} />
                <span>再読み込み</span>
              </button>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600">
                  技術的な詳細エラー情報
                </summary>
                <pre className="mt-2 max-h-36 overflow-auto rounded-xl bg-slate-100 p-3 text-xs text-rose-600 font-mono">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
