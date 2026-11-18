import type {
  CompanySettings,
  Customer,
  DocType,
  DocumentInfo,
  LogisticsInfo,
  MasterShipment,
  PaymentTerms,
} from '../types/exporta';
import { lineAmountCents, fromCents, isValidAmount } from './money';
import { summariseWeights, WeightIssue } from './weights';

/*
 * One shipment record, seven documents, each at its own stage.
 *
 * Order documents (quotation, proforma, sales order) are built from the
 * ORDERED quantities. Loading documents (actual loading list, commercial
 * invoice, packing list, shipping instructions) are built from the quantities
 * ACTUALLY LOADED. Until the actual loading is entered, a loading document is
 * provisional: it shows the ordered figures with a clear warning and cannot
 * be approved.
 *
 * An approved document keeps a frozen copy of its content. Later changes to
 * the shipment do not alter it; issuing new figures means creating a revision.
 */

export type QtyBasis = 'ordered' | 'loaded';

export const DOC_QTY_BASIS: Record<DocType, QtyBasis> = {
  quotation: 'ordered',
  proforma: 'ordered',
  sales_order: 'ordered',
  actual_loading: 'loaded',
  commercial_invoice: 'loaded',
  packing_list: 'loaded',
  shipping_instruction: 'loaded',
};

/** Documents that carry payment instructions and therefore need the company's bank details. */
const NEEDS_BANK: DocType[] = ['quotation', 'proforma', 'commercial_invoice'];
/** Documents where cargo weights matter. */
const WEIGHT_DOCS: DocType[] = ['actual_loading', 'packing_list', 'shipping_instruction', 'commercial_invoice'];

/** Incoterms® 2020 rules that may only be used for sea and inland waterway transport. */
export const SEA_ONLY_INCOTERMS = ['FAS', 'FOB', 'CFR', 'CIF'];
/** Rules whose named place is on the seller's side (place of delivery / loading). */
const ORIGIN_PLACE_INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB'];

export interface DocLine {
  itemId: string;
  productCode: string;
  productName: string;
  hsCode: string;
  unit: string;
  qty: number;
  unitPrice: number;
  currency: string;
  /** qty × unit price, rounded to cents. */
  amount: number;
  netKg: number;
  /** Cargo gross for the line: goods with their packing. */
  cargoGrossKg: number;
  imageUrl?: string;
  notes?: string;
}

export type DocIssue =
  | { code: 'MIXED_CURRENCY'; currencies: string[] }
  | { code: 'CURRENCY_NOT_SHIPMENT'; itemCurrency: string; shipmentCurrency: string }
  | { code: 'PROVISIONAL_QTY' }
  | { code: 'INVALID_NUMBER'; line: number }
  | { code: 'NO_LINES' }
  | { code: 'NAMED_PLACE_MISSING'; derivedFrom: 'loading' | 'discharge' }
  | { code: 'INCOTERM_MODE'; incoterm: string; mode: string }
  | { code: 'BANK_MISSING' }
  | WeightIssue;

/** Issues that make a document's figures unusable; such a document cannot be approved. */
export const BLOCKING_ISSUES: DocIssue['code'][] = ['MIXED_CURRENCY', 'PROVISIONAL_QTY', 'INVALID_NUMBER', 'NO_LINES', 'NET_EXCEEDS_GROSS', 'INVALID_WEIGHT'];

export interface DocIssuer {
  companyName: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  taxNo: string;
  taxOffice: string;
  bankName: string;
  bankBranch: string;
  iban: string;
  swiftCode: string;
  logoUrl?: string;
}

export interface DocContent {
  docType: DocType;
  basis: QtyBasis;
  /** A loading document built before the actual loading was entered. */
  provisional: boolean;
  lines: DocLine[];
  /** The single currency of the document, or null when lines disagree. */
  currency: string | null;
  currencies: string[];
  /** Sum of the rounded line amounts; null when currencies are mixed. */
  total: number | null;
  totalNetKg: number;
  totalCargoGrossKg: number;
  measuredCargoGrossKg?: number;
  containerTareKg?: number;
  declaredVgmKg?: number;
  expectedVgmKg?: number;
  /** Incoterms® named place as printed: entered, or derived (then flagged in issues). */
  namedPlace: string;
  buyer: Customer;
  logistics: LogisticsInfo;
  payment: PaymentTerms;
  issuer: DocIssuer;
  issues: DocIssue[];
}

const blank = (s: string | undefined) => !s || !s.trim();

