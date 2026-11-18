import type { MasterShipment } from '../types/exporta';

/**
 * Loading schedule buckets for the dashboard. Days are counted in Türkiye's
 * time zone, so a loading planned for "today" stays today until midnight in
 * Istanbul, wherever the browser happens to be.
 */
export const BUSINESS_TZ = 'Europe/Istanbul';

/** 'YYYY-MM-DD' for the given instant in the business time zone. */
export function dayInZone(now: Date = new Date(), timeZone = BUSINESS_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export type LoadingBucket = 'completed' | 'overdue' | 'today' | 'upcoming' | 'unscheduled';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function loadingBucket(s: Pick<MasterShipment, 'actualLoadingEntered' | 'logistics'>, today: string): LoadingBucket {
  if (s.actualLoadingEntered) return 'completed';
  const date = (s.logistics?.estimatedLoadingDate || '').slice(0, 10);
  if (!ISO_DAY.test(date)) return 'unscheduled';
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  return 'upcoming';
}

export function countBuckets(shipments: Pick<MasterShipment, 'actualLoadingEntered' | 'logistics'>[], today: string) {
  const out: Record<LoadingBucket, number> = { completed: 0, overdue: 0, today: 0, upcoming: 0, unscheduled: 0 };
  for (const s of shipments) out[loadingBucket(s, today)]++;
  return out;
}

/** Whole days between two ISO days (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/** Adds days to an ISO day. */
export function addDays(day: string, days: number): string {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) + days * 86400000);
  return d.toISOString().slice(0, 10);
}
