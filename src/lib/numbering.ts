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
    format: 'PI-{YYYYMM}-{CUSTOMER}-{SEQ}',
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
    format: 'INV-{YYYY}-{CUSTOMER}-{SEQ}',
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
