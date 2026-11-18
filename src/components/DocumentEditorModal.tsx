import React, { useState, useRef } from 'react';
import { MasterShipment, DocType, DocTemplate, CompanySettings, DocStatus, ShipmentItem } from '../types/exporta';
import { useLang, LANGS, LANG_LABEL, Lang } from '../i18n';
import { messages } from '../i18n/messages';
import { resolveDocContent, DocIssue } from '../lib/commerce';
import type { SaveOutcome, StatusChangeResult } from '../lib/saveTypes';
import { IssueList } from './IssueList';
import { outcomeMessage } from './AppNotice';
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
  Globe,
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
  onUpdateLang?: (shipmentId: string, docType: DocType, lang: Lang) => void;
  onUpdateStatus: (shipmentId: string, docType: DocType, status: DocStatus) => Promise<StatusChangeResult>;
  onReviseDocument?: (shipmentId: string, docType: DocType) => Promise<SaveOutcome>;
  onUpdateShipmentItems?: (shipmentId: string, items: ShipmentItem[]) => void;
  onUpdateDocNotes?: (shipmentId: string, docType: DocType, notes: string) => Promise<SaveOutcome> | void;
  onResetDocument?: (shipmentId: string, docType: DocType) => void;
}

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  isOpen,
  onClose,
  shipment,
  docType,
  companySettings,
  onUpdateTemplate,
  onUpdateLang,
  onUpdateStatus,
  onReviseDocument,
  onUpdateShipmentItems,
  onUpdateDocNotes,
  onResetDocument,
}) => {
  const { t, lang: uiLang } = useLang();
  const e = t.editor;
  const DOC_TYPE_NAMES = t.docNames;
  const docInfo = shipment.documents[docType];
  // The document's own language, independent of the interface (TR, EN or FR).
  const [docLang, setDocLang] = useState<Lang>(docInfo.lang ?? uiLang);
  const [currentTemplate, setCurrentTemplate] = useState<DocTemplate>(docInfo.template || 'classic');
  // Status always reflects the saved document: approval can be refused, and the editor must not pretend otherwise.
  const currentStatus: DocStatus = docInfo.status || 'taslak';
  const [blockedIssues, setBlockedIssues] = useState<DocIssue[] | null>(null);
  const [resultNote, setResultNote] = useState<{ ok: boolean; text: string } | null>(null);
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

  // Template, language, status and quantities are applied (and saved) as soon as
  // they change. Only the note text is a draft, so it is the only thing that
  // can be lost by closing; the warning appears only then.
  const dirty = notesText !== (docInfo.notes || '');
  const setDirty = (_v: boolean) => undefined;
  const markDirty = () => undefined;

  const confirmClose = () => {
    if (
      dirty &&
      !window.confirm(e.unsaved)
    ) {
      return;
    }
    onClose();
  };

  useEscapeClose(isOpen, confirmClose);

  if (!isOpen) return null;

  const report = (outcome: SaveOutcome | void) => {
    if (!outcome) return;
    setResultNote({ ok: outcome !== 'failed', text: outcomeMessage(t, outcome) });
  };

  const handleSaveNotes = async () => {
    const outcome = await onUpdateDocNotes?.(shipment.id, docType, notesText);
    report(outcome);
    if (outcome !== 'failed') {
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    }
  };

  const handleDeleteNotes = async () => {
    setNotesText('');
    report(await onUpdateDocNotes?.(shipment.id, docType, ''));
  };

  const handleTemplateChange = (tpl: DocTemplate) => {
    setCurrentTemplate(tpl);
    onUpdateTemplate(shipment.id, docType, tpl);
    markDirty();
  };

  const handleLangChange = (l: Lang) => {
    setDocLang(l);
    onUpdateLang?.(shipment.id, docType, l);
    markDirty();
  };

  const handleStatusChange = async (st: DocStatus) => {
    setBlockedIssues(null);
    const r = await onUpdateStatus(shipment.id, docType, st);
    if (r.ok === false) setBlockedIssues(r.issues);
  };

  const handleCreateRevision = async () => {
    if (!onReviseDocument || !window.confirm(t.approval.revisionConfirm)) return;
    report(await onReviseDocument(shipment.id, docType));
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
      // A blank line: no invented code, price, quantity or weight.
      productCode: '',
      productName: e.newItem,
      hsCode: '',
      unit: 'Adet',
      orderedQty: 0,
      actualLoadedQty: shipment.actualLoadingEntered ? 0 : undefined,
      unitPrice: 0,
      currency: shipment.payment.currency || 'EUR',
      netWeightKg: 0,
      grossWeightKg: 0,
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
  // Everything except the note is already applied; saving writes the note and reports the outcome.
  const handleSaveAll = async () => {
    const outcome = await onUpdateDocNotes?.(shipment.id, docType, notesText);
    report(outcome);
    if (outcome !== 'failed') {
      setDocSaveSuccess(true);
      setTimeout(() => setDocSaveSuccess(false), 3000);
    }
  };

  // Reset entire document to clean default state
  const handleResetAll = () => {
    if (window.confirm(e.resetConfirm)) {
      setNotesText('');
      setCurrentTemplate(companySettings.defaultTemplates?.[docType] ?? 'classic');
      setBlockedIssues(null);
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
      alert(e.pdfFailed);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!documentRef.current) return;
    const opened = printElement(documentRef.current);
    if (!opened) {
      alert(e.printFailed);
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

  // The preview shows the draft note and the document's own settings over the saved shipment.
  const previewShipment = {
    ...shipment,
    items,
    documents: {
      ...shipment.documents,
      [docType]: { ...docInfo, notes: notesText, template: currentTemplate, status: currentStatus, lang: docLang },
    },
  };
  const resolved = resolveDocContent(previewShipment, docType, companySettings);

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
              <p className="text-xs text-slate-400">{e.shipment}: {shipment.shipmentCode} ({shipment.customer.companyName})</p>
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
              <span>{showImages ? e.imagesOn : e.imagesOff}</span>
            </button>

            <button
              onClick={() => setIsImagePanelOpen(!isImagePanelOpen)}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded flex items-center space-x-1"
            >
              <span>{e.editImages}</span>
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
            <span>{e.qtyItems}</span>
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
            <span>{notesText.trim() ? e.notesEdit : e.notesAdd}</span>
            {notesText.trim() && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
            {isNotesPanelOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          {/* Template Switcher Buttons */}
          <div className="flex items-center space-x-3 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-semibold px-2 flex items-center space-x-1">
              <Layout className="w-3.5 h-3.5" />
              <span>{e.template}</span>
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

          {/* Document language: each document can be issued in TR, EN or FR */}
          <div
            role="group"
            aria-label={e.docLangHint}
            title={e.docLangHint}
            className="flex items-center space-x-1 bg-slate-800 p-1.5 rounded-lg border border-slate-700"
          >
            <span className="text-xs text-slate-400 font-semibold px-2 flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5" />
              <span>{e.docLang}</span>
            </span>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                title={LANG_LABEL[l]}
                aria-pressed={docLang === l}
                onClick={() => handleLangChange(l)}
                className={`px-2.5 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                  docLang === l ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Save & Reset Global Buttons */}
          <div className="flex items-center space-x-2 border-l border-slate-700 pl-3">
            <button
              onClick={handleSaveAll}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-xs transition-colors"
              title={e.saveTitle}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{e.save}</span>
            </button>

            <button
              onClick={handleResetAll}
              className="py-1.5 px-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 font-semibold text-xs rounded-lg border border-red-800 flex items-center space-x-1 transition-colors"
              title={e.resetTitle}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>{e.reset}</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyNo}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center space-x-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? e.copied : e.copyNo}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-1.5 px-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{e.generating}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{e.downloadPdf}</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 flex items-center space-x-1 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{e.print}</span>
            </button>
          </div>
        </div>

        {/* Toast Notification Banners */}
        {docSaveSuccess && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-inner animate-pulse">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{e.savedBanner(DOC_TYPE_NAMES[docType])}</span>
            </div>
            <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded">{e.savedTag}</span>
          </div>
        )}

        {docResetSuccess && (
          <div className="bg-amber-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>{e.resetBanner}</span>
            </div>
            <span className="text-[10px] bg-amber-800/60 px-2 py-0.5 rounded">{e.resetTag}</span>
          </div>
        )}

        {/* Expandable Quantity & Item Management Panel */}
        {isQtyPanelOpen && (
          <div className="bg-slate-800 border-b border-slate-700 p-4 text-white text-xs space-y-3 shrink-0 max-h-[340px] overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-teal-400" />
                <h4 className="font-bold text-teal-300">
                  {e.qtyTitle(DOC_TYPE_NAMES[docType])}
                </h4>
                {itemsSavedSuccess && (
                  <span className="bg-emerald-900/90 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-bounce">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{e.synced}</span>
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSyncAllProformaToActual}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs"
                  title={e.syncTitle}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{e.syncAll}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-lg border border-slate-600 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{e.addItem}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              {e.qtyLead}
            </p>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-300 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">{e.colItem}</th>
                    <th className="py-2 px-3 text-center">{e.colOrdered}</th>
                    <th className="py-2 px-3 text-center">{e.colActual}</th>
                    <th className="py-2 px-3 text-right">{e.colPrice(shipment.payment.currency || 'EUR')}</th>
                    <th className="py-2 px-3">{e.colNote}</th>
                    <th className="py-2 px-3 text-center">{e.colAction}</th>
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
                                {e.differs}
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
                            placeholder={e.notePlaceholder}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemField(item.id, 'actualLoadedQty', item.orderedQty)}
                              className="px-2 py-1 bg-slate-800 hover:bg-teal-900/50 hover:text-teal-200 text-slate-300 text-[10px] font-semibold rounded border border-slate-700"
                              title={e.matchTitle}
                            >
                              {e.match}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded border border-red-800"
                              title={e.deleteItem}
                              aria-label={e.deleteItem}
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
                <span>{e.imagesTitle}</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                {e.imagesLead}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-900/90 p-3 rounded-lg border border-slate-700 flex items-center space-x-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 object-cover rounded border border-slate-600 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] shrink-0">
                      {e.noImage}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-semibold text-slate-200 truncate">{item.productName}</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={item.imageUrl || ''}
                        onChange={(e) => handleItemImageChange(item.id, e.target.value)}
                        placeholder={e.imagePlaceholder}
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
                      {e.pickSample}
                    </button>
                    {item.imageUrl && (
                      <button
                        onClick={() => handleItemImageChange(item.id, '')}
                        className="px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-300 text-[10px] rounded border border-red-800"
                      >
                        {e.removeImage}
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
                  {e.notesTitle(DOC_TYPE_NAMES[docType])}
                </h4>
                {notesSavedSuccess && (
                  <span className="bg-emerald-900/90 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-semibold animate-bounce">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{e.notesSaved}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {e.notesLead}
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={notesText}
                onChange={(e) => {
                  setNotesText(e.target.value);
                  markDirty();
                }}
                placeholder={e.notesPlaceholder}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
              />

              <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                {/* Presets */}
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{e.presets}</span>
                  </span>
                  {(messages[docLang].presets[docType] || []).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNotesText(preset);
                        markDirty();
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-amber-900/50 hover:text-amber-200 text-slate-300 text-[10px] rounded border border-slate-600 transition-colors"
                    >
                      {e.preset(idx + 1)}
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
                      <span>{e.deleteNote}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{e.saveNote}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-slate-700">{e.status}</span>
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value as DocStatus)}
              className="border border-slate-300 rounded px-2 py-1 font-bold bg-white text-xs"
            >
              <option value="taslak">{t.docStatus.taslak}</option>
              <option value="hazir">{t.docStatus.hazir}</option>
              <option value="onaylandi">{t.docStatus.onaylandi}</option>
              <option value="eksik">{t.docStatus.eksik}</option>
            </select>
          </div>

          <div className="text-slate-500 italic text-[11px]">
            {e.footnote}
          </div>
        </div>

        {/* Live A4 Preview Container. The checks above the page are not part of the PDF. */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/80 flex flex-col items-center gap-4">
          <section aria-label={t.issues.title} className="w-full max-w-[800px] space-y-2 text-xs">
            <p className="font-semibold text-slate-700">{resolved.content.basis === 'ordered' ? t.approval.basisOrdered : t.approval.basisLoaded}</p>
            {resolved.frozen && docInfo.approved && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900 space-y-2">
                <p>{t.approval.frozen(docInfo.approved.revision, docInfo.approved.approvedAt)}</p>
                {resolved.changes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-900">
                    <span className="flex-1">{t.approval.changed(resolved.changes.map((a) => t.approval.areas[a]).join(', '))}</span>
                    {onReviseDocument && (
                      <button type="button" onClick={handleCreateRevision} className="rounded bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-500">
                        {t.approval.createRevision}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {currentStatus === 'onaylandi' && !docInfo.approved && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">{t.approval.legacyApproved}</p>
            )}
            {currentStatus !== 'onaylandi' && <p className="text-slate-600">{t.approval.approveNote}</p>}
            {blockedIssues && (
              <div role="alert" className="space-y-1.5">
                <p className="font-bold text-red-800">{t.approval.blocked}</p>
                <IssueList issues={blockedIssues} compact />
              </div>
            )}
            {!blockedIssues && <IssueList issues={resolved.content.issues} compact />}
            {(docInfo.history?.length ?? 0) > 0 && (
              <details className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">
                <summary className="cursor-pointer font-semibold">{t.approval.history(docInfo.history!.length)}</summary>
                <ul className="mt-1 space-y-0.5">
                  {docInfo.history!.map((h) => (
                    <li key={`${h.revision}-${h.approvedAt}`}>
                      {t.approval.historyItem(h.revision, h.approvedAt, h.supersededAt ?? '—')}
                      {h.supersededReason ? ` · ${h.supersededReason}` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {resultNote && (
              <p role="status" className={`font-semibold ${resultNote.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {resultNote.text}
              </p>
            )}
          </section>

          <div ref={documentRef} className="w-full max-w-[800px] bg-white shadow-lg rounded-sm">
            <DocumentRenderer
              shipment={previewShipment}
              docType={docType}
              template={currentTemplate}
              companySettings={companySettings}
              showImagesOverride={showImages}
              lang={docLang}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
