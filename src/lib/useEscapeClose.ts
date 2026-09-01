import { useEffect } from 'react';

/**
 * Calls `onEscape` whenever the Escape key is pressed while `enabled` is true.
 *
 * The handler passed in is responsible for any confirmation (e.g. an
 * unsaved-changes guard) — this hook only wires the key to it. Kept in one
 * place so every modal in the app gets identical Escape behaviour.
 */
export function useEscapeClose(enabled: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, onEscape]);
}
