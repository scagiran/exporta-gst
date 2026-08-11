import React, { useState } from 'react';
import { MasterShipment, DocType, DocTemplate, CompanySettings, DocStatus } from '../types/exporta';
import { DOC_TYPE_NAMES } from '../lib/numbering';
import { FileText, Eye, Layout, Search, Filter, Printer, Check, Clock, AlertTriangle, Download, StickyNote, Edit, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface DocumentsHubViewProps {
  shipments: MasterShipment[];
  companySettings: CompanySettings;
  onOpenDocEditor: (shipmentId: string, docType: DocType) => void;
  onUpdateDocNotes?: (shipmentId: string, docType: DocType, notes: string) => void;
  onResetDocument?: (shipmentId: string, docType: DocType) => void;
}

export const DocumentsHubView: React.FC<DocumentsHubViewProps> = ({
  shipments,
  companySettings,
  onOpenDocEditor,
  onUpdateDocNotes,
  onResetDocument,
}) => {
  const [selectedDocTypeFilter, setSelectedDocTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [noteInputValue, setNoteInputValue] = useState<string>('');

  const docTypesList: { id: DocType; name: string }[] = [
    { id: 'quotation', name: 'Quotation' },
    { id: 'proforma', name: 'Proforma Invoice' },
    { id: 'sales_order', name: 'Sales Order' },
    { id: 'actual_loading', name: 'Actual Loading' },
    { id: 'commercial_invoice', name: 'Commercial Invoice' },
    { id: 'packing_list', name: 'Packing List' },
    { id: 'shipping_instruction', name: 'Shipping Instruction' },
  ];

  // Flatten all documents across shipments
  const allDocs = shipments.flatMap((shipment) =>
    Object.entries(shipment.documents).map(([dType, docInfo]) => ({
      shipment,
      docType: dType as DocType,
      docInfo,
    }))
  );

  const filteredDocs = allDocs.filter((item) => {
    const matchesType = selectedDocTypeFilter === 'all' || item.docType === selectedDocTypeFilter;
    const matchesSearch =
      item.docInfo.docNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.shipment.shipmentCode.toLowerCase().includes(search.toLowerCase()) ||
      item.shipment.customer.companyName.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getStatusBadge = (status: DocStatus) => {
    switch (status) {
      case 'onaylandi':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">✓ Onaylandı</span>;
      case 'hazir':
        return <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">● Hazır</span>;
      case 'taslak':
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Taslak</span>;
      case 'eksik':
      default:
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">⚠ Eksik</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600" />
          <span>Belge Merkezi & Şablon Yönetimi</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tüm aktif sevkiyatlara ait 7 ihraç belgesinin canlı listesi. Her belge için Classic, Modern veya Compact şablonlarını canlı önizleyebilirsiniz.
        </p>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedDocTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              selectedDocTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tüm Belgeler ({allDocs.length})
          </button>
          {docTypesList.map((dt) => (
            <button
              key={dt.id}
              onClick={() => setSelectedDocTypeFilter(dt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                selectedDocTypeFilter === dt.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {dt.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Belge no veya firma ara..."
            className="w-full text-xs text-slate-800 pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Documents Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Belge Türü</th>
                <th className="py-3 px-4">Belge Numarası</th>
                <th className="py-3 px-4">Master Sevkiyat</th>
                <th className="py-3 px-4">Müşteri</th>
                <th className="py-3 px-4">Şablon</th>
                <th className="py-3 px-4">Belge Notu</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4 text-center">Önizle & Bastır</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((item, idx) => {
                const noteKey = `${item.shipment.id}-${item.docType}`;
                return (
                  <tr key={`${noteKey}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {DOC_TYPE_NAMES[item.docType]}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {item.docInfo.docNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {item.shipment.shipmentCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.shipment.customer.companyName}</div>
                      <div className="text-[10px] text-slate-500">{item.shipment.customer.country}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] uppercase font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {item.docInfo.template}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {editingNoteKey === noteKey ? (
                        <div className="space-y-1">
                          <textarea
                            value={noteInputValue}
                            onChange={(e) => setNoteInputValue(e.target.value)}
                            rows={2}
                            placeholder="Belge notunu girin..."
                            className="w-full text-[11px] p-1.5 border border-amber-400 rounded focus:outline-none bg-amber-50/50"
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setEditingNoteKey(null)}
                              className="text-[10px] px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium"
                            >
                              İptal
                            </button>
                            <button
                              onClick={() => {
                                if (onUpdateDocNotes) {
                                  onUpdateDocNotes(item.shipment.id, item.docType, noteInputValue);
                                }
                                setEditingNoteKey(null);
                              }}
                              className="text-[10px] px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded flex items-center gap-0.5 shadow-2xs"
                            >
                              <Save className="w-3 h-3" />
                              <span>Kaydet</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 group">
                          <span className={`text-[11px] font-sans truncate max-w-[170px] ${item.docInfo.notes ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                            {item.docInfo.notes ? item.docInfo.notes : 'Not eklenmedi'}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                            <button
                              onClick={() => {
                                setEditingNoteKey(noteKey);
                                setNoteInputValue(item.docInfo.notes || '');
                              }}
                              className="p-1 hover:bg-amber-100 text-amber-800 rounded transition-colors"
                              title="Notu Düzenle"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            {item.docInfo.notes && (
                              <button
                                onClick={() => {
                                  if (onUpdateDocNotes) {
                                    onUpdateDocNotes(item.shipment.id, item.docType, '');
                                  }
                                }}
                                className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                                title="Notu Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(item.docInfo.status)}
                    </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => onOpenDocEditor(item.shipment.id, item.docType)}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg inline-flex items-center space-x-1 shadow-2xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Düzenle & Önizle</span>
                      </button>

                      {onResetDocument && (
                        <button
                          onClick={() => {
                            if (window.confirm(`${DOC_TYPE_NAMES[item.docType]} belgesinin notlarını ve ayarlarını sıfırlamak istiyor musunuz?`)) {
                              onResetDocument(item.shipment.id, item.docType);
                            }
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs rounded-lg border border-slate-200 transition-colors"
                          title="Belgeyi ve Notları Sıfırla / Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenDocEditor(item.shipment.id, item.docType)}
                        className="py-1.5 px-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg inline-flex items-center space-x-1 shadow-2xs transition-colors"
                        title="PDF İndir / Yazdır"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF / Indir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
