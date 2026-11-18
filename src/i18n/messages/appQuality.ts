import type { Lang } from '../lang';
import { NB } from '../lang';

/*
 * Checks, save states, approvals and revisions, weights and VGM, and the
 * new-shipment form. Kept together because they describe what the product
 * guarantees and what it does not.
 */

type Mode = 'Sea' | 'Air' | 'Road' | 'Rail';
type Area = 'lines' | 'totals' | 'buyer' | 'terms' | 'bank' | 'weights';

const tr = {
  issues: {
    title: 'Kontroller',
    blocking: 'Engelleyici',
    warning: 'Uyarı',
    MIXED_CURRENCY: (c: string) =>
      `Kalemler farklı para birimlerinde (${c}). Dönüştürme yapılmadan tek toplam hesaplanmaz; bir sevkiyat tek para birimi kullanmalı.`,
    CURRENCY_NOT_SHIPMENT: (item: string, ship: string) => `Kalemlerin para birimi (${item}), sevkiyatın para biriminden (${ship}) farklı.`,
    PROVISIONAL_QTY: 'Fiili yükleme henüz girilmedi. Bu belge sipariş miktarlarıyla GEÇİCİ olarak gösteriliyor ve onaylanamaz.',
    INVALID_NUMBER: (line: number) => `${line}. satırda geçersiz miktar veya fiyat var.`,
    NO_LINES: 'Belgede kalem yok.',
    NAMED_PLACE_MISSING: (from: 'loading' | 'discharge') =>
      `Incoterms® teslim yeri girilmemiş; ${from === 'loading' ? 'yükleme yerinden' : 'varış yerinden'} türetildi. Sevkiyat kaydında kontrol edin.`,
    INCOTERM_MODE: (inc: string, mode: string) => `${inc} yalnızca deniz ve iç su yolu taşımacılığı için kullanılır; seçili taşıma şekli: ${mode}.`,
    BANK_MISSING: 'Firma banka bilgileri (banka adı, IBAN) eksik; ödeme bilgisi belgede boş kalır.',
    NET_EXCEEDS_GROSS: (line: number) => `${line}. satırda birim net ağırlık brüt ağırlıktan büyük.`,
    INVALID_WEIGHT: (line: number) => `${line}. satırda geçersiz ağırlık veya miktar.`,
    VGM_BELOW_CARGO: (vgm: string, cargo: string) =>
      `Beyan edilen VGM (${vgm} kg), yük brütünden (${cargo} kg) düşük olamaz; VGM konteyner darasını da içerir.`,
    VGM_DIFFERS: (vgm: string, expected: string, pct: string, tol: string) =>
      `Beyan edilen VGM (${vgm} kg), yük brütü + konteyner darası (${expected} kg) toplamından %${pct} farklı. Şirket uyarı eşiği: %${tol}.`,
    MEASURED_DIFFERS: (measured: string, calc: string, pct: string, tol: string) =>
      `Kantarda ölçülen yük brütü (${measured} kg), ana veriden hesaplanan değerden (${calc} kg) %${pct} farklı. Şirket uyarı eşiği: %${tol}.`,
  },
  modes: { Sea: 'Deniz', Air: 'Hava', Road: 'Kara', Rail: 'Demiryolu' } as Record<Mode, string>,
  places: {
    loading: { Sea: 'Yükleme Limanı', Air: 'Kalkış Havalimanı', Road: 'Yükleme Yeri', Rail: 'Yükleme İstasyonu' } as Record<Mode, string>,
    discharge: { Sea: 'Varış Limanı', Air: 'Varış Havalimanı', Road: 'Teslim Yeri', Rail: 'Varış İstasyonu' } as Record<Mode, string>,
  },
  notice: {
    demo: 'Demo: kurgusal bir firma ve sevkiyatlar. Yaptığınız değişiklikler yalnızca bu tarayıcı sekmesinde tutulur, hiçbir yere kaydedilmez.',
    loading: 'Firma verileriniz yükleniyor…',
    loadError: 'Verileriniz yüklenemedi. Yanlış görünmemesi için ekranda hiçbir veri gösterilmiyor.',
    retry: 'Yeniden dene',
  },
  save: {
    saving: 'Kaydediliyor…',
    saved: 'Kaydedildi',
    failed: (n: number) => `Kaydedilemedi (${n})`,
    failedDetail: 'Değişiklikler ekranda duruyor ama veritabanına yazılamadı.',
    retry: 'Yeniden dene',
    demo: 'Demo · kaydedilmiyor',
    savedDemo: 'Demo: değişiklik yalnızca bu sekmede uygulandı, kaydedilmedi.',
    savedOk: 'Kaydedildi.',
    savedFailed: 'Kaydedilemedi. Değişiklikler ekranda duruyor; üst çubuktaki "Yeniden dene" ile tekrar deneyin.',
  },
  approval: {
    basisOrdered: 'Bu belge SİPARİŞ miktarlarını kullanır.',
    basisLoaded: 'Bu belge FİİLİ YÜKLEME miktarlarını kullanır.',
    frozen: (rev: number, date: string) => `Onaylı sürüm gösteriliyor (Rev. ${rev}, ${date}). İçerik onay anında donduruldu.`,
    changed: (areas: string) =>
      `Onaydan sonra sevkiyat verisi değişti (${areas}). Belge onaylı haliyle korunuyor; yeni rakamları yayımlamak için revizyon oluşturun.`,
    areas: { lines: 'kalemler', totals: 'tutarlar', buyer: 'alıcı', terms: 'teslim/ödeme şartları', bank: 'banka bilgileri', weights: 'ağırlıklar' } as Record<Area, string>,
    createRevision: 'Revizyon oluştur',
    revisionConfirm: 'Onaylı sürüm geçmişe kaydedilecek ve belge yeni revizyon olarak taslağa dönecek. Devam edilsin mi?',
    blocked: 'Belge onaylanamadı. Önce şu sorunları giderin:',
    approveNote: 'Onaylanan belgenin içeriği dondurulur; sonraki değişiklikler revizyon gerektirir.',
    history: (n: number) => `Önceki onaylı sürümler: ${n}`,
    historyItem: (rev: number, approved: string, superseded: string) => `Rev. ${rev} · onay ${approved} · yerine yenisi ${superseded}`,
    legacyApproved: 'Bu belge sürüm takibinden önce onaylanmış; içeriği dondurulmamış. Yeniden onaylarsanız içerik dondurulur.',
  },
  weights: {
    title: 'Ağırlıklar ve VGM',
    lead: 'Yük brütü (ürün + ambalaj, palet ve sabitleme) çeki listesine yazılır. VGM, dolu konteynerin beyan edilen doğrulanmış brüt ağırlığıdır (yük brütü + konteyner darası) ve ürün satırlarına dağıtılmaz. ExPorta tartım yapmaz ve VGM onaylamaz; girilen beyanı tutarlılık açısından kontrol eder.',
    calcCargo: 'Hesaplanan yük brütü (ana veriden)',
    measuredCargo: 'Kantar yük brütü (ölçülen, konteyner hariç)',
    tare: 'Konteyner darası',
    vgm: 'Beyan edilen VGM (konteyner dahil)',
    expectedVgm: 'Beklenen VGM (yük brütü + dara)',
    net: 'Toplam net ağırlık',
    tolNote: (pct: string) => `Uyarı eşiği şirketinizin kendi ayarıdır (%${pct}); bir mevzuat toleransı değildir.`,
    save: 'Ağırlıkları kaydet',
    invalid: 'Ağırlıklar 0 veya pozitif bir sayı olmalı.',
    colLoaded: 'Yüklenen miktar',
    colNet: 'Net (kg)',
    colGross: 'Yük brütü (kg)',
    tableTitle: 'Çeki listesi ağırlık dökümü',
    tableLead: 'Satır brütleri ürün ana verisinden hesaplanır; kantar veya VGM değeri satırlara dağıtılmaz.',
  },
  wizard: {
    qty: 'Sipariş miktarı',
    currency: 'Sevkiyat para birimi',
    currencyMismatch: (c: string) =>
      `Seçilen ürünler farklı para birimlerinde (${c}). Bir sevkiyat tek para birimi kullanır; aynı para birimindeki ürünleri seçin.`,
    qtyRequired: "Her seçili ürün için 0'dan büyük bir sipariş miktarı girin.",
    mode: 'Taşıma şekli',
    namedPlace: 'Incoterms® teslim yeri *',
    namedPlaceHint: (fromOrigin: boolean): string =>
      fromOrigin ? 'Bu kuralda teslim yeri satıcı tarafındadır (örn. yükleme limanı).' : 'Bu kuralda teslim yeri alıcı tarafındadır (örn. varış limanı).',
    destinationCountry: 'Varış ülkesi',
    required: 'Yükleme yeri, varış yeri ve Incoterms® teslim yerini girin.',
    buyerChanged: (country: string) => `Alıcı değişti (${country}). Varış yerini ve teslim şartını gözden geçirin.`,
    seaOnly: (inc: string) => `${inc} yalnızca deniz taşımacılığı içindir. Başka taşıma şekli için FCA, CPT, CIP, DAP veya DDP kullanın.`,
    ibanMissing: 'Firma ayarlarında IBAN yok; ödeme bilgisi belgelerde boş kalacak.',
    creating: 'Oluşturuluyor…',
    createFailed: (msg: string) => `Sevkiyat oluşturulamadı: ${msg}`,
    numberingLocal: 'Numaralar bu tarayıcıdaki verilere göre kontrol edildi; sunucu taraflı numaralandırma henüz etkin değil.',
    savedLocally: 'Sevkiyat ekranda oluşturuldu ama kaydedilemedi; üst çubuktan yeniden deneyin.',
    noCustomers: 'Önce bir müşteri ekleyin.',
    noProducts: 'Önce bir ürün ekleyin.',
    carrier: 'Taşıyıcı / acente (isteğe bağlı)',
    eta: 'Tahmini varış tarihi',
  },
  dashboard2: {
    upcomingSub: (overdue: number, done: number) => `${overdue} gecikmiş · ${done} tamamlandı`,
    portfolioHint: 'Yükleme girildiyse yüklenen, girilmediyse sipariş miktarıyla; para birimine göre ayrı.',
    mixed: 'Karma para birimi',
    overdueBadge: 'Gecikmiş yükleme',
  },
  settings2: {
    tolerance: 'VGM / kantar uyarı eşiği (%)',
    toleranceHint: 'Şirketinizin kendi operasyon uyarısıdır; bir mevzuat toleransı değildir.',
  },
  editor2: {
    reasonStatus: 'Onay durumu değiştirildi',
    reasonRevision: 'Yeni revizyon oluşturuldu',
    reasonReset: 'Belge sıfırlandı',
  },
};

