/**
 * The page head in each language. The app sets document.title and the
 * description from here, and scripts/lang-pages.mjs writes /en/ and /fr/
 * copies of index.html with the same text, so links shared on social media
 * and search results show the right language before any script runs.
 */
export const SITE = 'https://exporta.tr';

export const HEAD = {
  tr: {
    path: '/',
    ogLocale: 'tr_TR',
    title: 'ExPorta B2B · İhracat Operasyon ve Belge Yönetim Platformu',
    description:
      "KOBİ'ler için B2B dış ticaret operasyon platformu. Sevkiyat yönetimi, proforma fatura, packing list, konşimento talimatı ve 7 aşamalı belge akışı tek yerde.",
    ogTitle: 'ExPorta · İhracatın Dijital Kapısı',
    ogDescription: 'Sevkiyattan belgeye, tüm ihracatınız tek platformda.',
  },
  en: {
    path: '/en/',
    ogLocale: 'en_GB',
    title: 'ExPorta · Export operations and documentation platform',
    description:
      'Export operations software for small and mid-sized exporters: shipment management, proforma invoices, packing lists, shipping instructions and a seven-step document workflow, all from one record.',
    ogTitle: 'ExPorta · The digital gateway to export',
    ogDescription: 'From shipment to paperwork, all your exports on one platform.',
  },
  fr: {
    path: '/fr/',
    ogLocale: 'fr_FR',
    title: 'ExPorta · Plateforme de gestion des opérations et documents export',
    description:
      "Le logiciel des PME exportatrices : gestion des expéditions, facture pro forma, liste de colisage, instructions d'expédition et un circuit documentaire en sept étapes, à partir d'un seul dossier.",
    ogTitle: "ExPorta · La porte numérique de l'export",
    ogDescription: "De l'expédition aux documents, tout votre export sur une seule plateforme.",
  },
};
