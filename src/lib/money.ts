/**
 * Money and quantity arithmetic for documents.
 *
 * Amounts are computed in minor units (cents) so that a line total, the sum of
 * line totals and the figure printed on the PDF are always the same number.
 * Rule: each line is rounded to 2 decimals (half away from zero), and the
 * document total is the sum of the rounded lines. No document total is ever
 * computed across different currencies.
 */

/** Round half away from zero to `decimals` places, robust against binary float noise (1.005 → 1.01). */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return NaN;
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  // toPrecision strips the representation error before rounding (1.005*100 = 100.49999…).
  const rounded = Math.round(Number(scaled.toPrecision(15)));
  return (Math.sign(value) || 1) * (rounded / factor);
}

/** Integer minor units (cents) for a money value. */
export const toCents = (amount: number): number => Math.round(Number((amount * 100).toPrecision(15)));

/** Line amount: quantity × unit price, rounded to cents. */
export function lineAmountCents(qty: number, unitPrice: number): number {
  return toCents(roundTo(qty * unitPrice, 2));
}

export const fromCents = (cents: number): number => cents / 100;

/** A valid, non-negative, finite number. */
export const isValidAmount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/**
 * Sums amounts per currency. Returns one entry per currency, in first-seen
 * order, so mixed-currency collections are shown side by side, never added up.
 */
export function totalsByCurrency(entries: { currency: string; cents: number }[]): { currency: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const cur = (e.currency || '').toUpperCase().trim() || '?';
    map.set(cur, (map.get(cur) ?? 0) + e.cents);
  }
  return [...map.entries()].map(([currency, cents]) => ({ currency, amount: fromCents(cents) }));
}
