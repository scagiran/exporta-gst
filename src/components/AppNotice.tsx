import React from 'react';
import { FlaskConical, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { useLang } from '../i18n';

/** Full-width notices above the panel: demo data, loading, or a failed load. */
export const AppNotice: React.FC<{ kind: 'demo' | 'loading' | 'loadError'; onRetry?: () => void }> = ({ kind, onRetry }) => {
  const { t } = useLang();
  const n = t.notice;
  if (kind === 'demo') {
    return (
      <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <FlaskConical className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
        <span>{n.demo}</span>
      </div>
    );
  }
  if (kind === 'loading') {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>{n.loading}</span>
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-900">
      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" aria-hidden="true" />
      <span className="flex-1">{n.loadError}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {n.retry}
        </button>
      )}
    </div>
  );
};

/** One line under a form or button telling the user what happened to their change. */
export function outcomeMessage(t: ReturnType<typeof useLang>['t'], outcome: 'saved' | 'demo' | 'failed'): string {
  return outcome === 'saved' ? t.save.savedOk : outcome === 'demo' ? t.save.savedDemo : t.save.savedFailed;
}
