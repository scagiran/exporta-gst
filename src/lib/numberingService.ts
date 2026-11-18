import type { Customer, DocNumberFormat, DocType } from '../types/exporta';
import { generateDocNumber, maxShipmentSeq, nextFreeDocNumber } from './numbering';
import { nextOrgCounter, reserveDocumentNumber } from './supabaseService';

export const DOC_ORDER: DocType[] = [
  'quotation',
  'proforma',
  'sales_order',
  'actual_loading',
  'commercial_invoice',
  'packing_list',
  'shipping_instruction',
];

export interface AllocatedNumbers {
  shipmentCode: string;
  shipmentSeq: number;
  year: number;
  docNumbers: Record<DocType, string>;
  /** Sequence used per document type; the stored nextSeq becomes this + 1. */
  usedSeqs: Record<DocType, number>;
  /** 'server': guaranteed unique by the database. 'local': checked against the data loaded in this browser only. */
  source: 'server' | 'local';
  serverError?: string;
}

interface Params {
  orgId: string | null;
  date: Date;
  customer: Customer | { code?: string };
  formats: Record<DocType, DocNumberFormat>;
  existingShipmentCodes: string[];
  takenDocNumbers: Set<string>;
  shipmentHighWater: number;
}

function localAllocation(p: Params, serverError?: string): AllocatedNumbers {
  const year = p.date.getFullYear();
  const shipmentSeq = Math.max(maxShipmentSeq(p.existingShipmentCodes, year), p.shipmentHighWater) + 1;
  const taken = new Set(p.takenDocNumbers);
  const docNumbers = {} as Record<DocType, string>;
  const usedSeqs = {} as Record<DocType, number>;
  for (const dt of DOC_ORDER) {
    const r = nextFreeDocNumber(p.formats[dt], p.customer, taken, p.date);
    docNumbers[dt] = r.number;
    usedSeqs[dt] = r.seq;
    taken.add(r.number);
  }
  return { shipmentCode: `SHP-${year}-${String(shipmentSeq).padStart(3, '0')}`, shipmentSeq, year, docNumbers, usedSeqs, source: 'local', serverError };
}

/**
 * Numbers for a new shipment and its seven documents. Uses the database when
 * an organisation is signed in and the numbering functions are installed;
 * otherwise falls back to browser-side numbering and reports it.
 */
export async function allocateShipmentNumbers(p: Params): Promise<AllocatedNumbers> {
  if (!p.orgId) return localAllocation(p);
  const year = p.date.getFullYear();

  const shipment = await nextOrgCounter(p.orgId, `shipment:${year}`, Math.max(maxShipmentSeq(p.existingShipmentCodes, year), p.shipmentHighWater));
  if (shipment.value === null) return localAllocation(p, shipment.error ?? 'counter unavailable');

  const docNumbers = {} as Record<DocType, string>;
  const usedSeqs = {} as Record<DocType, number>;
  for (const dt of DOC_ORDER) {
    const cfg = p.formats[dt];
    let found = false;
    for (let attempt = 0; attempt < 25 && !found; attempt++) {
      const c = await nextOrgCounter(p.orgId, `doc:${dt}`, Math.max(0, (cfg.nextSeq || 1) - 1));
      if (c.value === null) return localAllocation(p, c.error ?? 'counter unavailable');
      const number = generateDocNumber(cfg, p.customer, c.value, p.date);
      if (p.takenDocNumbers.has(number)) continue;
      const r = await reserveDocumentNumber(p.orgId, dt, number);
      if (r.reserved === null) return localAllocation(p, r.error ?? 'reservation unavailable');
      if (r.reserved) {
        docNumbers[dt] = number;
        usedSeqs[dt] = c.value;
        found = true;
      }
    }
    if (!found) throw new Error(`Could not allocate a free number for ${dt}`);
  }

  return {
    shipmentCode: `SHP-${year}-${String(shipment.value).padStart(3, '0')}`,
    shipmentSeq: shipment.value,
    year,
    docNumbers,
    usedSeqs,
    source: 'server',
  };
}
