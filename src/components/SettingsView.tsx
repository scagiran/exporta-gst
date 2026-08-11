import React, { useState } from 'react';
import { CompanySettings, CustomField, DocType, DocTemplate, DocNumberFormat, CustomFieldType, CustomFieldModule, DocNumberHistory } from '../types/exporta';
import { generateDocNumber, DOC_TYPE_NAMES } from '../lib/numbering';
import { Settings, Building, Sliders, Hash, Layout, Plus, Trash2, Edit, Check, Eye, AlertCircle, History, RefreshCw } from 'lucide-react';

interface SettingsViewProps {
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  customFields: CustomField[];
  onAddCustomField: (field: CustomField) => void;
  onDeleteCustomField: (id: string) => void;
  docNumberFormats: Record<DocType, DocNumberFormat>;
  onUpdateNumberFormat: (docType: DocType, format: DocNumberFormat) => void;
  numberHistory: DocNumberHistory[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  companySettings,
  onUpdateCompanySettings,
  customFields,
  onAddCustomField,
  onDeleteCustomField,
  docNumberFormats,
  onUpdateNumberFormat,
  numberHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'company' | 'custom_fields' | 'numbering'>('company');

  // Company settings local state
  const [companyForm, setCompanyForm] = useState<CompanySettings>(companySettings);

  // Custom field modal state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldModule, setNewFieldModule] = useState<CustomFieldModule>('shipment');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldShowInDocs, setNewFieldShowInDocs] = useState(true);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Numbering local format states
  const [selectedNumDocType, setSelectedNumDocType] = useState<DocType>('proforma');
  const [numPrefix, setNumPrefix] = useState(docNumberFormats.proforma.prefix);
  const [numFormatStr, setNumFormatStr] = useState(docNumberFormats.proforma.format);
  const [numNextSeq, setNumNextSeq] = useState(docNumberFormats.proforma.nextSeq);

  const docTypesList: DocType[] = [
    'quotation',
    'proforma',
    'sales_order',
    'actual_loading',
    'commercial_invoice',
    'packing_list',
    'shipping_instruction',
  ];

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompanySettings(companyForm);
    alert('Firma ve varsayılan şablon ayarları başarıyla kaydedildi!');
  };

