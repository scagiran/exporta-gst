import React from 'react';
import {
  Ship,
  FileText,
  FileCheck,
  Table,
  Check,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Sparkles,
  Layers,
  Layout,
  Building,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { ExPortaLogo } from './ExPortaLogo';

interface LandingPageProps {
  onStartDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartDemo }) => {
  const pricingPlans = [
    {
      id: 'free',
      name: 'Başlangıç (Free)',
      desc: 'İhracata yeni başlayan küçük işletmeler için temel seviye.',
      monthlyPrice: '₺0',
      period: 'Sonsuza Kadar Ücretsiz',
      highlight: false,
      badge: 'Ücretsiz',
      features: [
        '1 Kullanıcı Hesabı',
        'Sınırsız Master Sevkiyat',
        '7 Aşamalı İhracat Belge Üretimi',
        'Standart Belge Şablonu (Classic)',
        'Müşteri & Ürün Katalog Yönetimi',
        'PDF Belge İndirme & Yazdırma',
      ],
      ctaText: 'Ücretsiz Başlayın',
    },
    {
      id: 'pro',
      name: 'Profesyonel (Pro)',
      desc: 'Düzenli ihracat yapan KOBİ\'ler için tam donanımlı operasyon paketi.',
      monthlyPrice: '₺1.490',
      period: 'Kullanıcı / Ay',
      highlight: true,
      badge: 'En Popüler',
      features: [
        'Sınırsız Master Sevkiyat Oluşturma',
        '7 Aşamalı Otomatik Belge Workflow',
        '3 Profesyonel Şablon (Classic, Modern, Compact)',
        'Excel İçe/Dışa Aktarım (Müşteri & Ürün)',
        'Özel Alan Tanımlama (Custom Fields)',
        'Otomatik Belge Numaralandırma',
        'Supabase Bulut Senkronizasyonu & Yedekleme',
        'E-posta ile Müşteri Desteği',
      ],
      ctaText: 'Ücretsiz Başlayın',
    },
    {
      id: 'business',
      name: 'Kurumsal (Business)',
      desc: 'Çoklu kullanıcı ve geniş ihracat ekibine sahip firmalar için.',
      monthlyPrice: '₺3.990',
      period: '5 Kullanıcı Dahil / Ay',
      highlight: false,
      badge: 'Çoklu Kullanıcı',
      features: [
        'Sınırsız Master Sevkiyat & Belge Üretimi',
        '3 Profesyonel Şablon + Özel Alan Tanımlama',
        'Otomatik Belge Numaralandırma & Değişiklik Kaydı',
        'Firma Logosu Tüm Belge Şablonlarında',
        { label: '5 Kullanıcıya Kadar Multi-Tenant Erişim', soon: true },
        { label: 'Gelişmiş Şirket Rol ve Yetkilendirme', soon: true },
        { label: 'Özel Veri Dışa Aktarım API Erişimi', soon: true },
        'Kurulum & Şablon Tasarım Desteği (manuel)',
      ],
      ctaText: 'Kurumsal Görüşme Yapın',
    },
  ];

  const faqs = [
    {
      q: 'ExPorta verilerimi nerede saklıyor?',
      a: 'Verileriniz Supabase (PostgreSQL) altyapısında, her organizasyona ayrı bir kayıt alanı verilerek saklanır. Erişim, oturum açan kullanıcının üyesi olduğu organizasyonla sınırlandırılır.',
    },
    {
      q: 'Mevcut Excel müşteri ve ürün listemi aktarabilir miyim?',
      a: 'Evet! Excel içe aktarım modülü sayesinde mevcut müşterilerinizi ve GTİP kodlu ürün kataloğunuzu saniyeler içinde ExPorta\'ya yükleyebilirsiniz.',
    },
    {
      q: 'Fatura veya Proforma oluşturduğumda PDF olarak indirebilir miyim?',
      a: 'Kesinlikle. Commercial Invoice, Packing List, Proforma ve diğer tüm 7 ihracat belgesini anında canlı önizleyebilir, PDF olarak indirebilir veya yazdırabilirsiniz.',
    },
    {
      q: 'Ücretli pakete nasıl geçerim?',
      a: 'Ücretsiz hesabınızı hemen açıp uygulamayı kullanmaya başlayabilirsiniz. Pro veya Kurumsal pakete geçmek için bizimle iletişime geçin; ödeme ve aktivasyon manuel olarak, birlikte yapılır.',
    },
  ];

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="cursor-pointer" onClick={onStartDemo}>
            <ExPortaLogo variant="light" size="md" showSubtitle={true} />
          </div>

          <div className="flex items-center space-x-4">
            <a href="#pricing" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">
              Fiyatlandırma
            </a>
            <a href="#features" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">
              Özellikler
            </a>
            <button
              onClick={onStartDemo}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-teal-500/20 flex items-center space-x-2"
            >
              <span>SaaS Uygulamasına Giriş</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center space-y-8 relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>İhracatçı KOBİ'ler İçin Yeni Nesil B2B Operasyon OS</span>
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
            <span>Ücretsiz Hesabınızı Başlatın</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Pipeline Diagram */}
        <div className="pt-12">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-5xl mx-auto">
            <div className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest text-left mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>MASTER WORKFLOW DÖNGÜSÜ (7 STEP DOCUMENT PIPELINE)</span>
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
      <section id="features" className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-widest">ÖNE ÇIKAN B2B MİMARİ</span>
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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center space-y-4 mb-12">
          <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-widest">ŞEFFAF VE UYGUN FİYATLANDIRMA</span>
          <h2 className="text-3xl md:text-5xl font-black text-white">Şirketiniz İçin En Uygun Planı Seçin</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Ücretsiz paketle hemen başlayın. Pro ve Kurumsal paketlerde ödeme ve aktivasyon
            şu an için bizimle iletişime geçilerek, manuel olarak yapılır.
          </p>

          <div className="pt-2 flex items-center justify-center">
            <span className="text-[11px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
              Fiyatlar aylık, kullanıcı başınadır · KDV hariç
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricingPlans.map((plan) => {
            const price = plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 flex flex-col justify-between relative transition-all ${
                  plan.highlight
                    ? 'bg-slate-900 border-2 border-teal-500 shadow-2xl shadow-teal-500/10 transform md:-translate-y-2'
                    : 'bg-slate-900/60 border border-slate-800'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-500 text-slate-950 text-[11px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{plan.desc}</p>
                  </div>

                  <div className="border-t border-b border-slate-800/80 py-4">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-4xl font-black text-white">{price}</span>
                      {price !== '₺0' && <span className="text-xs text-slate-400">/ ay</span>}
                    </div>
                    <span className="text-[11px] text-teal-400 font-mono block mt-1">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => {
                      const isSoon = typeof feat === 'object' && feat.soon;
                      const label = typeof feat === 'object' ? feat.label : feat;
                      return (
                        <li key={idx} className="flex items-center space-x-2.5">
                          <Check
                            className={`w-4 h-4 shrink-0 ${isSoon ? 'text-slate-600' : 'text-teal-400'}`}
                          />
                          <span className={isSoon ? 'text-slate-500' : ''}>{label}</span>
                          {isSoon && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded-full shrink-0">
                              Yakında
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    onClick={onStartDemo}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                      plan.highlight
                        ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SSS (FAQ) Section */}
      <section className="py-16 px-6 max-w-5xl mx-auto border-t border-slate-800 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-widest">AKLINIZA TAKILANLAR</span>
          <h2 className="text-3xl font-extrabold text-white">Sıkça Sorulan Sorular</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 text-center text-xs text-slate-500 space-y-4">
        <div className="flex items-center justify-center">
          <ExPortaLogo variant="light" size="sm" />
        </div>
        <p>© 2026 ExPorta B2B Dış Ticaret Operasyon Platformu. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
};
