import React from 'react';
import {
  Ship,
  FileText,
  FileCheck,
  Table,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Sparkles,
  Layers,
  Layout,
  Download,
} from 'lucide-react';

interface LandingPageProps {
  onStartDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartDemo }) => {
  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onStartDemo}>
            <div className="w-9 h-9 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-black text-xl">
              eX
            </div>
            <div>
              <span className="text-white font-extrabold text-xl tracking-tight">ExPorta</span>
              <span className="block text-[10px] text-teal-400 font-mono tracking-widest uppercase">
                B2B EXPORT OPERATION OS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onStartDemo}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-teal-500/20 flex items-center space-x-2"
            >
              <span>Sisteme Giriş / Prototip Başlat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center space-y-8 relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>İhracatçı KOBİ'ler İçin Yeni Nesil B2B SaaS Arayüzü</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Tek Ortak Veri Kaynağında <span className="text-teal-400">Master Sevkiyat</span> ve 7 Aşamalı Belge Üretimi
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          ExPorta; müşteri, ürün ve yükleme verilerinizi tek master sevkiyat kartında toplar. Quotation'dan Shipping Instruction'a kadar 7 ihraç belgenizi 3 profesyonel şablonla anında türetir.
        </p>

        <div className="pt-4 flex justify-center">
          <button
            onClick={onStartDemo}
            className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-teal-500/20 flex items-center space-x-3 transition-all transform hover:-translate-y-0.5"
          >
            <span>Gerçek İhracat Sevkiyatını Deneyimleyin</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Pipeline Diagram */}
        <div className="pt-12">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-5xl mx-auto">
            <div className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest text-left mb-4">
              MASTER WORKFLOW DÖNGÜSÜ (7 STEP DOCUMENT PIPELINE)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-teal-400 font-mono font-bold block">01</span>
                <strong className="text-white text-xs block mt-1">Quotation</strong>
                <span className="text-[10px] text-slate-400">Teklif</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-teal-400 font-mono font-bold block">02</span>
                <strong className="text-white text-xs block mt-1">Proforma</strong>
                <span className="text-[10px] text-slate-400">Ön Fatura</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-teal-400 font-mono font-bold block">03</span>
                <strong className="text-white text-xs block mt-1">Sales Order</strong>
                <span className="text-[10px] text-slate-400">Satış Emri</span>
              </div>
              <div className="bg-teal-900/60 p-3 rounded-xl border border-teal-500/50">
                <span className="text-[10px] text-teal-300 font-mono font-bold block">04</span>
                <strong className="text-white text-xs block mt-1">Actual Loading</strong>
                <span className="text-[10px] text-teal-200">Gerçek Yükleme</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-teal-400 font-mono font-bold block">05</span>
                <strong className="text-white text-xs block mt-1">Commercial Inv.</strong>
                <span className="text-[10px] text-slate-400">Ticari Fatura</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-teal-400 font-mono font-bold block">06</span>
                <strong className="text-white text-xs block mt-1">Packing List</strong>
                <span className="text-[10px] text-slate-400">Çeki Listesi</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-teal-400 font-mono font-bold block">07</span>
                <strong className="text-white text-xs block mt-1">Shipping Inst.</strong>
                <span className="text-[10px] text-slate-400">Konşimento Talimatı</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-widest">ÖNE ÇIKAN B2B Mimarİ</span>
          <h2 className="text-3xl font-extrabold text-white">İhracat Operasyonunuz İçin Tasarlandı</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Ship className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Master Shipment Veri Modeli</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Belgeler bağımsız formlar değildir. Müşteri, ürün, teslim ve kantar verisi bir sevkiyatta toplanır, tüm belgeler buradan türetilir.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Layout className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Her Belge İçin 3 Profesyonel Şablon</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Classic, Modern ve Compact şablonları arasında anında geçiş yapın. Şablon değişse de ticari verileriniz asla bozulmaz.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Table className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Excel Müşteri & Ürün İçe Aktarımı</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Mevcut Excel kataloğunuzu kolon eşleştirme ve canlı doğrulama adımlarıyla saniyeler içinde ExPorta'ya aktarın.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 ExPorta B2B Dış Ticaret Operasyon Platformu. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
};
