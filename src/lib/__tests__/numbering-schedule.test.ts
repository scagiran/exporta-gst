import { describe, it, expect } from 'vitest';
import { nextShipmentCode, nextFreeDocNumber, takenDocNumbers, DEFAULT_NUMBER_FORMATS } from '../numbering';
import { loadingBucket, countBuckets, dayInZone } from '../schedule';

describe('scenario 5: deletion and year change', () => {
  it('does not reuse a number freed by deleting the latest shipment', () => {
    const codes = ['SHP-2026-001', 'SHP-2026-002', 'SHP-2026-003'];
    const first = nextShipmentCode(codes, new Date(2026, 10, 18));
    expect(first.code).toBe('SHP-2026-004');
    // SHP-2026-004 is created, then deleted; the stored high-water mark remembers it.
    const afterDelete = nextShipmentCode(codes, new Date(2026, 10, 18), first.seq);
    expect(afterDelete.code).toBe('SHP-2026-005');
  });

  it('never derives the code from the list length', () => {
    // Two shipments left after deleting 002: a length-based code would repeat 003.
    expect(nextShipmentCode(['SHP-2026-001', 'SHP-2026-003'], new Date(2026, 5, 1)).code).toBe('SHP-2026-004');
  });

  it('takes the year from the creation date', () => {
    expect(nextShipmentCode(['SHP-2026-041'], new Date(2027, 0, 2)).code).toBe('SHP-2027-001');
  });

  it('skips document numbers that already exist', () => {
    const cfg = { ...DEFAULT_NUMBER_FORMATS.quotation, nextSeq: 2 };
    const taken = takenDocNumbers([{ documents: { quotation: { docNumber: 'QT-2026-002' }, proforma: { docNumber: 'QT-2026-003' } } }]);
    const r = nextFreeDocNumber(cfg, { code: 'BUY' }, taken, new Date(2026, 10, 18));
    expect(r.number).toBe('QT-2026-004');
    expect(r.seq).toBe(4);
  });
});

describe('scenario 8: dashboard loading buckets', () => {
  const today = '2026-11-18';
  const s = (date: string, loaded = false) => ({ actualLoadingEntered: loaded, logistics: { estimatedLoadingDate: date } as never });
  it('separates past, today, future and completed loadings', () => {
    expect(loadingBucket(s('2026-08-12'), today)).toBe('overdue');
    expect(loadingBucket(s('2026-11-18'), today)).toBe('today');
    expect(loadingBucket(s('2026-11-25'), today)).toBe('upcoming');
    expect(loadingBucket(s('2026-08-12', true), today)).toBe('completed');
    expect(loadingBucket(s(''), today)).toBe('unscheduled');
  });
  it('does not count three August loadings as upcoming in November', () => {
    const c = countBuckets([s('2026-08-12'), s('2026-08-18'), s('2026-08-25')], today);
    expect(c.upcoming).toBe(0);
    expect(c.overdue).toBe(3);
  });
  it('counts days in Istanbul time, not UTC', () => {
    // 22:30 UTC on 17 Nov is already 18 Nov in Istanbul (UTC+3).
    expect(dayInZone(new Date(Date.UTC(2026, 10, 17, 22, 30)))).toBe('2026-11-18');
    expect(dayInZone(new Date(Date.UTC(2026, 10, 17, 20, 59)))).toBe('2026-11-17');
  });
});
