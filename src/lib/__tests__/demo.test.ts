import { describe, it, expect } from 'vitest';
import { buildDemo } from '../../data/demo';
import { countBuckets } from '../schedule';
import { resolveDocContent } from '../commerce';

describe('demo data', () => {
  it('places the demo loadings around today, whatever the date', () => {
    for (const today of ['2026-11-18', '2027-03-01']) {
      const demo = buildDemo('en', today);
      const b = countBuckets(demo.shipments, today);
      expect(b.completed).toBe(1);
      expect(b.upcoming + b.today).toBe(2);
      expect(b.overdue).toBe(0);
      expect(demo.shipments[0].shipmentCode.startsWith(`SHP-${today.slice(0, 4)}-`)).toBe(true);
    }
  });

  it('shows the 50-ordered / 48-loaded story: proforma frozen at 50, invoice at 48', () => {
    const demo = buildDemo('en', '2026-11-18');
    const s = demo.shipments[0];
    const proforma = resolveDocContent(s, 'proforma', demo.companySettings);
    const invoice = resolveDocContent(s, 'commercial_invoice', demo.companySettings);
    expect(proforma.frozen).toBe(true);
    expect(proforma.content.lines[0].qty).toBe(50);
    expect(invoice.content.lines[0].qty).toBe(48);
    expect(invoice.content.total).toBe(28140);
    expect(proforma.content.total).toBe(29100);
    // Cargo gross on the packing list, VGM separate.
    const pl = resolveDocContent(s, 'packing_list', demo.companySettings).content;
    expect(pl.totalCargoGrossKg).toBe(6780);
    expect(pl.declaredVgmKg).toBe(10600);
    expect(pl.expectedVgmKg).toBe(10600);
  });
});
