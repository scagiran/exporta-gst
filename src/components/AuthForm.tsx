import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n';
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
  const { t } = useLang();
  const a = t.auth;

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
      setErrorMsg(a.errCompany);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(
            error.message === 'Invalid login credentials' ? a.errCredentials : error.message
          );
        } else {
          setSuccessMsg(a.okSignin);
          onSuccess?.();
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password, companyName);
        if (error) {
          setErrorMsg(error.message);
        } else if (needsEmailConfirmation) {
          // Account exists but has no session yet: keep the instruction on screen.
          setSuccessMsg(a.okConfirm(email));
          onModeChange('signin');
        } else {
          setSuccessMsg(a.okSignup);
          onSuccess?.();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || a.errGeneric);
    } finally {
      setLoading(false);
    }
  };

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="xa">
      <div className="xa-tabs" role="tablist" aria-label={a.tablist}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={`xa-tab ${mode === 'signin' ? 'is-on' : ''}`}
          onClick={() => switchMode('signin')}
        >
          {a.signin}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`xa-tab ${mode === 'signup' ? 'is-on' : ''}`}
          onClick={() => switchMode('signup')}
        >
          {a.signup}
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
            <label htmlFor={id('company')}>{a.company}</label>
            <div className="xa-input">
              <Building2 aria-hidden="true" />
              <input
                id={id('company')}
                type="text"
                required
                autoComplete="organization"
                placeholder={a.companyPlaceholder}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <p className="xa-help">{a.companyHelp}</p>
          </div>
        )}

        <div className="xa-field">
          <label htmlFor={id('email')}>{a.email}</label>
          <div className="xa-input">
            <Mail aria-hidden="true" />
            <input
              id={id('email')}
              type="email"
              required
              autoComplete="email"
              placeholder={a.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="xa-field">
          <label htmlFor={id('password')}>{a.password}</label>
          <div className="xa-input">
            <Lock aria-hidden="true" />
            <input
              id={id('password')}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={a.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="xa-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? a.hidePassword : a.showPassword}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={`xa-submit ${mode === 'signup' ? 'is-accent' : ''}`}>
          {loading ? (
            <Loader2 className="xa-spin" aria-label={a.sending} />
          ) : (
            <>
              <span>{mode === 'signin' ? a.submitSignin : a.submitSignup}</span>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>

        <p className="xa-switch">
          {mode === 'signin' ? (
            <>
              {a.noAccount}{' '}
              <button type="button" onClick={() => switchMode('signup')}>
                {a.openFree}
              </button>
            </>
          ) : (
            <>
              {a.haveAccount}{' '}
              <button type="button" onClick={() => switchMode('signin')}>
                {a.goSignin}
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
};
