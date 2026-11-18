import type { Lang } from '../i18n/lang';
import type { CompanySettings, Customer, CustomField, DocType, MasterShipment, NoteItem, Product } from '../types/exporta';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_NOTES,
  INITIAL_PRODUCTS,
  INITIAL_SHIPMENTS,
} from './initialDemoData';
import { localizeDemo } from './demoLocale';
import { addDays, daysBetween, dayInZone } from '../lib/schedule';
import { approveDocument, buildDocContent, ApprovalBlockedError } from '../lib/commerce';

/**
 * The public demo: a fictional Ankara exporter with three shipments.
 *
 * Dates are written around a fixed anchor day and moved to today, so the
 * dashboard always shows one loading done and two ahead, whatever the date.
 * Approved demo documents get the same frozen content a real approval stores.
 */
const ANCHOR_DAY = '2026-08-14';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function shiftDates<T>(value: T, delta: number): T {
  if (typeof value === 'string') return (ISO_DAY.test(value) ? addDays(value, delta) : value) as T;
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, delta)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = shiftDates(v, delta);
    return out as T;
  }
  return value;
}

/** Rewrites the year (and year-month) inside demo codes to match the shifted creation date. */
function redate(code: string, created: string): string {
  const yyyy = created.slice(0, 4);
  const yyyymm = created.slice(0, 4) + created.slice(5, 7);
  return code.replace(/202608/g, yyyymm).replace(/-2026-/g, `-${yyyy}-`);
}

/** Weights, places and the loading story the demo walks through. */
const DEMO_PATCH: Record<string, Partial<MasterShipment> & { namedPlace?: string; destinationCountry?: string }> = {
  'shp-1': { measuredCargoGrossKg: 6850, containerTareKg: 3750, vgmKg: 10600, totalVgmKg: undefined, namedPlace: 'Ambarlı, İstanbul' },
  'shp-2': { totalVgmKg: undefined, namedPlace: 'New York' },
  'shp-3': { totalVgmKg: undefined, namedPlace: 'Ankara' },
};

const ORDER_DOCS: DocType[] = ['quotation', 'proforma', 'sales_order'];

export interface DemoData {
  companySettings: CompanySettings;
  customers: Customer[];
  products: Product[];
  customFields: CustomField[];
  shipments: MasterShipment[];
  notes: NoteItem[];
}

export function buildDemo(lang: Lang, today: string = dayInZone()): DemoData {
  const delta = daysBetween(ANCHOR_DAY, today);
  const company = localizeDemo(INITIAL_COMPANY_SETTINGS, lang);

  const shipments = shiftDates(localizeDemo(INITIAL_SHIPMENTS, lang), delta).map((s) => {
    const patch = DEMO_PATCH[s.id] ?? {};
    const { namedPlace, destinationCountry, ...rest } = patch;
    const shipment: MasterShipment = {
      ...s,
      ...rest,
      shipmentCode: redate(s.shipmentCode, s.createdAt),
      logistics: { ...s.logistics, namedPlace: localizeDemo(namedPlace, lang), destinationCountry: destinationCountry ?? s.customer.country },
      documents: { ...s.documents },
    };
    for (const dt of Object.keys(shipment.documents) as DocType[]) {
      const d = shipment.documents[dt];
      shipment.documents[dt] = { ...d, docNumber: redate(d.docNumber, d.createdAt || s.createdAt) };
    }
    // Approved demo documents are frozen like real ones. A loading document
    // cannot be approved before the actual loading, so the demo marks it ready instead.
    for (const dt of Object.keys(shipment.documents) as DocType[]) {
      const d = shipment.documents[dt];
      if (d.status !== 'onaylandi') continue;
      try {
        shipment.documents[dt] = approveDocument(d, buildDocContent(shipment, dt, company), d.updatedAt || s.createdAt);
      } catch (e) {
        if (!(e instanceof ApprovalBlockedError)) throw e;
        shipment.documents[dt] = { ...d, status: ORDER_DOCS.includes(dt) ? 'hazir' : 'taslak' };
      }
    }
    return shipment;
  });

  return {
    companySettings: company,
    customers: localizeDemo(INITIAL_CUSTOMERS, lang),
    products: localizeDemo(INITIAL_PRODUCTS, lang),
    customFields: localizeDemo(INITIAL_CUSTOM_FIELDS, lang),
    shipments,
    notes: shiftDates(localizeDemo(INITIAL_NOTES, lang), delta),
  };
}
