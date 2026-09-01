import React, { useState, useRef } from 'react';
import { MasterShipment, DocType, DocTemplate, CompanySettings, DocStatus, ShipmentItem } from '../types/exporta';
import { DOC_TYPE_NAMES } from '../lib/numbering';
import { DocumentRenderer } from './DocumentRenderer';
import { downloadPdfFromElement, printElement } from '../lib/pdfGenerator';
import { ModalCloseButton } from './ModalCloseButton';
import { useEscapeClose } from '../lib/useEscapeClose';
import {
  Layout,
  Printer,
  Download,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  Image,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Loader2,
  StickyNote,
  Save,
  Trash2,
  Edit3,
  Sparkles,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: MasterShipment;
  docType: DocType;
  companySettings: CompanySettings;
  onUpdateTemplate: (shipmentId: string, docType: DocType, template: DocTemplate) => void;
  onUpdateStatus: (shipmentId: string, docType: DocType, status: DocStatus) => void;
  onUpdateShipmentItems?: (shipmentId: string, items: ShipmentItem[]) => void;
  onUpdateDocNotes?: (shipmentId: string, docType: DocType, notes: string) => void;
  onResetDocument?: (shipmentId: string, docType: DocType) => void;
}

const DEFAULT_PRESET_NOTES: Record<DocType, string[]> = {
  quotation: [
    '1. İşbu teklif verildiği tarihten itibaren 30 takvim günü süreyle geçerlidir.\n2. Fiyatlarımıza ihracat ambalajlama ve fabrikamız teslimi (EXW) dahildir.\n3. Ödeme %30 siparişle peşin, kalan %70 yükleme öncesi banka havalesi ile yapılacaktır.',
    '1. Teslimat süresi sipariş onayından ve avans ödemesinden itibaren 14 iş günüdür.\n2. Akreditifli ödemelerde akreditif açılış masrafları alıcıya aittir.',
  ],
  proforma: [
    '1. İşbu Proforma Fatura sipariş teyididir. Lütfen kaşe imza ile onaylayarak tarafımıza iletiniz.\n2. Ödeme %30 peşin transfer, %70 yükleme öncesi CAD / Akreditif şeklindedir.\n3. Alıcı banka masrafları ve muhabir banka kesintileri alıcıya aittir.',
    '1. Fatura bedeli belirtilen IBAN hesabına EUR cinsinden yatırılacaktır.\n2. Sevkiyat akreditif şartlarında belirtilen son yükleme tarihine kadar gerçekleştirilecektir.',
  ],
  sales_order: [
    '1. Üretim ve paketleme emirleri onaylanmış teknik çizimlere göre başlatılacaktır.\n2. Ahşap palet ambalajlar ISPM-15 karantina standartlarına uygundur.',
    '1. Kalite kontrol ve test sertifikaları sevkiyat evrakları ile birlikte teslim edilecektir.',
  ],
  actual_loading: [
    '1. Yükleme işlemi fabrikamız alanında gümrük kantar fişi KTR-2026 gözetiminde yapılmıştır.\n2. Tüm kaplar ve koliler numaralandırılarak mühür numarası MS-SEAL ile kapatılmıştır.',
    '1. Fiziki yükleme sayımı yapılmış, teslimat raporuna işlenmiştir.',
  ],
  commercial_invoice: [
    '1. İşbu faturada tanımlanan mallar Türkiye Cumhuriyeti menşelidir ve gümrük beyanına uygundur.\n2. Garanti süresi teslim tarihinden itibaren 24 aydır.\n3. Fatura tutarı sözleşmeye ve gümrük mevzuatına uygundur.',
    '1. Goods are of Turkish origin and covered by A.TR / EUR.1 movement certificate.\n2. Payment terms as agreed under LC conditions.',
  ],
  packing_list: [
    '1. Tüm paletler streç film ve çelik çember ile ambalajlanmıştır.\n2. Ahşap ambalaj malzemeleri ISPM-15 standardına uygundur.\n3. Net ve brüt ağırlıklar kantar onaylıdır.',
    '1. Packaged on Euro pallets (120x80 cm) with waterproof covering.\n2. Container sealing: MSC-SEAL-004921.',
  ],
  shipping_instruction: [
    '1. Konşimento (B/L) talimatı: Consignee kısmına alıcı firma adı ve adresi yazılmalıdır.\n2. Notify Party: Acente ve forwarder iletişim bilgileri eklenmelidir.\n3. Freight Prepaid / Collect bilgisi kontrol edilmelidir.',
    '1. VGM Beyanı SOLAS Yöntem 1 uyarınca kantar fişi ile acenteye iletilmiştir.',
  ],
};

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  isOpen,
  onClose,
  shipment,
  docType,
  companySettings,
  onUpdateTemplate,
  onUpdateStatus,
  onUpdateShipmentItems,
  onUpdateDocNotes,
  onResetDocument,
}) => {
  const docInfo = shipment.documents[docType];
  const [currentTemplate, setCurrentTemplate] = useState<DocTemplate>(docInfo.template || 'classic');
  const [currentStatus, setCurrentStatus] = useState<DocStatus>(docInfo.status || 'hazir');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Notes state
  const [notesText, setNotesText] = useState<string>(docInfo.notes || '');
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState<boolean>(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState<boolean>(false);

  // Quantity & Items state
  const [isQtyPanelOpen, setIsQtyPanelOpen] = useState<boolean>(false);
  const [itemsSavedSuccess, setItemsSavedSuccess] = useState<boolean>(false);
  const [docSaveSuccess, setDocSaveSuccess] = useState<boolean>(false);
  const [docResetSuccess, setDocResetSuccess] = useState<boolean>(false);

  const documentRef = useRef<HTMLDivElement>(null);

  // Default showImages to true for quotation and proforma
  const isQuotationOrProforma = docType === 'quotation' || docType === 'proforma';
  const [showImages, setShowImages] = useState<boolean>(docInfo.showImages ?? isQuotationOrProforma);
  const [isImagePanelOpen, setIsImagePanelOpen] = useState<boolean>(false);

  // Local state for shipment items to allow editing in real-time
  const [items, setItems] = useState<ShipmentItem[]>(shipment.items);

  // Minimal dirty flag: flipped on by any editable control, cleared by "Kaydet".
  // Note-only changes go through their own save button, so they clear it too.
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);

  const confirmClose = () => {
    if (
      dirty &&
      !window.confirm('Kaydedilmemiş değişiklikler var, çıkmak istediğinize emin misiniz?')
    ) {
      return;
    }
    onClose();
  };

  useEscapeClose(isOpen, confirmClose);

  if (!isOpen) return null;

  const handleSaveNotes = () => {
    if (onUpdateDocNotes) {
      onUpdateDocNotes(shipment.id, docType, notesText);
    }
    setDirty(false);
    setNotesSavedSuccess(true);
    setTimeout(() => setNotesSavedSuccess(false), 2000);
  };

  const handleDeleteNotes = () => {
    setNotesText('');
    if (onUpdateDocNotes) {
      onUpdateDocNotes(shipment.id, docType, '');
    }
    setDirty(false);
    setNotesSavedSuccess(true);
    setTimeout(() => setNotesSavedSuccess(false), 2000);
  };

  const handleTemplateChange = (tpl: DocTemplate) => {
    setCurrentTemplate(tpl);
    onUpdateTemplate(shipment.id, docType, tpl);
    markDirty();
  };

  const handleStatusChange = (st: DocStatus) => {
    setCurrentStatus(st);
    onUpdateStatus(shipment.id, docType, st);
    markDirty();
  };

  // Sync all proforma quantities to actual loading quantities
  const handleSyncAllProformaToActual = () => {
    const synced = items.map((it) => ({
      ...it,
      actualLoadedQty: it.orderedQty,
    }));
    setItems(synced);
    if (onUpdateShipmentItems) {
      onUpdateShipmentItems(shipment.id, synced);
    }
    markDirty();
    setItemsSavedSuccess(true);
    setTimeout(() => setItemsSavedSuccess(false), 2000);
  };

  // Update item numeric or text fields
  const handleUpdateItemField = (itemId: string, field: keyof ShipmentItem, value: any) => {
    const updated = items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it));
    setItems(updated);
    if (onUpdateShipmentItems) {
      onUpdateShipmentItems(shipment.id, updated);
    }
    markDirty();
  };

  // Add new product item row
  const handleAddItem = () => {
    const newItem: ShipmentItem = {
      id: `item-${Date.now()}`,
      productId: `prod-${Date.now()}`,
      productCode: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      productName: 'Yeni İhraç Kalemi',
      hsCode: '8481.80.00.00',
      unit: 'Pcs',
      orderedQty: 100,
      actualLoadedQty: 100,
      unitPrice: 25.0,
      currency: shipment.payment.currency || 'EUR',
      netWeightKg: 2.5,
      grossWeightKg: 2.8,
    };
    const updated = [...items, newItem];
    setItems(updated);
    if (onUpdateShipmentItems) {
      onUpdateShipmentItems(shipment.id, updated);
    }
    markDirty();
  };

  // Delete product item row
  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((it) => it.id !== itemId);
    setItems(updated);
    if (onUpdateShipmentItems) {
      onUpdateShipmentItems(shipment.id, updated);
    }
    markDirty();
  };

  // Save all document settings at once
  const handleSaveAll = () => {
    if (onUpdateDocNotes) {
      onUpdateDocNotes(shipment.id, docType, notesText);
    }
    onUpdateTemplate(shipment.id, docType, currentTemplate);
    onUpdateStatus(shipment.id, docType, currentStatus);
    if (onUpdateShipmentItems) {
      onUpdateShipmentItems(shipment.id, items);
    }
    setDirty(false);
    setDocSaveSuccess(true);
    setTimeout(() => setDocSaveSuccess(false), 3000);
  };

  // Reset entire document to clean default state
  const handleResetAll = () => {
    if (window.confirm('Bu belgenin özel notlarını, şablonunu ve ayarlarını sıfırlamak istediğinize emin misiniz?')) {
      setNotesText('');
      setCurrentTemplate('classic');
      setCurrentStatus('taslak');
      setItems(shipment.items);
      if (onResetDocument) {
        onResetDocument(shipment.id, docType);
      }
      setDirty(false);
      setDocResetSuccess(true);
      setTimeout(() => setDocResetSuccess(false), 3000);
    }
  };

  const handleItemImageChange = (itemId: string, imageUrl: string) => {
    const updated = items.map((it) => (it.id === itemId ? { ...it, imageUrl } : it));
    setItems(updated);
    if (onUpdateShipmentItems) {
      onUpdateShipmentItems(shipment.id, updated);
    }
    markDirty();
  };

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const fileName = `${docInfo.docNumber}_${shipment.customer.companyName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await downloadPdfFromElement(documentRef.current, fileName);
    } catch (e) {
      console.error(e);
      alert('PDF oluşturulamadı. Lütfen tekrar deneyin; sorun sürerse "Yazdır" ile tarayıcıdan PDF alabilirsiniz.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!documentRef.current) return;
    const opened = printElement(documentRef.current);
    if (!opened) {
      alert('Yazdırma penceresi açılamadı. Tarayıcınızın açılır pencere (pop-up) engelleyicisini bu site için kapatın.');
    }
  };

  const handleCopyNo = () => {
    navigator.clipboard.writeText(docInfo.docNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sample image URLs to quickly pick from
  const SAMPLE_IMAGES = [
    { label: 'Pano Kabini', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80' },
    { label: 'Vana Seti', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=300&auto=format&fit=crop&q=80' },
    { label: 'Fren Diski', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&auto=format&fit=crop&q=80' },
    { label: 'CNC Parça', url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&auto=format&fit=crop&q=80' },
    { label: 'Hidrolik Rakor', url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=300&auto=format&fit=crop&q=80' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden my-auto">
        <ModalCloseButton onClose={confirmClose} />
        {/* Top Control Bar — pr-14 keeps the wrapping toolbar clear of the fixed close button */}
        <div className="px-6 py-4 pr-14 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>{DOC_TYPE_NAMES[docType]}</span>
                <span className="font-mono text-xs text-teal-400 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-700">
                  {docInfo.docNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Sevkiyat: {shipment.shipmentCode} ({shipment.customer.companyName})</p>
            </div>
          </div>

          {/* Image toggle & settings for Quotation & Proforma */}
          <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                setShowImages(!showImages);
                markDirty();
              }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center space-x-1.5 ${
                showImages ? 'bg-teal-500 text-slate-950 shadow-xs' : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>{showImages ? 'Görsel Alanı: AÇIK' : 'Görsel Alanı: KAPALI'}</span>
            </button>

            <button
              onClick={() => setIsImagePanelOpen(!isImagePanelOpen)}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded flex items-center space-x-1"
            >
              <span>+ Görselleri Düzenle</span>
              {isImagePanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quantity & Items Editor Button */}
          <button
            onClick={() => setIsQtyPanelOpen(!isQtyPanelOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              isQtyPanelOpen
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                : 'bg-slate-800 text-teal-300 border-teal-500/50 hover:bg-slate-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Miktar & Kalemler</span>
            {isQtyPanelOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          {/* Document Notes Button */}
          <button
            onClick={() => setIsNotesPanelOpen(!isNotesPanelOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              isNotesPanelOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : notesText.trim()
                ? 'bg-slate-800 text-amber-300 border-amber-500/50 hover:bg-slate-700'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>{notesText.trim() ? 'Notlar (Düzenle / Sil)' : '+ Belge Notu Ekle'}</span>
            {notesText.trim() && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
            {isNotesPanelOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          {/* Template Switcher Buttons */}
          <div className="flex items-center space-x-3 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-semibold px-2 flex items-center space-x-1">
              <Layout className="w-3.5 h-3.5" />
              <span>Şablon:</span>
            </span>
            <button
              onClick={() => handleTemplateChange('classic')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                currentTemplate === 'classic' ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              CLASSIC
            </button>
            <button
              onClick={() => handleTemplateChange('modern')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                currentTemplate === 'modern' ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              MODERN
            </button>
            <button
              onClick={() => handleTemplateChange('compact')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                currentTemplate === 'compact' ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              COMPACT
            </button>
          </div>

          {/* Save & Reset Global Buttons */}
          <div className="flex items-center space-x-2 border-l border-slate-700 pl-3">
            <button
              onClick={handleSaveAll}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-xs transition-colors"
              title="Belge değişikliklerini kaydet"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Kaydet</span>
            </button>

            <button
              onClick={handleResetAll}
              className="py-1.5 px-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 font-semibold text-xs rounded-lg border border-red-800 flex items-center space-x-1 transition-colors"
              title="Belge notlarını ve ayarlarını sıfırla / sil"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Sıfırla / Sil</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyNo}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center space-x-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Numara Kopyala'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-1.5 px-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>PDF Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF İndir</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 flex items-center space-x-1 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
          </div>
        </div>

        {/* Toast Notification Banners */}
        {docSaveSuccess && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-inner animate-pulse">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{DOC_TYPE_NAMES[docType]} belgesi, notları, miktarları ve ayarları başarıyla kaydedildi!</span>
            </div>
            <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded">Kaydedildi</span>
          </div>
        )}

        {docResetSuccess && (
          <div className="bg-amber-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>Belge varsayılan durumuna sıfırlandı. Notlar ve özel ayarlar temizlendi.</span>
            </div>
            <span className="text-[10px] bg-amber-800/60 px-2 py-0.5 rounded">Sıfırlandı</span>
          </div>
        )}

        {/* Expandable Quantity & Item Management Panel */}
        {isQtyPanelOpen && (
          <div className="bg-slate-800 border-b border-slate-700 p-4 text-white text-xs space-y-3 shrink-0 max-h-[340px] overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-teal-400" />
                <h4 className="font-bold text-teal-300">
                  {DOC_TYPE_NAMES[docType]} - Belge Kalem & Miktar Yönetimi
                </h4>
                {itemsSavedSuccess && (
                  <span className="bg-emerald-900/90 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-bounce">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Miktarlar Eşitlendi!</span>
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSyncAllProformaToActual}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs"
                  title="Proforma adetlerini fiili yüklenen adetlere kopyalar"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Proforma Adetlerini Fiili Yüklemeye Eşitle</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-lg border border-slate-600 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Kalem Ekle</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Sevkiyat günü yüklenen fiziki adetler (Actual Loading) proforma sipariş adetlerinden farklı olabilir.
              Aşağıdaki tablodan sipariş ve yükleme adetlerini bağımsız güncelleyebilir veya tek tıkla eşitleyebilirsiniz.
            </p>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-300 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Ürün / Kalem</th>
                    <th className="py-2 px-3 text-center">Proforma / Sipariş (Adet)</th>
                    <th className="py-2 px-3 text-center">Fiili Yüklenen (Actual Loading)</th>
                    <th className="py-2 px-3 text-right">Birim Fiyat ({shipment.payment.currency || 'EUR'})</th>
                    <th className="py-2 px-3">Açıklama / Kalem Notu</th>
                    <th className="py-2 px-3 text-center">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 bg-slate-900/50">
                  {items.map((item) => {
                    const isDiff = item.actualLoadedQty !== undefined && item.actualLoadedQty !== item.orderedQty;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/80">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleUpdateItemField(item.id, 'productName', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-bold text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                          />
                          <div className="font-mono text-[10px] text-teal-400 mt-0.5">{item.productCode} ({item.hsCode})</div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={item.orderedQty}
                            onChange={(e) => handleUpdateItemField(item.id, 'orderedQty', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              value={item.actualLoadedQty ?? item.orderedQty}
                              onChange={(e) => handleUpdateItemField(item.id, 'actualLoadedQty', parseFloat(e.target.value) || 0)}
                              className={`w-20 bg-slate-950 border rounded px-2 py-1 text-center font-mono font-bold focus:outline-none ${
                                isDiff ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-teal-300'
                              }`}
                            />
                            {isDiff && (
                              <span className="text-[9px] font-mono px-1 py-0.5 bg-amber-900/60 text-amber-300 rounded border border-amber-700 shrink-0">
                                Farklı
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemField(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-white focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.customNotes || ''}
                            onChange={(e) => handleUpdateItemField(item.id, 'customNotes', e.target.value)}
                            placeholder="Örn: Özel ambalaj..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemField(item.id, 'actualLoadedQty', item.orderedQty)}
                              className="px-2 py-1 bg-slate-800 hover:bg-teal-900/50 hover:text-teal-200 text-slate-300 text-[10px] font-semibold rounded border border-slate-700"
                              title="Fiili yükleme adetini proforma adeti ile aynı yap"
                            >
                              Eşitle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded border border-red-800"
                              title="Kalemi Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expandable Product Image Management Panel */}
        {isImagePanelOpen && (
          <div className="bg-slate-800 border-b border-slate-700 p-4 text-white text-xs space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-teal-400 flex items-center space-x-2">
                <Image className="w-4 h-4" />
                <span>Ürün Görselleri & Sunum Alanı Ayarları</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Görseller Quotation ve Proforma belgelerinde ürün tablosunda ve görsel sunum alanında görüntülenir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-900/90 p-3 rounded-lg border border-slate-700 flex items-center space-x-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 object-cover rounded border border-slate-600 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] shrink-0">
                      Görsel Yok
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-semibold text-slate-200 truncate">{item.productName}</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={item.imageUrl || ''}
                        onChange={(e) => handleItemImageChange(item.id, e.target.value)}
                        placeholder="Görsel URL yapıştırın..."
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-[11px] text-teal-300 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Sample presets */}
                  <div className="shrink-0 flex flex-col gap-1">
                    <button
                      onClick={() => handleItemImageChange(item.id, SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)].url)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700"
                    >
                      Örnek Seç
                    </button>
                    {item.imageUrl && (
                      <button
                        onClick={() => handleItemImageChange(item.id, '')}
                        className="px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-300 text-[10px] rounded border border-red-800"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Document Notes Management Panel */}
        {isNotesPanelOpen && (
          <div className="bg-slate-800 border-b border-slate-700 p-4 text-white text-xs space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-amber-300">
                  {DOC_TYPE_NAMES[docType]} - Belge Notu Düzenleme & Yönetimi
                </h4>
                {notesSavedSuccess && (
                  <span className="bg-emerald-900/90 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-bounce">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Kaydedildi!</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Notlar belgenin alt kısmında (Notes & Special Remarks) canlı olarak yayınlanır.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={notesText}
                onChange={(e) => {
                  setNotesText(e.target.value);
                  markDirty();
                }}
                placeholder="Bu belgeye özel teslimat şartları, banka açıklamaları veya gümrük notları yazın..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
              />

              <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                {/* Presets */}
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Hazır Şablonlar:</span>
                  </span>
                  {(DEFAULT_PRESET_NOTES[docType] || []).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNotesText(preset);
                        markDirty();
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-amber-900/50 hover:text-amber-200 text-slate-300 text-[10px] rounded border border-slate-600 transition-colors"
                    >
                      Şablon {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Save & Delete Action Buttons */}
                <div className="flex items-center space-x-2">
                  {notesText.trim() && (
                    <button
                      type="button"
                      onClick={handleDeleteNotes}
                      className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-semibold rounded-lg border border-red-800 flex items-center space-x-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Notu Sil</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Notu Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-slate-700">Belge Durumu:</span>
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value as DocStatus)}
              className="border border-slate-300 rounded px-2 py-1 font-bold bg-white text-xs"
            >
              <option value="taslak">Taslak</option>
              <option value="hazir">Hazır</option>
              <option value="onaylandi">Onaylandı</option>
              <option value="eksik">Eksik</option>
            </select>
          </div>

          <div className="text-slate-500 italic text-[11px]">
            * Şablon değişikliği ve görsel ekleme ticari veriyi değiştirmez, sadece sunum ve PDF katmanını günceller.
          </div>
        </div>

        {/* Live A4 Preview Container */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-200/80 flex justify-center">
          <div ref={documentRef} className="w-full max-w-[800px] bg-white shadow-lg rounded-sm">
            <DocumentRenderer
              shipment={{
                ...shipment,
                items,
                documents: {
                  ...shipment.documents,
                  [docType]: {
                    ...docInfo,
                    notes: notesText,
                    template: currentTemplate,
                    status: currentStatus,
                  },
                },
              }}
              docType={docType}
              template={currentTemplate}
              companySettings={companySettings}
              showImagesOverride={showImages}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
