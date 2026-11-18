import React from 'react';
import { LANGS, LANG_LABEL, useLang } from '../i18n';

interface LangSwitchProps {
  /** 'landing' uses the site's own styles (landing.css), 'app' the panel's Tailwind look. */
  variant?: 'landing' | 'app';
  className?: string;
  tabIndex?: number;
}

/** TR · EN · FR. Each code is labelled in its own language, so anyone can find theirs. */
export const LangSwitch: React.FC<LangSwitchProps> = ({ variant = 'landing', className = '', tabIndex }) => {
  const { lang, setLang, t } = useLang();

  if (variant === 'app') {
    return (
      <div
        role="group"
        aria-label={t.nav.language}
        className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 ${className}`}
      >
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            title={LANG_LABEL[l]}
            aria-label={LANG_LABEL[l]}
            aria-pressed={lang === l}
            tabIndex={tabIndex}
            onClick={() => setLang(l)}
            className={`min-w-[2.25rem] rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              lang === l ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="group" aria-label={t.nav.language} className={`xp-lang ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={LANG_LABEL[l]}
          aria-label={LANG_LABEL[l]}
          aria-pressed={lang === l}
          tabIndex={tabIndex}
          className={lang === l ? 'is-on' : undefined}
          onClick={() => setLang(l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
};
