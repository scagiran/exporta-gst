import { DocType, DocNumberFormat, Customer } from '../types/exporta';

export const DEFAULT_NUMBER_FORMATS: Record<DocType, DocNumberFormat> = {
  quotation: {
    docType: 'quotation',
    prefix: 'QT',
    format: '{PREFIX}-{YYYY}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
  proforma: {
    docType: 'proforma',
    prefix: 'PI',
    format: '{PREFIX}-{YYYYMM}-{CUSTOMER}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
  sales_order: {
    docType: 'sales_order',
    prefix: 'SO',
    format: '{PREFIX}-{YYYY}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
  actual_loading: {
    docType: 'actual_loading',
    prefix: 'AL',
    format: '{PREFIX}-{YYYY}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
  commercial_invoice: {
    docType: 'commercial_invoice',
    prefix: 'INV',
    format: '{PREFIX}-{YYYY}-{CUSTOMER}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
  packing_list: {
    docType: 'packing_list',
    prefix: 'PL',
    format: '{PREFIX}-{YYYY}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
  shipping_instruction: {
    docType: 'shipping_instruction',
    prefix: 'SI',
    format: '{PREFIX}-{YYYY}-{SEQ}',
    nextSeq: 1,
    seqLength: 3,
  },
};

export const DOC_TYPE_NAMES: Record<DocType, string> = {
  quotation: 'Quotation (Teklif)',
  proforma: 'Proforma Invoice',
  sales_order: 'Sales Order (Satış Siparişi)',
  actual_loading: 'Actual Loading (Gerçek Yükleme)',
  commercial_invoice: 'Commercial Invoice (Ticari Fatura)',
  packing_list: 'Packing List (Çeki Listesi)',
  shipping_instruction: 'Shipping Instruction (Yükleme Talimatı)',
};

export const DOC_TYPE_ENGLISH_TITLES: Record<DocType, string> = {
  quotation: 'QUOTATION',
  proforma: 'PROFORMA INVOICE',
  sales_order: 'SALES ORDER',
  actual_loading: 'ACTUAL LOADING LIST',
  commercial_invoice: 'COMMERCIAL INVOICE',
  packing_list: 'PACKING LIST',
  shipping_instruction: 'SHIPPING INSTRUCTION',
};

/**
 * Converts English text to clean UPPERCASE ensuring no Turkish dotted 'İ' or 'ı' appears.
 */
export function toEnglishUpper(str: string): string {
  if (!str) return '';
  return str
    .replace(/i/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .toUpperCase();
}


export function generateDocNumber(
  cfg: DocNumberFormat,
  customer?: Customer | { code?: string },
  seqOverride?: number,
  customDate?: Date
): string {
  const date = customDate || new Date();
  const year = date.getFullYear().toString();
  const shortYear = year.slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  const seqNum = seqOverride ?? cfg.nextSeq;
  const seqStr = seqNum.toString().padStart(cfg.seqLength || 3, '0');
  
  const customerCode = (customer && customer.code)
    ? customer.code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    : 'CUST';

  let result = cfg.format || '{PREFIX}-{YYYY}-{SEQ}';
  result = result.replace('{PREFIX}', cfg.prefix || '');
  result = result.replace('{YYYYMM}', yearMonth);
  result = result.replace('{YYYY}', year);
  result = result.replace('{YY}', shortYear);
  result = result.replace('{MM}', month);
  result = result.replace('{CUSTOMER}', customerCode);
  result = result.replace('{SEQ}', seqStr);

  return result;
}

/*
 * Collision-safe numbering helpers.
 *
 * These run in the browser and protect against the cases the browser can see:
 * deleted records (the code is never computed from a list length), year
 * changes (the year comes from the creation date) and numbers already present
 * in the loaded data. They cannot see another tab or another user creating a
 * record at the same moment; that guarantee comes from the database
 * (supabase/migrations: org_counters, issued_document_numbers), used whenever
 * it is available. These numbers are internal document references, not
 * official e-invoice (e-Fatura) numbers.
 */

const SHIPMENT_CODE = /^SHP-(\d{4})-(\d+)$/;

/** Highest sequence used for the given year among existing shipment codes. */
export function maxShipmentSeq(codes: string[], year: number): number {
  let max = 0;
  for (const c of codes) {
    const m = SHIPMENT_CODE.exec((c || '').trim());
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }
  return max;
}

/**
 * Next shipment code for the creation date: SHP-YYYY-NNN, one above both the
 * highest code still present and the stored high-water mark (so a deleted
 * shipment's number is not handed out again).
 */
export function nextShipmentCode(codes: string[], date: Date = new Date(), highWater = 0): { code: string; seq: number; year: number } {
  const year = date.getFullYear();
  const seq = Math.max(maxShipmentSeq(codes, year), highWater) + 1;
  return { code: `SHP-${year}-${String(seq).padStart(3, '0')}`, seq, year };
}

/**
 * Formats the next document number that is not already taken. Starts at the
 * configured nextSeq and moves forward past any number found in `taken`.
 */
export function nextFreeDocNumber(
  cfg: DocNumberFormat,
  customer: Customer | { code?: string } | undefined,
  taken: Set<string>,
  date: Date = new Date()
): { number: string; seq: number } {
  let seq = Math.max(1, cfg.nextSeq || 1);
  for (let guard = 0; guard < 10000; guard++, seq++) {
    const number = generateDocNumber(cfg, customer, seq, date);
    if (!taken.has(number)) return { number, seq };
  }
  throw new Error('No free document number found');
}

/** Every document number currently present in the given shipments. */
export function takenDocNumbers(shipments: { documents: Record<string, { docNumber?: string }> }[]): Set<string> {
  const out = new Set<string>();
  for (const s of shipments) for (const d of Object.values(s.documents || {})) if (d?.docNumber) out.add(d.docNumber);
  return out;
}