export type AppQualityMessages = typeof tr;

const en: AppQualityMessages = {
  issues: {
    title: 'Checks',
    blocking: 'Blocking',
    warning: 'Warning',
    MIXED_CURRENCY: (c: string) =>
      `Lines are in different currencies (${c}). No single total is calculated without a conversion; a shipment must use one currency.`,
    CURRENCY_NOT_SHIPMENT: (item: string, ship: string) => `The lines are in ${item}, but the shipment currency is ${ship}.`,
    PROVISIONAL_QTY: 'Actual loading not entered yet. This document shows the ordered quantities as a PROVISIONAL draft and cannot be approved.',
    INVALID_NUMBER: (line: number) => `Line ${line} has an invalid quantity or price.`,
    NO_LINES: 'The document has no lines.',
    NAMED_PLACE_MISSING: (from: 'loading' | 'discharge') =>
      `No Incoterms® named place entered; it was taken from the ${from === 'loading' ? 'place of loading' : 'destination'}. Check it in the shipment record.`,
    INCOTERM_MODE: (inc: string, mode: string) => `${inc} is for sea and inland waterway transport only; the selected mode is ${mode}.`,
    BANK_MISSING: "The company's bank details (bank name, IBAN) are missing; payment details stay blank on the document.",
    NET_EXCEEDS_GROSS: (line: number) => `Line ${line}: net weight per unit is above gross weight.`,
    INVALID_WEIGHT: (line: number) => `Line ${line} has an invalid weight or quantity.`,
    VGM_BELOW_CARGO: (vgm: string, cargo: string) =>
      `The declared VGM (${vgm} kg) cannot be lower than the cargo gross weight (${cargo} kg); the VGM includes the container tare.`,
    VGM_DIFFERS: (vgm: string, expected: string, pct: string, tol: string) =>
      `The declared VGM (${vgm} kg) differs by ${pct}% from cargo gross + container tare (${expected} kg). Company warning threshold: ${tol}%.`,
    MEASURED_DIFFERS: (measured: string, calc: string, pct: string, tol: string) =>
      `The weighbridge cargo gross (${measured} kg) differs by ${pct}% from the figure calculated from master data (${calc} kg). Company warning threshold: ${tol}%.`,
  },
  modes: { Sea: 'Sea', Air: 'Air', Road: 'Road', Rail: 'Rail' },
  places: {
    loading: { Sea: 'Port of loading', Air: 'Airport of departure', Road: 'Place of loading', Rail: 'Rail terminal of loading' },
    discharge: { Sea: 'Port of discharge', Air: 'Airport of destination', Road: 'Place of delivery', Rail: 'Rail terminal of destination' },
  },
  notice: {
    demo: 'Demo: a fictional company and shipments. Your changes stay in this browser tab only and are not saved anywhere.',
    loading: 'Loading your company data…',
    loadError: 'Your data could not be loaded. Nothing is shown, so nothing can be mistaken for your data.',
    retry: 'Try again',
  },
  save: {
    saving: 'Saving…',
    saved: 'Saved',
    failed: (n: number) => `Not saved (${n})`,
    failedDetail: 'Your changes are still on screen but could not be written to the database.',
    retry: 'Retry',
    demo: 'Demo · not saved',
    savedDemo: 'Demo: the change is applied in this tab only and is not saved.',
    savedOk: 'Saved.',
    savedFailed: 'Not saved. Your changes are still on screen; use "Retry" in the top bar.',
  },
  approval: {
    basisOrdered: 'This document uses the ORDERED quantities.',
    basisLoaded: 'This document uses the quantities ACTUALLY LOADED.',
    frozen: (rev: number, date: string) => `Showing the approved version (Rev. ${rev}, ${date}). Its content was frozen at approval.`,
    changed: (areas: string) =>
      `The shipment changed after approval (${areas}). The document keeps its approved content; create a revision to issue the new figures.`,
    areas: { lines: 'lines', totals: 'amounts', buyer: 'buyer', terms: 'delivery/payment terms', bank: 'bank details', weights: 'weights' },
    createRevision: 'Create revision',
    revisionConfirm: 'The approved version will be kept in the history and the document will reopen as a new draft revision. Continue?',
    blocked: 'The document cannot be approved. Fix these first:',
    approveNote: "An approved document's content is frozen; later changes need a revision.",
    history: (n: number) => `Earlier approved versions: ${n}`,
    historyItem: (rev: number, approved: string, superseded: string) => `Rev. ${rev} · approved ${approved} · superseded ${superseded}`,
    legacyApproved: 'Approved before version tracking; its content is not frozen. Approving again will freeze it.',
  },
  weights: {
    title: 'Weights and VGM',
    lead: 'The cargo gross weight (goods plus packing, pallets and lashing) goes on the packing list. The VGM is the declared verified gross mass of the packed container (cargo gross + container tare) and is never spread over product lines. ExPorta does not weigh or certify anything; it checks the declared figures for consistency.',
    calcCargo: 'Calculated cargo gross (master data)',
    measuredCargo: 'Weighbridge cargo gross (measured, container excluded)',
    tare: 'Container tare',
    vgm: 'Declared VGM (container included)',
    expectedVgm: 'Expected VGM (cargo gross + tare)',
    net: 'Total net weight',
    tolNote: (pct: string) => `The warning threshold is your company's own setting (${pct}%), not a legal tolerance.`,
    save: 'Save weights',
    invalid: 'Weights must be zero or a positive number.',
    colLoaded: 'Qty loaded',
    colNet: 'Net (kg)',
    colGross: 'Cargo gross (kg)',
    tableTitle: 'Packing list weight breakdown',
    tableLead: 'Line gross weights come from product master data; weighbridge and VGM figures are not spread over lines.',
  },
  wizard: {
    qty: 'Ordered quantity',
    currency: 'Shipment currency',
    currencyMismatch: (c: string) =>
      `The selected products are in different currencies (${c}). A shipment uses one currency; select products in the same currency.`,
    qtyRequired: 'Enter an ordered quantity above zero for each selected product.',
    mode: 'Transport mode',
    namedPlace: 'Incoterms® named place *',
    namedPlaceHint: (fromOrigin: boolean): string =>
      fromOrigin ? "Under this rule the named place is on the seller's side (e.g. port of loading)." : "Under this rule the named place is on the buyer's side (e.g. port of discharge).",
    destinationCountry: 'Destination country',
    required: 'Enter the place of loading, the destination and the Incoterms® named place.',
    buyerChanged: (country: string) => `Buyer changed (${country}). Review the destination and the delivery terms.`,
    seaOnly: (inc: string) => `${inc} is for sea transport only. For other modes use FCA, CPT, CIP, DAP or DDP.`,
    ibanMissing: 'No IBAN in the company settings; payment details will be blank on documents.',
    creating: 'Creating…',
    createFailed: (msg: string) => `The shipment could not be created: ${msg}`,
    numberingLocal: 'Numbers were checked against the data in this browser; server-side numbering is not active yet.',
    savedLocally: 'The shipment was created on screen but could not be saved; use "Retry" in the top bar.',
    noCustomers: 'Add a customer first.',
    noProducts: 'Add a product first.',
    carrier: 'Carrier / agent (optional)',
    eta: 'Estimated arrival date',
  },
  dashboard2: {
    upcomingSub: (overdue: number, done: number) => `${overdue} overdue · ${done} completed`,
    portfolioHint: 'Loaded quantities where entered, otherwise ordered; shown per currency.',
    mixed: 'Mixed currencies',
    overdueBadge: 'Loading overdue',
  },
  settings2: {
    tolerance: 'VGM / weighbridge warning threshold (%)',
    toleranceHint: "Your company's own operational warning, not a legal tolerance.",
  },
  editor2: {
    reasonStatus: 'Approval status changed',
    reasonRevision: 'New revision created',
    reasonReset: 'Document reset',
  },
};

