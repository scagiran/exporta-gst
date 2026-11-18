export type DocType = 
  | 'quotation'
  | 'proforma'
  | 'sales_order'
  | 'actual_loading'
  | 'commercial_invoice'
  | 'packing_list'
  | 'shipping_instruction';

export type DocStatus = 'eksik' | 'taslak' | 'hazir' | 'onaylandi';

export type DocTemplate = 'classic' | 'modern' | 'compact';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'currency' | 'boolean';

export type CustomFieldModule = 'shipment' | 'customer' | 'product';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  module: CustomFieldModule;
  required: boolean;
  showInDocs: boolean;
  options?: string[]; // for 'select' type
}

export interface Customer {
  id: string;
  code: string;
  companyName: string;
  country: string;
  city: string;
  address: string;
  taxNo: string;
  contactPerson: string;
  email: string;
  phone: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  hsCode: string; // GTİP / HS Code
  description: string;
  unit: string; // Pcs, Kg, Set, Meter, etc.
  origin: string; // Turkey, TR, etc.
  netWeightKg: number;
  grossWeightKg: number;
  unitPrice: number;
  currency: string; // EUR, USD, GBP, TRY
  imageUrl?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface ShipmentItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  hsCode: string;
  unit: string;
  orderedQty: number;
  actualLoadedQty?: number; // Actual Loading input
  unitPrice: number;
  currency: string;
  netWeightKg: number;
  grossWeightKg: number;
  vgmWeightKg?: number; // Distributed VGM weight
  imageUrl?: string;
  customNotes?: string;
}

export interface LogisticsInfo {
  incoterm: 'EXW' | 'FCA' | 'FOB' | 'CFR' | 'CIF' | 'DDP' | 'DAP' | 'CPT' | 'CIP';
  /** Incoterms® named place (e.g. "FOB Ambarlı"). Kept apart from the ports below. */
  namedPlace?: string;
  /** Place / port / airport of loading, depending on the transport mode. */
  loadingPort: string;
  /** Place / port / airport of discharge or final destination. */
  dischargePort: string;
  /** Destination country; may differ from the buyer's country. */
  destinationCountry?: string;
  transportMode: 'Sea' | 'Air' | 'Road' | 'Rail';
  carrierCompany: string;
  vesselFlightNo: string;
  bookingNo: string;
  containerNo?: string;
  sealNo?: string;
  estimatedLoadingDate: string;
  estimatedArrivalDate: string;
  forwarderName?: string;
}

export interface PaymentTerms {
  paymentMethod: 'Advance Payment (%100)' | '%30 Advance / %70 CAD' | 'Letter of Credit (L/C)' | 'Open Account 60 Days' | 'Cash Against Documents (CAD)';
  bankAccountIban: string;
  currency: string;
}

export interface DocNumberHistory {
  id: string;
  docType: DocType;
  oldNumber: string;
  newNumber: string;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export interface DocumentInfo {
  docType: DocType;
  docNumber: string;
  status: DocStatus;
  template: DocTemplate;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  showImages?: boolean;
  presentationImageUrl?: string;
  /** Language the document is issued in. Unset: the language of the interface. */
  lang?: 'tr' | 'en' | 'fr';
  /** Current revision number; 0 for the first issue. */
  revision?: number;
  /** Frozen content of the approved version. Present only while status is 'onaylandi'. */
  approved?: ApprovedVersion;
  /** Earlier approved versions, newest first. Never rewritten. */
  history?: ApprovedVersion[];
}

/** The commercial content of a document at the moment it was approved. */
export interface ApprovedVersion {
  revision: number;
  approvedAt: string;
  /** When a newer revision replaced it. */
  supersededAt?: string;
  supersededReason?: string;
  content: import('../lib/commerce').DocContent;
}

export interface MasterShipment {
  id: string;
  shipmentCode: string; // e.g. SHP-2026-001
  referenceNo?: string;
  customerId: string;
  customer: Customer;
  items: ShipmentItem[];
  logistics: LogisticsInfo;
  payment: PaymentTerms;
  documents: Record<DocType, DocumentInfo>;
  actualLoadingEntered: boolean;
  actualLoadingDate?: string;
  /** Legacy field: older versions stored the declared VGM here. Read through vgmKg. */
  totalVgmKg?: number;
  /** Declared VGM of the packed container (cargo gross + container tare). */
  vgmKg?: number;
  /** Cargo gross weight from a weighbridge ticket, container tare excluded. */
  measuredCargoGrossKg?: number;
  /** Empty container weight. */
  containerTareKg?: number;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface DocNumberFormat {
  docType: DocType;
  prefix: string;
  format: string; // e.g. "{PREFIX}-{YYYY}-{SEQ}" or "{PREFIX}-{YYYYMM}-{CUSTOMER}-{SEQ}"
  nextSeq: number;
  seqLength: number; // e.g. 3 => 001
}

export interface CompanySettings {
  companyName: string;
  taxNo: string;
  taxOffice: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  stampUrl?: string;
  bankName: string;
  bankBranch: string;
  iban: string;
  swiftCode: string;
  defaultTemplates: Record<DocType, DocTemplate>;
  /** The company's own VGM / weighbridge warning threshold in percent (default 5). Not a legal tolerance. */
  vgmWarningTolerancePct?: number;
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  actionRoute: string;
  completed: boolean;
}

export type NoteCategory = 'Gümrük Mevzuatı' | 'Müşteri Talebi' | 'Lojistik' | 'Ödeme & Banka';

export interface NoteItem {
  id: string;
  title: string;
  category: NoteCategory;
  content: string;
  createdAt: string;
  completed: boolean;
}

/**
 * Organization-level preferences that are not part of CompanySettings but still
 * have to survive a page reload (stored in the `org_preferences` table).
 */
export interface OrgPreferences {
  docNumberFormats: Record<DocType, DocNumberFormat>;
  customFields: CustomField[];
  numberHistory: DocNumberHistory[];
  notes: NoteItem[];
  onboardingSteps: OnboardingStep[];
  /** Highest shipment sequence ever issued per year, so a deleted shipment's code is not reused. */
  shipmentSeqHighWater?: Record<string, number>;
}
