import { browserRegion } from '../i18n';
import type { Lang } from '../i18n/lang';

/**
 * Prices: one source, kept apart from the interface language.
 *
 * The market (and so the currency) is chosen by the visitor or guessed from
 * the browser's region, never from the language: an English-speaking visitor
 * in Germany sees euros, and switching the page to French does not change
 * the price shown. The amounts are the ones already published; nothing here
 * invents a price. All prices are per company per month, excluding VAT.
 */
export type Market = 'TR' | 'EU' | 'INTL';
export type PlanId = 'starter' | 'professional' | 'business' | 'insights';

export const MARKET_CURRENCY: Record<Market, 'TRY' | 'EUR' | 'USD'> = { TR: 'TRY', EU: 'EUR', INTL: 'USD' };

export const PLAN_PRICES: Record<PlanId, Record<Market, number>> = {
  starter: { TR: 0, EU: 0, INTL: 0 },
  professional: { TR: 499, EU: 19, INTL: 19 },
  business: { TR: 999, EU: 39, INTL: 39 },
  insights: { TR: 1999, EU: 79, INTL: 79 },
};

/** EU/EEA, Switzerland and the UK, plus the CFA franc zones (pegged to the euro). */
const EURO_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH', 'GB', 'MC', 'AD', 'SM',
  'BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG', 'CM', 'CF', 'TD', 'CG', 'GQ', 'GA', 'KM',
]);

const KEY = 'exporta.market';

export function guessMarket(lang: Lang, region: string | null = browserRegion()): Market {
  if (region === 'TR') return 'TR';
  if (region && EURO_REGIONS.has(region)) return 'EU';
  if (region) return 'INTL';
  return lang === 'tr' ? 'TR' : lang === 'fr' ? 'EU' : 'INTL';
}

export function storedMarket(): Market | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'TR' || v === 'EU' || v === 'INTL' ? v : null;
  } catch {
    return null;
  }
}

export function rememberMarket(m: Market) {
  try {
    window.localStorage.setItem(KEY, m);
  } catch {
    /* the choice still applies to this visit */
  }
}

export function formatPrice(amount: number, market: Market, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: MARKET_CURRENCY[market], maximumFractionDigits: 0 }).format(amount);
}
