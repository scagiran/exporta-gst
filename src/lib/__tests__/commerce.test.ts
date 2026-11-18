import { describe, it, expect } from 'vitest';
import type { CompanySettings, MasterShipment, DocType, DocumentInfo } from '../../types/exporta';
import { buildDocContent, approveDocument, reviseDocument, resolveDocContent, ApprovalBlockedError, blockingIssues } from '../commerce';
import { roundTo, toCents, lineAmountCents } from '../money';
import { summariseWeights } from '../weights';

const DOC_TYPES: DocType[] = ['quotation', 'proforma', 'sales_order', 'actual_loading', 'commercial_invoice', 'packing_list', 'shipping_instruction'];

const company: CompanySettings = {
  companyName: 'Test Exporter Ltd',
  taxNo: '1',
  taxOffice: 'X',
  address: 'Street 1',
  city: 'Izmir',
  country: 'Türkiye',
  phone: '',
  email: '',
  website: '',
  bankName: 'Test Bank',
  bankBranch: 'Main',
  iban: 'TR00 0000',
  swiftCode: 'TESTTRIS',
  defaultTemplates: Object.fromEntries(DOC_TYPES.map((d) => [d, 'classic'])) as CompanySettings['defaultTemplates'],
};

function doc(docType: DocType, status: DocumentInfo['status'] = 'taslak'): DocumentInfo {
  return { docType, docNumber: `${docType}-1`, status, template: 'classic', createdAt: '2026-11-01', updatedAt: '2026-11-01' };
}

function shipment(over: Partial<MasterShipment> = {}): MasterShipment {
  return {
    id: 's1',
    shipmentCode: 'SHP-2026-001',
    customerId: 'c1',
    customer: { id: 'c1', code: 'BUY', companyName: 'Buyer GmbH', country: 'Germany', city: 'Hamburg', address: 'Str 2', taxNo: 'DE1', contactPerson: '', email: '', phone: '' },
    items: [
      { id: 'i1', productId: 'p1', productCode: 'P1', productName: 'Widget', hsCode: '8481', unit: 'Adet', orderedQty: 100, unitPrice: 20, currency: 'EUR', netWeightKg: 9, grossWeightKg: 10 },
    ],
    logistics: {
      incoterm: 'FOB',
      namedPlace: 'Ambarlı',
      loadingPort: 'Ambarlı',
      dischargePort: 'Hamburg',
      transportMode: 'Sea',
      carrierCompany: '',
      vesselFlightNo: '',
      bookingNo: '',
      estimatedLoadingDate: '2026-11-20',
      estimatedArrivalDate: '2026-12-10',
    },
    payment: { paymentMethod: 'Advance Payment (%100)', bankAccountIban: '', currency: 'EUR' },
    documents: Object.fromEntries(DOC_TYPES.map((d) => [d, doc(d)])) as MasterShipment['documents'],
    actualLoadingEntered: false,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
    ...over,
  };
}

