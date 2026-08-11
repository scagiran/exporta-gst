import React, { useState } from 'react';
import { Customer, CustomField } from '../types/exporta';
import { Users, Plus, Search, FileSpreadsheet, Building, MapPin, Mail, Phone, Edit, Trash2, Globe, FileText } from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  customFields: CustomField[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onOpenExcelImport: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  customFields,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onOpenExcelImport,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const customerCustomFields = customFields.filter((cf) => cf.module === 'customer');

  const [formData, setFormData] = useState<Partial<Customer>>({
    code: '',
    companyName: '',
    country: 'Almanya',
    city: '',
    address: '',
    taxNo: '',
    contactPerson: '',
    email: '',
    phone: '',
    customFields: {},
  });

  const filteredCustomers = customers.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      code: `CUST-${customers.length + 1}`,
      companyName: '',
      country: 'Almanya',
      city: '',
      address: '',
      taxNo: '',
      contactPerson: '',
      email: '',
      phone: '',
      customFields: {},
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({ ...cust, customFields: cust.customFields || {} });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.code) {
      alert('Lütfen firma adı ve müşteri kodunu doldurun.');
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer({ ...editingCustomer, ...formData } as Customer);
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        code: formData.code || `CUST-${Date.now()}`,
        companyName: formData.companyName || '',
        country: formData.country || 'Türkiye',
        city: formData.city || '',
        address: formData.address || '',
        taxNo: formData.taxNo || '',
        contactPerson: formData.contactPerson || '',
        email: formData.email || '',
        phone: formData.phone || '',
        customFields: formData.customFields || {},
      };
      onAddCustomer(newCust);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>Müşteri Portföyü (İhracat Alıcıları)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tek ortak veri kaynağında kayıtlı tüm yabancı alıcı ve müşteri bilgileri
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Excel Import button explicitly requested in rule 4 */}
          <button
            onClick={onOpenExcelImport}
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center space-x-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>[Excel'den İçe Aktar]</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Müşteri Ekle</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Firma adı, müşteri kodu veya ülkeye göre ara..."
          className="w-full text-xs text-slate-800 focus:outline-none"
        />
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    {cust.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mt-1">{cust.companyName}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteCustomer(cust.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center space-x-2">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{cust.country}</span>
                  {cust.city && <span>, {cust.city}</span>}
                </div>

                {cust.address && (
                  <div className="flex items-start space-x-2 text-[11px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cust.address}</span>
                  </div>
                )}

                {cust.taxNo && (
                  <div className="flex items-center space-x-2 text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Vergi No:</span>
                    <span className="font-mono font-medium text-slate-800">{cust.taxNo}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                {cust.contactPerson && (
                  <div className="font-medium text-slate-800 text-xs">
                    Yetkili: {cust.contactPerson}
                  </div>
                )}
                {cust.email && (
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                )}
                {cust.phone && (
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>
                )}
              </div>

              {/* Display Custom Fields if present */}
              {cust.customFields && Object.keys(cust.customFields).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Özel Alanlar</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(cust.customFields).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                        <strong>{k}:</strong> {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingCustomer ? 'Müşteri Bilgilerini Düzenle' : 'Yeni İhracat Müşterisi Ekle'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Müşteri Kodu *</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="Örn: ELEK"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Firma Adı *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="ElektroTech GmbH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ülke *</label>
                  <input
                    type="text"
                    required
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="Almanya"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Şehir</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="Hamburg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adres</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                  placeholder="İhracat evraklarında gözükecek tam fatura adresi"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vergi Numarası (VAT)</label>
                  <input
                    type="text"
                    value={formData.taxNo || ''}
                    onChange={(e) => setFormData({ ...formData, taxNo: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="DE812345678"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Yetkili Kişi</label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="Hans Mueller"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                    placeholder="export@client.de"
                  />
                </div>
              </div>

              {/* Dynamic Customer Custom Fields */}
              {customerCustomFields.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Kullanıcı Tanımlı Özel Alanlar</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {customerCustomFields.map((cf) => (
                      <div key={cf.id}>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {cf.name} {cf.required && <span className="text-red-500">*</span>}
                        </label>
                        {cf.type === 'select' ? (
                          <select
                            value={(formData.customFields?.[cf.name] as string) || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customFields: { ...formData.customFields, [cf.name]: e.target.value },
                              })
                            }
                            className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                          >
                            <option value="">-- Seçiniz --</option>
                            {cf.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={cf.type === 'number' ? 'number' : 'text'}
                            value={(formData.customFields?.[cf.name] as string) || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customFields: { ...formData.customFields, [cf.name]: e.target.value },
                              })
                            }
                            className="w-full border border-slate-300 rounded-lg p-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
