import React from 'react';
import { MasterShipment, OnboardingStep, DocumentInfo } from '../types/exporta';
import { OnboardingWidget } from './OnboardingWidget';
import { NavTab } from './Sidebar';
import {
  Ship,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Building,
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
} from 'lucide-react';

interface DashboardViewProps {
  shipments: MasterShipment[];
  onboardingSteps: OnboardingStep[];
  onNavigateTab: (tab: NavTab) => void;
  onToggleOnboardingStep: (id: number) => void;
  onSelectShipment: (id: string) => void;
  onNewShipmentClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shipments,
  onboardingSteps,
  onNavigateTab,
  onToggleOnboardingStep,
  onSelectShipment,
  onNewShipmentClick,
}) => {
  // Metrics calculations
  const totalShipments = shipments.length;
  
  // Calculate total value across shipments (converting or summing EUR/USD)
  const totalValueEUR = shipments.reduce((sum, shp) => {
    const shpTotal = shp.items.reduce((itemSum, item) => {
      const qty = shp.actualLoadingEntered && item.actualLoadedQty !== undefined ? item.actualLoadedQty : item.orderedQty;
      return itemSum + qty * item.unitPrice;
    }, 0);
    return sum + shpTotal;
  }, 0);

  // Incomplete files (shipments where actual loading is missing or any document status is 'eksik')
  const incompleteShipments = shipments.filter((s) => {
    const missingDocs = (Object.values(s.documents) as DocumentInfo[]).some((d) => d.status === 'eksik');
    return !s.actualLoadingEntered || missingDocs;
  });

  // Upcoming loadings sorted by estimated loading date
  const upcomingLoadings = [...shipments].sort((a, b) => 
    new Date(a.logistics.estimatedLoadingDate).getTime() - new Date(b.logistics.estimatedLoadingDate).getTime()
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Contextual Onboarding widget */}
      <OnboardingWidget
        steps={onboardingSteps}
        onNavigateTab={onNavigateTab}
        onToggleStep={onToggleOnboardingStep}
      />

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Aktif Sevkiyatlar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Aktif Sevkiyatlar</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{totalShipments}</span>
            <span className="text-xs text-emerald-600 font-medium">Sevkiyat Kartı</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tek master veri kaynağında kayıtlı</p>
        </div>

        {/* Metric 2: Toplam Sevkiyat Değeri */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Toplam Portföy Değeri</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              €{totalValueEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">FOB/CIF ticari fatura tutarı</p>
        </div>

        {/* Metric 3: Eksik Bilgili Dosyalar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Eksik Dosyalar</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{incompleteShipments.length}</span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded">Dikkat</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Gerçek yükleme veya belge eksikliği var</p>
        </div>

        {/* Metric 4: Yaklaşan Yüklemeler */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Yaklaşan Yüklemeler</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {upcomingLoadings.length}
            </span>
            <span className="text-xs text-teal-700 font-medium">Liman / Depo Yüklemesi</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Takvimdeki sevkiyat planı</p>
        </div>
      </div>

      {/* Main Grid Section: Sevkiyat Listesi & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Master Shipments table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Aktif Sevkiyatlar & Belge Workflow</h3>
              <p className="text-xs text-slate-500">Ortak veri kaynağından beslenen canlı master sevkiyatlar</p>
            </div>
            <button
              onClick={onNewShipmentClick}
              className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Yeni Sevkiyat</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {shipments.map((shipment) => {
              // Count completed docs
              const docs = Object.values(shipment.documents) as DocumentInfo[];
              const readyDocs = docs.filter((d) => d.status === 'hazir' || d.status === 'onaylandi').length;
              const totalAmount = shipment.items.reduce((s, i) => {
                const qty = shipment.actualLoadingEntered && i.actualLoadedQty !== undefined ? i.actualLoadedQty : i.orderedQty;
                return s + qty * i.unitPrice;
              }, 0);

              return (
                <div
                  key={shipment.id}
                  onClick={() => onSelectShipment(shipment.id)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-sm text-teal-800">
                        {shipment.shipmentCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {shipment.customer.companyName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                        {shipment.customer.country}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span>Liman: <strong className="text-slate-700">{shipment.logistics.dischargePort}</strong></span>
                      <span>•</span>
                      <span>Teslim: <strong className="text-slate-700">{shipment.logistics.incoterm}</strong></span>
                      <span>•</span>
                      <span>Yükleme: <strong className="text-slate-700">{shipment.logistics.estimatedLoadingDate}</strong></span>
                    </div>

                    {/* Actual loading warning status */}
                    {!shipment.actualLoadingEntered && (
                      <div className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Gerçek Yükleme (Actual Loading) henüz girilmedi</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-slate-900">
                        €{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-end space-x-1">
                        <FileCheck className="w-3 h-3 text-teal-600" />
                        <span>Belge İlerlemesi: <strong className="text-slate-800">{readyDocs} / 7</strong></span>
                      </div>
                    </div>

                    <div className="p-1.5 bg-slate-100 group-hover:bg-teal-50 text-slate-500 group-hover:text-teal-700 rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={() => onNavigateTab('shipments')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center"
            >
              Tüm Sevkiyatları Detaylı Yönet
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* Right Column: Eksik Bilgi Uyarısı & Hızlı Başlat */}
        <div className="space-y-6">
          {/* Quick Guidance Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>7 Aşamalı İhracat Workflow</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ExPorta master sevkiyat mantığıyla çalışır. Girilen sipariş, ürün ve yükleme verilerinden tüm belgeler anında türetilir.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-800 block">Quotation & Proforma</strong>
                  <span className="text-slate-500">Müşteri teklifi ve sipariş teyidi oluşturun.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-800 block">Actual Loading & VGM</strong>
                  <span className="text-slate-500">Fiziki yüklenen adet ve kantar/VGM ağırlığını işleyin.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-800 block">Commercial Invoice & Packing List</strong>
                  <span className="text-slate-500">3 farklı şablon ile tek tıkla gümrük belgesi basın.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('documents')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Belge Merkezine Git
            </button>
          </div>

          {/* Quick Excel Import Banner */}
          <div className="bg-teal-900 text-white rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">Toplu Veri Aktarımı</span>
              <span className="p-1.5 bg-teal-800 rounded-md text-teal-300">Excel</span>
            </div>
            <h4 className="font-bold text-sm text-white">Müşteri ve Ürün Kataloğunuzu Excel'den Yükleyin</h4>
            <p className="text-xs text-teal-200 leading-relaxed">
              Mevcut Excel dosyalarınızdaki kolonları eşleştirerek yüzlerce ürünü ve alıcı firmayı saniyeler içinde ExPorta'ya aktarın.
            </p>
            <button
              onClick={() => onNavigateTab('customers')}
              className="w-full py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              Müşteriler / Ürünler Sayfasına Git
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
