import React, { useEffect, useState } from 'react';
import { CompanySettings, CustomField, DocType, DocTemplate, DocNumberFormat, CustomFieldType, CustomFieldModule, DocNumberHistory } from '../types/exporta';
import { generateDocNumber } from '../lib/numbering';
import { Settings, Building, Sliders, Hash, Layout, Plus, Trash2, Edit, Check, Eye, AlertCircle, History, RefreshCw, ImageIcon, Loader2, UploadCloud } from 'lucide-react';
import { ModalCloseButton } from './ModalCloseButton';
import { useEscapeClose } from '../lib/useEscapeClose';
import { useLang } from '../i18n';
import type { SaveOutcome } from '../lib/saveTypes';
import { outcomeMessage } from './AppNotice';
import { useAuth } from '../context/AuthContext';
import {
  uploadCompanyLogo,
  deleteCompanyLogo,
  LOGO_MAX_BYTES,
  LOGO_ACCEPTED_TYPES,
} from '../lib/supabaseService';

interface SettingsViewProps {
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => Promise<SaveOutcome>;
  customFields: CustomField[];
  onAddCustomField: (field: CustomField) => void;
  onDeleteCustomField: (id: string) => void;
  docNumberFormats: Record<DocType, DocNumberFormat>;
  onUpdateNumberFormat: (docType: DocType, format: DocNumberFormat, reason: string) => Promise<SaveOutcome>;
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
  const { organization } = useAuth();
  const { t } = useLang();
  const st = t.settings;
  const DOC_TYPE_NAMES = t.docNames;
  const [activeTab, setActiveTab] = useState<'company' | 'custom_fields' | 'numbering'>('company');

  // Company settings local state. Re-synced whenever the prop changes so the
  // form doesn't keep showing a snapshot taken before the org's real data
  // (or its empty default) arrived from Supabase. User edits between fetch
  // completions are transient and expected to be re-based on saved data.
  const [companyForm, setCompanyForm] = useState<CompanySettings>(companySettings);
  useEffect(() => {
    setCompanyForm(companySettings);
  }, [companySettings]);

  // Logo upload state
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  /**
   * Persists a logoUrl change straight away (both local form + parent/Supabase),
   * so the logo survives even if the user never presses "Ayarları Kaydet".
   */
  const persistLogoUrl = (logoUrl: string | undefined) => {
    setCompanyForm((prev) => ({ ...prev, logoUrl }));
    onUpdateCompanySettings({ ...companyForm, logoUrl });
  };

  const handleLogoFile = async (file: File | undefined) => {
    setLogoError(null);
    if (!file) return;

    if (!organization?.id) {
      setLogoError(st.logoNoOrg);
      return;
    }
    if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
      setLogoError(st.logoType);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(st.logoSize);
      return;
    }

    setLogoBusy(true);
    const { url, error } = await uploadCompanyLogo(organization.id, file);
    setLogoBusy(false);

