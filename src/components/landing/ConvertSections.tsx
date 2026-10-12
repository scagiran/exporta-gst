import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { ExPortaLogo } from '../ExPortaLogo';
import { AuthForm, AuthMode } from '../AuthForm';

const i = (n: number) => ({ '--i': n } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* 7. Pricing (plans unchanged, presented as a tariff sheet)           */
/* ------------------------------------------------------------------ */

type Feature = string | { label: string; soon: true };

const PLANS: {
  id: string;
  name: string;
  tag: string;
  desc: string;
  price: string;
  period: string;
  pick?: boolean;
  badge?: string;
  features: Feature[];
  cta: string;
}[] = [
  {
    id: 'free',
    name: 'Başlangıç',
    tag: 'Free',
    desc: 'İhracata yeni başlayan küçük işletmeler için temel seviye.',
    price: '₺0',
    period: 'Sonsuza kadar ücretsiz',
    features: [
      '1 kullanıcı hesabı',
      'Sınırsız master sevkiyat',
      '7 aşamalı ihracat belge üretimi',
      'Standart belge şablonu (Classic)',
      'Müşteri ve ürün katalog yönetimi',
      'PDF belge indirme ve yazdırma',
    ],
    cta: 'Ücretsiz başlayın',
  },
  {
    id: 'pro',
    name: 'Profesyonel',
    tag: 'Pro',
    desc: "Düzenli ihracat yapan KOBİ'ler için tam donanımlı operasyon paketi.",
    price: '₺1.490',
    period: 'Kullanıcı / ay',
    pick: true,
    badge: 'En çok tercih edilen',
    features: [
      'Sınırsız master sevkiyat oluşturma',
      '7 aşamalı otomatik belge akışı',
      '3 profesyonel şablon (Classic, Modern, Compact)',
      'Excel içe ve dışa aktarım (müşteri ve ürün)',
      'Özel alan tanımlama',
      'Otomatik belge numaralandırma',
      'Supabase bulut senkronizasyonu ve yedekleme',
      'E-posta ile müşteri desteği',
    ],
    cta: 'Ücretsiz başlayın',
  },
  {
    id: 'business',
    name: 'Kurumsal',
    tag: 'Business',
    desc: 'Çoklu kullanıcı ve geniş ihracat ekibine sahip firmalar için.',
    price: '₺3.990',
    period: '5 kullanıcı dahil / ay',
    features: [
      'Sınırsız master sevkiyat ve belge üretimi',
      '3 profesyonel şablon ve özel alan tanımlama',
      'Otomatik belge numaralandırma ve değişiklik kaydı',
      'Firma logosu tüm belge şablonlarında',
      { label: '5 kullanıcıya kadar ekip erişimi', soon: true },
      { label: 'Gelişmiş şirket rol ve yetkilendirme', soon: true },
      { label: 'Özel veri dışa aktarım API erişimi', soon: true },
      'Kurulum ve şablon tasarım desteği (elle)',
    ],
    cta: 'Hesap açın, görüşelim',
  },
];

export const PricingSection: React.FC<{ onSignup: () => void }> = ({ onSignup }) => (
  <section id="fiyatlar" className="xp-sec xp-price" aria-labelledby="fiyat-h">
    <div className="xp-wrap">
      <div className="xp-price-head" data-reveal>
        <div>
          <p className="xp-label r" style={i(0)}>
            Fiyatlar
          </p>
          <h2 id="fiyat-h" className="xp-h2 r" style={i(1)}>
            Şirketinize uygun planı seçin.
          </h2>
        </div>
        <p className="xp-price-note r" style={i(2)}>
          Fiyatlar aylık ve kullanıcı başınadır, KDV hariçtir. Ücretsiz planla hemen başlayın. Pro ve Kurumsal planlarda
          ödeme ve aktivasyon şimdilik bizimle iletişime geçilerek, elle yapılır.
        </p>
      </div>

      <div className="xp-plans" data-reveal>
        {PLANS.map((plan, n) => (
          <article key={plan.id} className={`xp-plan r${plan.pick ? ' is-pick' : ''}`} style={i(n)}>
            {plan.badge && <span className="xp-plan-badge">{plan.badge}</span>}
            <h3>
              {plan.name}
              <small>{plan.tag}</small>
            </h3>
            <p className="xp-plan-desc">{plan.desc}</p>
            <div className="xp-plan-price">
              <b>{plan.price}</b>
              {plan.price !== '₺0' && <span>/ ay</span>}
            </div>
            <span className="xp-plan-period">{plan.period}</span>
            <ul>
              {plan.features.map((f) => {
                const soon = typeof f === 'object';
                const label = typeof f === 'object' ? f.label : f;
                return (
                  <li key={label} className={soon ? 'is-soon' : undefined}>
                    <Check aria-hidden="true" />
                    <span>
                      {label}
                      {soon && <span className="xp-soon">Yakında</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button type="button" className={`xp-btn ${plan.pick ? 'is-gate' : 'is-line-ink'}`} onClick={onSignup}>
              {plan.cta} <ArrowRight aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* 8. FAQ: the real objections, answered plainly                       */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'Belgeler arasında rakamlar nasıl tutarlı kalıyor?',
    a: 'Yedi belgenin hepsi aynı master sevkiyat kaydından üretilir. Müşteri, ürün, koli ve ağırlık bilgisi tek yerde durduğu için bir değişiklik o sevkiyata bağlı her belgede aynı görünür.',
  },
  {
    q: 'ExPorta verilerimi nerede saklıyor?',
    a: 'Verileriniz Supabase (PostgreSQL) altyapısında, her organizasyona ayrı bir kayıt alanı verilerek saklanır. Erişim, oturum açan kullanıcının üyesi olduğu organizasyonla sınırlıdır.',
  },
  {
    q: 'Mevcut Excel müşteri ve ürün listemi aktarabilir miyim?',
    a: "Evet. Excel içe aktarma ile mevcut müşterilerinizi ve GTİP kodlu ürün kataloğunuzu sütun eşleştirerek ExPorta'ya yüklersiniz. Hatalı satırları aktarmadan önce görürsünüz.",
  },
  {
    q: 'Proforma ya da fatura oluşturduğumda PDF olarak indirebilir miyim?',
    a: 'Evet. Commercial Invoice, Packing List, Proforma ve diğer ihracat belgelerinin hepsini canlı önizleyebilir, PDF olarak indirebilir ya da yazdırabilirsiniz.',
  },
  {
    q: 'Başlamak ne kadar sürer?',
    a: 'Hesabınızı açtığınızda rehberli başlangıç ilk sevkiyatınızın yedi adımında size yol gösterir. Listelerinizi Excel ile aktarırsanız sıfırdan yazmanız gerekmez.',
  },
  {
    q: 'Ücretli pakete nasıl geçerim?',
    a: 'Ücretsiz hesabınızı hemen açıp kullanmaya başlayabilirsiniz. Pro veya Kurumsal pakete geçmek için bizimle iletişime geçin; ödeme ve aktivasyon birlikte, elle yapılır.',
  },
];

export const FaqSection: React.FC = () => (
  <section id="sss" className="xp-sec xp-faq" aria-labelledby="sss-h">
    <div className="xp-wrap xp-faq-grid">
      <div className="xp-faq-side" data-reveal>
        <p className="xp-label r" style={i(0)}>
          Sık sorulanlar
        </p>
        <h2 id="sss-h" className="xp-h2 r" style={i(1)}>
          Aklınıza takılanlar.
        </h2>
      </div>
      <div className="xp-faq-list" data-reveal>
        {FAQS.map((f, n) => (
          <details key={f.q} className="r" style={i(n)} open={n === 0}>
            <summary>
              {f.q}
              <i aria-hidden="true" />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* 9. Account: sign in or open a company account, for real             */
/* ------------------------------------------------------------------ */

interface AccountSectionProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onDemo: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ mode, onModeChange, onDemo }) => (
  <section id="hesap" className="xp-sec xp-night xp-acct" aria-labelledby="hesap-h">
    <div className="xp-acct-floor live" aria-hidden="true" />
    <div className="xp-acct-glow" aria-hidden="true" />
    <div className="xp-wrap xp-acct-grid">
      <div data-reveal>
        <p className="xp-label r" style={i(0)}>
          Hesabınız
        </p>
        <h2 id="hesap-h" className="xp-h2 r" style={i(1)}>
          Hesabınızı açın, ilk sevkiyatınızı bugün hazırlayın.
        </h2>
        <p className="xp-lead r" style={i(2)}>
          Şirket hesabınız açıldığında verileriniz size ayrılmış alanda tutulur. Rehberli başlangıç ilk sevkiyatınızda yol
          gösterir.
        </p>
        <ul className="xp-acct-list r" style={i(3)}>
          <li>Ücretsiz plan, süre sınırı yok</li>
          <li>Kart bilgisi istemiyoruz</li>
          <li>Excel listenizi dakikalar içinde aktarın</li>
        </ul>
        <p className="xp-acct-demo r" style={i(4)}>
          Önce bakmak mı istiyorsunuz?{' '}
          <button type="button" className="xp-link" onClick={onDemo}>
            Demoyu hesap açmadan inceleyin
          </button>
        </p>
      </div>

      <div data-reveal>
        <div className="xp-acct-card r" style={i(1)}>
          <div className="xp-acct-card-top">
            <ExPortaLogo variant="dark" size="sm" />
            <span>Güvenli giriş</span>
          </div>
          <AuthForm mode={mode} onModeChange={onModeChange} idPrefix="landing" />
        </div>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

interface FooterProps {
  onSignup: () => void;
  onSignin: () => void;
  onDemo: () => void;
}

export const LandingFooter: React.FC<FooterProps> = ({ onSignup, onSignin, onDemo }) => (
  <footer className="xp-foot">
    <div className="xp-wrap">
      <div className="xp-foot-grid">
        <div>
          <ExPortaLogo variant="light" size="md" showSubtitle={true} />
          <p>İhracatın dijital kapısı. Sevkiyattan belgeye, tüm ihracatınız tek platformda.</p>
        </div>
        <div>
          <h4>Ürün</h4>
          <ul>
            <li>
              <a href="#rota">Nasıl çalışır</a>
            </li>
            <li>
              <a href="#tur">Ürün turu</a>
            </li>
            <li>
              <a href="#ozellikler">Özellikler</a>
            </li>
            <li>
              <a href="#fiyatlar">Fiyatlar</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Hesap</h4>
          <ul>
            <li>
              <button type="button" onClick={onSignin}>
                Giriş yap
              </button>
            </li>
            <li>
              <button type="button" onClick={onSignup}>
                Ücretsiz hesap aç
              </button>
            </li>
            <li>
              <button type="button" onClick={onDemo}>
                Demoyu incele
              </button>
            </li>
          </ul>
        </div>
      </div>
      <p className="xp-foot-legal">© 2026 ExPorta B2B Dış Ticaret Operasyon Platformu. Tüm hakları saklıdır.</p>
    </div>
  </footer>
);
