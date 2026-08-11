import React, { useState } from 'react';
import { MasterShipment, Customer, Product, DocType, CustomField, DocumentInfo } from '../types/exporta';
import { DEFAULT_NUMBER_FORMATS, generateDocNumber } from '../lib/numbering';
import { Ship, Plus, Search, FileCheck, AlertTriangle, ChevronRight, Calendar, ArrowRight, Building, Check } from 'lucide-react';

interface ShipmentsViewProps {
  shipments: MasterShipment[];
  customers: Customer[];
  products: Product[];
  customFields: CustomField[];
  onSelectShipment: (id: string) => void;
  onAddShipment: (shipment: MasterShipment) => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({
  shipments,
  customers,
  products,
  customFields,
  onSelectShipment,
  onAddShipment,
}) => {
  const [search, setSearch] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // New Shipment Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([products[0]?.id || '']);
  const [incoterm, setIncoterm] = useState<'EXW' | 'FOB' | 'CFR' | 'CIF' | 'DDP'>('FOB');
  const [paymentMethod, setPaymentMethod] = useState<string>('%30 Advance / %70 CAD');
  const [dischargePort, setDischargePort] = useState<string>('Hamburg Port, Almanya');
  const [loadingPort, setLoadingPort] = useState<string>('Ambarlı Limanı, İstanbul');
  const [estimatedLoadingDate, setEstimatedLoadingDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  const filteredShipments = shipments.filter(
    (s) =>
      s.shipmentCode.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateShipment = () => {
    const cust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    const selectedProds = products.filter((p) => selectedProductIds.includes(p.id));

    if (!cust || selectedProds.length === 0) {
      alert('Lütfen bir müşteri ve en az 1 ürün seçin.');
      return;
    }

    const nextSeq = shipments.length + 1;
    const shipmentCode = `SHP-2026-${String(nextSeq).padStart(3, '0')}`;

    // Auto generate 7 document numbers from formats
    const today = new Date().toISOString().split('T')[0];

    const newShipment: MasterShipment = {
      id: `shp-${Date.now()}`,
      shipmentCode,
      customerId: cust.id,
      customer: cust,
      actualLoadingEntered: false,
      createdAt: today,
      updatedAt: today,
      notes: 'Yeni oluşturulan master sevkiyat dosyası.',
      logistics: {
        incoterm,
        loadingPort,
        dischargePort,
        transportMode: 'Sea',
        carrierCompany: 'MSC Mediterranean Shipping',
        vesselFlightNo: 'TBD',
        bookingNo: `BKG-2026-${nextSeq}`,
        estimatedLoadingDate,
        estimatedArrivalDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      },
      payment: {
        paymentMethod: paymentMethod as any,
        bankAccountIban: 'TR33 0006 4000 0011 2233 4455 66',
        currency: selectedProds[0]?.currency || 'EUR',
      },
      items: selectedProds.map((p, idx) => ({
        id: `si-${Date.now()}-${idx}`,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        hsCode: p.hsCode,
        unit: p.unit,
        orderedQty: 100,
        unitPrice: p.unitPrice,
        currency: p.currency,
        netWeightKg: p.netWeightKg,
        grossWeightKg: p.grossWeightKg,
      })),
      documents: {
        quotation: {
          docType: 'quotation',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.quotation, cust, nextSeq),
          status: 'hazir',
          template: 'classic',
          createdAt: today,
          updatedAt: today,
        },
        proforma: {
          docType: 'proforma',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.proforma, cust, nextSeq),
          status: 'taslak',
          template: 'classic',
          createdAt: today,
          updatedAt: today,
        },
        sales_order: {
          docType: 'sales_order',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.sales_order, cust, nextSeq),
          status: 'eksik',
          template: 'classic',
          createdAt: today,
          updatedAt: today,
        },
        actual_loading: {
          docType: 'actual_loading',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.actual_loading, cust, nextSeq),
          status: 'eksik',
          template: 'modern',
          createdAt: today,
          updatedAt: today,
        },
        commercial_invoice: {
          docType: 'commercial_invoice',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.commercial_invoice, cust, nextSeq),
          status: 'eksik',
          template: 'modern',
          createdAt: today,
          updatedAt: today,
        },
        packing_list: {
          docType: 'packing_list',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.packing_list, cust, nextSeq),
          status: 'eksik',
          template: 'compact',
          createdAt: today,
          updatedAt: today,
        },
        shipping_instruction: {
          docType: 'shipping_instruction',
          docNumber: generateDocNumber(DEFAULT_NUMBER_FORMATS.shipping_instruction, cust, nextSeq),
          status: 'eksik',
          template: 'modern',
          createdAt: today,
          updatedAt: today,
        },
      },
    };

    onAddShipment(newShipment);
    setIsWizardOpen(false);
    onSelectShipment(newShipment.id);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ship className="w-5 h-5 text-teal-600" />
            <span>Sevkiyat Dosyaları & Master Kayıtlar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            İhracat operasyonlarınızın ana veri kaynağı ve 7 aşamalı belge yönetim merkezi
          </p>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Sevkiyat Oluştur</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sevkiyat kodu, müşteri adı veya hedef ülkeye göre ara..."
          className="w-full text-xs text-slate-800 focus:outline-none"
        />
      </div>

      {/* Shipments List */}
      <div className="space-y-3">
        {filteredShipments.map((shp) => {
          const docs = Object.values(shp.documents) as DocumentInfo[];
          const readyCount = docs.filter((d) => d.status === 'hazir' || d.status === 'onaylandi').length;
          const totalVal = shp.items.reduce((sum, item) => {
            const qty = shp.actualLoadingEntered && item.actualLoadedQty !== undefined ? item.actualLoadedQty : item.orderedQty;
            return sum + qty * item.unitPrice;
          }, 0);

          return (
            <div
              key={shp.id}
              onClick={() => onSelectShipment(shp.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-black text-base text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                    {shp.shipmentCode}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{shp.customer.companyName}</h3>
                  <span className="text-xs text-slate-500 font-medium">({shp.customer.country})</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>Teslim: <strong className="text-slate-800">{shp.logistics.incoterm}</strong></span>
                  <span>Liman: <strong className="text-slate-800">{shp.logistics.dischargePort}</strong></span>
                  <span>Ödeme: <strong className="text-slate-800">{shp.payment.paymentMethod}</strong></span>
                  <span>Tahmini Yükleme: <strong className="text-slate-800">{shp.logistics.estimatedLoadingDate}</strong></span>
                </div>

                {!shp.actualLoadingEntered ? (
                  <div className="inline-flex items-center space-x-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Actual Loading (Gerçek Yükleme) henüz girilmedi.</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Actual Loading onaylandı ({shp.actualLoadingDate})</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-6 justify-between md:justify-end shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <div className="text-base font-black font-mono text-slate-900">
                    €{totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-end space-x-1 mt-0.5">
                    <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Belge Tamamlanma: <strong className="text-slate-800">{readyCount}/7</strong></span>
                  </div>
                </div>

                <div className="p-2 bg-slate-100 text-slate-600 hover:bg-teal-600 hover:text-white rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Shipment Modal Wizard */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Ship className="w-5 h-5 text-teal-400" />
                <span>+ Yeni Master Sevkiyat Dosyası Oluştur</span>
              </h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Müşteri (Alıcı Firma) Seçin *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.code}) - {c.country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Sipariş Kalemlerini Seçin *</label>
                <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50">
                  {products.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer hover:border-teal-500">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds((prev) => [...prev, p.id]);
                              } else {
                                setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span className="font-mono font-bold text-teal-800">{p.code}</span>
                          <span className="font-semibold text-slate-800">{p.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{p.unitPrice} {p.currency}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teslim Şekli (Incoterm) *</label>
                  <select
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="EXW">EXW - Fabrikada Teslim</option>
                    <option value="FOB">FOB - Gemide Güvertede Teslim</option>
                    <option value="CFR">CFR - Navlun Ödenmiş</option>
                    <option value="CIF">CIF - Sigorta ve Navlun Ödenmiş</option>
                    <option value="DDP">DDP - Gümrük Vergileri Ödenmiş</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ödeme Koşulu *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="%30 Advance / %70 CAD">%30 Avans / %70 Vesaik Mukabili (CAD)</option>
                    <option value="Advance Payment (%100)">%100 Peşin Transfer</option>
                    <option value="Letter of Credit (L/C)">Gayri Kabili Rucu Akreditif (L/C)</option>
                    <option value="Open Account 60 Days">Açık Hesap 60 Gün</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Çıkış / Yükleme Limanı</label>
                  <input
                    type="text"
                    value={loadingPort}
                    onChange={(e) => setLoadingPort(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Varış Limanı / Ülke</label>
                  <input
                    type="text"
                    value={dischargePort}
                    onChange={(e) => setDischargePort(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahmini Yükleme Tarihi</label>
                <input
                  type="date"
                  value={estimatedLoadingDate}
                  onChange={(e) => setEstimatedLoadingDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateShipment}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs flex items-center space-x-1"
                >
                  <span>Sevkiyat Dosyasını Başlat</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
