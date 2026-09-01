import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, a single malformed record takes the entire page down to a blank
 * white screen with nothing but a console stack trace. Showing the message keeps
 * the failure reportable.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ExPorta] Arayüz hatası:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Bir şeyler ters gitti</h1>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Ekran çizilirken beklenmeyen bir hata oluştu. Verileriniz etkilenmedi. Sorun
            devam ederse aşağıdaki teknik mesajı iletin.
          </p>

          <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message}
          </pre>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sayfayı Yenile</span>
          </button>
        </div>
      </div>
    );
  }
}
