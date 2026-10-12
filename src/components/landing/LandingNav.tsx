import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ExPortaLogo } from '../ExPortaLogo';

const LINKS = [
  { href: '#rota', label: 'Nasıl çalışır' },
  { href: '#tur', label: 'Ürün turu' },
  { href: '#ozellikler', label: 'Özellikler' },
  { href: '#fiyatlar', label: 'Fiyatlar' },
  { href: '#sss', label: 'SSS' },
];

interface LandingNavProps {
  onSignup: () => void;
  onSignin: () => void;
  onDemo: () => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({ onSignup, onSignin, onDemo }) => {
  const [paper, setPaper] = useState(false);
  const [open, setOpen] = useState(false);
  const paperRef = useRef(false);

  // Light text over the film, paper once the page proper begins.
  useEffect(() => {
    let raf: number | null = null;
    const measure = () => {
      raf = null;
      const hero = document.querySelector('.xp-hero');
      const next = hero ? hero.getBoundingClientRect().bottom <= 68 : window.scrollY > 40;
      if (next !== paperRef.current) {
        paperRef.current = next;
        setPaper(next);
      }
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);
  const dark = paper || open;

  return (
    <>
      <nav className={`xp-nav${dark ? ' is-paper' : ''}`} aria-label="Ana menü">
        <div className="xp-wrap xp-nav-in">
          <button
            type="button"
            className="xp-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="ExPorta, sayfanın başına dön"
          >
            <ExPortaLogo variant={dark ? 'dark' : 'light'} size="md" />
          </button>

          <ul className="xp-nav-links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>

          <div className="xp-nav-cta">
            <button type="button" className="xp-nav-demo xp-hide-sm" onClick={onDemo}>
              Demoyu incele
            </button>
            <button type="button" className="xp-btn is-sm is-line-nav xp-hide-sm" onClick={onSignin}>
              Giriş yap
            </button>
            <button type="button" className="xp-btn is-sm is-gate" onClick={onSignup}>
              Ücretsiz hesap aç
            </button>
            <button
              type="button"
              className="xp-burger"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="xp-mobile-menu"
              aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
      </nav>

      <div id="xp-mobile-menu" className={`xp-sheet-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={close} tabIndex={open ? 0 : -1}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="xp-sheet-actions">
          <button
            type="button"
            className="xp-btn is-line-ink"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              close();
              onSignin();
            }}
          >
            Giriş yap
          </button>
          <button
            type="button"
            className="xp-btn is-line-ink"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              close();
              onDemo();
            }}
          >
            Demoyu incele
          </button>
        </div>
      </div>
    </>
  );
};
