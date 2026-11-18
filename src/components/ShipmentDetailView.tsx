import React, { useState } from 'react';
import { MasterShipment, ShipmentItem, DocType, DocStatus, CompanySettings } from '../types/exporta';
import { useLang } from '../i18n';
import { unitLabel } from '../i18n/units';
import { summariseWeights, DEFAULT_WARNING_TOLERANCE_PCT } from '../lib/weights';
import { shipmentVgmKg } from '../lib/commerce';
import type { SaveOutcome } from '../lib/saveTypes';
import { outcomeMessage } from './AppNotice';
import { IssueList } from './IssueList';
import {
  Ship,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileText,
  Truck,
  CreditCard,
  Package,
  Scale,
  Plus,
  Trash2,
  ChevronRight,
  Info,
  HelpCircle,
  Eye,
  Edit,
  Save,
  Check,
  Download,
  StickyNote,
  Zap,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

interface ShipmentDetailViewProps {
  shipment: MasterShipment;
  companySettings: CompanySettings;
  onUpdateShipment: (updated: MasterShipment) => Promise<SaveOutcome>;
  onBack: () => void;
  onOpenDocEditor: (shipmentId: string, docType: DocType) => void;
  onUpdateDocNotes?: (shipmentId: string, docType: DocType, notes: string) => void;
  onResetDocument?: (shipmentId: string, docType: DocType) => void;
}

/** Parses a weight field: empty means "not given", anything else must be a non-negative number. */
const parseKg = (v: string): number | undefined | null => {
  if (!v.trim()) return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const ShipmentDetailView: React.FC<ShipmentDetailViewProps> = ({
  shipment,
  companySettings,
  onUpdateShipment,
  onBack,
  onOpenDocEditor,
  onUpdateDocNotes,
  onResetDocument,
}) => {
  const { t, lang, num } = useLang();
  const dt = t.detail;
  const kg1 = (n: number) => num(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dp2 = (n: number) => num(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'actual_loading' | 'vgm' | 'workflow'>('workflow');
  
  // Document notes editing inline state
  const [editingNotesDocType, setEditingNotesDocType] = useState<DocType | null>(null);
  const [tempDocNotes, setTempDocNotes] = useState<string>('');

  // Local state for editing actual loading quantities & VGM
  const [itemsData, setItemsData] = useState<ShipmentItem[]>(shipment.items);
  const [actualLoadingEntered, setActualLoadingEntered] = useState<boolean>(shipment.actualLoadingEntered);
  const [actualLoadingDate, setActualLoadingDate] = useState<string>(shipment.actualLoadingDate || new Date().toISOString().split('T')[0]);
  const kgText = (n?: number) => (n === undefined ? '' : String(n));
  const [measuredText, setMeasuredText] = useState(kgText(shipment.measuredCargoGrossKg));
  const [tareText, setTareText] = useState(kgText(shipment.containerTareKg));
  const [vgmText, setVgmText] = useState(kgText(shipmentVgmKg(shipment)));
  const [saveMsg, setSaveMsg] = useState<{ tab: string; text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Weights for the quantities actually loaded (ordered ones until the loading is entered).
  const measured = parseKg(measuredText);
  const tare = parseKg(tareText);
  const vgm = parseKg(vgmText);
  const weightsInvalid = measured === null || tare === null || vgm === null;
  const tolerance = companySettings.vgmWarningTolerancePct ?? DEFAULT_WARNING_TOLERANCE_PCT;
  const loadedQty = (it: ShipmentItem) => (actualLoadingEntered && it.actualLoadedQty !== undefined ? it.actualLoadedQty : it.orderedQty);
  const weights = summariseWeights({
    lines: itemsData.map((it) => ({ qty: loadedQty(it), netWeightKg: it.netWeightKg, grossWeightKg: it.grossWeightKg })),
    measuredCargoGrossKg: measured ?? undefined,
    containerTareKg: tare ?? undefined,
    declaredVgmKg: vgm ?? undefined,
    warningTolerancePct: tolerance,
  });

  // Handle actual loaded quantity change
  const handleActualQtyChange = (itemId: string, newQty: number) => {
    setItemsData((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, actualLoadedQty: newQty } : item))
    );
    setHasChanges(true);
  };

  // Save the actual loading. Loading documents become ready to check; nothing is
  // approved automatically, and approved documents keep their frozen content.
  const handleSaveActualLoading = async () => {
    const day = new Date().toISOString().split('T')[0];
    const docs = { ...shipment.documents };
    for (const dt of ['actual_loading', 'commercial_invoice', 'packing_list', 'shipping_instruction'] as DocType[]) {
      if (docs[dt].status === 'eksik') docs[dt] = { ...docs[dt], status: 'hazir', updatedAt: day };
    }
    const updatedItems = itemsData.map(({ vgmWeightKg: _legacy, ...it }) => ({ ...it, actualLoadedQty: it.actualLoadedQty ?? it.orderedQty }));
    const updated: MasterShipment = {
      ...shipment,
      items: updatedItems,
      actualLoadingEntered: true,
      actualLoadingDate,
      documents: docs,
    };
    setBusy(true);
    const outcome = await onUpdateShipment(updated);
    setBusy(false);
    setItemsData(updatedItems);
    setActualLoadingEntered(true);
    if (outcome !== 'failed') setHasChanges(false);
    setSaveMsg({ tab: 'actual_loading', ok: outcome !== 'failed', text: outcome === 'saved' ? dt.savedActual : outcomeMessage(t, outcome) });
  };

  const handleSaveWeights = async () => {
    if (weightsInvalid) {
      setSaveMsg({ tab: 'vgm', ok: false, text: t.weights.invalid });
      return;
    }
    setBusy(true);
    const outcome = await onUpdateShipment({
      ...shipment,
      measuredCargoGrossKg: measured ?? undefined,
      containerTareKg: tare ?? undefined,
      vgmKg: vgm ?? undefined,
      totalVgmKg: undefined,
    });
    setBusy(false);
    setSaveMsg({ tab: 'vgm', ok: outcome !== 'failed', text: outcomeMessage(t, outcome) });
  };

  // 7 Workflow Docs
  const ORDER: DocType[] = ['quotation', 'proforma', 'sales_order', 'actual_loading', 'commercial_invoice', 'packing_list', 'shipping_instruction'];
  const workflowDocOrder: { type: DocType; name: string; desc: string; step: number }[] = ORDER.map((type, i) => ({
    type,
    name: dt.steps[type].name,
    desc: dt.steps[type].desc,
    step: i + 1,
  }));
  /** Which question heads each step's guide. */
  const QUESTION: Record<DocType, 'qNow' | 'qNext' | 'qMissing'> = {
    quotation: 'qNow',
    proforma: 'qNext',
    sales_order: 'qMissing',
    actual_loading: 'qNow',
    commercial_invoice: 'qNext',
    packing_list: 'qMissing',
    shipping_instruction: 'qNow',
  };

  const getStatusBadge = (status: DocStatus) => {
    switch (status) {
      case 'onaylandi':
        return <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">✓ {t.docStatus.onaylandi}</span>;
      case 'hazir':
        return <span className="px-2.5 py-1 rounded bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">● {t.docStatus.hazir}</span>;
      case 'taslak':
        return <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"> {t.docStatus.taslak}</span>;
      case 'eksik':
      default:
        return <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">⚠ {t.docStatus.eksik}</span>;
    }
  };

  // Calculate order totals
  const totalOrderedQty = itemsData.reduce((s, i) => s + i.orderedQty, 0);
  const totalActualQty = itemsData.reduce((s, i) => s + (i.actualLoadedQty ?? i.orderedQty), 0);
  const qtyDiff = totalActualQty - totalOrderedQty;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            title={dt.back}
            aria-label={dt.back}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                {shipment.shipmentCode}
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-semibold text-slate-700">{shipment.customer.companyName} ({shipment.customer.country})</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{dt.title}</h2>
          </div>
        </div>

        {/* Global Actual Loading Warning Banner if not entered */}
        {!actualLoadingEntered && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center space-x-3 text-xs text-amber-800 max-w-md">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="block font-bold">{dt.noActualTitle}</strong>
              <span>{dt.noActualBody}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Header */}
      <div className="bg-white border-b border-slate-200 px-4 rounded-xl shadow-2xs flex space-x-2 overflow-x-auto text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'workflow' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-teal-600" />
          <span>{dt.tabWorkflow}</span>
        </button>

        <button
          onClick={() => setActiveTab('actual_loading')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'actual_loading' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-slate-600" />
          <span>{dt.tabActual}</span>
          {!actualLoadingEntered && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('vgm')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'vgm' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-slate-600" />
          <span>{t.weights.title}</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'items' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 text-slate-600" />
          <span>{dt.tabItems(shipment.items.length)}</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'overview' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Info className="w-4 h-4 text-slate-600" />
          <span>{dt.tabOverview}</span>
        </button>
      </div>

      {/* TAB 1: 7 AŞAMALI BELGE WORKFLOW */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">{dt.flowTitle}</h3>
            <p className="text-xs text-slate-500">
              {dt.flowLead}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflowDocOrder.map((docItem) => {
              const docInfo = shipment.documents[docItem.type];
              return (
                <div
                  key={docItem.type}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-teal-400 font-bold text-sm flex items-center justify-center shrink-0">
                          {docItem.step}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{docItem.name}</h4>
                          <p className="text-[11px] text-slate-500">{docItem.desc}</p>
                        </div>
                      </div>
                      <div>{getStatusBadge(docInfo.status)}</div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">{dt.docNo}</span>
                      <strong className="text-slate-800">{docInfo.docNumber}</strong>
                    </div>

                    {/* Contextual Guidance Guidance requested in Rule 3 */}
                    <div className="bg-teal-50/60 border border-teal-200/80 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="font-bold text-teal-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
                        <span>{dt.guide}</span>
                      </div>

                      <p className="text-teal-950 text-[11px]">
                        <strong>{dt[QUESTION[docItem.type]]}</strong> {dt.hints[docItem.type]}
                      </p>
                    </div>

                    {/* Document Note Inline Management (Edit / Delete / Save) */}
                    <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <StickyNote className="w-3.5 h-3.5 text-amber-700" />
                          <span>{dt.docNote}</span>
                        </span>

                        {editingNotesDocType !== docItem.type && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesDocType(docItem.type);
                                setTempDocNotes(docInfo.notes || '');
                              }}
                              className="text-[10px] font-bold text-amber-900 hover:bg-amber-200 px-2 py-0.5 bg-amber-100 rounded border border-amber-300 transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>{docInfo.notes ? dt.editNote : dt.addNote}</span>
                            </button>
                            {docInfo.notes && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateDocNotes) {
                                    onUpdateDocNotes(shipment.id, docItem.type, '');
                                  }
                                }}
                                className="text-[10px] font-bold text-red-700 hover:bg-red-100 px-1.5 py-0.5 bg-red-50 rounded border border-red-200 transition-colors flex items-center gap-1"
                                title={dt.deleteNote}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{dt.del}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {editingNotesDocType === docItem.type ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={tempDocNotes}
                            onChange={(e) => setTempDocNotes(e.target.value)}
                            rows={3}
                            placeholder={dt.notePlaceholder}
                            className="w-full bg-white border border-amber-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-600 leading-relaxed font-sans"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingNotesDocType(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] rounded"
                            >
                              {dt.cancel}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateDocNotes) {
                                  onUpdateDocNotes(shipment.id, docItem.type, tempDocNotes);
                                }
                                setEditingNotesDocType(null);
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded flex items-center gap-1 shadow-2xs"
                            >
                              <Save className="w-3 h-3" />
                              <span>{dt.save}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-800 text-[11px] whitespace-pre-line leading-relaxed italic">
                          {docInfo.notes ? `"${docInfo.notes}"` : dt.noNote}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => onOpenDocEditor(shipment.id, docItem.type)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{dt.editPreview}</span>
                    </button>

                    {onResetDocument && (
                      <button
                        onClick={() => {
                          if (window.confirm(t.resetConfirm(t.docNames[docItem.type]))) {
                            onResetDocument(shipment.id, docItem.type);
                          }
                        }}
                        className="py-2 px-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs rounded-lg border border-slate-200 transition-colors"
                        title={dt.resetTitle}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onOpenDocEditor(shipment.id, docItem.type)}
                      className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-1 transition-colors shadow-2xs"
                      title={dt.pdfTitle}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ACTUAL LOADING (GERÇEK YÜKLEME) */}
      {activeTab === 'actual_loading' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{dt.actualTitle}</h3>
                <p className="text-xs text-slate-500">
                  {dt.actualLead}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">{dt.loadingDate}</label>
                  <input
                    type="date"
                    value={actualLoadingDate}
                    onChange={(e) => {
                      setActualLoadingDate(e.target.value);
                      setHasChanges(true);
                    }}
                    className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setItemsData((prev) =>
                        prev.map((it) => ({
                          ...it,
                          actualLoadedQty: it.orderedQty,
                        }))
                      );
                      setActualLoadingEntered(true);
                      setHasChanges(true);
                    }}
                    className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
                    title={dt.syncTitle}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{dt.sync}</span>
                  </button>

                  <button
                    onClick={handleSaveActualLoading}
                    disabled={busy}
                    className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{dt.saveActual}</span>
                  </button>
                </div>
              </div>
            </div>

            {saveMsg?.tab === 'actual_loading' && (
              <p role="status" className={`text-xs font-semibold ${saveMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {saveMsg.text}
              </p>
            )}

            {/* Quantity Difference Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">{dt.totalOrdered}</span>
                <strong className="text-base font-mono text-slate-800">{num(totalOrderedQty)} {dt.units}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">{dt.totalLoaded}</span>
                <strong className="text-base font-mono text-teal-800">{num(totalActualQty)} {dt.units}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">{dt.variance}</span>
                <strong className={`text-base font-mono ${qtyDiff < 0 ? 'text-red-600' : qtyDiff > 0 ? 'text-teal-600' : 'text-slate-700'}`}>
                  {qtyDiff > 0 ? `+${num(qtyDiff)}` : num(qtyDiff)} {dt.units}
                </strong>
              </div>
            </div>
          </div>

          {/* Items Actual Loading Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              {dt.tableTitle}
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">{dt.colImage}</th>
                  <th className="py-3 px-4">{dt.colCode}</th>
                  <th className="py-3 px-4">{dt.colName}</th>
                  <th className="py-3 px-4 text-center">{dt.colOrdered}</th>
                  <th className="py-3 px-4 text-center">{dt.colActual}</th>
                  <th className="py-3 px-4 text-center">{dt.colDiff}</th>
                  <th className="py-3 px-4 text-right">{dt.colPrice}</th>
                  <th className="py-3 px-4 text-right">{dt.colAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsData.map((item) => {
                  const actualQty = item.actualLoadedQty !== undefined ? item.actualLoadedQty : item.orderedQty;
                  const diff = actualQty - item.orderedQty;
                  const itemTotal = actualQty * item.unitPrice;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-9 h-9 object-cover rounded border border-slate-200" />
                        ) : (
                          <div className="w-9 h-9 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            -
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">{item.productCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.productName}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {num(item.orderedQty)} {unitLabel(item.unit, lang, item.orderedQty)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={actualQty}
                          onChange={(e) => handleActualQtyChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-24 text-center border border-slate-300 rounded-md py-1 px-2 font-mono font-bold focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {diff < 0 ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">{diff}</span>
                        ) : diff > 0 ? (
                          <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded">+{diff}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {dp2(item.unitPrice)} {item.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {dp2(itemTotal)} {item.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WEIGHTS AND VGM. Cargo gross and VGM are separate figures. */}
      {activeTab === 'vgm' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t.weights.title}</h3>
              <p className="text-slate-500 mt-0.5 leading-relaxed">{t.weights.lead}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'w-measured', label: t.weights.measuredCargo, value: measuredText, set: setMeasuredText, bad: measured === null },
                { id: 'w-tare', label: t.weights.tare, value: tareText, set: setTareText, bad: tare === null },
                { id: 'w-vgm', label: t.weights.vgm, value: vgmText, set: setVgmText, bad: vgm === null },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="block font-semibold text-slate-700 mb-1">
                    {f.label} (kg)
                  </label>
                  <input
                    id={f.id}
                    inputMode="decimal"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    aria-invalid={f.bad}
                    className={`w-full border rounded-lg p-2 font-mono font-bold ${f.bad ? 'border-red-500' : 'border-slate-300'}`}
                  />
                </div>
              ))}
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                [t.weights.net, `${kg1(weights.totalNetKg)} kg`],
                [t.weights.calcCargo, `${kg1(weights.calculatedCargoGrossKg)} kg`],
                [t.weights.measuredCargo, weights.measuredCargoGrossKg !== undefined ? `${kg1(weights.measuredCargoGrossKg)} kg` : '—'],
                [t.weights.expectedVgm, weights.expectedVgmKg !== undefined ? `${kg1(weights.expectedVgmKg)} kg` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <dt className="text-[10px] text-slate-500">{k}</dt>
                  <dd className="font-mono font-bold text-slate-800 text-sm">{v}</dd>
                </div>
              ))}
            </dl>

            <IssueList issues={weights.issues.map((i) => ('line' in i ? { ...i, line: i.line } : i))} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">{t.weights.tolNote(num(tolerance))}</p>
              <button
                type="button"
                onClick={handleSaveWeights}
                disabled={busy}
                className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>{t.weights.save}</span>
              </button>
            </div>
            {saveMsg?.tab === 'vgm' && (
              <p role="status" className={`text-xs font-semibold ${saveMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {saveMsg.text}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex flex-wrap gap-2 justify-between items-center">
              <span>{t.weights.tableTitle}</span>
              <span className="text-[11px] text-slate-500 font-normal">{t.weights.tableLead}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">{dt.colCode}</th>
                    <th className="py-3 px-4">{dt.colName}</th>
                    <th className="py-3 px-4 text-center">{t.weights.colLoaded}</th>
                    <th className="py-3 px-4 text-right">{t.weights.colNet}</th>
                    <th className="py-3 px-4 text-right">{t.weights.colGross}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsData.map((item, i) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">{item.productCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.productName}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        {num(loadedQty(item))} {unitLabel(item.unit, lang, loadedQty(item))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{kg1(weights.lineNetKg[i])} kg</td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-teal-800">{kg1(weights.lineCargoGrossKg[i])} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SİPARİŞ KALEMLERİ */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">{dt.itemsTitle}</h3>
          <div className="divide-y divide-slate-100">
            {itemsData.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-teal-800 mr-2">{item.productCode}</span>
                  <span className="font-semibold text-slate-900">{item.productName}</span>
                  <p className="text-[11px] text-slate-500">{dt.hs}: {item.hsCode}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold">{num(item.orderedQty)} {unitLabel(item.unit, lang, item.orderedQty)}</span> x {dp2(item.unitPrice)} {item.currency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LOJİSTİK & ÖDEME KOŞULLARI */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Truck className="w-4 h-4 text-teal-600" />
              <span>{dt.logistics}</span>
            </h3>
            <div className="space-y-2">
              <div><strong className="text-slate-500">Incoterm:</strong> {shipment.logistics.incoterm}</div>
              <div><strong className="text-slate-500">{dt.loadingPort}</strong> {shipment.logistics.loadingPort}</div>
              <div><strong className="text-slate-500">{dt.dischargePort}</strong> {shipment.logistics.dischargePort}</div>
              <div><strong className="text-slate-500">{dt.carrier}</strong> {shipment.logistics.carrierCompany}</div>
              <div><strong className="text-slate-500">{dt.vessel}</strong> {shipment.logistics.vesselFlightNo}</div>
              <div><strong className="text-slate-500">{dt.booking}</strong> {shipment.logistics.bookingNo}</div>
              <div><strong className="text-slate-500">{dt.container}</strong> {shipment.logistics.containerNo || '-'}</div>
              <div><strong className="text-slate-500">{dt.seal}</strong> {shipment.logistics.sealNo || '-'}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>{dt.paymentTitle}</span>
            </h3>
            <div className="space-y-2">
              <div><strong className="text-slate-500">{dt.paymentMethod}</strong> {t.payments[shipment.payment.paymentMethod] ?? shipment.payment.paymentMethod}</div>
              <div><strong className="text-slate-500">{dt.currency}</strong> {shipment.payment.currency}</div>
              <div><strong className="text-slate-500">{dt.iban}</strong> {shipment.payment.bankAccountIban}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
