import React, { useState } from 'react';
import { MasterShipment, ShipmentItem, DocType, DocStatus, Customer, Product, CustomField } from '../types/exporta';
import { DOC_TYPE_NAMES } from '../lib/numbering';
import { calculateVgmAndWeights } from '../lib/vgm';
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
  customers: Customer[];
  products: Product[];
  customFields: CustomField[];
  onUpdateShipment: (updated: MasterShipment) => void;
  onBack: () => void;
  onOpenDocEditor: (shipmentId: string, docType: DocType) => void;
  onUpdateDocNotes?: (shipmentId: string, docType: DocType, notes: string) => void;
  onResetDocument?: (shipmentId: string, docType: DocType) => void;
  onSyncProformaToActual?: (shipmentId: string) => void;
}

export const ShipmentDetailView: React.FC<ShipmentDetailViewProps> = ({
  shipment,
  customers,
  products,
  customFields,
  onUpdateShipment,
  onBack,
  onOpenDocEditor,
  onUpdateDocNotes,
  onResetDocument,
  onSyncProformaToActual,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'actual_loading' | 'vgm' | 'workflow'>('workflow');
  
  // Document notes editing inline state
  const [editingNotesDocType, setEditingNotesDocType] = useState<DocType | null>(null);
  const [tempDocNotes, setTempDocNotes] = useState<string>('');

  // Local state for editing actual loading quantities & VGM
  const [itemsData, setItemsData] = useState<ShipmentItem[]>(shipment.items);
  const [actualLoadingEntered, setActualLoadingEntered] = useState<boolean>(shipment.actualLoadingEntered);
  const [totalVgmKg, setTotalVgmKg] = useState<number>(shipment.totalVgmKg || 0);
  const [actualLoadingDate, setActualLoadingDate] = useState<string>(shipment.actualLoadingDate || new Date().toISOString().split('T')[0]);

  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Compute VGM and weights dynamically using Product Master defaults and Actual VGM
  const vgmResult = calculateVgmAndWeights(itemsData, actualLoadingEntered, totalVgmKg);

  // Handle actual loaded quantity change
  const handleActualQtyChange = (itemId: string, newQty: number) => {
    setItemsData((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, actualLoadedQty: newQty } : item))
    );
    setHasChanges(true);
  };

  // Save Actual Loading & Master changes
  const handleSaveActualLoading = () => {
    const updatedDocs = { ...shipment.documents };
    
    // Update Actual Loading & Commercial Invoice & Packing List statuses
    updatedDocs.actual_loading = {
      ...updatedDocs.actual_loading,
      status: 'onaylandi' as DocStatus,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (updatedDocs.commercial_invoice.status === 'eksik' || updatedDocs.commercial_invoice.status === 'taslak') {
      updatedDocs.commercial_invoice.status = 'hazir';
    }
    if (updatedDocs.packing_list.status === 'eksik' || updatedDocs.packing_list.status === 'taslak') {
      updatedDocs.packing_list.status = 'hazir';
    }

    const updatedItems = vgmResult.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productCode: it.productCode,
      productName: it.productName,
      hsCode: it.hsCode,
      unit: it.unit,
      orderedQty: it.orderedQty,
      actualLoadedQty: it.actualLoadedQty,
      unitPrice: it.unitPrice,
      currency: it.currency,
      netWeightKg: it.netWeightKg,
      grossWeightKg: it.grossWeightKg,
      vgmWeightKg: it.lineCalculatedGrossWeightKg,
      customNotes: it.customNotes,
    }));

    const updated: MasterShipment = {
      ...shipment,
      items: updatedItems,
      actualLoadingEntered: true,
      actualLoadingDate,
      totalVgmKg: totalVgmKg > 0 ? totalVgmKg : undefined,
      documents: updatedDocs,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setItemsData(updatedItems);
    setActualLoadingEntered(true);
    onUpdateShipment(updated);
    setHasChanges(false);
    alert('Actual Loading (Gerçek Yükleme) verileri kaydedildi! Commercial Invoice ve Packing List güncellendi.');
  };

  // 7 Workflow Docs
  const workflowDocOrder: { type: DocType; name: string; desc: string; step: number }[] = [
    { type: 'quotation', name: '1. Quotation (Teklif)', desc: 'İlk fiyat ve ticari koşullar teklifi', step: 1 },
    { type: 'proforma', name: '2. Proforma Invoice', desc: 'Müşteri onaylı ön fatura ve sipariş akdi', step: 2 },
    { type: 'sales_order', name: '3. Sales Order (Satış Siparişi)', desc: 'İç üretim ve depo hazırlık emri', step: 3 },
    { type: 'actual_loading', name: '4. Actual Loading (Gerçek Yükleme)', desc: 'Fiziki yüklenen miktar ve kantar doğrulaması', step: 4 },
    { type: 'commercial_invoice', name: '5. Commercial Invoice (Ticari Fatura)', desc: 'Gümrük ve ödeme için resmi fatura', step: 5 },
    { type: 'packing_list', name: '6. Packing List (Çeki Listesi)', desc: 'Paket, kap ve kantar/VGM ağırlık dökümü', step: 6 },
    { type: 'shipping_instruction', name: '7. Shipping Instruction (Yükleme Talimatı)', desc: 'Forwarder/Acente konşimento talimatı', step: 7 },
  ];

  const getStatusBadge = (status: DocStatus) => {
    switch (status) {
      case 'onaylandi':
        return <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">✓ Onaylandı</span>;
      case 'hazir':
        return <span className="px-2.5 py-1 rounded bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">● Hazır</span>;
      case 'taslak':
        return <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"> Taslak</span>;
      case 'eksik':
      default:
        return <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">⚠ Eksik</span>;
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
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">Master Sevkiyat Dosyası & Belge Workflow</h2>
          </div>
        </div>

        {/* Global Actual Loading Warning Banner if not entered */}
        {!actualLoadingEntered && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center space-x-3 text-xs text-amber-800 max-w-md">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="block font-bold">Gerçek Yükleme Girilmedi!</strong>
              <span>Belge Proforma/Sales Order sipariş miktarlarını kullanacaktır.</span>
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
          <span>7 Aşamalı Belge Workflow</span>
        </button>

        <button
          onClick={() => setActiveTab('actual_loading')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'actual_loading' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-slate-600" />
          <span>Actual Loading (Gerçek Yükleme)</span>
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
          <span>VGM & Kantar Ağırlığı</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'items' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 text-slate-600" />
          <span>Sipariş Kalemleri ({shipment.items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'overview' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Info className="w-4 h-4 text-slate-600" />
          <span>Lojistik & Ödeme Koşulları</span>
        </button>
      </div>

      {/* TAB 1: 7 AŞAMALI BELGE WORKFLOW */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Dış Ticaret Belge İlerleme Akışı</h3>
            <p className="text-xs text-slate-500">
              Bu sevkiyata ait 7 temel belgenin canlı durumu. Her belgenin tasarımı 3 farklı şablon ile canlı önizlenebilir.
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
                      <span className="text-slate-500">Belge No:</span>
                      <strong className="text-slate-800">{docInfo.docNumber}</strong>
                    </div>

                    {/* Contextual Guidance Guidance requested in Rule 3 */}
                    <div className="bg-teal-50/60 border border-teal-200/80 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="font-bold text-teal-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
                        <span>Adım Rehberi</span>
                      </div>

                      {docItem.type === 'quotation' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Şimdi ne yapmalısınız?</strong> Müşterinize teklif metnini iletin ve teyit bekleyin.
                        </p>
                      )}
                      {docItem.type === 'proforma' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Sonraki adım nedir?</strong> Proforma onaylandıktan sonra banka akreditif/avans ödemesini kontrol edin.
                        </p>
                      )}
                      {docItem.type === 'sales_order' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Eksik olan nedir?</strong> Depoya paketleme ve hazırlık emrini iletin.
                        </p>
                      )}
                      {docItem.type === 'actual_loading' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Şimdi ne yapmalısınız?</strong> Konteyner/kamyon yüklendikten sonra fiziki adet ve kantar kg girin.
                        </p>
                      )}
                      {docItem.type === 'commercial_invoice' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Sonraki adım nedir?</strong> Gerçek yüklenen adetlere göre gümrük faturasını onaylayın.
                        </p>
                      )}
                      {docItem.type === 'packing_list' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Eksik olan nedir?</strong> VGM/kantar tartı sonucuna göre net/brüt kap ağırlıklarını kontrol edin.
                        </p>
                      )}
                      {docItem.type === 'shipping_instruction' && (
                        <p className="text-teal-950 text-[11px]">
                          <strong>Şimdi ne yapmalısınız?</strong> Forwarder/acente firmasına konşimento (B/L) talimatını gönderin.
                        </p>
                      )}
                    </div>

                    {/* Document Note Inline Management (Edit / Delete / Save) */}
                    <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <StickyNote className="w-3.5 h-3.5 text-amber-700" />
                          <span>Belge Notu</span>
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
                              <span>{docInfo.notes ? 'Düzenle' : '+ Not Ekle'}</span>
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
                                title="Notu Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Sil</span>
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
                            placeholder="Belgeye özel not veya açıklama yazın..."
                            className="w-full bg-white border border-amber-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-600 leading-relaxed font-sans"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingNotesDocType(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] rounded"
                            >
                              İptal
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
                              <span>Kaydet</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-800 text-[11px] whitespace-pre-line leading-relaxed italic">
                          {docInfo.notes ? `"${docInfo.notes}"` : 'Henüz özel not eklenmedi.'}
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
                      <span>Düzenle & Önizle</span>
                    </button>

                    {onResetDocument && (
                      <button
                        onClick={() => {
                          if (window.confirm(`${DOC_TYPE_NAMES[docItem.type]} belgesinin notlarını ve ayarlarını sıfırlamak istiyor musunuz?`)) {
                            onResetDocument(shipment.id, docItem.type);
                          }
                        }}
                        className="py-2 px-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs rounded-lg border border-slate-200 transition-colors"
                        title="Belge notlarını ve ayarlarını sıfırla / sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onOpenDocEditor(shipment.id, docItem.type)}
                      className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-1 transition-colors shadow-2xs"
                      title="PDF İndir"
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
                <h3 className="font-bold text-slate-900 text-sm">Actual Loading (Gerçek Yükleme Adetleri)</h3>
                <p className="text-xs text-slate-500">
                  Fabrikada veya limanda gerçeğe dönüşen fiziki yükleme verileri. Commercial Invoice ve Packing List bu miktarlara göre türetilir.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Yükleme Tarihi:</label>
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
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Actual VGM / Kantar (kg):</label>
                  <input
                    type="number"
                    value={totalVgmKg || ''}
                    onChange={(e) => {
                      setTotalVgmKg(parseFloat(e.target.value) || 0);
                      setHasChanges(true);
                    }}
                    placeholder="Örn: 1080"
                    className="border border-slate-300 rounded-md px-2 py-1 text-xs font-mono font-bold w-28"
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
                      if (onSyncProformaToActual) {
                        onSyncProformaToActual(shipment.id);
                      }
                    }}
                    className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
                    title="Sevkiyat günü proforma adetlerini fiili yüklenen adetlere kopyalar"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>⚡ Proforma Adetlerini Eşitle</span>
                  </button>

                  <button
                    onClick={handleSaveActualLoading}
                    className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Gerçek Yüklemeyi Kaydet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quantity Difference Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Toplam Sipariş Edilen</span>
                <strong className="text-base font-mono text-slate-800">{totalOrderedQty} Birim</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Gerçek Yüklenen Adet</span>
                <strong className="text-base font-mono text-teal-800">{totalActualQty} Birim</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Yükleme Farkı (Variance)</span>
                <strong className={`text-base font-mono ${qtyDiff < 0 ? 'text-red-600' : qtyDiff > 0 ? 'text-teal-600' : 'text-slate-700'}`}>
                  {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff} Birim
                </strong>
              </div>
            </div>
          </div>

          {/* Items Actual Loading Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
              Sipariş Ürünleri Fiziki Yükleme Tablosu
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Görsel</th>
                  <th className="py-3 px-4">Ürün Kodu</th>
                  <th className="py-3 px-4">Ürün Adı</th>
                  <th className="py-3 px-4 text-center">Sipariş Miktarı</th>
                  <th className="py-3 px-4 text-center">Gerçek Yükleme (Actual)</th>
                  <th className="py-3 px-4 text-center">Fark</th>
                  <th className="py-3 px-4 text-right">Birim Fiyat</th>
                  <th className="py-3 px-4 text-right">Fatura Tutarı</th>
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
                        {item.orderedQty} {item.unit}
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
                        {item.unitPrice.toFixed(2)} {item.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {itemTotal.toFixed(2)} {item.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VGM & KANTAR AĞIRLIĞI */}
      {activeTab === 'vgm' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">VGM (Verified Gross Mass) & Kantar Ağırlığı</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kantar fişinden alınan gerçek toplam brüt ağırlık verisini girin. Sistem, Packing List brüt ağırlıklarını varsayılan ürün oranlarına göre otomatik oluşturur.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="space-y-1 shrink-0">
                  <label className="text-xs font-bold text-slate-800 block">Actual VGM / Kantar Ağırlığı (kg):</label>
                  <input
                    type="number"
                    value={totalVgmKg || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTotalVgmKg(val);
                      setHasChanges(true);
                    }}
                    placeholder="Örn: 1080"
                    className="border border-slate-300 rounded-lg p-2 font-mono font-bold text-sm w-48 focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Varsayılan Net Ağırlık</span>
                    <strong className="font-mono text-slate-800 text-sm">{vgmResult.totalNetWeightKg.toLocaleString('tr-TR')} kg</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Varsayılan Brüt Ağırlık</span>
                    <strong className="font-mono text-slate-800 text-sm">{vgmResult.totalDefaultGrossWeightKg.toLocaleString('tr-TR')} kg</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Actual VGM</span>
                    <strong className="font-mono text-teal-800 text-sm">
                      {vgmResult.actualVgmKg ? `${vgmResult.actualVgmKg.toLocaleString('tr-TR')} kg` : '-'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Kantar Farkı</span>
                    <strong className={`font-mono text-sm ${vgmResult.differenceKg > 0 ? 'text-amber-700' : vgmResult.differenceKg < 0 ? 'text-blue-700' : 'text-slate-700'}`}>
                      {vgmResult.differenceKg > 0 ? `+${vgmResult.differenceKg.toLocaleString('tr-TR')}` : vgmResult.differenceKg.toLocaleString('tr-TR')} kg
                    </strong>
                  </div>
                </div>
              </div>

              {/* VGM Operational Rule Tolerance Warning (+5%) */}
              {vgmResult.isToleranceExceeded && vgmResult.toleranceWarning && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-xs flex items-center space-x-2 font-semibold">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{vgmResult.toleranceWarning}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between items-center">
              <span>Packing List Brüt Ağırlık Dökümü</span>
              <span className="text-[11px] text-slate-500 font-normal">Nihai kap brüt ağırlıkları kantar farkına göre dengelenmiştir.</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ürün Kodu</th>
                  <th className="py-3 px-4">Ürün Adı</th>
                  <th className="py-3 px-4 text-center">Yüklenen Miktar</th>
                  <th className="py-3 px-4 text-right">Net Ağırlık (kg)</th>
                  <th className="py-3 px-4 text-right">Varsayılan Brüt (kg)</th>
                  <th className="py-3 px-4 text-right">Packing List Brüt (VGM kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vgmResult.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">{item.productCode}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{item.productName}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">{item.activeQty} {item.unit}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{item.lineNetWeightKg.toFixed(1)} kg</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{item.lineDefaultGrossWeightKg.toFixed(1)} kg</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-teal-800 text-sm">
                      {item.lineCalculatedGrossWeightKg.toFixed(1)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SİPARİŞ KALEMLERİ */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Sipariş Kalem Listesi</h3>
          <div className="divide-y divide-slate-100">
            {itemsData.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-teal-800 mr-2">{item.productCode}</span>
                  <span className="font-semibold text-slate-900">{item.productName}</span>
                  <p className="text-[11px] text-slate-500">GTİP: {item.hsCode}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold">{item.orderedQty} {item.unit}</span> x {item.unitPrice} {item.currency}
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
              <span>Lojistik Bilgileri</span>
            </h3>
            <div className="space-y-2">
              <div><strong className="text-slate-500">Incoterm:</strong> {shipment.logistics.incoterm}</div>
              <div><strong className="text-slate-500">Yükleme Limanı:</strong> {shipment.logistics.loadingPort}</div>
              <div><strong className="text-slate-500">Varış Limanı:</strong> {shipment.logistics.dischargePort}</div>
              <div><strong className="text-slate-500">Taşıyıcı / Acente:</strong> {shipment.logistics.carrierCompany}</div>
              <div><strong className="text-slate-500">Gemi / Sefer:</strong> {shipment.logistics.vesselFlightNo}</div>
              <div><strong className="text-slate-500">Booking / Konşimento No:</strong> {shipment.logistics.bookingNo}</div>
              <div><strong className="text-slate-500">Konteyner No:</strong> {shipment.logistics.containerNo || '-'}</div>
              <div><strong className="text-slate-500">Mühür No:</strong> {shipment.logistics.sealNo || '-'}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>Ödeme Koşulları</span>
            </h3>
            <div className="space-y-2">
              <div><strong className="text-slate-500">Ödeme Şekli:</strong> {shipment.payment.paymentMethod}</div>
              <div><strong className="text-slate-500">Para Birimi:</strong> {shipment.payment.currency}</div>
              <div><strong className="text-slate-500">Banka IBAN:</strong> {shipment.payment.bankAccountIban}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
