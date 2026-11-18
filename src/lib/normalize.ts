import {
  Customer,
  Product,
  MasterShipment,
  DocType,
  DocumentInfo,
  ShipmentItem,
  LogisticsInfo,
  PaymentTerms,
} from '../types/exporta';

/**
 * Records saved by earlier versions of the app do not always carry every field the
 * current UI reads. A single missing `documents` object used to take the whole page
 * down with "Cannot convert undefined or null to object". Everything coming out of
 * Supabase is therefore funnelled through these helpers first, so views can rely on
 * the shape instead of guarding every access.
 */

export const DOC_TYPES: DocType[] = [
  'quotation',
  'proforma',
  'sales_order',
  'actual_loading',
  'commercial_invoice',
  'packing_list',
  'shipping_instruction',
];

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && !isNaN(v) ? v : fallback);

const today = () => new Date().toISOString().split('T')[0];

export function normalizeCustomer(raw: Partial<Customer> | null | undefined, id?: string): Customer {
  const c = raw || {};
  return {
    id: str(c.id, id || `cust-${Date.now()}`),
    code: str(c.code),
    companyName: str(c.companyName, 'İsimsiz Müşteri'),
    country: str(c.country),
    city: str(c.city),
    address: str(c.address),
    taxNo: str(c.taxNo),
    contactPerson: str(c.contactPerson),
    email: str(c.email),
    phone: str(c.phone),
    customFields: c.customFields || {},
  };
}

export function normalizeProduct(raw: Partial<Product> | null | undefined, id?: string): Product {
  const p = raw || {};
  return {
    id: str(p.id, id || `prd-${Date.now()}`),
    code: str(p.code),
    name: str(p.name, 'İsimsiz Ürün'),
    hsCode: str(p.hsCode),
    description: str(p.description),
    unit: str(p.unit, 'Pcs'),
    origin: str(p.origin, 'Turkey'),
    netWeightKg: num(p.netWeightKg),
    grossWeightKg: num(p.grossWeightKg),
    unitPrice: num(p.unitPrice),
    currency: str(p.currency, 'EUR'),
    imageUrl: p.imageUrl,
    customFields: p.customFields || {},
  };
}

function normalizeItem(raw: Partial<ShipmentItem>, idx: number): ShipmentItem {
  return {
    id: str(raw.id, `si-${idx}`),
    productId: str(raw.productId),
    productCode: str(raw.productCode),
    productName: str(raw.productName, 'İsimsiz Kalem'),
    hsCode: str(raw.hsCode),
    unit: str(raw.unit, 'Pcs'),
    orderedQty: num(raw.orderedQty),
    actualLoadedQty: raw.actualLoadedQty,
    unitPrice: num(raw.unitPrice),
    currency: str(raw.currency, 'EUR'),
    netWeightKg: num(raw.netWeightKg),
    grossWeightKg: num(raw.grossWeightKg),
    vgmWeightKg: raw.vgmWeightKg,
    imageUrl: raw.imageUrl,
    customNotes: raw.customNotes,
  };
}

function normalizeDocuments(
  raw: Partial<Record<DocType, Partial<DocumentInfo>>> | null | undefined
): Record<DocType, DocumentInfo> {
  const source = raw || {};
  const result = {} as Record<DocType, DocumentInfo>;

  DOC_TYPES.forEach((docType) => {
    const d = source[docType] || {};
    result[docType] = {
      docType,
      docNumber: str(d.docNumber, '-'),
      status: d.status || 'eksik',
      template: d.template || 'classic',
      createdAt: str(d.createdAt, today()),
      updatedAt: str(d.updatedAt, today()),
      // Older versions wrote the note to customNotes; it is the same note.
      notes: d.notes ?? (d as { customNotes?: string }).customNotes,
      showImages: d.showImages,
      presentationImageUrl: d.presentationImageUrl,
      lang: d.lang === 'tr' || d.lang === 'en' || d.lang === 'fr' ? d.lang : undefined,
      revision: typeof d.revision === 'number' ? d.revision : undefined,
      approved: d.approved,
      history: Array.isArray(d.history) ? d.history : undefined,
    };
  });

  return result;
}

export function normalizeShipment(raw: Partial<MasterShipment>, id?: string): MasterShipment {
  const s = raw || {};
  const logistics = (s.logistics || {}) as Partial<LogisticsInfo>;
  const payment = (s.payment || {}) as Partial<PaymentTerms>;
  const shipmentId = str(s.id, id || `shp-${Date.now()}`);

  return {
    id: shipmentId,
    shipmentCode: str(s.shipmentCode, shipmentId),
    referenceNo: s.referenceNo,
    customerId: str(s.customerId),
    customer: normalizeCustomer(s.customer, s.customerId),
    items: Array.isArray(s.items) ? s.items.map(normalizeItem) : [],
    logistics: {
      incoterm: logistics.incoterm || 'FOB',
      namedPlace: logistics.namedPlace,
      loadingPort: str(logistics.loadingPort),
      dischargePort: str(logistics.dischargePort),
      destinationCountry: logistics.destinationCountry,
      transportMode: logistics.transportMode || 'Sea',
      carrierCompany: str(logistics.carrierCompany),
      vesselFlightNo: str(logistics.vesselFlightNo),
      bookingNo: str(logistics.bookingNo),
      containerNo: logistics.containerNo,
      sealNo: logistics.sealNo,
      // A missing date stays missing: inventing "today" would put it on the dashboard as due.
      estimatedLoadingDate: str(logistics.estimatedLoadingDate),
      estimatedArrivalDate: str(logistics.estimatedArrivalDate),
      forwarderName: logistics.forwarderName,
    },
    payment: {
      paymentMethod: payment.paymentMethod || 'Advance Payment (%100)',
      bankAccountIban: str(payment.bankAccountIban),
      currency: str(payment.currency, 'EUR'),
    },
    documents: normalizeDocuments(s.documents),
    actualLoadingEntered: s.actualLoadingEntered === true,
    actualLoadingDate: s.actualLoadingDate,
    totalVgmKg: s.totalVgmKg,
    vgmKg: s.vgmKg,
    measuredCargoGrossKg: s.measuredCargoGrossKg,
    containerTareKg: s.containerTareKg,
    notes: s.notes,
    customFields: s.customFields || {},
    createdAt: str(s.createdAt, today()),
    updatedAt: str(s.updatedAt, today()),
  };
}
