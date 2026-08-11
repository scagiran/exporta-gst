import React, { useState } from 'react';
import { StickyNote, Plus, Trash2, CheckCircle2, ShieldAlert, Sparkles, FileText, Globe } from 'lucide-react';

interface NoteItem {
  id: string;
  title: string;
  category: 'Gümrük Mevzuatı' | 'Müşteri Talebi' | 'Lojistik' | 'Ödeme & Banka';
  content: string;
  createdAt: string;
  completed: boolean;
}

export const NotesView: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: 'n-1',
      title: 'Almanya AB A.TR Dolaşım Belgesi Gereksinimi',
      category: 'Gümrük Mevzuatı',
      content: 'Hamburg teslimatlarında gümrük vergisi muafiyeti için gümrük müşavirimize elektronik A.TR vizesi iletilmelidir.',
      createdAt: '2026-08-08',
      completed: true,
    },
    {
      id: 'n-2',
      title: 'ABD Akreditif (L/C) 45 Gün Vadeli Belge İbrazı',
      category: 'Ödeme & Banka',
      content: 'Chicago Global Trade sevkiyatı için konşimento tarihi itibaren 21 gün içinde İş Bankası Ostim şubesine 3 nüsha Commercial Invoice sunulacak.',
      createdAt: '2026-08-09',
      completed: false,
    },
    {
      id: 'n-3',
      title: 'Dubai Jebel Ali Serbest Bölge Konşimento Talimatı',
      category: 'Lojistik',
      content: 'Consignee kısmına Levant Import FZE yazılmalı, Notify Party kısmına acente adı eklenmelidir.',
      createdAt: '2026-08-10',
      completed: false,
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Gümrük Mevzuatı' | 'Müşteri Talebi' | 'Lojistik' | 'Ödeme & Banka'>('Gümrük Mevzuatı');
  const [newContent, setNewContent] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const note: NoteItem = {
      id: `note-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      content: newContent,
      createdAt: new Date().toISOString().split('T')[0],
      completed: false,
    };

    setNotes([note, ...notes]);
    setNewTitle('');
    setNewContent('');
  };

  const handleToggleNote = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-teal-600" />
          <span>İhracat Operasyon Notları & Hatırlatıcılar</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Gümrük mevzuatı, akreditif şartları ve sevkiyat özel notlarınızı ekibin ortak bilgi havuzunda saklayın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Note Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 text-xs h-fit">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-teal-600" />
            <span>Yeni Not / Hatırlatıcı Ekle</span>
          </h3>

          <form onSubmit={handleAddNote} className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Not Başlığı *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Örn: Fransa A.TR Belgesi Tasdiki"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="Gümrük Mevzuatı">Gümrük Mevzuatı</option>
                <option value="Müşteri Talebi">Müşteri Talebi</option>
                <option value="Lojistik">Lojistik</option>
                <option value="Ödeme & Banka">Ödeme & Banka</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Not İçeriği</label>
              <textarea
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Operasyon ekibinin dikkat etmesi gereken detaylar..."
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
            >
              Notu Kaydet
            </button>
          </form>
        </div>

        {/* Notes List */}
        <div className="lg:col-span-2 space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-xl border transition-all space-y-2 ${
                note.completed
                  ? 'bg-slate-100/80 border-slate-200 opacity-75'
                  : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={note.completed}
                    onChange={() => handleToggleNote(note.id)}
                    className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    {note.category}
                  </span>
                  <span className="text-[10px] text-slate-400">{note.createdAt}</span>
                </div>

                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className={`font-bold text-sm text-slate-900 ${note.completed ? 'line-through text-slate-500' : ''}`}>
                {note.title}
              </h4>
              {note.content && <p className="text-xs text-slate-600 leading-relaxed">{note.content}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
