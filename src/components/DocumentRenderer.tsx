import React from 'react';
import { MasterShipment, DocType, DocTemplate, CompanySettings } from '../types/exporta';
import { DOC_TYPE_ENGLISH_TITLES, toEnglishUpper } from '../lib/numbering';
import { resolveDocContent } from '../lib/commerce';
import type { Lang } from '../i18n/lang';
import { LOCALE } from '../i18n/lang';
import { messages } from '../i18n/messages';
import { unitLabel } from '../i18n/units';

interface DocumentRendererProps {
  shipment: MasterShipment;
  docType: DocType;
  template: DocTemplate;
  companySettings: CompanySettings;
  showImagesOverride?: boolean;
  /** The document's own language; Turkish keeps the bilingual labels documents have always had. */
  lang?: Lang;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  shipment,
  docType,
  template,
  companySettings,
  showImagesOverride,
  lang = 'tr',
}) => {
  const M = messages[lang];
  const L = M.doc;
  const c = L.colon;
  const isTr = lang === 'tr';
  // Turkish documents keep their established figures (12480.00); English and
  // French use their own grouping and decimal marks (12,480.00 / 12 480,00).
  const fixed = (n: number, d: number) =>
    isTr ? n.toFixed(d) : new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  const f2 = (n: number) => fixed(n, 2);
  const f1 = (n: number) => fixed(n, 1);
  const qty = (n: number) => (isTr ? String(n) : new Intl.NumberFormat(LOCALE[lang]).format(n));
  const unit = (u: string, n?: number) => unitLabel(u, lang, n);
  const docInfo = shipment.documents[docType];
  // Approved documents show their frozen content; others the live shipment at this document's stage.
  const { content } = resolveDocContent(shipment, docType, companySettings);
  const customer = content.buyer;
  const logistics = content.logistics;
  const issuer = content.issuer;
  const mode = (logistics.transportMode || 'Sea') as 'Sea' | 'Air' | 'Road' | 'Rail';
  const loadingLabel = M.places.loading[mode] ?? M.places.loading.Sea;
  const dischargeLabel = M.places.discharge[mode] ?? M.places.discharge.Sea;
  const revision = docInfo.revision ?? 0;
  const docNo = revision > 0 ? `${docInfo.docNumber} · Rev. ${revision}` : docInfo.docNumber;
  const isLoadingDoc = content.basis === 'loaded';
  const showVgm = (docType === 'packing_list' || docType === 'shipping_instruction') && content.declaredVgmKg !== undefined;

  // Show images by default for quotation & proforma, or if explicitly enabled
  const isImageSupportedDoc = docType === 'quotation' || docType === 'proforma';
  const showImages = showImagesOverride !== undefined 
    ? showImagesOverride 
    : (docInfo.showImages !== undefined ? docInfo.showImages : isImageSupportedDoc);

  const isPackingList = docType === 'packing_list';

  // Lines carry the quantity for this document's stage (ordered or actually loaded).
  const items = content.lines;
  const totalNetKg = content.totalNetKg;
  const totalGrossKg = content.totalCargoGrossKg;
  // With mixed currencies there is no total; the document says so instead of adding them up.
  const currency = content.currency ?? '—';
  const money = (n: number | null) => (n === null ? L.mixedTotal : `${f2(n)} ${currency}`);
  const moneyBare = (n: number | null) => (n === null ? '—' : f2(n));
  const docTitle = isTr ? DOC_TYPE_ENGLISH_TITLES[docType] || toEnglishUpper(docType) : L.titles[docType];
  // Payment terms are stored as codes; Turkish documents print the code as before.
  const payment = isTr ? content.payment.paymentMethod : M.payments[content.payment.paymentMethod] ?? content.payment.paymentMethod;
  const incotermLine = `${logistics.incoterm} ${content.namedPlace}`.trim();

  /** Printed on the document itself, so a provisional draft can never pass for the final one. */
  const ProvisionalBanner: React.FC = () =>
    content.provisional ? (
      <div className="my-3 border-2 border-dashed border-red-500 bg-red-50 px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-red-700">
        {L.provisional}
      </div>
    ) : null;

  /** Declared VGM and weighbridge figures, shown apart from the packing list's cargo gross. */
  const VgmBlock: React.FC<{ className?: string }> = ({ className = '' }) =>
    showVgm || content.measuredCargoGrossKg !== undefined ? (
      <div className={`text-[10px] space-y-0.5 ${className}`}>
        {content.measuredCargoGrossKg !== undefined && (
          <div className="flex justify-between gap-4">
            <span>{L.measuredGross}{c}</span>
            <span className="font-mono">{f1(content.measuredCargoGrossKg)} kg</span>
          </div>
        )}
        {content.containerTareKg !== undefined && showVgm && (
          <div className="flex justify-between gap-4">
            <span>{L.containerTare}{c}</span>
            <span className="font-mono">{f1(content.containerTareKg)} kg</span>
          </div>
        )}
        {showVgm && (
          <div className="flex justify-between gap-4 font-bold">
            <span>{L.vgmDeclared}{c}</span>
            <span className="font-mono">{f1(content.declaredVgmKg!)} kg</span>
          </div>
        )}
      </div>
    ) : null;

  // Company logo. Rendered only when set, so an empty logoUrl leaves every
  // template byte-identical to before. crossOrigin="anonymous" matches what the
  // canvas-based PDF export (html2canvas useCORS) needs for Supabase Storage URLs.
  const CompanyLogo: React.FC<{ className?: string }> = ({ className = '' }) =>
    issuer.logoUrl ? (
      <img
        src={issuer.logoUrl}
        alt={`${issuer.companyName} logo`}
        crossOrigin="anonymous"
        className={`object-contain ${className}`}
      />
    ) : null;

  /* ========================================================================
   * TEMPLATE 01: CLASSIC (Traditional Serif/Sans, double line box, classic logo)
   * ======================================================================== */
  if (template === 'classic') {
    return (
      <div lang={lang} className="w-full bg-white text-slate-900 font-sans text-[11px] p-8 border border-slate-300 shadow-md min-h-[1000px] relative">
        {/* Top Header */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-slate-800">
          <div className="space-y-1 max-w-sm font-sans">
            <CompanyLogo className="max-h-16 max-w-[180px] mb-2" />
            <h1 className="font-extrabold text-lg text-slate-900 tracking-wide uppercase">{issuer.companyName}</h1>
            <p className="text-[10px] text-slate-600 leading-tight">{issuer.address}, {issuer.city} / {issuer.country}</p>
            <p className="text-[10px] text-slate-600">{L.classic.tel}{c} {issuer.phone} | {L.classic.email}{c} {issuer.email}</p>
            <p className="text-[10px] text-slate-600">{L.classic.taxOfficeNo}{c} {issuer.taxOffice} - {issuer.taxNo}</p>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-wider font-mono">{toEnglishUpper(docTitle)}</h2>
            <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded inline-block border border-slate-300">
              {L.classic.no}{c} {docNo}
            </div>
            <p className="text-[10px] text-slate-600 font-sans">{L.classic.date}{c} {docInfo.updatedAt}</p>
          </div>
        </div>

        {/* Buyer & Logistics Block Grid */}
        <div className="grid grid-cols-2 gap-6 my-6 font-sans">
          {/* Buyer Box */}
          <div className="border border-slate-400 p-3 rounded">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-600 mb-1 border-b pb-1">{L.classic.buyer}</h3>
            <p className="font-bold text-xs text-slate-900">{customer.companyName}</p>
            <p className="text-[10px] text-slate-700">{customer.address}, {customer.city}</p>
            <p className="font-bold text-[10px] text-slate-800">{customer.country}</p>
            <p className="text-[10px] text-slate-600">{L.classic.vat}{c} {customer.taxNo || '-'}</p>
            <p className="text-[10px] text-slate-600">{L.classic.attn}{c} {customer.contactPerson || '-'}</p>
          </div>

          {/* Shipment Terms Box */}
          <div className="border border-slate-400 p-3 rounded space-y-1">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-600 mb-1 border-b pb-1">{L.classic.terms}</h3>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">{L.classic.incoterm}{c}</span>
              <strong className="text-slate-900">{incotermLine}</strong>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">{L.classic.payment}{c}</span>
              <strong className="text-slate-900">{payment}</strong>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">{loadingLabel}{c}</span>
              <span className="text-slate-800">{logistics.loadingPort}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">{dischargeLabel}{c}</span>
              <span className="text-slate-800">{logistics.dischargePort || '—'}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">{L.classic.carrier}{c}</span>
              <span className="text-slate-800">{[logistics.carrierCompany, logistics.vesselFlightNo].filter(Boolean).join(' / ') || '—'}</span>
            </div>
          </div>
        </div>

        <ProvisionalBanner />

        {/* Table of Items.
            border-separate (not border-collapse) + wrapper/row borders:
            html2canvas 1.4.x mis-lays-out border-collapse tables, shifting
            cell content so headers overlap the first row in PDF/print
            capture (fine on screen). This scheme renders identically in
            both. Vertical rules via border-r on all but the last cell. */}
        <div className="my-6 font-sans">
          <table className="w-full text-left border-separate border-spacing-0 border border-slate-400 text-[10px]">
            <thead className="bg-slate-200 text-slate-900 font-bold uppercase">
              {isPackingList ? (
                <tr>
                  <th className="p-2 border-b border-r border-slate-400">#</th>
                  {showImages && <th className="p-2 border-b border-r border-slate-400 text-center">{L.classic.colImage}</th>}
                  <th className="p-2 border-b border-r border-slate-400">{L.classic.colCode}</th>
                  <th className="p-2 border-b border-r border-slate-400">{L.classic.colDesc}</th>
                  <th className="p-2 border-b border-r border-slate-400">{L.classic.colHs}</th>
                  <th className="p-2 border-b border-r border-slate-400 text-center">{L.classic.colQty}</th>
                  <th className="p-2 border-b border-r border-slate-400 text-right">{L.classic.colNet}</th>
                  <th className="p-2 border-b border-slate-400 text-right">{L.classic.colGross}</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-2 border-b border-r border-slate-400">#</th>
                  {showImages && <th className="p-2 border-b border-r border-slate-400 text-center">{L.classic.colImage}</th>}
                  <th className="p-2 border-b border-r border-slate-400">{L.classic.colCode}</th>
                  <th className="p-2 border-b border-r border-slate-400">{L.classic.colDesc}</th>
                  <th className="p-2 border-b border-r border-slate-400">{L.classic.colHs}</th>
                  <th className="p-2 border-b border-r border-slate-400 text-center">{L.classic.colQty}</th>
                  <th className="p-2 border-b border-r border-slate-400 text-right">{L.classic.colPrice}</th>
                  <th className="p-2 border-b border-slate-400 text-right">{L.classic.colTotal}</th>
                </tr>
              )}
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const rowBorder = idx < items.length - 1 ? 'border-b border-slate-300' : '';
                return (
                <tr key={item.itemId}>
                  <td className={`p-2 border-r border-slate-300 ${rowBorder}`}>{idx + 1}</td>
                  {showImages && (
                    <td className={`p-1 border-r border-slate-300 text-center ${rowBorder}`}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-10 h-10 object-cover rounded border border-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-400 text-[9px] italic">-</span>
                      )}
                    </td>
                  )}
                  <td className={`p-2 border-r border-slate-300 font-mono font-bold ${rowBorder}`}>{item.productCode}</td>
                  <td className={`p-2 border-r border-slate-300 ${rowBorder}`}>
                    <strong className="block text-slate-900">{item.productName}</strong>
                    {item.notes && <span className="text-slate-600 text-[9px]">{item.notes}</span>}
                  </td>
                  <td className={`p-2 border-r border-slate-300 font-mono ${rowBorder}`}>{item.hsCode}</td>
                  <td className={`p-2 border-r border-slate-300 text-center font-bold ${rowBorder}`}>{qty(item.qty)} {unit(item.unit, item.qty)}</td>
                  {isPackingList ? (
                    <>
                      <td className={`p-2 border-r border-slate-300 text-right font-mono ${rowBorder}`}>{f1(item.netKg)} kg</td>
                      <td className={`p-2 text-right font-mono font-bold ${rowBorder}`}>{f1(item.cargoGrossKg)} kg</td>
                    </>
                  ) : (
                    <>
                      <td className={`p-2 border-r border-slate-300 text-right font-mono ${rowBorder}`}>{f2(item.unitPrice)} {currency}</td>
                      <td className={`p-2 text-right font-mono font-bold ${rowBorder}`}>{f2(item.amount)} {currency}</td>
                    </>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Product Visual Presentation Section if showImages.
            doc-capture-hide: on-screen editing aid only — stripped from the
            PDF (html2canvas onclone) and print (@media print) output so the
            business document stays lean. */}
        {showImages && (
          <div className="doc-capture-hide my-6 border border-slate-300 rounded p-4 bg-slate-50 font-sans">
            <h4 className="font-bold text-slate-800 text-[11px] mb-3 border-b border-slate-300 pb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>{L.classic.visual}</span>
              <span className="text-[9px] text-slate-500 font-normal">{L.classic.visualSub}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.itemId} className="bg-white p-2.5 rounded border border-slate-200 flex flex-col items-center text-center space-y-1.5 shadow-2xs">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-24 h-20 object-cover rounded border border-slate-200" />
                  ) : (
                    <div className="w-24 h-20 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-[9px]">{L.classic.noImage}</div>
                  )}
                  <div className="font-mono text-[9px] font-bold text-teal-800">{item.productCode}</div>
                  <div className="font-semibold text-[10px] text-slate-900 line-clamp-2">{item.productName}</div>
                  <div className="text-[9px] text-slate-600 font-mono font-bold">{f2(item.unitPrice)} {currency} / {unit(item.unit)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals & Bank Footer */}
        <div className="grid grid-cols-2 gap-6 my-6 font-sans">
          <div className="p-3 border border-slate-300 rounded text-[10px] space-y-1 bg-slate-50">
            <h4 className="font-bold text-slate-800">{L.classic.bank}</h4>
            <p><strong>{L.classic.bankName}{c}</strong> {issuer.bankName} - {issuer.bankBranch}</p>
            <p><strong>IBAN{c}</strong> <span className="font-mono">{issuer.iban}</span></p>
            <p><strong>{L.classic.swift}{c}</strong> <span className="font-mono">{issuer.swiftCode}</span></p>
          </div>

          <div className="p-3 border border-slate-400 rounded space-y-1 text-right font-mono text-[11px] bg-slate-100">
            {!isPackingList && (
              <div className="flex justify-between">
                <span>{L.classic.subtotal}{c}</span>
                <strong>{money(content.total)}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span>{L.classic.totalNet}{c}</span>
              <span>{f1(totalNetKg)} kg</span>
            </div>
            <div className="flex justify-between">
              <span>{L.classic.totalGross}{c}</span>
              <strong>{f1(totalGrossKg)} kg</strong>
            </div>
            <VgmBlock className="font-sans text-slate-700" />
            {!isPackingList && (
              <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-400 pt-1 mt-1">
                <span>{L.classic.grandTotal} ({currency}){c}</span>
                <span>{money(content.total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Notes Section */}
        {docInfo.notes && (
          <div className="my-5 p-3.5 border border-slate-400 rounded bg-slate-50 font-sans text-[10px] space-y-1">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-300 pb-1 flex justify-between items-center">
              <span>{L.classic.notes}</span>
              <span className="text-[9px] font-normal text-slate-500">{L.classic.notesTag}</span>
            </h4>
            <p className="whitespace-pre-line text-slate-800 leading-relaxed font-sans">{docInfo.notes}</p>
          </div>
        )}

        {/* Signature stamp area */}
        <div className="pt-8 flex justify-between items-end border-t border-slate-300 font-sans text-[10px]">
          <div>
            <p className="text-slate-500">{L.classic.issuedBy}</p>
            <p className="text-slate-500">{L.classic.date}{c} {docInfo.updatedAt}</p>
          </div>
          <div className="text-center w-48 border-t border-slate-400 pt-2 font-bold text-slate-800">
            {issuer.companyName}
            <br />
            <span className="font-normal text-[9px] text-slate-500">{L.classic.signature}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================================
   * TEMPLATE 02: MODERN (Teal accent bar, clean typography, sleek grid layout)
   * ======================================================================== */
  if (template === 'modern') {
    return (
      <div lang={lang} className="w-full bg-white text-slate-900 font-sans text-[11px] p-8 border border-slate-200 shadow-md min-h-[1000px] relative">
        {/* Top Teal Accent Bar */}
        <div className="h-2 bg-teal-600 rounded-t w-full -mt-8 -mx-8 mb-6" />

        {/* Header Grid */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {issuer.logoUrl ? (
                <CompanyLogo className="max-h-10 max-w-[140px]" />
              ) : (
                <div className="w-7 h-7 bg-teal-600 text-white font-bold text-sm flex items-center justify-center rounded">eX</div>
              )}
              <span className="font-extrabold text-base text-slate-900 tracking-tight">{issuer.companyName}</span>
            </div>
            <p className="text-[10px] text-slate-500">{issuer.address}, {issuer.city}</p>
            <p className="text-[10px] text-slate-500">{L.modern.taxNo}{c} {issuer.taxNo} | {issuer.email}</p>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-black rounded border border-teal-200 font-mono inline-block mb-1">
              {toEnglishUpper(docTitle)}
            </span>
            <div className="text-sm font-extrabold font-mono text-slate-900">{docNo}</div>
            <p className="text-[10px] text-slate-500">{L.modern.issueDate}{c} {docInfo.updatedAt}</p>
          </div>
        </div>

        {/* Buyer & Logistics 2-column card layout */}
        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[9px] font-bold text-teal-700 uppercase tracking-widest block">{L.modern.buyer}</span>
            <h3 className="font-bold text-sm text-slate-900">{customer.companyName}</h3>
            <p className="text-[10px] text-slate-600">{customer.address}, {customer.city} / {customer.country}</p>
            <p className="text-[10px] text-slate-500">{L.modern.vat}{c} {customer.taxNo} | {L.modern.contact}{c} {customer.contactPerson}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[9px] font-bold text-teal-700 uppercase tracking-widest block">{L.modern.details}</span>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">{L.modern.incoterm}{c}</span><strong className="text-slate-900">{incotermLine}</strong></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">{L.modern.payment}{c}</span><strong className="text-slate-900">{payment}</strong></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">{loadingLabel}{c}</span><span>{logistics.loadingPort}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">{dischargeLabel}{c}</span><span>{logistics.dischargePort || '—'}</span></div>
          </div>
        </div>

        <ProvisionalBanner />

        {/* Modern Table */}
        <div className="my-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              {isPackingList ? (
                <tr>
                  {showImages && <th className="p-2.5 text-center">{L.modern.colImage}</th>}
                  <th className="p-2.5">{L.modern.colCode}</th>
                  <th className="p-2.5">{L.modern.colDesc}</th>
                  <th className="p-2.5">{L.modern.colHs}</th>
                  <th className="p-2.5 text-center">{L.modern.colQty}</th>
                  <th className="p-2.5 text-right">{L.modern.colNet}</th>
                  <th className="p-2.5 text-right">{L.modern.colGross}</th>
                </tr>
              ) : (
                <tr>
                  {showImages && <th className="p-2.5 text-center">{L.modern.colImage}</th>}
                  <th className="p-2.5">{L.modern.colCode}</th>
                  <th className="p-2.5">{L.modern.colDesc}</th>
                  <th className="p-2.5">{L.modern.colHs}</th>
                  <th className="p-2.5 text-center">{L.modern.colQty}</th>
                  <th className="p-2.5 text-right">{L.modern.colPrice}</th>
                  <th className="p-2.5 text-right">{L.modern.colAmount} ({currency})</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.itemId} className="hover:bg-slate-50">
                  {showImages && (
                    <td className="p-2 text-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-10 h-10 object-cover rounded border border-slate-200 mx-auto" />
                      ) : (
                        <span className="text-slate-400 text-[9px]">-</span>
                      )}
                    </td>
                  )}
                  <td className="p-2.5 font-mono font-bold text-teal-800">{item.productCode}</td>
                  <td className="p-2.5 font-semibold text-slate-900">{item.productName}</td>
                  <td className="p-2.5 font-mono">{item.hsCode}</td>
                  <td className="p-2.5 text-center font-bold">{qty(item.qty)} {unit(item.unit, item.qty)}</td>
                  {isPackingList ? (
                    <>
                      <td className="p-2.5 text-right font-mono">{f1(item.netKg)} kg</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{f1(item.cargoGrossKg)} kg</td>
                    </>
                  ) : (
                    <>
                      <td className="p-2.5 text-right font-mono">{f2(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{f2(item.amount)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Product Visual Presentation Section in MODERN — see doc-capture-hide note above */}
        {showImages && (
          <div className="doc-capture-hide my-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">{L.modern.visual}</span>
              <span className="text-[10px] text-slate-500 font-mono">{L.modern.visualSub}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.itemId} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center space-y-1.5 shadow-2xs">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-24 h-20 object-cover rounded-md border border-slate-200" />
                  ) : (
                    <div className="w-24 h-20 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 text-[9px]">{L.modern.noImage}</div>
                  )}
                  <div className="font-mono text-[9px] font-bold text-teal-700">{item.productCode}</div>
                  <div className="font-semibold text-[10px] text-slate-900 line-clamp-2">{item.productName}</div>
                  <div className="text-[9px] text-slate-600 font-mono font-bold">{f2(item.unitPrice)} {currency} / {unit(item.unit)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end my-6">
          <div className="w-72 bg-teal-50 p-4 rounded-lg border border-teal-200 space-y-1.5 font-mono text-[11px] text-right">
            {!isPackingList && (
              <div className="flex justify-between"><span className="text-slate-600">{L.modern.subtotal}{c}</span><strong>{money(content.total)}</strong></div>
            )}
            <div className="flex justify-between"><span className="text-slate-600">{L.modern.net}{c}</span><span>{f1(totalNetKg)} kg</span></div>
            <div className="flex justify-between"><span className="text-slate-600">{L.modern.gross}{c}</span><strong>{f1(totalGrossKg)} kg</strong></div>
            <VgmBlock className="font-sans text-slate-700" />
            {!isPackingList && (
              <div className="flex justify-between text-xs font-black text-slate-900 border-t border-teal-300 pt-2">
                <span>{L.modern.total}{c}</span>
                <span>{money(content.total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Notes Section */}
        {docInfo.notes && (
          <div className="my-5 p-4 bg-slate-50 rounded-lg border border-slate-200 font-sans text-[10px] space-y-1">
            <h4 className="font-bold text-teal-800 text-[9px] uppercase tracking-widest border-b border-slate-200 pb-1 flex justify-between items-center">
              <span>{L.modern.notes}</span>
              <span className="text-[9px] font-normal text-slate-400">{L.modern.notesTag}</span>
            </h4>
            <p className="whitespace-pre-line text-slate-700 leading-relaxed">{docInfo.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
          <div>{L.modern.bank}{c} {issuer.bankName} | IBAN{c} {issuer.iban} | SWIFT{c} {issuer.swiftCode}</div>
          <div className="font-bold text-slate-800">{issuer.companyName}</div>
        </div>
      </div>
    );
  }

  /* ========================================================================
   * TEMPLATE 03: COMPACT (High-density grid layout, compact margins)
   * ======================================================================== */
  return (
    <div lang={lang} className="w-full bg-white text-slate-900 font-sans text-[10px] p-6 border border-slate-300 shadow-md min-h-[1000px] relative">
      <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-2.5">
          <CompanyLogo className="max-h-11 max-w-[120px]" />
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 uppercase">{issuer.companyName}</h1>
            <p className="text-[9px] text-slate-600">{issuer.address} | {L.compact.tax}{c} {issuer.taxNo}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-base font-black font-mono text-slate-900">{toEnglishUpper(docTitle)}</h2>
          <div className="font-mono text-xs font-bold text-slate-800">{docNo}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 my-3 text-[9px]">
        <div className="border border-slate-300 p-2 rounded bg-slate-50">
          <strong className="block text-slate-800 uppercase font-bold border-b pb-0.5 mb-1">{L.compact.buyer}</strong>
          <p className="font-bold text-slate-900">{customer.companyName}</p>
          <p>{customer.address}, {customer.country}</p>
          <p>{L.compact.taxId}{c} {customer.taxNo}</p>
        </div>

        <div className="border border-slate-300 p-2 rounded space-y-0.5">
          <strong className="block text-slate-800 uppercase font-bold border-b pb-0.5 mb-1">{L.compact.terms}</strong>
          <div>{L.compact.incoterm}{c} <strong>{incotermLine}</strong></div>
          <div>{L.compact.payment}{c} <strong>{payment}</strong></div>
          <div>{L.compact.date}{c} <strong>{docInfo.updatedAt}</strong></div>
        </div>
      </div>

      <ProvisionalBanner />

      {/* border-separate, not border-collapse: html2canvas mis-renders
          collapsed-border tables in PDF/print (cell content overlaps
          headers). See the classic template's table for the same fix. */}
      <table className="w-full text-left border-separate border-spacing-0 border border-slate-300 text-[9px] my-3">
        <thead className="bg-slate-100 font-bold uppercase">
          {isPackingList ? (
            <tr>
              {showImages && <th className="p-1.5 border-b border-r border-slate-300 text-center">{L.compact.colImage}</th>}
              <th className="p-1.5 border-b border-r border-slate-300">{L.compact.colCode}</th>
              <th className="p-1.5 border-b border-r border-slate-300">{L.compact.colDesc}</th>
              <th className="p-1.5 border-b border-r border-slate-300">{L.compact.colHs}</th>
              <th className="p-1.5 border-b border-r border-slate-300 text-center">{L.compact.colQty}</th>
              <th className="p-1.5 border-b border-r border-slate-300 text-right">{L.compact.colNet}</th>
              <th className="p-1.5 border-b border-slate-300 text-right">{L.compact.colGross}</th>
            </tr>
          ) : (
            <tr>
              {showImages && <th className="p-1.5 border-b border-r border-slate-300 text-center">{L.compact.colImage}</th>}
              <th className="p-1.5 border-b border-r border-slate-300">{L.compact.colCode}</th>
              <th className="p-1.5 border-b border-r border-slate-300">{L.compact.colDesc}</th>
              <th className="p-1.5 border-b border-r border-slate-300">{L.compact.colHs}</th>
              <th className="p-1.5 border-b border-r border-slate-300 text-center">{L.compact.colQty}</th>
              <th className="p-1.5 border-b border-r border-slate-300 text-right">{L.compact.colPrice}</th>
              <th className="p-1.5 border-b border-slate-300 text-right">{L.compact.colTotal} ({currency})</th>
            </tr>
          )}
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const rowBorder = idx < items.length - 1 ? 'border-b border-slate-200' : '';
            return (
            <tr key={item.itemId}>
              {showImages && (
                <td className={`p-1 border-r border-slate-200 text-center ${rowBorder}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-8 h-8 object-cover rounded border border-slate-200 mx-auto" />
                  ) : (
                    <span className="text-slate-400 text-[8px]">-</span>
                  )}
                </td>
              )}
              <td className={`p-1.5 border-r border-slate-200 font-mono font-bold ${rowBorder}`}>{item.productCode}</td>
              <td className={`p-1.5 border-r border-slate-200 ${rowBorder}`}>{item.productName}</td>
              <td className={`p-1.5 border-r border-slate-200 font-mono ${rowBorder}`}>{item.hsCode}</td>
              <td className={`p-1.5 border-r border-slate-200 text-center font-bold ${rowBorder}`}>{qty(item.qty)} {unit(item.unit, item.qty)}</td>
              {isPackingList ? (
                <>
                  <td className={`p-1.5 border-r border-slate-200 text-right font-mono ${rowBorder}`}>{f1(item.netKg)} kg</td>
                  <td className={`p-1.5 text-right font-mono font-bold ${rowBorder}`}>{f1(item.cargoGrossKg)} kg</td>
                </>
              ) : (
                <>
                  <td className={`p-1.5 border-r border-slate-200 text-right font-mono ${rowBorder}`}>{f2(item.unitPrice)}</td>
                  <td className={`p-1.5 text-right font-mono font-bold ${rowBorder}`}>{f2(item.amount)}</td>
                </>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>

      {/* Product Visual Presentation Section in COMPACT — see doc-capture-hide note above */}
      {showImages && (
        <div className="doc-capture-hide my-3 bg-slate-50 p-3 rounded border border-slate-300 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">{L.compact.visual}</span>
            <span className="text-[8px] text-slate-500 font-mono">{L.compact.visualSub}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <div key={item.itemId} className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center text-center space-y-1">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-16 h-14 object-cover rounded border border-slate-200" />
                ) : (
                  <div className="w-16 h-14 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-[8px]">{L.compact.noImage}</div>
                )}
                <div className="font-mono text-[8px] font-bold text-slate-800">{item.productCode}</div>
                <div className="font-semibold text-[9px] text-slate-900 line-clamp-1">{item.productName}</div>
                <div className="text-[8px] text-slate-600 font-mono font-bold">{f2(item.unitPrice)} {currency} / {unit(item.unit)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start my-3 text-[9px]">
        <div className="p-2 border border-slate-300 rounded max-w-xs space-y-0.5">
          <strong>{L.compact.bank}{c}</strong> {issuer.bankName} | <strong>IBAN{c}</strong> {issuer.iban}
        </div>
        <div className="p-2 border border-slate-300 rounded text-right font-mono font-bold space-y-0.5 bg-slate-50">
          {!isPackingList && (
            <div>
              {L.compact.totalAmount}{c} {money(content.total)}
            </div>
          )}
          <div>
            {L.compact.totalNet}{c} {f1(totalNetKg)} kg
          </div>
          <div>
            {L.compact.totalGross}{c} {f1(totalGrossKg)} kg
          </div>
          <VgmBlock className="font-sans font-normal" />
        </div>
      </div>

      {docInfo.notes && (
        <div className="my-3 p-2 border border-slate-300 rounded bg-slate-50 text-[9px]">
          <strong className="block text-slate-800 uppercase font-bold border-b pb-0.5 mb-1">{L.compact.notes}</strong>
          <p className="whitespace-pre-line text-slate-700">{docInfo.notes}</p>
        </div>
      )}
    </div>
  );
};
