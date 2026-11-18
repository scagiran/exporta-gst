import type { Lang } from '../i18n/lang';

/**
 * The public demo (an Ankara exporter's sample shipments) in the visitor's
 * language. Only free text is translated: product names, notes, ports and
 * country names, and custom field names. Stored codes (units, note
 * categories, statuses, payment terms) stay as they are; the interface and
 * the documents label those themselves. Company and person names are kept.
 */
const DICT: Record<string, { en: string; fr: string }> = {
  // countries and places
  Türkiye: { en: 'Türkiye', fr: 'Turquie' },
  Almanya: { en: 'Germany', fr: 'Allemagne' },
  ABD: { en: 'USA', fr: 'États-Unis' },
  'Birleşik Arap Emirlikleri': { en: 'United Arab Emirates', fr: 'Émirats arabes unis' },
  'Ambarlı Limanı, İstanbul / Türkiye': { en: 'Ambarlı Port, Istanbul / Türkiye', fr: "Port d'Ambarlı, Istanbul / Turquie" },
  'Hamburg Port, Almanya': { en: 'Port of Hamburg, Germany', fr: 'Port de Hambourg, Allemagne' },
  'Mersin Limanı, Türkiye': { en: 'Port of Mersin, Türkiye', fr: 'Port de Mersin, Turquie' },
  'New York Port, USA': { en: 'Port of New York, USA', fr: 'Port de New York, États-Unis' },
  'Ankara Fabrika Depo': { en: 'Ankara factory warehouse', fr: 'Entrepôt usine, Ankara' },
  'Jebel Ali Port, Dubai': { en: 'Jebel Ali Port, Dubai', fr: 'Port de Jebel Ali, Dubaï' },

  // products
  'Ankastre 4 Gözlü Cam Ocak (60 cm Wok Gözlü)': {
    en: 'Built-in 4-burner gas-on-glass hob (60 cm, wok burner)',
    fr: 'Table de cuisson gaz sur verre encastrable 4 feux (60 cm, brûleur wok)',
  },
  'Siyah Temperli Cam Yüzey, Otomatik Gaz Emniyetli Wok Gözlü Ocak': {
    en: 'Black tempered glass top, wok burner, automatic gas safety cut-off',
    fr: 'Plaque en verre trempé noir, brûleur wok, sécurité gaz automatique',
  },
  'Ankastre Elektrikli Dijital Multifonksiyon Fırın (65 Lt)': {
    en: 'Built-in electric digital multifunction oven (65 L)',
    fr: 'Four encastrable électrique multifonction numérique (65 L)',
  },
  'A+ Enerji Sınıfı, 8 Programlı Dokunmatik Dijital Ankastre Fırın': {
    en: 'Energy class A+, built-in digital oven with touch controls and 8 programmes',
    fr: 'Classe énergétique A+, four encastrable numérique à commandes tactiles, 8 programmes',
  },
  'Endüstriyel Elektrik Pano Kabini (800x2000x600 mm)': {
    en: 'Industrial electrical enclosure (800x2000x600 mm)',
    fr: 'Armoire électrique industrielle (800x2000x600 mm)',
  },
  'IP65 Çelik Monoblok Elektrik Dağıtım Panosu, Toz Boyalı Ral 7035': {
    en: 'IP65 monobloc steel distribution enclosure, powder-coated RAL 7035',
    fr: 'Armoire de distribution monobloc en acier IP65, peinture poudre RAL 7035',
  },
  'Paslanmaz Çelik Sanayi Vana Seti 2 inç PN40': {
    en: 'Stainless steel industrial valve set, 2 in, PN40',
    fr: 'Jeu de vannes industrielles en inox, 2 pouces, PN40',
  },
  'AISI 316 Paslanmaz Çelik Küresel Vana, Flanşlı Bağlantılı': {
    en: 'AISI 316 stainless steel ball valve, flanged connection',
    fr: 'Robinet à tournant sphérique en inox AISI 316, raccordement à brides',
  },
  'Otomotiv Ağır Vasıta Fren Disk Takımı': {
    en: 'Brake disc set for heavy goods vehicles',
    fr: 'Jeu de disques de frein pour poids lourds',
  },
  'Döküm Demir Ağır Ticari Araç Ön Fren Diski (Çiftli Paket)': {
    en: 'Cast iron front brake disc for heavy commercial vehicles (pair pack)',
    fr: 'Disque de frein avant en fonte pour véhicules utilitaires lourds (lot de 2)',
  },
  'Hassas CNC İşlenmiş Alüminyum Gövde Parçası': {
    en: 'Precision CNC-machined aluminium housing part',
    fr: 'Pièce de carter en aluminium usinée CNC de précision',
  },
  'Yüksek Basınçlı Hidrolik Hortum Rakoru 3/4"': {
    en: 'High-pressure hydraulic hose fitting 3/4"',
    fr: 'Raccord de flexible hydraulique haute pression 3/4"',
  },
  'Paletli ahşap kasa paketleme': { en: 'Packed in wooden crates on pallets', fr: 'Emballage en caisse bois sur palette' },
  'Karton kutu içinde ikili ambalaj': { en: 'Packed in pairs in cardboard boxes', fr: 'Conditionnement par deux en carton' },

  // shipments
  'Hamburg Ambarlı Limanı çıkışlı 40ft HC konteyner sevkiyatı.': {
    en: '40ft HC container shipment from Ambarlı port to Hamburg.',
    fr: "Expédition en conteneur 40' HC au départ du port d'Ambarlı vers Hambourg.",
  },
  'Chicago teslimli deniz yolu nakliyesi.': { en: 'Sea freight, delivered to Chicago.', fr: 'Transport maritime, livraison à Chicago.' },
  'Dubai Jebel Ali Serbest Bölge teslimi.': {
    en: 'Delivery to Jebel Ali Free Zone, Dubai.',
    fr: 'Livraison en zone franche de Jebel Ali, Dubaï.',
  },
  'Gümrük kantar fişi no: KTR-9982. 2 adet pano kabini hasarlı koli nedeniyle yüklenmedi.': {
    en: 'Customs weighbridge ticket no. KTR-9982. 2 enclosures were not loaded because their packaging was damaged.',
    fr: "Ticket de pesée douanier n° KTR-9982. 2 armoires électriques n'ont pas été chargées en raison de colis endommagés.",
  },

  // custom fields (names are also the keys of the stored values)
  'Müşteri Referansı': { en: 'Customer reference', fr: 'Référence client' },
  'Fabrika Sipariş No': { en: 'Factory order no.', fr: 'N° de commande usine' },
  'Forwarder Firma': { en: 'Forwarder', fr: 'Transitaire' },
  'Satış Temsilcisi': { en: 'Sales representative', fr: 'Commercial' },

  // notes
  'Almanya AB A.TR Dolaşım Belgesi Gereksinimi': {
    en: 'Germany (EU): A.TR movement certificate required',
    fr: 'Allemagne (UE) : certificat de circulation A.TR obligatoire',
  },
  'Hamburg teslimatlarında gümrük vergisi muafiyeti için gümrük müşavirimize elektronik A.TR vizesi iletilmelidir.': {
    en: 'For duty relief on Hamburg deliveries, the electronically endorsed A.TR must be sent to our customs broker.',
    fr: "Pour l'exonération des droits sur les livraisons à Hambourg, le certificat A.TR visé électroniquement doit être transmis à notre commissionnaire en douane.",
  },
  'ABD Akreditif (L/C) 45 Gün Vadeli Belge İbrazı': {
    en: 'USA: 45-day letter of credit (L/C), presentation of documents',
    fr: 'États-Unis : crédit documentaire (L/C) à 45 jours, présentation des documents',
  },
  'Chicago Global Trade sevkiyatı için konşimento tarihi itibaren 21 gün içinde İş Bankası Ostim şubesine 3 nüsha Commercial Invoice sunulacak.': {
    en: 'For the Chicago Global Trade shipment, 3 copies of the commercial invoice must be presented to İş Bankası, Ostim branch, within 21 days of the bill of lading date.',
    fr: "Pour l'expédition Chicago Global Trade, 3 exemplaires de la facture commerciale doivent être présentés à İş Bankası, agence d'Ostim, dans les 21 jours suivant la date du connaissement.",
  },
  'Dubai Jebel Ali Serbest Bölge Konşimento Talimatı': {
    en: 'Dubai, Jebel Ali Free Zone: bill of lading instructions',
    fr: 'Dubaï, zone franche de Jebel Ali : instructions de connaissement',
  },
  'Consignee kısmına Levant Import FZE yazılmalı, Notify Party kısmına acente adı eklenmelidir.': {
    en: "The consignee field must read Levant Import FZE, and the agent's name must be added under notify party.",
    fr: "La case consignee doit indiquer Levant Import FZE et le nom de l'agent doit figurer dans la case notify party.",
  },
};

/** Fields whose values are codes, never translated. */
const KEEP = new Set(['unit', 'category', 'status', 'paymentMethod', 'docType', 'template', 'id', 'actionRoute', 'currency']);

function walk(value: unknown, lang: 'en' | 'fr', key?: string): unknown {
  if (typeof value === 'string') return key && KEEP.has(key) ? value : DICT[value]?.[lang] ?? value;
  if (Array.isArray(value)) return value.map((v) => walk(v, lang));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Custom field values are keyed by the field's name, which is translated too.
      const name = key === 'customFields' ? DICT[k]?.[lang] ?? k : k;
      out[name] = walk(v, lang, k);
    }
    return out;
  }
  return value;
}

/** A translated copy of a demo record (or list) for English and French; Turkish is returned as is. */
export function localizeDemo<T>(data: T, lang: Lang): T {
  return lang === 'tr' ? data : (walk(data, lang) as T);
}
