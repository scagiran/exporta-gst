import React, { useState } from 'react';
import { useEscapeClose } from '../../lib/useEscapeClose';
import { submitEarlyAccess } from '../../lib/supabaseService';
import { supabaseConfigured } from '../../lib/supabase';
import { formatPrice, guessMarket, Market, PLAN_PRICES, rememberMarket, storedMarket } from '../../lib/pricing';
import { Check, ArrowRight } from 'lucide-react';
import { ExPortaLogo } from '../ExPortaLogo';
import { AuthForm, AuthMode } from '../AuthForm';
import { LangSwitch } from '../LangSwitch';
import { useLang } from '../../i18n';

const i = (n: number) => ({ '--i': n } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* 7. Pricing: four plans, prices from one source, honest availability */
/* ------------------------------------------------------------------ */

const PICK = 1;
const COMING = 3;

/** Early-access request for the plan in development. Success is shown only after the database confirms it. */
const EarlyAccessDialog: React.FC<{ planId: string; onClose: () => void }> = ({ planId, onClose }) => {
  const { t, lang } = useLang();
  const e = t.pricing.early;
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [interest, setInterest] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'failed' | 'invalid'>('idle');
  useEscapeClose(true, onClose);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setState('invalid');
    setState('sending');
    const r = supabaseConfigured
      ? await submitEarlyAccess({ email, company, interest, plan: planId, lang })
      : { error: { message: 'not configured' } };
    setState(r.error ? 'failed' : 'ok');
  };

  return (
    <div className="xp-early" role="dialog" aria-modal="true" aria-labelledby="early-title" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <form className="xp-early-card" onSubmit={submit}>
        <h3 id="early-title">{e.title}</h3>
        <p className="xp-early-lead">{e.lead}</p>
        {state === 'ok' ? (
          <p role="status" className="xp-early-ok">{e.ok}</p>
        ) : (
          <>
            <label>
              <span>{e.email}</span>
              <input type="email" required autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
            </label>
            <label>
              <span>{e.company}</span>
              <input type="text" autoComplete="organization" value={company} onChange={(ev) => setCompany(ev.target.value)} />
            </label>
            <label>
              <span>{e.interest}</span>
              <textarea rows={3} value={interest} onChange={(ev) => setInterest(ev.target.value)} />
            </label>
            {state === 'invalid' && <p role="alert" className="xp-early-err">{e.invalidEmail}</p>}
            {state === 'failed' && <p role="alert" className="xp-early-err">{e.failed}</p>}
          </>
        )}
        <div className="xp-early-actions">
          <button type="button" className="xp-btn is-line-ink" onClick={onClose}>
            {e.close}
          </button>
          {state !== 'ok' && (
            <button type="submit" className="xp-btn is-gate" disabled={state === 'sending'}>
              {state === 'sending' ? e.sending : e.submit}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export const PricingSection: React.FC<{ onSignup: () => void }> = ({ onSignup }) => {
  const { t, lang, locale } = useLang();
  const pr = t.pricing;
  // The market is chosen once (or guessed from the region) and survives language switches.
  const [market, setMarket] = useState<Market>(() => storedMarket() ?? guessMarket(lang));
  const [earlyPlan, setEarlyPlan] = useState<string | null>(null);
  const chooseMarket = (m: Market) => {
    setMarket(m);
    rememberMarket(m);
  };

  return (
    <section id="fiyatlar" className="xp-sec xp-price" aria-labelledby="fiyat-h">
      <div className="xp-wrap">
        <div className="xp-price-head" data-reveal>
          <div>
            <p className="xp-label r" style={i(0)}>
              {pr.label}
            </p>
            <h2 id="fiyat-h" className="xp-h2 r" style={i(1)}>
              {pr.title}
            </h2>
          </div>
          <div className="r" style={i(2)}>
            <p className="xp-price-note">{pr.note}</p>
            <div className="xp-market" role="group" aria-label={pr.marketLabel}>
              <span>{pr.marketLabel}</span>
              {(['TR', 'EU', 'INTL'] as Market[]).map((m) => (
                <button key={m} type="button" aria-pressed={market === m} className={market === m ? 'is-on' : undefined} onClick={() => chooseMarket(m)}>
                  {pr.markets[m]}
                </button>
              ))}
            </div>
            <p className="xp-market-note">{pr.marketNote}</p>
          </div>
        </div>

        <div className="xp-plans" data-reveal>
          {pr.plans.map((plan, n) => (
            <article
              key={plan.id}
              className={`xp-plan r${n === PICK ? ' is-pick' : ''}${n === COMING ? ' is-coming' : ''}`}
              style={i(n)}
            >
              {plan.badge && <span className="xp-plan-badge">{plan.badge}</span>}
              <h3>
                {plan.name}
                <small>{plan.tag}</small>
                {n === COMING && <span className="xp-soon">{pr.soon}</span>}
              </h3>
              <p className="xp-plan-desc">{plan.desc}</p>
              <div className="xp-plan-price">
                <b>{formatPrice(PLAN_PRICES[plan.id][market], market, locale)}</b>
                {n > 0 && <span>{pr.perMonth}</span>}
              </div>
              <span className="xp-plan-period">{plan.period}</span>
              <ul>
                {plan.features.map((f) => {
                  const soon = typeof f === 'object' && 'soon' in f;
                  const pilot = typeof f === 'object' && 'pilot' in f;
                  const label = typeof f === 'object' ? f.label : f;
                  return (
                    <li key={label} className={soon ? 'is-soon' : undefined}>
                      <Check aria-hidden="true" />
                      <span>
                        {label}
                        {soon && <span className="xp-soon">{pr.soon}</span>}
                        {pilot && <span className="xp-soon is-pilot">{pr.pilot}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className={`xp-btn ${n === PICK ? 'is-gate' : 'is-line-ink'}`}
                onClick={() => (plan.action === 'early' ? setEarlyPlan(plan.id) : onSignup())}
              >
                {plan.cta} <ArrowRight aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </div>
      {earlyPlan && <EarlyAccessDialog planId={earlyPlan} onClose={() => setEarlyPlan(null)} />}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 8. FAQ: the real objections, answered plainly                       */
/* ------------------------------------------------------------------ */

export const FaqSection: React.FC = () => {
  const { t } = useLang();
  const fq = t.faq;
  return (
    <section id="sss" className="xp-sec xp-faq" aria-labelledby="sss-h">
      <div className="xp-wrap xp-faq-grid">
        <div className="xp-faq-side" data-reveal>
          <p className="xp-label r" style={i(0)}>
            {fq.label}
          </p>
          <h2 id="sss-h" className="xp-h2 r" style={i(1)}>
            {fq.title}
          </h2>
        </div>
        <div className="xp-faq-list" data-reveal>
          {fq.items.map((f, n) => (
            <details key={n} className="r" style={i(n)} open={n === 0}>
              <summary>
                {f.q}
                <i aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 9. Account: sign in or open a company account, for real             */
/* ------------------------------------------------------------------ */

interface AccountSectionProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onDemo: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ mode, onModeChange, onDemo }) => {
  const { t } = useLang();
  const a = t.account;
  return (
    <section id="hesap" className="xp-sec xp-night xp-acct" aria-labelledby="hesap-h">
      <div className="xp-acct-floor live" aria-hidden="true" />
      <div className="xp-acct-glow" aria-hidden="true" />
      <div className="xp-wrap xp-acct-grid">
        <div data-reveal>
          <p className="xp-label r" style={i(0)}>
            {a.label}
          </p>
          <h2 id="hesap-h" className="xp-h2 r" style={i(1)}>
            {a.title}
          </h2>
          <p className="xp-lead r" style={i(2)}>
            {a.lead}
          </p>
          <ul className="xp-acct-list r" style={i(3)}>
            {a.list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="xp-acct-demo r" style={i(4)}>
            {a.demoQ}{' '}
            <button type="button" className="xp-link" onClick={onDemo}>
              {a.demoLink}
            </button>
          </p>
        </div>

        <div data-reveal>
          <div className="xp-acct-card r" style={i(1)}>
            <div className="xp-acct-card-top">
              <ExPortaLogo variant="dark" size="sm" />
              <span>{a.secure}</span>
            </div>
            <AuthForm mode={mode} onModeChange={onModeChange} idPrefix="landing" />
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

interface FooterProps {
  onSignup: () => void;
  onSignin: () => void;
  onDemo: () => void;
}

export const LandingFooter: React.FC<FooterProps> = ({ onSignup, onSignin, onDemo }) => {
  const { t } = useLang();
  const ft = t.footer;
  return (
    <footer className="xp-foot">
      <div className="xp-wrap">
        <div className="xp-foot-grid">
          <div>
            <ExPortaLogo variant="light" size="md" showSubtitle={true} />
            <p>{ft.tagline}</p>
          </div>
          <div>
            <h4>{ft.product}</h4>
            <ul>
              <li>
                <a href="#rota">{t.nav.links.how}</a>
              </li>
              <li>
                <a href="#tur">{t.nav.links.tour}</a>
              </li>
              <li>
                <a href="#ozellikler">{t.nav.links.features}</a>
              </li>
              <li>
                <a href="#fiyatlar">{t.nav.links.pricing}</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>{ft.account}</h4>
            <ul>
              <li>
                <button type="button" onClick={onSignin}>
                  {t.nav.signin}
                </button>
              </li>
              <li>
                <button type="button" onClick={onSignup}>
                  {t.nav.signup}
                </button>
              </li>
              <li>
                <button type="button" onClick={onDemo}>
                  {t.nav.demo}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="xp-foot-bottom">
          <p className="xp-foot-legal">{ft.legal}</p>
          <LangSwitch />
        </div>
      </div>
    </footer>
  );
};
