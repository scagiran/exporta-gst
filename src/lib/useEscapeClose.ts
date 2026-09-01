import { useEffect, useRef } from 'react';

/**
 * Calls `onEscape` whenever the Escape key is pressed while `enabled` is true.
 *
 * The handler passed in is responsible for any confirmation (e.g. an
 * unsaved-changes guard) — this hook only wires the key to it. Kept in one
 * place so every modal in the app gets identical Escape behaviour.
 *
 * `onEscape` is held in a ref so callers can pass an inline closure (which
 * changes identity every render) without the listener being torn down and
 * re-added on every render. The listener is added/removed only when `enabled`
 * flips, and always invokes the latest handler.
 */
export function useEscapeClose(enabled: boolean, onEscape: () => void) {
  const handlerRef = useRef(onEscape);
  handlerRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handlerRef.current();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
