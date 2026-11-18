import React, { useState } from 'react';
import { Product, CustomField } from '../types/exporta';
import { Package, Plus, Search, FileSpreadsheet, Tag, Scale, DollarSign, Edit, Trash2, Globe, Download } from 'lucide-react';
import { exportProductsToExcel } from '../lib/excelExport';
import { ModalCloseButton } from './ModalCloseButton';
import { useEscapeClose } from '../lib/useEscapeClose';
import { useLang } from '../i18n';
import { UNIT_VALUES, unitLabel } from '../i18n/units';

interface ProductsViewProps {
  products: Product[];
  customFields: CustomField[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onOpenExcelImport: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  customFields,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onOpenExcelImport,
}) => {
  const { t, lang, num } = useLang();
  const pr = t.products;
  const f = t.forms;
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Dirty flag: any input change inside the form bubbles to the form's onChange.
  const [formDirty, setFormDirty] = useState(false);

  const closeModal = () => {
    if (
      formDirty &&
      !window.confirm(f.unsaved)
    ) {
      return;
    }
    setIsModalOpen(false);
    setFormDirty(false);
  };

  useEscapeClose(isModalOpen, closeModal);

  const productCustomFields = customFields.filter((cf) => cf.module === 'product');

  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    name: '',
    hsCode: '',
    description: '',
    unit: 'Adet',
    origin: 'Türkiye',
    netWeightKg: 1.0,
    grossWeightKg: 1.2,
    unitPrice: 100.0,
    currency: 'EUR',
    customFields: {},
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.hsCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      code: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      hsCode: '',
      description: '',
      unit: 'Adet',
      origin: 'Türkiye',
      netWeightKg: 1.0,
      grossWeightKg: 1.2,
      unitPrice: 100.0,
      currency: 'EUR',
      customFields: {},
    });
    setFormDirty(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prd: Product) => {
    setEditingProduct(prd);
    setFormData({ ...prd, customFields: prd.customFields || {} });
    setFormDirty(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.hsCode) {
      alert(pr.required);
      return;
    }

    if (editingProduct) {
      onUpdateProduct({ ...editingProduct, ...formData } as Product);
    } else {
      const newPrd: Product = {
        id: `prod-${Date.now()}`,
        code: formData.code || `PRD-${Date.now()}`,
        name: formData.name || '',
        hsCode: formData.hsCode || '0000.00.00',
        description: formData.description || '',
        unit: formData.unit || 'Adet',
        origin: formData.origin || 'Türkiye',
        netWeightKg: Number(formData.netWeightKg) || 1,
        grossWeightKg: Number(formData.grossWeightKg) || 1,
        unitPrice: Number(formData.unitPrice) || 0,
        currency: formData.currency || 'EUR',
        customFields: formData.customFields || {},
      };
      onAddProduct(newPrd);
    }

    setFormDirty(false);
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const ok = exportProductsToExcel(products, lang);
    if (!ok) {
      alert(pr.nothingToExportLong);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            <span>{pr.title}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {pr.lead}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenExcelImport}
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center space-x-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{f.importExcel}</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={products.length === 0}
            title={products.length === 0 ? pr.nothingToExport : undefined}
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center space-x-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>{f.exportExcel}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{pr.add}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={pr.search}
          className="w-full text-xs text-slate-800 focus:outline-none"
        />
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{pr.colImage}</th>
                <th className="py-3 px-4">{pr.colCode}</th>
                <th className="py-3 px-4">{pr.colName}</th>
                <th className="py-3 px-4">{pr.colHs}</th>
                <th className="py-3 px-4">{pr.colUnit}</th>
                <th className="py-3 px-4 text-right">{pr.colWeight}</th>
                <th className="py-3 px-4 text-right">{pr.colPrice}</th>
                <th className="py-3 px-4 text-center">{pr.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prd) => (
                <tr key={prd.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    {prd.imageUrl ? (
                      <img
                        src={prd.imageUrl}
                        alt={prd.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-teal-800">{prd.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{prd.name}</div>
                    {prd.description && <div className="text-[11px] text-slate-500 line-clamp-1">{prd.description}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      {prd.hsCode}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800 font-medium">{unitLabel(prd.unit, lang)}</div>
                    <div className="text-[11px] text-slate-500">{prd.origin}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <div className="text-slate-800">{num(prd.netWeightKg)} kg ({pr.net})</div>
                    <div className="text-[11px] text-slate-500">{num(prd.grossWeightKg)} kg ({pr.gross})</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                    {num(prd.unitPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {prd.currency}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(prd)}
                        title={f.edit}
                        aria-label={f.edit}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-md"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(prd.id)}
                        title={f.delete}
                        aria-label={f.delete}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <ModalCloseButton onClose={closeModal} />
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingProduct ? pr.editTitle : pr.addTitle}
              </h3>
            </div>

            <form onSubmit={handleSubmit} onChange={() => setFormDirty(true)} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.code}</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 font-mono"
                    placeholder="PRD-8537"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.hs}</label>
                  <input
                    type="text"
                    required
                    value={formData.hsCode || ''}
                    onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 font-mono"
                    placeholder="8537.10.91.00.00"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{pr.name}</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                  placeholder={pr.namePlaceholder}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{pr.description}</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                  placeholder={pr.descriptionPlaceholder}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{pr.image}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.imageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  {formData.imageUrl && (
                    <img
                      src={formData.imageUrl}
                      alt={pr.preview}
                      className="w-9 h-9 object-cover rounded border border-slate-200 shrink-0"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.unit}</label>
                  <select
                    value={formData.unit || 'Adet'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {UNIT_VALUES.map((u) => (
                      <option key={u} value={u}>
                        {unitLabel(u, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.origin}</label>
                  <input
                    type="text"
                    value={formData.origin || 'Türkiye'}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.netKg}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.netWeightKg || ''}
                    onChange={(e) => setFormData({ ...formData, netWeightKg: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.grossKg}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.grossWeightKg || ''}
                    onChange={(e) => setFormData({ ...formData, grossWeightKg: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.price}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitPrice || ''}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{pr.currency}</label>
                  <select
                    value={formData.currency || 'EUR'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>
              </div>

              {/* Product Custom Fields */}
              {productCustomFields.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">{f.customFields}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {productCustomFields.map((cf) => (
                      <div key={cf.id}>
                        <label className="block font-semibold text-slate-700 mb-1">{cf.name}</label>
                        <input
                          type="text"
                          value={(formData.customFields?.[cf.name] as string) || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customFields: { ...formData.customFields, [cf.name]: e.target.value },
                            })
                          }
                          className="w-full border border-slate-300 rounded-lg p-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  {f.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {f.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
