import React, { useEffect, useState } from 'react';
import { ExPortaLogo } from './ExPortaLogo';
import { ModalCloseButton } from './ModalCloseButton';
import { AuthForm, AuthMode } from './AuthForm';
import { useEscapeClose } from '../lib/useEscapeClose';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Re-open on the tab the caller asked for.
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  // Auth form holds no persistable state — Escape / X close directly.
  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signin' ? 'Giriş yap' : 'Şirket hesabı aç'}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#fafbfa] shadow-2xl shadow-slate-950/40">
        <div className="relative bg-slate-950 px-7 pt-7 pb-6">
          <ModalCloseButton onClose={onClose} />
          <ExPortaLogo variant="light" size="md" showSubtitle={true} />
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {mode === 'signin'
              ? 'Hesabınıza girin, sevkiyatlarınız kaldığı yerden devam etsin.'
              : 'Şirket hesabınızı açın. Ücretsiz planla hemen başlarsınız.'}
          </p>
        </div>
        <div className="px-7 pb-7 pt-2">
          <AuthForm mode={mode} onModeChange={setMode} idPrefix="modal" onSuccess={() => setTimeout(onClose, 900)} />
        </div>
      </div>
    </div>
  );
};