describe('money', () => {
  it('rounds half away from zero without float noise', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
  it('rounds each line to cents', () => {
    expect(lineAmountCents(3, 0.335)).toBe(101); // 1.005 → 1.01
    expect(lineAmountCents(98, 20)).toBe(196000);
  });
});

describe('scenario 1: 100 ordered, 98 loaded', () => {
  it('keeps order documents on ordered quantities and loading documents on loaded quantities', () => {
    const s = shipment();
    s.items[0].actualLoadedQty = 98;
    s.actualLoadingEntered = true;

    const proforma = buildDocContent(s, 'proforma', company);
    expect(proforma.lines[0].qty).toBe(100);
    expect(proforma.total).toBe(2000);

    const invoice = buildDocContent(s, 'commercial_invoice', company);
    expect(invoice.lines[0].qty).toBe(98);
    expect(invoice.total).toBe(1960);
    expect(invoice.provisional).toBe(false);

    const pl = buildDocContent(s, 'packing_list', company);
    expect(pl.lines[0].qty).toBe(98);
    expect(pl.totalNetKg).toBe(882);
    expect(pl.totalCargoGrossKg).toBe(980);
  });

  it('keeps an approved proforma frozen when the order is changed later, and revises explicitly', () => {
    const s = shipment();
    const approved = approveDocument(s.documents.proforma, buildDocContent(s, 'proforma', company), '2026-11-02');
    s.documents.proforma = approved;
    // The order line is changed after approval.
    s.items[0].orderedQty = 120;

    const shown = resolveDocContent(s, 'proforma', company);
    expect(shown.frozen).toBe(true);
    expect(shown.content.lines[0].qty).toBe(100);
    expect(shown.content.total).toBe(2000);
    expect(shown.live.total).toBe(2400);
    expect(shown.changes).toContain('lines');
    expect(shown.changes).toContain('totals');

    const revised = reviseDocument(approved, 'order changed', '2026-11-03');
    expect(revised.status).toBe('taslak');
    expect(revised.revision).toBe(1);
    expect(revised.approved).toBeUndefined();
    expect(revised.history?.[0].content.total).toBe(2000);
    expect(revised.history?.[0].supersededReason).toBe('order changed');
  });

  it('marks loading documents provisional before the actual loading, and refuses to approve them', () => {
    const s = shipment();
    const invoice = buildDocContent(s, 'commercial_invoice', company);
    expect(invoice.provisional).toBe(true);
    expect(invoice.lines[0].qty).toBe(100);
    expect(() => approveDocument(s.documents.commercial_invoice, invoice, '2026-11-02')).toThrow(ApprovalBlockedError);
  });
});

describe('scenario 2: EUR and USD lines', () => {
  it('never produces a single total over mixed currencies and blocks approval', () => {
    const s = shipment();
    s.items.push({ id: 'i2', productId: 'p2', productCode: 'P2', productName: 'Gadget', hsCode: '8482', unit: 'Adet', orderedQty: 10, unitPrice: 5, currency: 'USD', netWeightKg: 1, grossWeightKg: 1.2 });
    const c = buildDocContent(s, 'proforma', company);
    expect(c.total).toBeNull();
    expect(c.currency).toBeNull();
    expect(c.currencies).toEqual(['EUR', 'USD']);
    expect(blockingIssues(c).map((i) => i.code)).toContain('MIXED_CURRENCY');
    expect(() => approveDocument(s.documents.proforma, c, '2026-11-02')).toThrow(ApprovalBlockedError);
  });
});

describe('scenario 3: cargo gross versus container VGM', () => {
  it('keeps the packing list on cargo gross and checks the declared VGM against cargo + tare', () => {
    // 100 units × 10 kg gross = 1,000 kg cargo gross; container tare 2,200 kg.
    const s = shipment({ actualLoadingEntered: true, vgmKg: 3200, containerTareKg: 2200 });
    s.items[0].actualLoadedQty = 100;
    const pl = buildDocContent(s, 'packing_list', company);
    expect(pl.totalCargoGrossKg).toBe(1000);
    expect(pl.lines[0].cargoGrossKg).toBe(1000);
    expect(pl.declaredVgmKg).toBe(3200);
    expect(pl.expectedVgmKg).toBe(3200);
    expect(pl.issues.map((i) => i.code)).not.toContain('VGM_DIFFERS');
  });

  it('flags a VGM lower than the cargo it contains, and a VGM far from cargo + tare', () => {
    const below = summariseWeights({ lines: [{ qty: 100, netWeightKg: 9, grossWeightKg: 10 }], declaredVgmKg: 900 });
    expect(below.issues.map((i) => i.code)).toContain('VGM_BELOW_CARGO');

    const far = summariseWeights({ lines: [{ qty: 100, netWeightKg: 9, grossWeightKg: 10 }], containerTareKg: 2200, declaredVgmKg: 3600, warningTolerancePct: 5 });
    const issue = far.issues.find((i) => i.code === 'VGM_DIFFERS');
    expect(issue).toBeTruthy();
    if (issue && issue.code === 'VGM_DIFFERS') {
      expect(issue.diffKg).toBe(400);
      expect(issue.diffPct).toBe(12.5);
    }
  });

  it('rejects net above gross and invalid weights', () => {
    const r = summariseWeights({ lines: [{ qty: 5, netWeightKg: 11, grossWeightKg: 10 }, { qty: -1, netWeightKg: 1, grossWeightKg: 1 }] });
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['NET_EXCEEDS_GROSS', 'INVALID_WEIGHT']));
  });
});

describe('Incoterms named place', () => {
  it('uses the entered named place, never the port of discharge for FOB', () => {
    const c = buildDocContent(shipment(), 'commercial_invoice', company);
    expect(c.namedPlace).toBe('Ambarlı');
  });
  it('derives a FOB place from the loading side and says so when none was entered', () => {
    const s = shipment();
    s.logistics.namedPlace = '';
    const c = buildDocContent(s, 'commercial_invoice', company);
    expect(c.namedPlace).toBe('Ambarlı');
    expect(c.issues).toContainEqual({ code: 'NAMED_PLACE_MISSING', derivedFrom: 'loading' });
  });
  it('flags sea-only rules used with road transport', () => {
    const s = shipment();
    s.logistics.transportMode = 'Road';
    expect(buildDocContent(s, 'proforma', company).issues.map((i) => i.code)).toContain('INCOTERM_MODE');
  });
});
