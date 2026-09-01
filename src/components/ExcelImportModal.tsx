import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertTriangle, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { Customer, Product } from '../types/exporta';
import { ModalCloseButton } from './ModalCloseButton';
import { useEscapeClose } from '../lib/useEscapeClose';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'customer' | 'product';
  onImportCustomers?: (customers: Customer[]) => void;
  onImportProducts?: (products: Product[]) => void;
}

interface ColumnMapping {
  systemField: string;
  label: string;
  required: boolean;
  excelColumn: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  mode,
  onImportCustomers,
  onImportProducts,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Upload, 2: Map, 3: Validate/Preview, 4: Success
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validatedRows, setValidatedRows] = useState<{ row: any; errors: string[]; valid: boolean }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResetModal = () => {
    setStep(1);
    setFileName('');
    setRawHeaders([]);
    setRawData([]);
    setMappings([]);
    setValidatedRows([]);
    onClose();
  };

  // Wizard state is either already committed or freely discardable — no guard.
  useEscapeClose(isOpen, handleResetModal);

  if (!isOpen) return null;

  const targetTitle = mode === 'customer' ? 'Müşteri Listesi Excel İçe Aktarımı' : 'Ürün Kataloğu Excel İçe Aktarımı';

  const customerFields: { key: keyof Customer; label: string; required: boolean }[] = [
    { key: 'companyName', label: 'Firma Adı', required: true },
    { key: 'code', label: 'Müşteri Kodu', required: true },
    { key: 'country', label: 'Ülke', required: true },
    { key: 'city', label: 'Şehir', required: false },
    { key: 'address', label: 'Adres', required: false },
    { key: 'taxNo', label: 'Vergi Numarası', required: false },
    { key: 'contactPerson', label: 'Yetkili Kişi', required: false },
    { key: 'email', label: 'E-posta', required: false },
    { key: 'phone', label: 'Telefon', required: false },
  ];

  const productFields: { key: keyof Product; label: string; required: boolean }[] = [
    { key: 'name', label: 'Ürün Adı', required: true },
    { key: 'code', label: 'Ürün Kodu', required: true },
    { key: 'hsCode', label: 'HS Code (GTİP)', required: true },
    { key: 'description', label: 'Açıklama', required: false },
    { key: 'unit', label: 'Birim (Adet, Kg, Set...)', required: true },
    { key: 'origin', label: 'Menşe Ülke', required: false },
    { key: 'netWeightKg', label: 'Net Ağırlık (kg)', required: true },
    { key: 'grossWeightKg', label: 'Brüt Ağırlık (kg)', required: true },
    { key: 'unitPrice', label: 'Birim Fiyat', required: true },
    { key: 'currency', label: 'Para Birimi (EUR, USD...)', required: true },
  ];

  const targetSystemFields = mode === 'customer' ? customerFields : productFields;

  // Generate and download sample Excel file
  const handleDownloadSample = () => {
    let sampleRows = [];
    if (mode === 'customer') {
      sampleRows = [
        {
          'Firma Adı': 'Nordic Industrial AS',
          'Müşteri Kodu': 'NORDIC',
          'Ülke': 'Norveç',
          'Şehir': 'Oslo',
          'Adres': 'Storgata 14, N-0155 Oslo',
          'Vergi Numarası': 'NO987654321',
          'Yetkili Kişi': 'Erik Lindqvist',
          'E-posta': 'e.lindqvist@nordicind.no',
          'Telefon': '+47 22 10 90 00',
        },
        {
          'Firma Adı': 'Iberia Metalurgica S.L.',
          'Müşteri Kodu': 'IBERIA',
          'Ülke': 'İspanya',
          'Şehir': 'Valencia',
          'Adres': 'Poligono Industrial Fuente del Jarro, 46988 Paterna',
          'Vergi Numarası': 'ESB9821034',
          'Yetkili Kişi': 'Carlos Rodriguez',
          'E-posta': 'c.rodriguez@iberiametal.es',
          'Telefon': '+34 96 123 4567',
        },
      ];
    } else {
      sampleRows = [
        {
          'Ürün Adı': 'Ağır Hizmet Tipi Sanayi Redüktörü',
          'Ürün Kodu': 'PRD-8483',
          'HS Code (GTİP)': '8483.40.21.00.00',
          'Açıklama': 'Helisel Dişli Çift Kademeli Sanayi Redüktör Motoru',
          'Birim': 'Adet',
          'Menşe Ülke': 'Türkiye',
          'Net Ağırlık (kg)': 45.0,
          'Brüt Ağırlık (kg)': 48.5,
          'Birim Fiyat': 320.0,
          'Para Birimi': 'EUR',
        },
        {
          'Ürün Adı': 'Hidrolik Silindir Sızdırmazlık Contası',
          'Ürün Kodu': 'PRD-4016',
          'HS Code (GTİP)': '4016.93.00.00.00',
          'Açıklama': 'NBR Yüksek Basınça Dayanıklı Vulkanize Kauçuk Conta',
          'Birim': 'Adet',
          'Menşe Ülke': 'Türkiye',
          'Net Ağırlık (kg)': 0.12,
          'Brüt Ağırlık (kg)': 0.15,
          'Birim Fiyat': 4.2,
          'Para Birimi': 'EUR',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mode === 'customer' ? 'Müşteriler' : 'Ürünler');
    XLSX.writeFile(wb, `ExPorta_${mode === 'customer' ? 'Musteri' : 'Urun'}_Ornek_Sablon.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });

        if (data.length > 0) {
          const headers = (data[0] as string[]).map((h) => String(h || '').trim());
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

          setRawHeaders(headers);
          setRawData(rows);

          // Auto map matching columns
          const initialMap: ColumnMapping[] = targetSystemFields.map((field) => {
            // Fuzzy match column header name
            const exactMatch = headers.find(
              (h) => h.toLowerCase() === field.label.toLowerCase() || h.toLowerCase() === field.key.toLowerCase()
            );
            return {
              systemField: field.key,
              label: field.label,
              required: field.required,
              excelColumn: exactMatch || '',
            };
          });

          setMappings(initialMap);
          setStep(2);
        }
      } catch (err) {
        alert('Excel dosyası okunamadı. Lütfen geçerli bir .xlsx veya .csv dosyası yükleyin.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (systemField: string, excelColumn: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.systemField === systemField ? { ...m, excelColumn } : m))
    );
  };

  const processAndValidateData = () => {
    const validated = rawData.map((rawRow, idx) => {
      const rowObj: any = {};
      const errors: string[] = [];

      mappings.forEach((m) => {
        const val = rawRow[m.excelColumn];
        if (m.required && (val === undefined || val === null || String(val).trim() === '')) {
          errors.push(`"${m.label}" alanı zorunludur.`);
        }

        if (mode === 'customer') {
          if (m.systemField === 'email' && val && !String(val).includes('@')) {
            errors.push('Geçersiz e-posta formatı.');
          }
        } else {
          if (['netWeightKg', 'grossWeightKg', 'unitPrice'].includes(m.systemField)) {
            const num = parseFloat(String(val).replace(',', '.'));
            if (isNaN(num) || num < 0) {
              errors.push(`"${m.label}" geçerli bir pozitif sayı olmalıdır.`);
            }
          }
        }

        rowObj[m.systemField] = val;
      });

      return {
        row: rowObj,
        errors,
        valid: errors.length === 0,
      };
    });

    setValidatedRows(validated);
    setStep(3);
  };

  const handleFinalImport = () => {
    const validRows = validatedRows.filter((r) => r.valid).map((r) => r.row);
    if (validRows.length === 0) {
      alert('İçe aktarılacak geçerli kayıt bulunamadı.');
      return;
    }

    if (mode === 'customer' && onImportCustomers) {
      const formatted: Customer[] = validRows.map((r, i) => ({
        id: `cust-imp-${Date.now()}-${i}`,
        code: r.code || `CUST-${i + 1}`,
        companyName: r.companyName || 'Bilinmeyen Firma',
        country: r.country || 'Türkiye',
        city: r.city || '',
        address: r.address || '',
        taxNo: r.taxNo || '',
        contactPerson: r.contactPerson || '',
        email: r.email || '',
        phone: r.phone || '',
      }));
      onImportCustomers(formatted);
    } else if (mode === 'product' && onImportProducts) {
      const formatted: Product[] = validRows.map((r, i) => ({
        id: `prod-imp-${Date.now()}-${i}`,
        code: r.code || `PRD-${i + 1}`,
        name: r.name || 'Bilinmeyen Ürün',
        hsCode: r.hsCode || '0000.00.00',
        description: r.description || '',
        unit: r.unit || 'Adet',
        origin: r.origin || 'Türkiye',
        netWeightKg: parseFloat(String(r.netWeightKg || 1).replace(',', '.')),
        grossWeightKg: parseFloat(String(r.grossWeightKg || 1).replace(',', '.')),
        unitPrice: parseFloat(String(r.unitPrice || 0).replace(',', '.')),
        currency: (r.currency || 'EUR').toUpperCase(),
      }));
      onImportProducts(formatted);
    }

    setStep(4);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
        <ModalCloseButton onClose={handleResetModal} />
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">{targetTitle}</h3>
              <p className="text-xs text-slate-400">Excel veya CSV dosyanızdan otomatik veri aktarımı</p>
            </div>
          </div>
        </div>

        {/* Wizard Steps bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 max-w-2xl mx-auto">
            <div className={`flex items-center space-x-1.5 ${step >= 1 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
              <span>Excel Yükle</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-1.5 ${step >= 2 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
              <span>Kolon Eşleştir</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-1.5 ${step >= 3 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
              <span>Doğrula & Önizle</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-1.5 ${step === 4 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 4 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
              <span>Tamamlandı</span>
            </div>
          </div>
        </div>

        {/* Modal Body content */}
        <div className="p-6">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 text-center bg-slate-50 hover:bg-teal-50/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="p-3 bg-teal-100 text-teal-700 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-slate-800 text-base">Excel veya CSV dosyanızı buraya sürükleyin</h4>
                <p className="text-xs text-slate-500 mt-1">.xlsx, .xls veya .csv formatlarını destekler</p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white shadow-xs">
                    Bilgisayarımdan Dosya Seç
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Download className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-amber-900 text-sm">Örnek Excel Şablonu Kullanın</h5>
                    <p className="text-xs text-amber-700">Kolon formatının doğrudan tanınması için hazır Excel şablonumuzu indirebilirsiniz.</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md shrink-0 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Şablonu İndir (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Yüklenen Dosya: <span className="text-teal-700">{fileName}</span></h4>
                  <p className="text-xs text-slate-500">Excel kolon başlıklarınızı ExPorta sistem alanları ile eşleştirin.</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">{rawData.length} Satır Bulundu</span>
              </div>

              <div className="max-h-80 overflow-y-auto pr-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-md">Sistem Alanı</th>
                      <th className="py-2.5 px-3">Durum</th>
                      <th className="py-2.5 px-3 rounded-r-md">Excel Kolonunuz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappings.map((m) => (
                      <tr key={m.systemField} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {m.label} {m.required && <span className="text-red-500">*</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {m.required ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">Zorunlu</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">Opsiyonel</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={m.excelColumn}
                            onChange={(e) => handleMappingChange(m.systemField, e.target.value)}
                            className="w-full border border-slate-300 rounded-md py-1.5 px-2 bg-white text-xs focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">-- Kolon Seçin --</option>
                            {rawHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Geri
                </button>
                <button
                  onClick={processAndValidateData}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <span>Verileri Doğrula & Önizle</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Validate & Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Veri Önizleme ve Doğrulama Raporu</h4>
                  <p className="text-xs text-slate-500">
                    Toplam {validatedRows.length} satırdan {validatedRows.filter((r) => r.valid).length} tanesi hatasız içe aktarıma hazır.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md font-medium">
                    ✓ {validatedRows.filter((r) => r.valid).length} Geçerli
                  </span>
                  {validatedRows.filter((r) => !r.valid).length > 0 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2.5 py-1 rounded-md font-medium">
                      ⚠ {validatedRows.filter((r) => !r.valid).length} Hatalı Satır
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Durum</th>
                      {mode === 'customer' ? (
                        <>
                          <th className="py-2 px-3">Firma Adı</th>
                          <th className="py-2 px-3">Kod</th>
                          <th className="py-2 px-3">Ülke</th>
                          <th className="py-2 px-3">Vergi No</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-3">Ürün Adı</th>
                          <th className="py-2 px-3">Kod</th>
                          <th className="py-2 px-3">HS Code</th>
                          <th className="py-2 px-3">Fiyat</th>
                        </>
                      )}
                      <th className="py-2 px-3">Açıklama / Hata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validatedRows.map((item, idx) => (
                      <tr key={idx} className={item.valid ? 'hover:bg-slate-50' : 'bg-red-50/50 hover:bg-red-50'}>
                        <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3">
                          {item.valid ? (
                            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-full inline-block">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="p-1 bg-red-100 text-red-700 rounded-full inline-block">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                        {mode === 'customer' ? (
                          <>
                            <td className="py-2 px-3 font-medium">{item.row.companyName || '-'}</td>
                            <td className="py-2 px-3 font-mono">{item.row.code || '-'}</td>
                            <td className="py-2 px-3">{item.row.country || '-'}</td>
                            <td className="py-2 px-3">{item.row.taxNo || '-'}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 font-medium">{item.row.name || '-'}</td>
                            <td className="py-2 px-3 font-mono">{item.row.code || '-'}</td>
                            <td className="py-2 px-3 font-mono">{item.row.hsCode || '-'}</td>
                            <td className="py-2 px-3">{item.row.unitPrice} {item.row.currency}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-red-600 text-[11px]">
                          {item.errors.length > 0 ? item.errors.join('; ') : '✓ İçe aktarıma uygun'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Eşleştirmeyi Düzenle
                </button>
                <button
                  onClick={handleFinalImport}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  <span>{validatedRows.filter((r) => r.valid).length} Kaydı İçe Aktar</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">İçe Aktarım Başarıyla Tamamlandı!</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Excel dosyanızdaki kayıtlar doğrulandı ve ExPorta ortak veri kaynağınıza aktarıldı. Artık bu kayıtları sevkiyat ve belgelerinizde kullanabilirsiniz.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleResetModal}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  Kapat ve Liste Görünümüne Dön
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