    if (error || !url) {
      setLogoError(error ? `${st.logoUploadFailed}: ${error.replace(/^Logo yüklenemedi: /, '')}` : st.logoUploadFailed);
      return;
    }
    persistLogoUrl(url);
  };

  const handleRemoveLogo = async () => {
    setLogoError(null);
    if (!organization?.id) {
      persistLogoUrl(undefined);
      return;
    }
    setLogoBusy(true);
    const { error } = await deleteCompanyLogo(organization.id);
    setLogoBusy(false);
    if (error) {
      setLogoError(`${st.logoDeleteFailed}: ${error.replace(/^Logo silinemedi: /, '')}`);
      return;
    }
    persistLogoUrl(undefined);
  };

  // Custom field modal state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fieldFormDirty, setFieldFormDirty] = useState(false);
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
  const [numChangeReason, setNumChangeReason] = useState('');

  const docTypesList: DocType[] = [
    'quotation',
    'proforma',
    'sales_order',
    'actual_loading',
    'commercial_invoice',
    'packing_list',
    'shipping_instruction',
  ];

  const openFieldModal = () => {
    setFieldFormDirty(false);
    setIsFieldModalOpen(true);
  };

  const closeFieldModal = () => {
    if (
      fieldFormDirty &&
      !window.confirm(t.forms.unsaved)
    ) {
      return;
    }
    setIsFieldModalOpen(false);
    setFieldFormDirty(false);
  };

  useEscapeClose(isFieldModalOpen, closeFieldModal);

  const [companyMsg, setCompanyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const outcome = await onUpdateCompanySettings(companyForm);
    setCompanyMsg({ ok: outcome !== 'failed', text: outcome === 'saved' ? st.saved : outcomeMessage(t, outcome) });
  };

  const handleAddCustomFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) {
      alert(st.fieldNameRequired);
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
    setFieldFormDirty(false);
    setIsFieldModalOpen(false);
    setNewFieldName('');
  };

  const handleDocTypeNumberingSelect = (dt: DocType) => {
    setSelectedNumDocType(dt);
    const cfg = docNumberFormats[dt];
    setNumPrefix(cfg.prefix);
    setNumFormatStr(cfg.format);
    setNumNextSeq(cfg.nextSeq);
    setNumChangeReason('');
  };

  const handleSaveNumberFormat = async () => {
    const current = docNumberFormats[selectedNumDocType];
    if (current.prefix === numPrefix && current.format === numFormatStr) {
      alert(st.noChange);
      return;
    }

    // The prefix only lands anywhere if the pattern actually contains the token.
    if (current.prefix !== numPrefix && !numFormatStr.includes('{PREFIX}')) {
      alert(st.prefixUnused);
      return;
    }

    const updated: DocNumberFormat = {
      docType: selectedNumDocType,
      prefix: numPrefix,
      format: numFormatStr,
      nextSeq: numNextSeq,
      seqLength: 3,
    };
    const outcome = await onUpdateNumberFormat(selectedNumDocType, updated, numChangeReason.trim() || st.noReason);
    setNumChangeReason('');
    alert(outcome === 'saved' ? st.formatSaved(DOC_TYPE_NAMES[selectedNumDocType]) : outcomeMessage(t, outcome));
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
          <span>{st.title}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {st.lead}
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
          <span>{st.tabCompany}</span>
        </button>

        <button
          onClick={() => setActiveTab('custom_fields')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'custom_fields' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-teal-600" />
          <span>{st.tabFields}</span>
        </button>

        <button
          onClick={() => setActiveTab('numbering')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'numbering' ? 'border-teal-600 text-teal-800 font-bold bg-teal-50/50' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Hash className="w-4 h-4 text-teal-600" />
          <span>{st.tabNumbering}</span>
        </button>
      </div>

      {/* TAB 1: FIRMA & BANKA AYARLARI */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">{st.official}</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{st.companyName}</label>
                <input
                  type="text"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{st.tax}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={st.taxNo}
                    value={companyForm.taxNo}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxNo: e.target.value })}
                    className="border border-slate-300 rounded-lg p-2 font-mono"
                  />
                  <input
                    type="text"
                    placeholder={st.taxOffice}
                    value={companyForm.taxOffice}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxOffice: e.target.value })}
                    className="border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{st.address}</label>
                <textarea
                  rows={2}
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{st.city}</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{st.email}</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>

            {/* Company Logo */}
            <div className="mt-6">
              <label className="block font-semibold text-slate-700 mb-1">{st.logo}</label>
              <p className="text-[11px] text-slate-500 mb-3">
                {st.logoHint}
              </p>

              <div className="flex items-center gap-4">
                <div className="w-28 h-28 shrink-0 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                  {companyForm.logoUrl ? (
                    <img
                      src={companyForm.logoUrl}
                      alt={st.logoAlt}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <ImageIcon className="w-7 h-7" />
                      <span className="text-[9px] mt-1">{st.noLogo}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      handleLogoFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={logoBusy}
                      onClick={() => logoInputRef.current?.click()}
                      className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-2 disabled:opacity-50"
                    >
                      {logoBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-teal-600" />
                      )}
                      <span>{companyForm.logoUrl ? st.changeLogo : st.uploadLogo}</span>
                    </button>

                    {companyForm.logoUrl && (
                      <button
                        type="button"
                        disabled={logoBusy}
                        onClick={handleRemoveLogo}
                        className="py-2 px-3 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{st.removeLogo}</span>
                      </button>
                    )}
                  </div>

                  {logoError && (
                    <p className="text-[11px] text-red-600 flex items-start gap-1.5 max-w-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{logoError}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">{st.bank}</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{st.bankName}</label>
                <input
                  type="text"
                  value={companyForm.bankName}
                  onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{st.iban}</label>
                <input
                  type="text"
                  value={companyForm.iban}
                  onChange={(e) => setCompanyForm({ ...companyForm, iban: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{st.swift}</label>
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
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">{st.templates}</h3>
            <div className="mt-3 mb-5 max-w-sm">
              <label htmlFor="vgm-tolerance" className="block font-semibold text-slate-700 mb-1">{t.settings2.tolerance}</label>
              <input
                id="vgm-tolerance"
                type="number"
                min={0}
                max={50}
                step="0.5"
                value={companyForm.vgmWarningTolerancePct ?? 5}
                onChange={(e) => setCompanyForm({ ...companyForm, vgmWarningTolerancePct: Math.max(0, Number(e.target.value) || 0) })}
                className="w-32 border border-slate-300 rounded-lg p-2 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">{t.settings2.toleranceHint}</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {st.templatesLead}
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
                    <option value="classic">{st.tplClassic}</option>
                    <option value="modern">{st.tplModern}</option>
                    <option value="compact">{st.tplCompact}</option>
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
              <span>{st.saveSettings}</span>
            </button>
          </div>
          {companyMsg && (
            <p role="status" className={`text-right text-xs font-semibold ${companyMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {companyMsg.text}
            </p>
          )}
        </form>
      )}

      {/* TAB 2: KULLANICI TANIMLI ÖZEL ALANLAR (RULE 5) */}
      {activeTab === 'custom_fields' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{st.fieldsTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {st.fieldsLead}
              </p>
            </div>
            <button
              onClick={openFieldModal}
              className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{st.newField}</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">{st.colName}</th>
                  <th className="py-3 px-4">{st.colType}</th>
                  <th className="py-3 px-4">{st.colModule}</th>
                  <th className="py-3 px-4">{st.colRequired}</th>
                  <th className="py-3 px-4">{st.colShow}</th>
                  <th className="py-3 px-4 text-center">{st.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customFields.map((cf) => (
                  <tr key={cf.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{cf.name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-teal-800 uppercase text-[10px]">{st.types[cf.type] ?? cf.type}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-700">{st.modules[cf.module] ?? cf.module}</td>
                    <td className="py-3 px-4">
                      {cf.required ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">{st.required}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">{st.optional}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cf.showInDocs ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">{st.shown}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">{st.hidden}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteCustomField(cf.id)}
                        title={st.deleteField}
                        aria-label={st.deleteField}
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
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
                <ModalCloseButton onClose={closeFieldModal} />
                <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold text-base">{st.fieldModalTitle}</h3>
                </div>

                <form onSubmit={handleAddCustomFieldSubmit} onChange={() => setFieldFormDirty(true)} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{st.fieldName}</label>
                    <input
                      type="text"
                      required
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder={st.fieldNamePlaceholder}
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{st.fieldType}</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                      >
                        {['text', 'number', 'date', 'select', 'currency', 'boolean'].map((ft) => (
                          <option key={ft} value={ft}>
                            {st.types[ft]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{st.fieldModule}</label>
                      <select
                        value={newFieldModule}
                        onChange={(e) => setNewFieldModule(e.target.value as CustomFieldModule)}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                      >
                        {['shipment', 'customer', 'product'].map((m) => (
                          <option key={m} value={m}>
                            {st.modules[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {newFieldType === 'select' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{st.options}</label>
                      <input
                        type="text"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder={st.optionsPlaceholder}
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
                      <span className="font-medium text-slate-800">{st.requiredField}</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldShowInDocs}
                        onChange={(e) => setNewFieldShowInDocs(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span className="font-medium text-slate-800">{st.showInDocs}</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={closeFieldModal}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg"
                    >
                      {st.cancel}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs"
                    >
                      {st.createField}
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
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-3">{st.docTypes}</h3>
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
                  {st.formatTitle(DOC_TYPE_NAMES[selectedNumDocType])}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {st.tokens} <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{PREFIX}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{YYYY}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{YYYYMM}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{CUSTOMER}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-bold">{'{SEQ}'}</code>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{st.prefix}</label>
                  <input
                    type="text"
                    value={numPrefix}
                    onChange={(e) => setNumPrefix(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">{st.pattern}</label>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">{st.livePreview}</span>
                <div className="text-2xl font-mono font-black text-white tracking-widest">
                  {livePreviewNum}
                </div>
                <p className="text-[11px] text-teal-200">
                  {st.sample}
                </p>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <label className="block font-semibold text-slate-700 mb-1">{st.reason}</label>
                  <input
                    type="text"
                    value={numChangeReason}
                    onChange={(e) => setNumChangeReason(e.target.value)}
                    placeholder={st.reasonPlaceholder}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <button
                  onClick={handleSaveNumberFormat}
                  className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1 shrink-0"
                >
                  <Check className="w-4 h-4 mr-1" />
                  <span>{st.saveFormat}</span>
                </button>
              </div>
            </div>

            {/* Audit Log / History for re-numbering approved documents (Rule 6) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-600">
                <History className="w-4 h-4 text-teal-600" />
                <span>{st.history}</span>
              </h4>
              <div className="space-y-2">
                {numberHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">{st.noHistory}</p>
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
