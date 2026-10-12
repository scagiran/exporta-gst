import React, { useEffect, useRef, useState } from 'react';
import './landing/landing.css';
import { LandingNav } from './landing/LandingNav';
import { HeroMap } from './landing/HeroMap';
import { OneRecordSection, RouteSection } from './landing/StorySections';
import { JourneySection } from './landing/JourneySection';
import { TourSection, FeaturesSection, AboutSection } from './landing/ProductSections';
import { PricingSection, FaqSection, AccountSection, LandingFooter } from './landing/ConvertSections';
import type { AuthMode } from './AuthForm';

interface LandingPageProps {
  onStartDemo: () => void;
}

/**
 * Public face of ExPorta. Every call to action funnels to one place: the
 * account section (#hesap), opened on the sign-up or sign-in tab.
 */
export const LandingPage: React.FC<LandingPageProps> = ({ onStartDemo }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');

  const goAccount = (mode: AuthMode) => {
    setAuthMode(mode);
    const target = document.getElementById('hesap');
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const onSignup = () => goAccount('signup');
  const onSignin = () => goAccount('signin');

  // Entrances, living elements that rest off screen, and a pause on hidden tabs.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const settleTimers: number[] = [];
    const revealIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add('in');
          revealIo.unobserve(el);
          // Retire the stagger once the entrance is done, so hovers never lag.
          settleTimers.push(window.setTimeout(() => el.classList.add('settled'), 1800));
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => revealIo.observe(el));

    const liveIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('on', entry.isIntersecting));
    });
    root.querySelectorAll('.xp-sec').forEach((el) => liveIo.observe(el));

    const onVisibility = () => document.body.classList.toggle('xp-paused', document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      revealIo.disconnect();
      liveIo.disconnect();
      settleTimers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener('visibilitychange', onVisibility);
      document.body.classList.remove('xp-paused');
    };
  }, []);

  return (
    <div ref={rootRef} className="xp">
      <a className="xp-skip" href="#main">
        İçeriğe geç
      </a>
      <div className="xp-env" aria-hidden="true">
        <div className="xp-tide" />
      </div>

      <LandingNav onSignup={onSignup} onSignin={onSignin} onDemo={onStartDemo} />

      <main id="main" tabIndex={-1}>
        <HeroMap onSignup={onSignup} onSignin={onSignin} />
        <JourneySection />
        <OneRecordSection />
        <RouteSection />
        <TourSection />
        <FeaturesSection />
        <AboutSection />
        <PricingSection onSignup={onSignup} />
        <FaqSection />
        <AccountSection mode={authMode} onModeChange={setAuthMode} onDemo={onStartDemo} />
      </main>

      <LandingFooter onSignup={onSignup} onSignin={onSignin} onDemo={onStartDemo} />
    </div>
  );
};
