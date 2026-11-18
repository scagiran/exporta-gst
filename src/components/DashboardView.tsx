import React from 'react';
import { MasterShipment, OnboardingStep, DocumentInfo } from '../types/exporta';
import { OnboardingWidget } from './OnboardingWidget';
import { NavTab } from './Sidebar';
import { useLang } from '../i18n';
import { DOC_QTY_BASIS, itemQty } from '../lib/commerce';
import { lineAmountCents, totalsByCurrency } from '../lib/money';
import { countBuckets, dayInZone, loadingBucket } from '../lib/schedule';
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
  const { t, money } = useLang();
  const d = t.dashboard;
  // Metrics calculations
  const totalShipments = shipments.length;
  const today = dayInZone();

  // Value of each shipment at its invoice stage: loaded quantities once entered, ordered before.
  // Amounts in different currencies are kept apart, never added together.
  const shipmentEntries = (shp: MasterShipment) =>
    shp.items.map((it) => ({
      currency: it.currency || shp.payment.currency,
      cents: lineAmountCents(itemQty(it, DOC_QTY_BASIS.commercial_invoice, shp.actualLoadingEntered), it.unitPrice),
    }));
  const portfolio = totalsByCurrency(shipments.flatMap(shipmentEntries));

  // Incomplete files: loading not entered yet, or a document still missing.
  const incompleteShipments = shipments.filter((s) => {
    const missingDocs = (Object.values(s.documents) as DocumentInfo[]).some((d) => d.status === 'eksik');
    return !s.actualLoadingEntered || missingDocs;
  });

  // Loadings by real date, in Türkiye's day: today and later count as upcoming.
  const buckets = countBuckets(shipments, today);
  const upcomingCount = buckets.today + buckets.upcoming;

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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{d.activeShipments}</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{totalShipments}</span>
            <span className="text-xs text-emerald-600 font-medium">{d.shipmentCards}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{d.activeHint}</p>
        </div>

        {/* Metric 2: Toplam Sevkiyat Değeri */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{d.portfolio}</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono flex flex-col">
              {portfolio.length === 0 ? '—' : portfolio.map((p) => <span key={p.currency}>{money(p.amount, p.currency)}</span>)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{t.dashboard2.portfolioHint}</p>
        </div>

        {/* Metric 3: Eksik Bilgili Dosyalar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{d.incomplete}</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{incompleteShipments.length}</span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded">{d.attention}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{d.incompleteHint}</p>
        </div>

        {/* Metric 4: Yaklaşan Yüklemeler */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{d.upcoming}</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {upcomingCount}
            </span>
            <span className="text-xs text-teal-700 font-medium">{d.upcomingUnit}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{t.dashboard2.upcomingSub(buckets.overdue, buckets.completed)}</p>
        </div>
      </div>

      {/* Main Grid Section: Sevkiyat Listesi & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Master Shipments table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{d.listTitle}</h3>
              <p className="text-xs text-slate-500">{d.listLead}</p>
            </div>
            <button
              onClick={onNewShipmentClick}
              className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{d.newShipment}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {shipments.map((shipment) => {
              // Count completed docs
              const docs = Object.values(shipment.documents) as DocumentInfo[];
              const readyDocs = docs.filter((d) => d.status === 'hazir' || d.status === 'onaylandi').length;
              const totals = totalsByCurrency(shipmentEntries(shipment));
              const bucket = loadingBucket(shipment, today);

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
                      <span>{d.port}: <strong className="text-slate-700">{shipment.logistics.dischargePort}</strong></span>
                      <span>•</span>
                      <span>{d.incoterm}: <strong className="text-slate-700">{shipment.logistics.incoterm}</strong></span>
                      <span>•</span>
                      <span>{d.loading}: <strong className="text-slate-700">{shipment.logistics.estimatedLoadingDate}</strong></span>
                    </div>

                    {/* Actual loading warning status */}
                    {!shipment.actualLoadingEntered && (
                      <div className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>{bucket === 'overdue' ? `${t.dashboard2.overdueBadge} · ${d.noActual}` : d.noActual}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-slate-900">
                        {totals.length === 1 ? money(totals[0].amount, totals[0].currency) : t.dashboard2.mixed}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-end space-x-1">
                        <FileCheck className="w-3 h-3 text-teal-600" />
                        <span>{d.docProgress}: <strong className="text-slate-800">{readyDocs} / 7</strong></span>
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
              {d.manageAll}
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
              <span>{d.workflowTitle}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {d.workflowLead}
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-800 block">{d.flow[0].title}</strong>
                  <span className="text-slate-500">{d.flow[0].body}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-800 block">{d.flow[1].title}</strong>
                  <span className="text-slate-500">{d.flow[1].body}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-800 block">{d.flow[2].title}</strong>
                  <span className="text-slate-500">{d.flow[2].body}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('documents')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              {d.toDocuments}
            </button>
          </div>

          {/* Quick Excel Import Banner */}
          <div className="bg-teal-900 text-white rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">{d.importTag}</span>
              <span className="p-1.5 bg-teal-800 rounded-md text-teal-300">Excel</span>
            </div>
            <h4 className="font-bold text-sm text-white">{d.importTitle}</h4>
            <p className="text-xs text-teal-200 leading-relaxed">
              {d.importBody}
            </p>
            <button
              onClick={() => onNavigateTab('customers')}
              className="w-full py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              {d.toLists}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
