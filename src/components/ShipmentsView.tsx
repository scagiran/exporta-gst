import React, { useEffect, useMemo, useState } from 'react';
import { MasterShipment, Customer, Product, CompanySettings, LogisticsInfo, PaymentTerms } from '../types/exporta';
import { Ship, Plus, Search, AlertTriangle, ChevronRight, FileCheck, Check, PackagePlus, Loader2, Info } from 'lucide-react';
import { ModalCloseButton } from './ModalCloseButton';
import { useEscapeClose } from '../lib/useEscapeClose';
import { useLang } from '../i18n';
import { PAYMENT_CODES } from '../i18n/messages/appShipments';
import { buildDocContent, SEA_ONLY_INCOTERMS } from '../lib/commerce';
import { loadingBucket, dayInZone } from '../lib/schedule';
import { unitLabel } from '../i18n/units';
import type { CreateShipmentResult } from '../lib/saveTypes';

/** Everything the form provides; numbers, documents and dates are added when the shipment is created. */
export type NewShipmentDraft = Omit<MasterShipment, 'id' | 'shipmentCode' | 'documents' | 'createdAt' | 'updatedAt'>;

type Incoterm = LogisticsInfo['incoterm'];
type Mode = LogisticsInfo['transportMode'];
const INCOTERMS: Incoterm[] = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DDP'];
const MODES: Mode[] = ['Sea', 'Air', 'Road', 'Rail'];
const ORIGIN_SIDE: Incoterm[] = ['EXW', 'FCA', 'FOB'];

interface ShipmentsViewProps {
  shipments: MasterShipment[];
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings;
  /** True when the top bar, sidebar or dashboard asked for a new shipment. */
  wizardRequested: boolean;
  onWizardRequestHandled: () => void;
  onSelectShipment: (id: string) => void;
  onCreateShipment: (draft: NewShipmentDraft) => Promise<CreateShipmentResult>;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({
  shipments,
  customers,
  products,
  companySettings,
  wizardRequested,
  onWizardRequestHandled,
  onSelectShipment,
  onCreateShipment,
}) => {
  const { t, money, num, lang } = useLang();
  const sh = t.shipments;
  const w = t.wizard;
  const [search, setSearch] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardDirty, setWizardDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form state. No hidden defaults: places, quantities and the carrier are entered by the user.
  const [customerId, setCustomerId] = useState('');
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, string>>({});
  const [incoterm, setIncoterm] = useState<Incoterm>('FOB');
  const [mode, setMode] = useState<Mode>('Sea');
  const [paymentMethod, setPaymentMethod] = useState<PaymentTerms['paymentMethod']>('Advance Payment (%100)');
  const [loadingPort, setLoadingPort] = useState('');
  const [dischargePort, setDischargePort] = useState('');
  const [namedPlace, setNamedPlace] = useState('');
  const [namedPlaceTouched, setNamedPlaceTouched] = useState(false);
  const [destinationCountry, setDestinationCountry] = useState('');
  const [carrier, setCarrier] = useState('');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');
  const [buyerChangedNote, setBuyerChangedNote] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerId(customers[0]?.id ?? '');
    setDestinationCountry(customers[0]?.country ?? '');
    setQtyByProduct({});
    setIncoterm('FOB');
    setMode('Sea');
    setPaymentMethod('Advance Payment (%100)');
    setLoadingPort('');
    setDischargePort('');
    setNamedPlace('');
    setNamedPlaceTouched(false);
    setCarrier('');
    setEtd('');
    setEta('');
    setBuyerChangedNote(null);
    setFormError(null);
  };

  const openWizard = () => {
    resetForm();
    setWizardDirty(false);
    setIsWizardOpen(true);
  };

  // Every "new shipment" button in the app lands here and opens the same form.
  useEffect(() => {
    if (!wizardRequested) return;
    openWizard();
    onWizardRequestHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardRequested]);

