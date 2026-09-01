import React from 'react';
import { MasterShipment, DocType, DocTemplate, CompanySettings } from '../types/exporta';
import { DOC_TYPE_NAMES, DOC_TYPE_ENGLISH_TITLES, toEnglishUpper } from '../lib/numbering';
import { calculateVgmAndWeights } from '../lib/vgm';

interface DocumentRendererProps {
  shipment: MasterShipment;
  docType: DocType;
  template: DocTemplate;
  companySettings: CompanySettings;
  showImagesOverride?: boolean;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  shipment,
  docType,
  template,
  companySettings,
  showImagesOverride,
}) => {
  const docInfo = shipment.documents[docType];
  const customer = shipment.customer;

  // Show images by default for quotation & proforma, or if explicitly enabled
  const isImageSupportedDoc = docType === 'quotation' || docType === 'proforma';
  const showImages = showImagesOverride !== undefined 
    ? showImagesOverride 
    : (docInfo.showImages !== undefined ? docInfo.showImages : isImageSupportedDoc);

  // Compute VGM and weights using Product Master defaults and Actual VGM
  const vgmResult = calculateVgmAndWeights(
    shipment.items,
    shipment.actualLoadingEntered,
    shipment.totalVgmKg
  );

  const isPackingList = docType === 'packing_list';

  // Commercial values derived from actual loading if entered, otherwise ordered qty
  const items = vgmResult.items.map((i) => {
    return {
      ...i,
      totalPrice: i.activeQty * i.unitPrice,
    };
  });

  const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalNetKg = vgmResult.totalNetWeightKg;
  const totalGrossKg = vgmResult.actualVgmKg ?? vgmResult.totalDefaultGrossWeightKg;

  const currency = shipment.payment.currency || 'EUR';
  const docTitle = DOC_TYPE_ENGLISH_TITLES[docType] || toEnglishUpper(docType);

  // Company logo. Rendered only when set, so an empty logoUrl leaves every
  // template byte-identical to before. crossOrigin="anonymous" matches what the
  // canvas-based PDF export (html2canvas useCORS) needs for Supabase Storage URLs.
  const CompanyLogo: React.FC<{ className?: string }> = ({ className = '' }) =>
    companySettings.logoUrl ? (
      <img
        src={companySettings.logoUrl}
        alt={`${companySettings.companyName} logo`}
        crossOrigin="anonymous"
        className={`object-contain ${className}`}
      />
    ) : null;

  /* ========================================================================
   * TEMPLATE 01: CLASSIC (Traditional Serif/Sans, double line box, classic logo)
   * ======================================================================== */
  if (template === 'classic') {
    return (
      <div className="w-full bg-white text-slate-900 font-sans text-[11px] p-8 border border-slate-300 shadow-md min-h-[1000px] relative">
        {/* Top Header */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-slate-800">
          <div className="space-y-1 max-w-sm font-sans">
            <CompanyLogo className="max-h-16 max-w-[180px] mb-2" />
            <h1 className="font-extrabold text-lg text-slate-900 tracking-wide uppercase">{companySettings.companyName}</h1>
            <p className="text-[10px] text-slate-600 leading-tight">{companySettings.address}, {companySettings.city} / {companySettings.country}</p>
            <p className="text-[10px] text-slate-600">Tel: {companySettings.phone} | Email: {companySettings.email}</p>
            <p className="text-[10px] text-slate-600">Vergi Daire/No: {companySettings.taxOffice} - {companySettings.taxNo}</p>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-wider font-mono">{toEnglishUpper(docTitle)}</h2>
            <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded inline-block border border-slate-300">
              No: {docInfo.docNumber}
            </div>
            <p className="text-[10px] text-slate-600 font-sans">Tarih: {docInfo.updatedAt}</p>
          </div>
        </div>

        {/* Buyer & Logistics Block Grid */}
        <div className="grid grid-cols-2 gap-6 my-6 font-sans">
          {/* Buyer Box */}
          <div className="border border-slate-400 p-3 rounded">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-600 mb-1 border-b pb-1">ALICI / BUYER (CONSIGNEE)</h3>
            <p className="font-bold text-xs text-slate-900">{customer.companyName}</p>
            <p className="text-[10px] text-slate-700">{customer.address}, {customer.city}</p>
            <p className="font-bold text-[10px] text-slate-800">{customer.country}</p>
            <p className="text-[10px] text-slate-600">VAT / Tax No: {customer.taxNo || '-'}</p>
            <p className="text-[10px] text-slate-600">Attn: {customer.contactPerson || '-'}</p>
          </div>

          {/* Shipment Terms Box */}
          <div className="border border-slate-400 p-3 rounded space-y-1">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-600 mb-1 border-b pb-1">TESLİM VE ÖDEME ŞARTLARI</h3>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">Incoterm:</span>
              <strong className="text-slate-900">{shipment.logistics.incoterm} - {shipment.logistics.dischargePort}</strong>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">Ödeme Şekli:</span>
              <strong className="text-slate-900">{shipment.payment.paymentMethod}</strong>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">Yükleme Limanı:</span>
              <span className="text-slate-800">{shipment.logistics.loadingPort}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px]">
              <span className="text-slate-500">Taşıyıcı / Vasıta:</span>
              <span className="text-slate-800">{shipment.logistics.carrierCompany} / {shipment.logistics.vesselFlightNo}</span>
            </div>
          </div>
        </div>

        {/* Table of Items */}
        <div className="my-6 font-sans">
          <table className="w-full text-left border-collapse border border-slate-400 text-[10px]">
            <thead className="bg-slate-200 text-slate-900 font-bold uppercase border-b border-slate-400">
              {isPackingList ? (
                <tr>
                  <th className="p-2 border border-slate-400">#</th>
                  {showImages && <th className="p-2 border border-slate-400 text-center">Görsel</th>}
                  <th className="p-2 border border-slate-400">Ürün Kodu</th>
                  <th className="p-2 border border-slate-400">Açıklama / Product Description</th>
                  <th className="p-2 border border-slate-400">HS Code</th>
                  <th className="p-2 border border-slate-400 text-center">Miktar</th>
                  <th className="p-2 border border-slate-400 text-right">Net Ağırlık</th>
                  <th className="p-2 border border-slate-400 text-right">Brüt Ağırlık (VGM)</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-2 border border-slate-400">#</th>
                  {showImages && <th className="p-2 border border-slate-400 text-center">Görsel</th>}
                  <th className="p-2 border border-slate-400">Ürün Kodu</th>
                  <th className="p-2 border border-slate-400">Açıklama / Product Description</th>
                  <th className="p-2 border border-slate-400">HS Code</th>
                  <th className="p-2 border border-slate-400 text-center">Miktar</th>
                  <th className="p-2 border border-slate-400 text-right">Birim Fiyat</th>
                  <th className="p-2 border border-slate-400 text-right">Toplam Tutarlar</th>
                </tr>
              )}
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="p-2 border border-slate-300">{idx + 1}</td>
                  {showImages && (
                    <td className="p-1 border border-slate-300 text-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-10 h-10 object-cover rounded border border-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-400 text-[9px] italic">-</span>
                      )}
                    </td>
                  )}
                  <td className="p-2 border border-slate-300 font-mono font-bold">{item.productCode}</td>
                  <td className="p-2 border border-slate-300">
                    <strong className="block text-slate-900">{item.productName}</strong>
                    {item.customNotes && <span className="text-slate-600 text-[9px]">{item.customNotes}</span>}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono">{item.hsCode}</td>
                  <td className="p-2 border border-slate-300 text-center font-bold">{item.activeQty} {item.unit}</td>
                  {isPackingList ? (
                    <>
                      <td className="p-2 border border-slate-300 text-right font-mono">{item.lineNetWeightKg.toFixed(1)} kg</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold">{item.lineCalculatedGrossWeightKg.toFixed(1)} kg</td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 border border-slate-300 text-right font-mono">{item.unitPrice.toFixed(2)} {currency}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold">{item.totalPrice.toFixed(2)} {currency}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Product Visual Presentation Section if showImages */}
        {showImages && (
          <div className="my-6 border border-slate-300 rounded p-4 bg-slate-50 font-sans">
            <h4 className="font-bold text-slate-800 text-[11px] mb-3 border-b border-slate-300 pb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>ÜRÜN GÖRSEL SUNUMU / PRODUCT VISUAL PRESENTATION</span>
              <span className="text-[9px] text-slate-500 font-normal">Quotation & Proforma Görsel Kataloğu</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-2.5 rounded border border-slate-200 flex flex-col items-center text-center space-y-1.5 shadow-2xs">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-24 h-20 object-cover rounded border border-slate-200" />
                  ) : (
                    <div className="w-24 h-20 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-[9px]">Görsel Bulunmuyor</div>
                  )}
                  <div className="font-mono text-[9px] font-bold text-teal-800">{item.productCode}</div>
                  <div className="font-semibold text-[10px] text-slate-900 line-clamp-2">{item.productName}</div>
                  <div className="text-[9px] text-slate-600 font-mono font-bold">{item.unitPrice.toFixed(2)} {currency} / {item.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals & Bank Footer */}
        <div className="grid grid-cols-2 gap-6 my-6 font-sans">
          <div className="p-3 border border-slate-300 rounded text-[10px] space-y-1 bg-slate-50">
            <h4 className="font-bold text-slate-800">BANKA HESAP BİLGİLERİ (BANK DETAILS)</h4>
            <p><strong>Banka:</strong> {companySettings.bankName} - {companySettings.bankBranch}</p>
            <p><strong>IBAN:</strong> <span className="font-mono">{companySettings.iban}</span></p>
            <p><strong>SWIFT Code:</strong> <span className="font-mono">{companySettings.swiftCode}</span></p>
          </div>

          <div className="p-3 border border-slate-400 rounded space-y-1 text-right font-mono text-[11px] bg-slate-100">
            {!isPackingList && (
              <div className="flex justify-between">
                <span>Ara Toplam (Subtotal):</span>
                <strong>{totalAmount.toFixed(2)} {currency}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span>Toplam Net Ağırlık:</span>
              <span>{totalNetKg.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam Brüt Ağırlık (VGM):</span>
              <strong>{totalGrossKg.toFixed(1)} kg</strong>
            </div>
            {!isPackingList && (
              <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-400 pt-1 mt-1">
                <span>GENEL TOPLAM ({currency}):</span>
                <span>{totalAmount.toFixed(2)} {currency}</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Notes Section */}
        {docInfo.notes && (
          <div className="my-5 p-3.5 border border-slate-400 rounded bg-slate-50 font-sans text-[10px] space-y-1">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-300 pb-1 flex justify-between items-center">
              <span>BELGE NOTLARI VE BİLDİRİMLER / NOTES & REMARKS</span>
              <span className="text-[9px] font-normal text-slate-500">ExPorta Document Note</span>
            </h4>
            <p className="whitespace-pre-line text-slate-800 leading-relaxed font-sans">{docInfo.notes}</p>
          </div>
        )}

        {/* Signature stamp area */}
        <div className="pt-8 flex justify-between items-end border-t border-slate-300 font-sans text-[10px]">
          <div>
            <p className="text-slate-500">Düzenleyen: ExPorta B2B System</p>
            <p className="text-slate-500">Tarih: {docInfo.updatedAt}</p>
          </div>
          <div className="text-center w-48 border-t border-slate-400 pt-2 font-bold text-slate-800">
            {companySettings.companyName}
            <br />
            <span className="font-normal text-[9px] text-slate-500">Yetkili İmza & Kaşe / Authorized Stamp</span>
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
      <div className="w-full bg-white text-slate-900 font-sans text-[11px] p-8 border border-slate-200 shadow-md min-h-[1000px] relative">
        {/* Top Teal Accent Bar */}
        <div className="h-2 bg-teal-600 rounded-t w-full -mt-8 -mx-8 mb-6" />

        {/* Header Grid */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {companySettings.logoUrl ? (
                <CompanyLogo className="max-h-10 max-w-[140px]" />
              ) : (
                <div className="w-7 h-7 bg-teal-600 text-white font-bold text-sm flex items-center justify-center rounded">eX</div>
              )}
              <span className="font-extrabold text-base text-slate-900 tracking-tight">{companySettings.companyName}</span>
            </div>
            <p className="text-[10px] text-slate-500">{companySettings.address}, {companySettings.city}</p>
            <p className="text-[10px] text-slate-500">Vergi No: {companySettings.taxNo} | {companySettings.email}</p>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-black rounded border border-teal-200 font-mono inline-block mb-1">
              {toEnglishUpper(docTitle)}
            </span>
            <div className="text-sm font-extrabold font-mono text-slate-900">{docInfo.docNumber}</div>
            <p className="text-[10px] text-slate-500">Düzenleme Tarihi: {docInfo.updatedAt}</p>
          </div>
        </div>

        {/* Buyer & Logistics 2-column card layout */}
        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[9px] font-bold text-teal-700 uppercase tracking-widest block">ALICI FİRMA / CONSIGNEE</span>
            <h3 className="font-bold text-sm text-slate-900">{customer.companyName}</h3>
            <p className="text-[10px] text-slate-600">{customer.address}, {customer.city} / {customer.country}</p>
            <p className="text-[10px] text-slate-500">VAT: {customer.taxNo} | Contact: {customer.contactPerson}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[9px] font-bold text-teal-700 uppercase tracking-widest block">SEVKİYAT DETAYLARI</span>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Incoterm:</span><strong className="text-slate-900">{shipment.logistics.incoterm} - {shipment.logistics.dischargePort}</strong></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Ödeme Şekli:</span><strong className="text-slate-900">{shipment.payment.paymentMethod}</strong></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Yükleme Limanı:</span><span>{shipment.logistics.loadingPort}</span></div>
          </div>
        </div>

        {/* Modern Table */}
        <div className="my-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              {isPackingList ? (
                <tr>
                  {showImages && <th className="p-2.5 text-center">Görsel</th>}
                  <th className="p-2.5">Kod</th>
                  <th className="p-2.5">Ürün Tanımı</th>
                  <th className="p-2.5">HS Code</th>
                  <th className="p-2.5 text-center">Miktar</th>
                  <th className="p-2.5 text-right">Net Ağırlık</th>
                  <th className="p-2.5 text-right">Brüt Ağırlık (VGM)</th>
                </tr>
              ) : (
                <tr>
                  {showImages && <th className="p-2.5 text-center">Görsel</th>}
                  <th className="p-2.5">Kod</th>
                  <th className="p-2.5">Ürün Tanımı</th>
                  <th className="p-2.5">HS Code</th>
                  <th className="p-2.5 text-center">Miktar</th>
                  <th className="p-2.5 text-right">Birim Fiyat</th>
                  <th className="p-2.5 text-right">Tutar ({currency})</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
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
                  <td className="p-2.5 text-center font-bold">{item.activeQty} {item.unit}</td>
                  {isPackingList ? (
                    <>
                      <td className="p-2.5 text-right font-mono">{item.lineNetWeightKg.toFixed(1)} kg</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{item.lineCalculatedGrossWeightKg.toFixed(1)} kg</td>
                    </>
                  ) : (
                    <>
                      <td className="p-2.5 text-right font-mono">{item.unitPrice.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{item.totalPrice.toFixed(2)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Product Visual Presentation Section in MODERN */}
        {showImages && (
          <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">ÜRÜN GÖRSEL SUNUMU (PRODUCT PRESENTATION)</span>
              <span className="text-[10px] text-slate-500 font-mono">Görsel Katalog Katmanı</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center space-y-1.5 shadow-2xs">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-24 h-20 object-cover rounded-md border border-slate-200" />
                  ) : (
                    <div className="w-24 h-20 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 text-[9px]">Görsel Bulunmuyor</div>
                  )}
                  <div className="font-mono text-[9px] font-bold text-teal-700">{item.productCode}</div>
                  <div className="font-semibold text-[10px] text-slate-900 line-clamp-2">{item.productName}</div>
                  <div className="text-[9px] text-slate-600 font-mono font-bold">{item.unitPrice.toFixed(2)} {currency} / {item.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end my-6">
          <div className="w-72 bg-teal-50 p-4 rounded-lg border border-teal-200 space-y-1.5 font-mono text-[11px] text-right">
            {!isPackingList && (
              <div className="flex justify-between"><span className="text-slate-600">Ara Toplam:</span><strong>{totalAmount.toFixed(2)} {currency}</strong></div>
            )}
            <div className="flex justify-between"><span className="text-slate-600">Net Ağırlık:</span><span>{totalNetKg.toFixed(1)} kg</span></div>
            <div className="flex justify-between"><span className="text-slate-600">VGM Brüt Ağırlık:</span><strong>{totalGrossKg.toFixed(1)} kg</strong></div>
            {!isPackingList && (
              <div className="flex justify-between text-xs font-black text-slate-900 border-t border-teal-300 pt-2">
                <span>TOPLAM TUTAR:</span>
                <span>{totalAmount.toFixed(2)} {currency}</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Notes Section */}
        {docInfo.notes && (
          <div className="my-5 p-4 bg-slate-50 rounded-lg border border-slate-200 font-sans text-[10px] space-y-1">
            <h4 className="font-bold text-teal-800 text-[9px] uppercase tracking-widest border-b border-slate-200 pb-1 flex justify-between items-center">
              <span>BELGE NOTLARI VE AÇIKLAMALAR / NOTES & REMARKS</span>
              <span className="text-[9px] font-normal text-slate-400">ExPorta Note Layer</span>
            </h4>
            <p className="whitespace-pre-line text-slate-700 leading-relaxed">{docInfo.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
          <div>Bank: {companySettings.bankName} | IBAN: {companySettings.iban} | SWIFT: {companySettings.swiftCode}</div>
          <div className="font-bold text-slate-800">{companySettings.companyName}</div>
        </div>
      </div>
    );
  }

  /* ========================================================================
   * TEMPLATE 03: COMPACT (High-density grid layout, compact margins)
   * ======================================================================== */
  return (
    <div className="w-full bg-white text-slate-900 font-sans text-[10px] p-6 border border-slate-300 shadow-md min-h-[1000px] relative">
      <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-2.5">
          <CompanyLogo className="max-h-11 max-w-[120px]" />
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 uppercase">{companySettings.companyName}</h1>
            <p className="text-[9px] text-slate-600">{companySettings.address} | Tax: {companySettings.taxNo}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-base font-black font-mono text-slate-900">{toEnglishUpper(docTitle)}</h2>
          <div className="font-mono text-xs font-bold text-slate-800">{docInfo.docNumber}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 my-3 text-[9px]">
        <div className="border border-slate-300 p-2 rounded bg-slate-50">
          <strong className="block text-slate-800 uppercase font-bold border-b pb-0.5 mb-1">CONSIGNEE / BUYER</strong>
          <p className="font-bold text-slate-900">{customer.companyName}</p>
          <p>{customer.address}, {customer.country}</p>
          <p>Tax ID: {customer.taxNo}</p>
        </div>

        <div className="border border-slate-300 p-2 rounded space-y-0.5">
          <strong className="block text-slate-800 uppercase font-bold border-b pb-0.5 mb-1">TERMS</strong>
          <div>Incoterm: <strong>{shipment.logistics.incoterm} - {shipment.logistics.dischargePort}</strong></div>
          <div>Payment: <strong>{shipment.payment.paymentMethod}</strong></div>
          <div>Date: <strong>{docInfo.updatedAt}</strong></div>
        </div>
      </div>

      <table className="w-full text-left border-collapse border border-slate-300 text-[9px] my-3">
        <thead className="bg-slate-100 font-bold uppercase border-b border-slate-300">
          {isPackingList ? (
            <tr>
              {showImages && <th className="p-1.5 border border-slate-300 text-center">Görsel</th>}
              <th className="p-1.5 border border-slate-300">Code</th>
              <th className="p-1.5 border border-slate-300">Description</th>
              <th className="p-1.5 border border-slate-300">HS Code</th>
              <th className="p-1.5 border border-slate-300 text-center">Qty</th>
              <th className="p-1.5 border border-slate-300 text-right">Net Weight</th>
              <th className="p-1.5 border border-slate-300 text-right">Gross Weight (VGM)</th>
            </tr>
          ) : (
            <tr>
              {showImages && <th className="p-1.5 border border-slate-300 text-center">Görsel</th>}
              <th className="p-1.5 border border-slate-300">Code</th>
              <th className="p-1.5 border border-slate-300">Description</th>
              <th className="p-1.5 border border-slate-300">HS Code</th>
              <th className="p-1.5 border border-slate-300 text-center">Qty</th>
              <th className="p-1.5 border border-slate-300 text-right">Price</th>
              <th className="p-1.5 border border-slate-300 text-right">Total ({currency})</th>
            </tr>
          )}
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-slate-200">
              {showImages && (
                <td className="p-1 border border-slate-200 text-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-8 h-8 object-cover rounded border border-slate-200 mx-auto" />
                  ) : (
                    <span className="text-slate-400 text-[8px]">-</span>
                  )}
                </td>
              )}
              <td className="p-1.5 border border-slate-200 font-mono font-bold">{item.productCode}</td>
              <td className="p-1.5 border border-slate-200">{item.productName}</td>
              <td className="p-1.5 border border-slate-200 font-mono">{item.hsCode}</td>
              <td className="p-1.5 border border-slate-200 text-center font-bold">{item.activeQty} {item.unit}</td>
              {isPackingList ? (
                <>
                  <td className="p-1.5 border border-slate-200 text-right font-mono">{item.lineNetWeightKg.toFixed(1)} kg</td>
                  <td className="p-1.5 border border-slate-200 text-right font-mono font-bold">{item.lineCalculatedGrossWeightKg.toFixed(1)} kg</td>
                </>
              ) : (
                <>
                  <td className="p-1.5 border border-slate-200 text-right font-mono">{item.unitPrice.toFixed(2)}</td>
                  <td className="p-1.5 border border-slate-200 text-right font-mono font-bold">{item.totalPrice.toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Product Visual Presentation Section in COMPACT */}
      {showImages && (
        <div className="my-3 bg-slate-50 p-3 rounded border border-slate-300 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">ÜRÜN GÖRSEL SUNUMU (PRODUCT PRESENTATION)</span>
            <span className="text-[8px] text-slate-500 font-mono">Görsel Katalog Katmanı</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center text-center space-y-1">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} crossOrigin="anonymous" className="w-16 h-14 object-cover rounded border border-slate-200" />
                ) : (
                  <div className="w-16 h-14 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-[8px]">Görsel Yok</div>
                )}
                <div className="font-mono text-[8px] font-bold text-slate-800">{item.productCode}</div>
                <div className="font-semibold text-[9px] text-slate-900 line-clamp-1">{item.productName}</div>
                <div className="text-[8px] text-slate-600 font-mono font-bold">{item.unitPrice.toFixed(2)} {currency} / {item.unit}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start my-3 text-[9px]">
        <div className="p-2 border border-slate-300 rounded max-w-xs space-y-0.5">
          <strong>BANK:</strong> {companySettings.bankName} | <strong>IBAN:</strong> {companySettings.iban}
        </div>
        <div className="p-2 border border-slate-300 rounded text-right font-mono font-bold space-y-0.5 bg-slate-50">
          {!isPackingList && <div>TOTAL AMOUNT: {totalAmount.toFixed(2)} {currency}</div>}
          <div>TOTAL NET: {totalNetKg.toFixed(1)} kg</div>
          <div>TOTAL GROSS (VGM): {totalGrossKg.toFixed(1)} kg</div>
        </div>
      </div>

      {docInfo.notes && (
        <div className="my-3 p-2 border border-slate-300 rounded bg-slate-50 text-[9px]">
          <strong className="block text-slate-800 uppercase font-bold border-b pb-0.5 mb-1">NOTES / NOTLAR</strong>
          <p className="whitespace-pre-line text-slate-700">{docInfo.notes}</p>
        </div>
      )}
    </div>
  );
};