  const handleAddCustomFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) {
      alert('Lütfen bir alan adı girin.');
      return;
    }

    const field: CustomField = {
      id: `cf-${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      module: newFieldModule,
      required: newFieldRequired,
      showInDocs: newFieldShowInDocs,
      options: newFieldType === 'select' ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    };

    onAddCustomField(field);
    setIsFieldModalOpen(false);
    setNewFieldName('');
  };

  const handleDocTypeNumberingSelect = (dt: DocType) => {
    setSelectedNumDocType(dt);
    const cfg = docNumberFormats[dt];
    setNumPrefix(cfg.prefix);
    setNumFormatStr(cfg.format);
    setNumNextSeq(cfg.nextSeq);
  };

  const handleSaveNumberFormat = () => {
    const updated: DocNumberFormat = {
      docType: selectedNumDocType,
      prefix: numPrefix,
      format: numFormatStr,
      nextSeq: numNextSeq,
      seqLength: 3,
    };
    onUpdateNumberFormat(selectedNumDocType, updated);
    alert(`${DOC_TYPE_NAMES[selectedNumDocType]} numaralandırma formatı güncellendi.`);
  };

  // Sample Customer for live preview
  const sampleCustomer = { code: 'ELEK' };
  const currentFormatCfg: DocNumberFormat = {
    docType: selectedNumDocType,
    prefix: numPrefix,
    format: numFormatStr,
    nextSeq: numNextSeq,
    seqLength: 3,
  };
  const livePreviewNum = generateDocNumber(currentFormatCfg, sampleCustomer);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          <span>Firma, Özel Alanlar & Numaralandırma Ayarları</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ExPorta platform ayarlarınızı, işletmenize özel alanları ve belge numaralandırma kurallarınızı yönetin.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white border-b border-slate-200 px-4 rounded-xl shadow-2xs flex space-x-2 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('company')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'company' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-teal-600" />
          <span>Firma & Banka Ayarları</span>
        </button>

        <button
          onClick={() => setActiveTab('custom_fields')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'custom_fields' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-teal-600" />
          <span>Kullanıcı Tanımlı Özel Alanlar</span>
        </button>

        <button
          onClick={() => setActiveTab('numbering')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'numbering' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Hash className="w-4 h-4 text-teal-600" />
          <span>Belge Numaralandırma Kuralları</span>
        </button>
      </div>

      {/* TAB 1: FIRMA & BANKA AYARLARI */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">Firma Resmi Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Firma Ticari Unvanı *</label>
                <input
                  type="text"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vergi Numarası & Dairesi *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Vergi No"
                    value={companyForm.taxNo}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxNo: e.target.value })}
                    className="border border-slate-300 rounded-lg p-2 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Vergi Dairesi"
                    value={companyForm.taxOffice}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxOffice: e.target.value })}
                    className="border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fatura Adresi *</label>
                <textarea
                  rows={2}
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Şehir</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">Banka & Swift Bilgileri</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Banka Adı & Şubesi</label>
                <input
                  type="text"
                  value={companyForm.bankName}
                  onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">IBAN Numarası</label>
                <input
                  type="text"
                  value={companyForm.iban}
                  onChange={(e) => setCompanyForm({ ...companyForm, iban: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SWIFT / BIC Kodu</label>
                <input
                  type="text"
                  value={companyForm.swiftCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, swiftCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Default Document Templates requested in rule 8 */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">Varsayılan Belge Şablon Tercihleri</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Her belge türü için sisteminizin varsayılan olarak açacağı şablonu belirleyin.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              {docTypesList.map((dt) => (
                <div key={dt} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-800 text-[11px] block">{DOC_TYPE_NAMES[dt]}</span>
                  <select
                    value={companyForm.defaultTemplates[dt] || 'classic'}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        defaultTemplates: {
                          ...companyForm.defaultTemplates,
                          [dt]: e.target.value as DocTemplate,
                        },
                      })
                    }
                    className="w-full border border-slate-300 rounded p-1.5 font-bold bg-white text-xs"
                  >
                    <option value="classic">CLASSIC (Klasik)</option>
                    <option value="modern">MODERN (Modern)</option>
                    <option value="compact">COMPACT (Kompakt)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Ayarları Kaydet</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: KULLANICI TANIMLI ÖZEL ALANLAR (RULE 5) */}
      {activeTab === 'custom_fields' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">İşletmenize Özel Tanımlı Alanlar (Custom Labels)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fabrika Sipariş No, İç Sipariş No, Forwarder vb. özel alanlarınızı oluşturun. Sistem standart alanlarını bozmaz.
              </p>
            </div>
            <button
              onClick={() => setIsFieldModalOpen(true)}
              className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Yeni Alan Oluştur</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Alan Adı</th>
                  <th className="py-3 px-4">Alan Tipi</th>
                  <th className="py-3 px-4">Modül</th>
                  <th className="py-3 px-4">Zorunlu Mu?</th>
                  <th className="py-3 px-4">Belgelerde Göster</th>
                  <th className="py-3 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customFields.map((cf) => (
                  <tr key={cf.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{cf.name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-teal-800 uppercase text-[10px]">{cf.type}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-700">{cf.module}</td>
                    <td className="py-3 px-4">
                      {cf.required ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Zorunlu</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">Opsiyonel</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cf.showInDocs ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Gösterilsin</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">Gizli</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteCustomField(cf.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New Custom Field Modal */}
          {isFieldModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
                <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold text-base">+ Yeni Özel Alan Tanımla</h3>
                  <button onClick={() => setIsFieldModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleAddCustomFieldSubmit} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alan Adı *</label>
                    <input
                      type="text"
                      required
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Örn: Fabrika Sipariş No veya Forwarder"
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alan Tipi *</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                      >
                        <option value="text">Metin (Text)</option>
                        <option value="number">Sayı (Number)</option>
                        <option value="date">Tarih (Date)</option>
                        <option value="select">Seçim Listesi (Select)</option>
                        <option value="currency">Para (Currency)</option>
                        <option value="boolean">Evet / Hayır (Boolean)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Hangi Modülde? *</label>
                      <select
                        value={newFieldModule}
                        onChange={(e) => setNewFieldModule(e.target.value as CustomFieldModule)}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                      >
                        <option value="shipment">Sevkiyat Dosyası</option>
                        <option value="customer">Müşteri Kartı</option>
                        <option value="product">Ürün Kartı</option>
                      </select>
                    </div>
                  </div>

                  {newFieldType === 'select' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Seçenekler (Virgülle Ayırın)</label>
                      <input
                        type="text"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder="Seçenek 1, Seçenek 2, Seçenek 3"
                        className="w-full border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-6 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span className="font-medium text-slate-800">Zorunlu Alan</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldShowInDocs}
                        onChange={(e) => setNewFieldShowInDocs(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span className="font-medium text-slate-800">Belgelerde Gösterilsin</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsFieldModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs"
                    >
                      Alanı Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BELGE NUMARALANDIRMA (RULE 6) */}
      {activeTab === 'numbering' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Left: Document Types list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-3">Belge Türleri</h3>
            {docTypesList.map((dt) => {
              const isSel = selectedNumDocType === dt;
              return (
                <button
                  key={dt}
                  onClick={() => handleDocTypeNumberingSelect(dt)}
                  className={`w-full text-left p-3 rounded-lg font-semibold transition-all flex justify-between items-center ${
                    isSel ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span>{DOC_TYPE_NAMES[dt]}</span>
                  <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${isSel ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {docNumberFormats[dt]?.prefix}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center & Right: Format Editor & Live Output Preview explicitly required in Rule 6 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {DOC_TYPE_NAMES[selectedNumDocType]} Formatı Özelleştirme
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kullanabileceğiniz token'lar: <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{PREFIX}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{YYYY}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{YYYYMM}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{CUSTOMER}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{SEQ}'}</code>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Önek (Prefix)</label>
                  <input
                    type="text"
                    value={numPrefix}
                    onChange={(e) => setNumPrefix(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Numara Formatı Kalıbı</label>
                  <input
                    type="text"
                    value={numFormatStr}
                    onChange={(e) => setNumFormatStr(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Live Preview Result Box explicitly mandated in Rule 6 */}
              <div className="bg-teal-900 text-white p-5 rounded-xl space-y-2 border border-teal-800 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">CANLI ÖNİZLEME (LIVE PREVIEW OUTPUT)</span>
                <div className="text-2xl font-mono font-black text-white tracking-widest">
                  {livePreviewNum}
                </div>
                <p className="text-[11px] text-teal-200">
                  Örnek Müşteri Kodu: "ELEK" | Yıl: 2026 | Ay: 08 | Sıra No: 001
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNumberFormat}
                  className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  <span>Formatı Kaydet</span>
                </button>
              </div>
            </div>

            {/* Audit Log / History for re-numbering approved documents (Rule 6) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-600">
                <History className="w-4 h-4 text-teal-600" />
                <span>Belge Numaralandırma Değişiklik Geçmişi (Audit Log)</span>
              </h4>
              <div className="space-y-2">
                {numberHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">Henüz onaylanmış bir belgede numara değişikliği yapılmadı.</p>
                ) : (
                  numberHistory.map((h) => (
                    <div key={h.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-slate-800">{DOC_TYPE_NAMES[h.docType]}</strong>
                        <p className="text-slate-500">{h.oldNumber} → <strong className="text-teal-800">{h.newNumber}</strong></p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <div>{h.changedBy} ({h.changedAt})</div>
                        <div className="italic">{h.reason}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
