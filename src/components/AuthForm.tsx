import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './auth.css';

export type AuthMode = 'signin' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Called once a session exists (sign-in, or sign-up without e-mail confirmation). */
  onSuccess?: () => void;
  /** Keeps input ids unique when the modal and the landing section are both mounted. */
  idPrefix?: string;
}

/**
 * Sign-in / company sign-up form shared by AuthModal and the landing page's
 * account section. Owns only form state; the real work is AuthContext's.
 */
export const AuthForm: React.FC<AuthFormProps> = ({ mode, onModeChange, onSuccess, idPrefix = 'auth' }) => {
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    onModeChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'signup' && !companyName.trim()) {
      setErrorMsg('Şirketinizin ticari unvanını yazın.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(
            error.message === 'Invalid login credentials' ? 'E-posta adresi veya şifre hatalı.' : error.message
          );
        } else {
          setSuccessMsg('Giriş yapıldı. Paneliniz açılıyor.');
          onSuccess?.();
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password, companyName);
        if (error) {
          setErrorMsg(error.message);
        } else if (needsEmailConfirmation) {
          // Account exists but has no session yet: keep the instruction on screen.
          setSuccessMsg(
            `Hesabınız oluşturuldu. ${email} adresine bir doğrulama bağlantısı gönderdik. ` +
              'Bağlantıya tıkladıktan sonra buradan giriş yapabilirsiniz.'
          );
          onModeChange('signin');
        } else {
          setSuccessMsg('Şirket hesabınız açıldı. Paneliniz hazırlanıyor.');
          onSuccess?.();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="xa">
      <div className="xa-tabs" role="tablist" aria-label="Hesap">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={`xa-tab ${mode === 'signin' ? 'is-on' : ''}`}
          onClick={() => switchMode('signin')}
        >
          Giriş yap
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`xa-tab ${mode === 'signup' ? 'is-on' : ''}`}
          onClick={() => switchMode('signup')}
        >
          Şirket hesabı aç
        </button>
        <span className={`xa-tab-ink ${mode === 'signup' ? 'is-right' : ''}`} aria-hidden="true" />
      </div>

      <form onSubmit={handleSubmit} className="xa-form">
        {errorMsg && (
          <div className="xa-note is-error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="xa-note is-ok" role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'signup' && (
          <div className="xa-field">
            <label htmlFor={id('company')}>Şirket ticari unvanı</label>
            <div className="xa-input">
              <Building2 aria-hidden="true" />
              <input
                id={id('company')}
                type="text"
                required
                autoComplete="organization"
                placeholder="ABC Dış Ticaret Ltd. Şti."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <p className="xa-help">Verileriniz bu şirket adına ayrılmış alanda saklanır.</p>
          </div>
        )}

        <div className="xa-field">
          <label htmlFor={id('email')}>E-posta adresi</label>
          <div className="xa-input">
            <Mail aria-hidden="true" />
            <input
              id={id('email')}
              type="email"
              required
              autoComplete="email"
              placeholder="ad@sirketiniz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="xa-field">
          <label htmlFor={id('password')}>Şifre</label>
          <div className="xa-input">
            <Lock aria-hidden="true" />
            <input
              id={id('password')}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="xa-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={`xa-submit ${mode === 'signup' ? 'is-accent' : ''}`}>
          {loading ? (
            <Loader2 className="xa-spin" aria-label="Gönderiliyor" />
          ) : (
            <>
              <span>{mode === 'signin' ? 'Giriş yap' : 'Şirket hesabımı aç'}</span>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>

        <p className="xa-switch">
          {mode === 'signin' ? (
            <>
              Hesabınız yok mu?{' '}
              <button type="button" onClick={() => switchMode('signup')}>
                Ücretsiz hesap açın
              </button>
            </>
          ) : (
            <>
              Zaten hesabınız var mı?{' '}
              <button type="button" onClick={() => switchMode('signin')}>
                Giriş yapın
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
};