const fr: AppQualityMessages = {
  issues: {
    title: 'Contrôles',
    blocking: 'Bloquant',
    warning: 'Avertissement',
    MIXED_CURRENCY: (c: string) =>
      `Les lignes sont en devises différentes (${c}). Aucun total unique n'est calculé sans conversion${NB}; une expédition doit utiliser une seule devise.`,
    CURRENCY_NOT_SHIPMENT: (item: string, ship: string) => `Les lignes sont en ${item}, mais la devise de l'expédition est ${ship}.`,
    PROVISIONAL_QTY: "Chargement réel pas encore saisi. Ce document affiche les quantités commandées à titre PROVISOIRE et ne peut pas être validé.",
    INVALID_NUMBER: (line: number) => `Ligne ${line}${NB}: quantité ou prix invalide.`,
    NO_LINES: "Le document ne comporte aucune ligne.",
    NAMED_PLACE_MISSING: (from: 'loading' | 'discharge') =>
      `Aucun lieu convenu Incoterms® saisi${NB}; repris du ${from === 'loading' ? 'lieu de chargement' : 'lieu de destination'}. Vérifiez-le dans le dossier.`,
    INCOTERM_MODE: (inc: string, mode: string) => `${inc} est réservé au transport maritime et fluvial${NB}; mode choisi${NB}: ${mode}.`,
    BANK_MISSING: "Coordonnées bancaires de l'entreprise (banque, IBAN) manquantes${NB}; les informations de paiement restent vides sur le document.".replace('${NB}', NB),
    NET_EXCEEDS_GROSS: (line: number) => `Ligne ${line}${NB}: poids net unitaire supérieur au poids brut.`,
    INVALID_WEIGHT: (line: number) => `Ligne ${line}${NB}: poids ou quantité invalide.`,
    VGM_BELOW_CARGO: (vgm: string, cargo: string) =>
      `La VGM déclarée (${vgm} kg) ne peut pas être inférieure au poids brut de la marchandise (${cargo} kg)${NB}; la VGM inclut la tare du conteneur.`,
    VGM_DIFFERS: (vgm: string, expected: string, pct: string, tol: string) =>
      `La VGM déclarée (${vgm} kg) s'écarte de ${pct}${NB}% du poids brut marchandise + tare du conteneur (${expected} kg). Seuil d'alerte de l'entreprise${NB}: ${tol}${NB}%.`,
    MEASURED_DIFFERS: (measured: string, calc: string, pct: string, tol: string) =>
      `Le poids brut pesé au pont-bascule (${measured} kg) s'écarte de ${pct}${NB}% du poids calculé à partir des fiches produits (${calc} kg). Seuil d'alerte de l'entreprise${NB}: ${tol}${NB}%.`,
  },
  modes: { Sea: 'Maritime', Air: 'Aérien', Road: 'Routier', Rail: 'Ferroviaire' },
  places: {
    loading: { Sea: 'Port de chargement', Air: 'Aéroport de départ', Road: 'Lieu de chargement', Rail: 'Gare de chargement' },
    discharge: { Sea: 'Port de déchargement', Air: 'Aéroport de destination', Road: 'Lieu de livraison', Rail: 'Gare de destination' },
  },
  notice: {
    demo: "Démo${NB}: une entreprise et des expéditions fictives. Vos modifications restent dans cet onglet du navigateur et ne sont enregistrées nulle part.".replace('${NB}', NB),
    loading: 'Chargement des données de votre entreprise…',
    loadError: "Vos données n'ont pas pu être chargées. Rien n'est affiché, afin que rien ne puisse être pris pour vos données.",
    retry: 'Réessayer',
  },
  save: {
    saving: 'Enregistrement…',
    saved: 'Enregistré',
    failed: (n: number) => `Non enregistré (${n})`,
    failedDetail: "Vos modifications restent à l'écran mais n'ont pas pu être écrites dans la base de données.",
    retry: 'Réessayer',
    demo: 'Démo · non enregistré',
    savedDemo: "Démo${NB}: la modification est appliquée dans cet onglet uniquement et n'est pas enregistrée.".replace('${NB}', NB),
    savedOk: 'Enregistré.',
    savedFailed: "Non enregistré. Vos modifications restent à l'écran${NB}; utilisez «${NB}Réessayer${NB}» dans la barre du haut.".replace(/\$\{NB\}/g, NB),
  },
  approval: {
    basisOrdered: 'Ce document utilise les quantités COMMANDÉES.',
    basisLoaded: 'Ce document utilise les quantités RÉELLEMENT CHARGÉES.',
    frozen: (rev: number, date: string) => `Version validée affichée (Rév. ${rev}, ${date}). Son contenu a été figé à la validation.`,
    changed: (areas: string) =>
      `L'expédition a changé après la validation (${areas}). Le document conserve son contenu validé${NB}; créez une révision pour émettre les nouveaux chiffres.`,
    areas: { lines: 'lignes', totals: 'montants', buyer: 'acheteur', terms: 'conditions de livraison/paiement', bank: 'coordonnées bancaires', weights: 'poids' },
    createRevision: 'Créer une révision',
    revisionConfirm: `La version validée sera conservée dans l'historique et le document repassera en brouillon sous une nouvelle révision. Continuer${NB}?`,
    blocked: `Le document ne peut pas être validé. Corrigez d'abord${NB}:`,
    approveNote: "Le contenu d'un document validé est figé ; toute modification ultérieure nécessite une révision.".replace(' ;', `${NB};`),
    history: (n: number) => `Versions validées précédentes${NB}: ${n}`,
    historyItem: (rev: number, approved: string, superseded: string) => `Rév. ${rev} · validée le ${approved} · remplacée le ${superseded}`,
    legacyApproved: 'Validé avant le suivi des versions ; son contenu n’est pas figé. Une nouvelle validation le figera.'.replace(' ;', `${NB};`),
  },
  weights: {
    title: 'Poids et VGM',
    lead: "Le poids brut de la marchandise (produits avec emballage, palettes et calage) figure sur la liste de colisage. La VGM est la masse brute vérifiée déclarée du conteneur empoté (poids brut marchandise + tare du conteneur) et n'est jamais répartie sur les lignes produits. ExPorta ne pèse ni ne certifie rien${NB}: il contrôle la cohérence des chiffres déclarés.".replace('${NB}', NB),
    calcCargo: 'Poids brut calculé (fiches produits)',
    measuredCargo: 'Poids brut pesé (pont-bascule, conteneur exclu)',
    tare: 'Tare du conteneur',
    vgm: 'VGM déclarée (conteneur inclus)',
    expectedVgm: 'VGM attendue (poids brut + tare)',
    net: 'Poids net total',
    tolNote: (pct: string) => `Le seuil d'alerte est un réglage propre à votre entreprise (${pct}${NB}%), et non une tolérance réglementaire.`,
    save: 'Enregistrer les poids',
    invalid: 'Les poids doivent être nuls ou positifs.',
    colLoaded: 'Qté chargée',
    colNet: 'Net (kg)',
    colGross: 'Brut marchandise (kg)',
    tableTitle: 'Détail des poids de la liste de colisage',
    tableLead: 'Les poids bruts des lignes proviennent des fiches produits ; la pesée et la VGM ne sont pas réparties sur les lignes.'.replace(' ;', `${NB};`),
  },
  wizard: {
    qty: 'Quantité commandée',
    currency: "Devise de l'expédition",
    currencyMismatch: (c: string) =>
      `Les produits choisis sont en devises différentes (${c}). Une expédition utilise une seule devise${NB}; choisissez des produits dans la même devise.`,
    qtyRequired: 'Saisissez une quantité commandée supérieure à zéro pour chaque produit choisi.',
    mode: 'Mode de transport',
    namedPlace: 'Lieu convenu Incoterms® *',
    namedPlaceHint: (fromOrigin: boolean): string =>
      fromOrigin
        ? 'Avec cette règle, le lieu convenu est côté vendeur (ex. port de chargement).'
        : "Avec cette règle, le lieu convenu est côté acheteur (ex. port de déchargement).",
    destinationCountry: 'Pays de destination',
    required: 'Saisissez le lieu de chargement, la destination et le lieu convenu Incoterms®.',
    buyerChanged: (country: string) => `Acheteur modifié (${country}). Vérifiez la destination et les conditions de livraison.`,
    seaOnly: (inc: string) => `${inc} est réservé au transport maritime. Pour les autres modes, utilisez FCA, CPT, CIP, DAP ou DDP.`,
    ibanMissing: "Aucun IBAN dans les paramètres de l'entreprise ; les informations de paiement seront vides sur les documents.".replace(' ;', `${NB};`),
    creating: 'Création…',
    createFailed: (msg: string) => `L'expédition n'a pas pu être créée${NB}: ${msg}`,
    numberingLocal: "Les numéros ont été vérifiés par rapport aux données de ce navigateur ; la numérotation côté serveur n'est pas encore active.".replace(' ;', `${NB};`),
    savedLocally: "L'expédition a été créée à l'écran mais n'a pas pu être enregistrée ; utilisez « Réessayer » dans la barre du haut.".replace(' ;', `${NB};`),
    noCustomers: "Ajoutez d'abord un client.",
    noProducts: "Ajoutez d'abord un produit.",
    carrier: 'Transporteur / agent (facultatif)',
    eta: "Date d'arrivée prévue",
  },
  dashboard2: {
    upcomingSub: (overdue: number, done: number) => `${overdue} en retard · ${done} terminé(s)`,
    portfolioHint: 'Quantités chargées si saisies, sinon commandées ; par devise.'.replace(' ;', `${NB};`),
    mixed: 'Devises multiples',
    overdueBadge: 'Chargement en retard',
  },
  settings2: {
    tolerance: "Seuil d'alerte VGM / pesée (%)",
    toleranceHint: "Alerte opérationnelle propre à votre entreprise, et non une tolérance réglementaire.",
  },
  editor2: {
    reasonStatus: 'Statut de validation modifié',
    reasonRevision: 'Nouvelle révision créée',
    reasonReset: 'Document réinitialisé',
  },
};

export const appQuality: Record<Lang, AppQualityMessages> = { tr, en, fr };