/** Quantity of an item for a given basis. Loaded basis falls back to ordered (provisional) when nothing was entered. */
export function itemQty(
  item: { orderedQty: number; actualLoadedQty?: number },
  basis: QtyBasis,
  actualLoadingEntered: boolean
): number {
  if (basis === 'loaded' && actualLoadingEntered && item.actualLoadedQty !== undefined && item.actualLoadedQty !== null) {
    return item.actualLoadedQty;
  }
  return item.orderedQty;
}

/** The declared VGM, reading the legacy field written by older versions. */
export const shipmentVgmKg = (s: Pick<MasterShipment, 'vgmKg' | 'totalVgmKg'>): number | undefined => s.vgmKg ?? s.totalVgmKg;

export function issuerFrom(c: CompanySettings): DocIssuer {
  return {
    companyName: c.companyName,
    address: c.address,
    city: c.city,
    country: c.country,
    phone: c.phone,
    email: c.email,
    taxNo: c.taxNo,
    taxOffice: c.taxOffice,
    bankName: c.bankName,
    bankBranch: c.bankBranch,
    iban: c.iban,
    swiftCode: c.swiftCode,
    logoUrl: c.logoUrl,
  };
}

/** Builds the commercial content of one document from the live shipment record. */
export function buildDocContent(shipment: MasterShipment, docType: DocType, company: CompanySettings): DocContent {
  const basis = DOC_QTY_BASIS[docType];
  const provisional = basis === 'loaded' && !shipment.actualLoadingEntered;
  const issues: DocIssue[] = [];

  const shipmentCurrency = (shipment.payment.currency || '').toUpperCase();
  const lines: DocLine[] = shipment.items.map((item, i) => {
    const qty = itemQty(item, basis, shipment.actualLoadingEntered);
    const currency = (item.currency || shipmentCurrency || '').toUpperCase();
    const numbersOk = [qty, item.unitPrice].every(isValidAmount);
    if (!numbersOk) issues.push({ code: 'INVALID_NUMBER', line: i });
    return {
      itemId: item.id,
      productCode: item.productCode,
      productName: item.productName,
      hsCode: item.hsCode,
      unit: item.unit,
      qty,
      unitPrice: item.unitPrice,
      currency,
      amount: numbersOk ? fromCents(lineAmountCents(qty, item.unitPrice)) : 0,
      netKg: 0,
      cargoGrossKg: 0,
      imageUrl: item.imageUrl,
      notes: item.customNotes,
    };
  });

  if (lines.length === 0) issues.push({ code: 'NO_LINES' });
  if (provisional) issues.push({ code: 'PROVISIONAL_QTY' });

  const currencies = [...new Set(lines.map((l) => l.currency).filter(Boolean))];
  const mixed = currencies.length > 1;
  if (mixed) issues.push({ code: 'MIXED_CURRENCY', currencies });
  else if (currencies.length === 1 && shipmentCurrency && currencies[0] !== shipmentCurrency) {
    issues.push({ code: 'CURRENCY_NOT_SHIPMENT', itemCurrency: currencies[0], shipmentCurrency });
  }
  const currency = mixed ? null : currencies[0] ?? (shipmentCurrency || null);
  const total = mixed ? null : fromCents(lines.reduce((sum, l) => sum + lineAmountCents(l.qty, l.unitPrice), 0));

  const weights = summariseWeights({
    lines: shipment.items.map((item, i) => ({ qty: lines[i].qty, netWeightKg: item.netWeightKg, grossWeightKg: item.grossWeightKg })),
    measuredCargoGrossKg: basis === 'loaded' ? shipment.measuredCargoGrossKg : undefined,
    containerTareKg: basis === 'loaded' ? shipment.containerTareKg : undefined,
    declaredVgmKg: basis === 'loaded' ? shipmentVgmKg(shipment) : undefined,
    warningTolerancePct: company.vgmWarningTolerancePct,
  });
  lines.forEach((l, i) => {
    l.netKg = weights.lineNetKg[i];
    l.cargoGrossKg = weights.lineCargoGrossKg[i];
  });
  for (const w of weights.issues) {
    // Product data problems matter on every document; container checks only where weights are declared.
    if (w.code === 'NET_EXCEEDS_GROSS' || w.code === 'INVALID_WEIGHT' || WEIGHT_DOCS.includes(docType)) issues.push(w);
  }

  // Incoterms® named place and transport mode.
  const lg = shipment.logistics;
  let namedPlace = (lg.namedPlace || '').trim();
  if (!namedPlace) {
    const fromOrigin = ORIGIN_PLACE_INCOTERMS.includes(lg.incoterm);
    namedPlace = ((fromOrigin ? lg.loadingPort : lg.dischargePort) || '').trim();
    issues.push({ code: 'NAMED_PLACE_MISSING', derivedFrom: fromOrigin ? 'loading' : 'discharge' });
  }
  if (SEA_ONLY_INCOTERMS.includes(lg.incoterm) && lg.transportMode && lg.transportMode !== 'Sea') {
    issues.push({ code: 'INCOTERM_MODE', incoterm: lg.incoterm, mode: lg.transportMode });
  }

  if (NEEDS_BANK.includes(docType) && (blank(company.iban) || blank(company.bankName))) issues.push({ code: 'BANK_MISSING' });

  return {
    docType,
    basis,
    provisional,
    lines,
    currency,
    currencies,
    total,
    totalNetKg: weights.totalNetKg,
    totalCargoGrossKg: weights.calculatedCargoGrossKg,
    measuredCargoGrossKg: weights.measuredCargoGrossKg,
    containerTareKg: weights.containerTareKg,
    declaredVgmKg: weights.declaredVgmKg,
    expectedVgmKg: weights.expectedVgmKg,
    namedPlace,
    buyer: { ...shipment.customer },
    logistics: { ...lg },
    payment: { ...shipment.payment },
    issuer: issuerFrom(company),
    issues,
  };
}