  const closeWizard = () => {
    if (creating) return;
    if (wizardDirty && !window.confirm(t.forms.unsaved)) return;
    setIsWizardOpen(false);
    setWizardDirty(false);
  };
  useEscapeClose(isWizardOpen, closeWizard);

  // The Incoterms® named place follows the rule's side until the user types their own.
  useEffect(() => {
    if (namedPlaceTouched) return;
    setNamedPlace(ORIGIN_SIDE.includes(incoterm) ? loadingPort : dischargePort);
  }, [incoterm, loadingPort, dischargePort, namedPlaceTouched]);

  const changeCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomerId(id);
    if (cust) {
      setDestinationCountry(cust.country);
      // A different buyer usually means a different route; never keep the old one silently.
      if (dischargePort || namedPlace) setBuyerChangedNote(w.buyerChanged(cust.country));
    }
  };

  const selected = useMemo(
    () =>
      products
        .filter((p) => qtyByProduct[p.id] !== undefined)
        .map((p) => ({ product: p, qty: Number(String(qtyByProduct[p.id]).replace(',', '.')) })),
    [products, qtyByProduct]
  );
  const currencies = [...new Set(selected.map((s) => (s.product.currency || '').toUpperCase()))];

  const filteredShipments = shipments.filter(
    (s) =>
      s.shipmentCode.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.country.toLowerCase().includes(search.toLowerCase())
  );
  const today = dayInZone();

  const handleCreate = async () => {
    setFormError(null);
    const cust = customers.find((c) => c.id === customerId);
    if (!cust || selected.length === 0) return setFormError(sh.pickRequired);
    if (selected.some((s) => !Number.isFinite(s.qty) || s.qty <= 0)) return setFormError(w.qtyRequired);
    if (currencies.length > 1) return setFormError(w.currencyMismatch(currencies.join(', ')));
    if (!loadingPort.trim() || !dischargePort.trim() || !namedPlace.trim()) return setFormError(w.required);
    if (SEA_ONLY_INCOTERMS.includes(incoterm) && mode !== 'Sea') return setFormError(w.seaOnly(incoterm));

    const draft: NewShipmentDraft = {
      customerId: cust.id,
      customer: cust,
      actualLoadingEntered: false,
      notes: '',
      logistics: {
        incoterm,
        namedPlace: namedPlace.trim(),
        loadingPort: loadingPort.trim(),
        dischargePort: dischargePort.trim(),
        destinationCountry: destinationCountry.trim() || cust.country,
        transportMode: mode,
        carrierCompany: carrier.trim(),
        vesselFlightNo: '',
        bookingNo: '',
        estimatedLoadingDate: etd,
        estimatedArrivalDate: eta,
      },
      payment: {
        paymentMethod,
        // Bank details come from the company settings, never from sample data.
        bankAccountIban: companySettings.iban || '',
        currency: currencies[0] || 'EUR',
      },
      items: selected.map(({ product: p, qty }, i) => ({
        id: `si-${Date.now()}-${i}`,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        hsCode: p.hsCode,
        unit: p.unit,
        orderedQty: qty,
        unitPrice: p.unitPrice,
        currency: p.currency,
        netWeightKg: p.netWeightKg,
        grossWeightKg: p.grossWeightKg,
        imageUrl: p.imageUrl,
      })),
    };

    setCreating(true);
    const result = await onCreateShipment(draft);
    setCreating(false);
    if (!result.ok && !result.shipmentId) return setFormError(w.createFailed(result.error ?? ''));
    setWizardDirty(false);
    setIsWizardOpen(false);
    const notes = [result.outcome === 'failed' ? w.savedLocally : null, result.numbering === 'local' && result.outcome === 'saved' ? w.numberingLocal : null].filter(Boolean);
    setNotice(notes.length ? notes.join(' ') : null);
    if (result.shipmentId) onSelectShipment(result.shipmentId);
  };

  const fieldCls = 'w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500';

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ship className="w-5 h-5 text-teal-600" />
            <span>{sh.title}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">{sh.lead}</p>
        </div>
        <button
          onClick={openWizard}
          className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{sh.create}</span>
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={sh.search}
          className="w-full text-xs text-slate-800 focus:outline-none"
        />
      </div>

      <div className="space-y-4">
        {filteredShipments.map((shp) => {
          const docs = Object.values(shp.documents);
          const readyCount = docs.filter((d) => d.status === 'hazir' || d.status === 'onaylandi').length;
          // The value is the commercial invoice's: loaded quantities once entered, ordered before.
          const value = buildDocContent(shp, 'commercial_invoice', companySettings);
          const bucket = loadingBucket(shp, today);
          return (
            <div
              key={shp.id}
              onClick={() => onSelectShipment(shp.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono font-black text-base text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">{shp.shipmentCode}</span>
                  <h3 className="font-bold text-slate-900 text-sm">{shp.customer.companyName}</h3>
                  <span className="text-xs text-slate-500 font-medium">({shp.customer.country})</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>
                    {sh.incoterm}: <strong className="text-slate-800">{`${shp.logistics.incoterm} ${shp.logistics.namedPlace ?? ''}`.trim()}</strong>
                  </span>
                  <span>
                    {sh.port}: <strong className="text-slate-800">{shp.logistics.dischargePort || '—'}</strong>
                  </span>
                  <span>
                    {sh.payment}: <strong className="text-slate-800">{t.payments[shp.payment.paymentMethod] ?? shp.payment.paymentMethod}</strong>
                  </span>
                  <span>
                    {sh.etd}: <strong className="text-slate-800">{shp.logistics.estimatedLoadingDate || '—'}</strong>
                  </span>
                </div>
                {!shp.actualLoadingEntered ? (
                  <div className="inline-flex items-center space-x-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bucket === 'overdue' ? `${t.dashboard2.overdueBadge} · ${sh.noActual}` : sh.noActual}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{sh.actualOk(shp.actualLoadingDate || '')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-6 justify-between md:justify-end shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <div className="text-base font-black font-mono text-slate-900">
                    {value.total === null || !value.currency ? t.dashboard2.mixed : money(value.total, value.currency)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-end space-x-1 mt-0.5">
                    <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {sh.completion}: <strong className="text-slate-800">{readyCount}/7</strong>
                    </span>
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

      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <ModalCloseButton onClose={closeWizard} />
            <div className="px-6 py-4 bg-slate-900 text-white">
              <h3 id="wizard-title" className="font-bold text-base flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-teal-400" />
                <span>{sh.wizardTitle}</span>
              </h3>
            </div>

            <div className="p-6 space-y-5 text-xs" onChange={() => setWizardDirty(true)}>
              {customers.length === 0 && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{w.noCustomers}</p>}
              {products.length === 0 && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{w.noProducts}</p>}

              <div>
                <label htmlFor="wz-customer" className="block font-bold text-slate-800 mb-1">
                  {sh.customer}
                </label>
                <select id="wz-customer" value={customerId} onChange={(e) => changeCustomer(e.target.value)} className={`${fieldCls} bg-white`}>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.country})
                    </option>
                  ))}
                </select>
                {buyerChangedNote && (
                  <p role="status" className="mt-1.5 flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    {buyerChangedNote}
                  </p>
                )}
              </div>

              <fieldset>
                <legend className="block font-bold text-slate-800 mb-1">{sh.lines}</legend>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {products.map((p) => {
                    const checked = qtyByProduct[p.id] !== undefined;
                    return (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setQtyByProduct((prev) => {
                                const next = { ...prev };
                                if (e.target.checked) next[p.id] = '';
                                else delete next[p.id];
                                return next;
                              })
                            }
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span className="font-mono font-bold text-teal-800">{p.code}</span>
                          <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-600">
                            {num(p.unitPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {p.currency}
                          </span>
                          {checked && (
                            <label className="flex items-center gap-1">
                              <span className="sr-only">{w.qty}</span>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                required
                                placeholder={w.qty}
                                value={qtyByProduct[p.id]}
                                onChange={(e) => setQtyByProduct((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                className="w-24 border border-slate-300 rounded p-1 font-mono text-right"
                              />
                              <span className="text-slate-500">{unitLabel(p.unit, lang)}</span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {currencies.length > 1 && (
                  <p role="alert" className="mt-1.5 text-red-700">
                    {w.currencyMismatch(currencies.join(', '))}
                  </p>
                )}
                {currencies.length === 1 && (
                  <p className="mt-1.5 text-slate-500">
                    {w.currency}: <strong>{currencies[0]}</strong>
                  </p>
                )}
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="wz-mode" className="block font-semibold text-slate-700 mb-1">{w.mode}</label>
                  <select id="wz-mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={`${fieldCls} bg-white`}>
                    {MODES.map((m) => (
                      <option key={m} value={m}>{t.modes[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="wz-incoterm" className="block font-semibold text-slate-700 mb-1">{sh.incotermLabel}</label>
                  <select id="wz-incoterm" value={incoterm} onChange={(e) => setIncoterm(e.target.value as Incoterm)} className={`${fieldCls} bg-white`}>
                    {INCOTERMS.map((code) => (
                      <option key={code} value={code}>
                        {code}{t.incoterms[code as keyof typeof t.incoterms] ? ` - ${t.incoterms[code as keyof typeof t.incoterms]}` : ''}
                      </option>
                    ))}
                  </select>
                  {SEA_ONLY_INCOTERMS.includes(incoterm) && mode !== 'Sea' && <p className="mt-1 text-red-700">{w.seaOnly(incoterm)}</p>}
                </div>
                <div>
                  <label htmlFor="wz-payment" className="block font-semibold text-slate-700 mb-1">{sh.paymentLabel}</label>
                  <select id="wz-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentTerms['paymentMethod'])} className={`${fieldCls} bg-white`}>
                    {PAYMENT_CODES.map((code) => (
                      <option key={code} value={code}>{t.payments[code]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wz-loading" className="block font-semibold text-slate-700 mb-1">{t.places.loading[mode]} *</label>
                  <input id="wz-loading" type="text" value={loadingPort} onChange={(e) => setLoadingPort(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="wz-discharge" className="block font-semibold text-slate-700 mb-1">{t.places.discharge[mode]} *</label>
                  <input id="wz-discharge" type="text" value={dischargePort} onChange={(e) => { setDischargePort(e.target.value); setBuyerChangedNote(null); }} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="wz-place" className="block font-semibold text-slate-700 mb-1">{w.namedPlace}</label>
                  <input
                    id="wz-place"
                    type="text"
                    value={namedPlace}
                    onChange={(e) => {
                      setNamedPlace(e.target.value);
                      setNamedPlaceTouched(true);
                    }}
                    className={fieldCls}
                  />
                  <p className="mt-1 text-slate-500">{w.namedPlaceHint(ORIGIN_SIDE.includes(incoterm))}</p>
                </div>
                <div>
                  <label htmlFor="wz-country" className="block font-semibold text-slate-700 mb-1">{w.destinationCountry}</label>
                  <input id="wz-country" type="text" value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="wz-etd" className="block font-semibold text-slate-700 mb-1">{sh.etdLabel}</label>
                  <input id="wz-etd" type="date" value={etd} onChange={(e) => setEtd(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="wz-eta" className="block font-semibold text-slate-700 mb-1">{w.eta}</label>
                  <input id="wz-eta" type="date" value={eta} onChange={(e) => setEta(e.target.value)} className={fieldCls} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="wz-carrier" className="block font-semibold text-slate-700 mb-1">{w.carrier}</label>
                  <input id="wz-carrier" type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} className={fieldCls} />
                </div>
              </div>

              {!companySettings.iban && (
                <p className="flex items-center gap-1 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  {w.ibanMissing}
                </p>
              )}

              {formError && (
                <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 font-semibold text-red-800">
                  {formError}
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={closeWizard} disabled={creating} className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg disabled:opacity-50">
                  {sh.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || customers.length === 0 || products.length === 0}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                  <span>{creating ? w.creating : sh.start}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
