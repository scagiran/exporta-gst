import React from 'react';
import { X } from 'lucide-react';

/**
 * The single close affordance used by every modal in the app. Fixed to the
 * top-right corner of the modal panel (the panel must be `position: relative`),
 * so it stays put regardless of how a header toolbar wraps or the viewport
 * resizes. Visual treatment matches the original AuthModal button.
 */
export const ModalCloseButton: React.FC<{ onClose: () => void; label?: string }> = ({
  onClose,
  label = 'Kapat',
}) => (
  <button
    type="button"
    onClick={onClose}
    aria-label={label}
    className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"
  >
    <X className="w-5 h-5" />
  </button>
);
