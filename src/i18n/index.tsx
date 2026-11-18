import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages, Messages } from './messages';
import { Lang, LANGS, LOCALE } from './lang';
import { HEAD, SITE } from './head.js';

/**
 * ExPorta speaks Turkish, English (UK) and French. The language lives in the
 * URL (/ for Turkish, /en, /fr) so a shared link opens in the right language,
 * and the visitor's choice is remembered in this browser.
 */
export type { Lang };
export { LANGS, LOCALE };
export const LANG_LABEL: Record<Lang, string> = { tr: 'Türkçe', en: 'English', fr: 'Français' };

const KEY = 'exporta.lang';

const isLang = (v: unknown): v is Lang => v === 'tr' || v === 'en' || v === 'fr';

function langFromPath(): Lang | null {
  const m = window.location.pathname.match(/^\/(en|fr)(\/|$)/);
  return m ? (m[1] as Lang) : null;
}

function storedLang(): Lang | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function browserLang(): Lang {
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'tr'];
  for (const raw of list) {
    const l = raw.toLowerCase();
    if (l.startsWith('tr')) return 'tr';
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

/** Path first (shared links), then the visitor's earlier choice, then the browser. */
function initialLang(): Lang {
  return langFromPath() ?? storedLang() ?? browserLang();
}

/** Region from the browser's language tag (fr-SN → SN), used by the map. Nothing is sent anywhere. */
export function browserRegion(): string | null {
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const raw of list) {
    const m = /^[a-z]{2,3}-([A-Z]{2})\b/i.exec(raw || '');
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function syncUrl(lang: Lang) {
  const rest = window.location.pathname.replace(/^\/(en|fr)(?=\/|$)/, '') || '/';
  const path = lang === 'tr' ? rest : `/${lang}${rest === '/' ? '/' : rest}`;
  if (path !== window.location.pathname) {
    window.history.replaceState(window.history.state, '', path + window.location.search + window.location.hash);
  }
}

function syncDocument(lang: Lang, m: Messages) {
  document.documentElement.lang = lang;
  document.title = m.meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', m.meta.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', SITE + HEAD[lang].path);
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
  locale: string;
  /** Numbers in the visitor's convention: 12.480 (tr), 12,480 (en), 12 480 (fr). */
  num: (n: number, opts?: Intl.NumberFormatOptions) => string;
  money: (n: number, currency: string) => string;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* the choice still applies to this visit */
    }
  }, []);

  useEffect(() => {
    syncUrl(lang);
    syncDocument(lang, messages[lang]);
  }, [lang]);

  const value = useMemo<LangContextValue>(() => {
    const locale = LOCALE[lang];
    return {
      lang,
      setLang,
      t: messages[lang],
      locale,
      num: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
      money: (n, currency) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n),
    };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
