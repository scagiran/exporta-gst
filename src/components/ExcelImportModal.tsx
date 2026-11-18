import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertTriangle, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { Customer, Product } from '../types/exporta';
import { ModalCloseButton } from './ModalCloseButton';
import { useEscapeClose } from '../lib/useEscapeClose';
import { useLang, LANGS } from '../i18n';
import { messages } from '../i18n/messages';
import { unitLabel, unitValue } from '../i18n/units';

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
  const { t, lang } = useLang();
  const x = t.excel;
  const unitLabelFor = (u: string) => unitLabel(u, lang);
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

  const targetTitle = mode === 'customer' ? x.titleCustomers : x.titleProducts;

  const C = x.customerCols;
  const P = x.productCols;
  const customerFields: { key: keyof Customer; label: string; required: boolean }[] = [
    { key: 'companyName', label: C.companyName, required: true },
    { key: 'code', label: C.code, required: true },
    { key: 'country', label: C.country, required: true },
    { key: 'city', label: C.city, required: false },
    { key: 'address', label: C.address, required: false },
    { key: 'taxNo', label: C.taxNo, required: false },
    { key: 'contactPerson', label: C.contactPerson, required: false },
    { key: 'email', label: C.email, required: false },
    { key: 'phone', label: C.phone, required: false },
  ];

  const productFields: { key: keyof Product; label: string; required: boolean }[] = [
    { key: 'name', label: P.name, required: true },
    { key: 'code', label: P.code, required: true },
    { key: 'hsCode', label: P.hsCode, required: true },
    { key: 'description', label: P.description, required: false },
    { key: 'unit', label: x.unitHint, required: true },
    { key: 'origin', label: P.origin, required: false },
    { key: 'netWeightKg', label: P.netWeightKg, required: true },
    { key: 'grossWeightKg', label: P.grossWeightKg, required: true },
    { key: 'unitPrice', label: P.unitPrice, required: true },
    { key: 'currency', label: x.currencyHint, required: true },
  ];

  /** Column headers recognised for a field: its name in Turkish, English and French, and the field key. */
  const headerAliases = (key: string): string[] => {
    const out = new Set<string>([key.toLocaleLowerCase('tr-TR')]);
    for (const l of LANGS) {
      const m = messages[l].excel;
      const cols = (mode === 'customer' ? m.customerCols : m.productCols) as Record<string, string>;
      if (cols[key]) out.add(cols[key].toLocaleLowerCase('tr-TR'));
      if (key === 'unit') out.add(m.unitHint.toLocaleLowerCase('tr-TR'));
      if (key === 'currency') out.add(m.currencyHint.toLocaleLowerCase('tr-TR'));
    }
    return [...out];
  };

  const targetSystemFields = mode === 'customer' ? customerFields : productFields;

  // Generate and download sample Excel file
  const handleDownloadSample = () => {
    let sampleRows = [];
    if (mode === 'customer') {
      sampleRows = [
        {
          [C.companyName]: 'Nordic Industrial AS',
          [C.code]: 'NORDIC',
          [C.country]: x.sampleCountries[0],
          [C.city]: 'Oslo',
          [C.address]: 'Storgata 14, N-0155 Oslo',
          [C.taxNo]: 'NO987654321',
          [C.contactPerson]: 'Erik Lindqvist',
          [C.email]: 'e.lindqvist@nordicind.no',
          [C.phone]: '+47 22 10 90 00',
        },
        {
          [C.companyName]: 'Iberia Metalurgica S.L.',
          [C.code]: 'IBERIA',
          [C.country]: x.sampleCountries[1],
          [C.city]: 'Valencia',
          [C.address]: 'Poligono Industrial Fuente del Jarro, 46988 Paterna',
          [C.taxNo]: 'ESB9821034',
          [C.contactPerson]: 'Carlos Rodriguez',
          [C.email]: 'c.rodriguez@iberiametal.es',
          [C.phone]: '+34 96 123 4567',
        },
      ];
    } else {
      sampleRows = [
        {
          [P.name]: x.sampleProducts[0].name,
          [P.code]: 'PRD-8483',
          [P.hsCode]: '8483.40.21.00.00',
          [P.description]: x.sampleProducts[0].description,
          [P.unit]: unitLabelFor('Adet'),
          [P.origin]: x.sampleOrigin,
          [P.netWeightKg]: 45.0,
          [P.grossWeightKg]: 48.5,
          [P.unitPrice]: 320.0,
          [P.currency]: 'EUR',
        },
        {
          [P.name]: x.sampleProducts[1].name,
          [P.code]: 'PRD-4016',
          [P.hsCode]: '4016.93.00.00.00',
          [P.description]: x.sampleProducts[1].description,
          [P.unit]: unitLabelFor('Adet'),
          [P.origin]: x.sampleOrigin,
          [P.netWeightKg]: 0.12,
          [P.grossWeightKg]: 0.15,
          [P.unitPrice]: 4.2,
          [P.currency]: 'EUR',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mode === 'customer' ? x.sheetCustomers : x.sheetProducts);
    XLSX.writeFile(wb, `${mode === 'customer' ? x.sampleFileCustomers : x.sampleFileProducts}.xlsx`);
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
            const aliases = headerAliases(field.key);
            const exactMatch = headers.find((h) => aliases.includes(h.toLocaleLowerCase('tr-TR')));
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
        alert(x.readError);
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
          errors.push(x.errRequired(m.label));
        }

        if (mode === 'customer') {
          if (m.systemField === 'email' && val && !String(val).includes('@')) {
            errors.push(x.errEmail);
          }
        } else {
          if (['netWeightKg', 'grossWeightKg', 'unitPrice'].includes(m.systemField)) {
            const num = parseFloat(String(val).replace(',', '.'));
            if (isNaN(num) || num < 0) {
              errors.push(x.errNumber(m.label));
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
      alert(x.nothingValid);
      return;
    }

    if (mode === 'customer' && onImportCustomers) {
      const formatted: Customer[] = validRows.map((r, i) => ({
        id: `cust-imp-${Date.now()}-${i}`,
        code: r.code || `CUST-${i + 1}`,
        companyName: r.companyName || x.unknownCompany,
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
        name: r.name || x.unknownProduct,
        hsCode: r.hsCode || '0000.00.00',
        description: r.description || '',
        unit: unitValue(r.unit) || 'Adet',
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
              <p className="text-xs text-slate-400">{x.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Wizard Steps bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 max-w-2xl mx-auto">
            <div className={`flex items-center space-x-1.5 ${step >= 1 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
              <span>{x.steps[0]}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-1.5 ${step >= 2 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
              <span>{x.steps[1]}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-1.5 ${step >= 3 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
              <span>{x.steps[2]}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-1.5 ${step === 4 ? 'text-teal-700 font-bold' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 4 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
              <span>{x.steps[3]}</span>
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
                <h4 className="font-medium text-slate-800 text-base">{x.dropTitle}</h4>
                <p className="text-xs text-slate-500 mt-1">{x.dropHint}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white shadow-xs">
                    {x.pick}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Download className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-amber-900 text-sm">{x.sampleTitle}</h5>
                    <p className="text-xs text-amber-700">{x.sampleBody}</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md shrink-0 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>{x.sampleDownload}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{x.uploaded} <span className="text-teal-700">{fileName}</span></h4>
                  <p className="text-xs text-slate-500">{x.mapLead}</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">{x.rowsFound(rawData.length)}</span>
              </div>

              <div className="max-h-80 overflow-y-auto pr-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-md">{x.colSystem}</th>
                      <th className="py-2.5 px-3">{x.colState}</th>
                      <th className="py-2.5 px-3 rounded-r-md">{x.colExcel}</th>
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
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">{x.required}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">{x.optional}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={m.excelColumn}
                            onChange={(e) => handleMappingChange(m.systemField, e.target.value)}
                            className="w-full border border-slate-300 rounded-md py-1.5 px-2 bg-white text-xs focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">{x.pickColumn}</option>
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
                  {x.back}
                </button>
                <button
                  onClick={processAndValidateData}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <span>{x.validate}</span>
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
                  <h4 className="font-semibold text-slate-800 text-sm">{x.reportTitle}</h4>
                  <p className="text-xs text-slate-500">
                    {x.reportLead(validatedRows.length, validatedRows.filter((r) => r.valid).length)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md font-medium">
                    {x.valid(validatedRows.filter((r) => r.valid).length)}
                  </span>
                  {validatedRows.filter((r) => !r.valid).length > 0 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2.5 py-1 rounded-md font-medium">
                      {x.invalid(validatedRows.filter((r) => !r.valid).length)}
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">{x.colStatus}</th>
                      {mode === 'customer' ? (
                        <>
                          <th className="py-2 px-3">{x.colCompany}</th>
                          <th className="py-2 px-3">{x.colCode}</th>
                          <th className="py-2 px-3">{x.colCountry}</th>
                          <th className="py-2 px-3">{x.colTax}</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-3">{x.colProduct}</th>
                          <th className="py-2 px-3">{x.colCode}</th>
                          <th className="py-2 px-3">{x.colHs}</th>
                          <th className="py-2 px-3">{x.colPrice}</th>
                        </>
                      )}
                      <th className="py-2 px-3">{x.colNote}</th>
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
                          {item.errors.length > 0 ? item.errors.join('; ') : x.rowOk}
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
                  {x.editMapping}
                </button>
                <button
                  onClick={handleFinalImport}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  <span>{x.importN(validatedRows.filter((r) => r.valid).length)}</span>
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
              <h4 className="text-xl font-bold text-slate-900">{x.doneTitle}</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {x.doneBody}
              </p>
              <div className="pt-4">
                <button
                  onClick={handleResetModal}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  {x.doneClose}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