export const blockingIssues = (c: DocContent) => c.issues.filter((i) => BLOCKING_ISSUES.includes(i.code));

/** The fields whose change makes an approved document out of date, grouped for display. */
export type ChangeArea = 'lines' | 'totals' | 'buyer' | 'terms' | 'bank' | 'weights';

export function contentChanges(approved: DocContent, live: DocContent): ChangeArea[] {
  const pick = {
    lines: (c: DocContent) => c.lines.map((l) => [l.productCode, l.productName, l.hsCode, l.unit, l.qty, l.unitPrice, l.currency, l.amount]),
    totals: (c: DocContent) => [c.currency, c.total],
    buyer: (c: DocContent) => [c.buyer.companyName, c.buyer.address, c.buyer.city, c.buyer.country, c.buyer.taxNo],
    terms: (c: DocContent) => [c.logistics.incoterm, c.namedPlace, c.logistics.loadingPort, c.logistics.dischargePort, c.payment.paymentMethod],
    bank: (c: DocContent) => [c.issuer.bankName, c.issuer.iban, c.issuer.swiftCode],
    weights: (c: DocContent) => [c.totalNetKg, c.totalCargoGrossKg, c.measuredCargoGrossKg, c.declaredVgmKg],
  };
  return (Object.keys(pick) as ChangeArea[]).filter((k) => JSON.stringify(pick[k](approved)) !== JSON.stringify(pick[k](live)));
}

export class ApprovalBlockedError extends Error {
  constructor(public issues: DocIssue[]) {
    super('approval blocked: ' + issues.map((i) => i.code).join(', '));
  }
}

/** Approves a document: its current content is frozen as this revision. */
export function approveDocument(doc: DocumentInfo, content: DocContent, today: string): DocumentInfo {
  const blocking = blockingIssues(content);
  if (blocking.length) throw new ApprovalBlockedError(blocking);
  return {
    ...doc,
    status: 'onaylandi',
    revision: doc.revision ?? 0,
    approved: { revision: doc.revision ?? 0, approvedAt: today, content },
    updatedAt: today,
  };
}

/**
 * Withdraws the approval and opens the next revision as a draft. The approved
 * version moves to the history unchanged.
 */
export function reviseDocument(doc: DocumentInfo, reason: string, today: string): DocumentInfo {
  const history = doc.approved
    ? [{ ...doc.approved, supersededAt: today, supersededReason: reason }, ...(doc.history ?? [])]
    : doc.history ?? [];
  return {
    ...doc,
    status: 'taslak',
    revision: (doc.revision ?? 0) + (doc.approved ? 1 : 0),
    approved: undefined,
    history,
    updatedAt: today,
  };
}

/**
 * The content to show for a document: the frozen approved version when there
 * is one, otherwise the live content. `changes` lists what moved since approval.
 */
export function resolveDocContent(shipment: MasterShipment, docType: DocType, company: CompanySettings) {
  const live = buildDocContent(shipment, docType, company);
  const doc = shipment.documents[docType];
  if (doc?.status === 'onaylandi' && doc.approved) {
    return { content: doc.approved.content, live, frozen: true as const, changes: contentChanges(doc.approved.content, live) };
  }
  return { content: live, live, frozen: false as const, changes: [] as ChangeArea[] };
}
