import React, { useRef, useState } from 'react';
import { Play, FileDown, Printer } from 'lucide-react';
import { MEDIA } from './media';

const i = (n: number) => ({ '--i': n } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* 4. The tour: the ExPorta film, with its ten chapters                */
/* ------------------------------------------------------------------ */

const CHAPTERS: { t: number; title: string }[] = [
  { t: 5.5, title: 'Genel Bakış' },
  { t: 12.6, title: 'Rehberli Başlangıç' },
  { t: 19.1, title: 'Sevkiyat Ekleme' },
  { t: 27.7, title: 'Müşteriler' },
  { t: 35.6, title: 'Ürün Kataloğu' },
  { t: 44.3, title: "Excel'den İçe Aktarma" },
  { t: 50.7, title: 'Belge Merkezi' },
  { t: 56.9, title: 'Belge Düzenleme' },
  { t: 64.7, title: 'Notlar ve Hatırlatıcılar' },
  { t: 70.9, title: 'Firma ve Banka Ayarları' },
];

const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const TourSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(-1);

  const play = (at?: number) => {
    const v = videoRef.current;
    if (!v) return;
    if (at !== undefined) v.currentTime = at;
    setStarted(true);
    v.play().catch(() => {
      /* the visitor can still press play on the native controls */
    });
  };

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    let idx = -1;
    for (let n = 0; n < CHAPTERS.length; n++) if (v.currentTime >= CHAPTERS[n].t - 0.2) idx = n;
    if (v.currentTime >= 78) idx = -1;
    if (idx !== active) setActive(idx);
  };

  return (
    <section id="tur" className="xp-sec xp-night xp-tour" aria-labelledby="tur-h">
      <div className="xp-wrap">
        <div data-reveal>
          <p className="xp-label r" style={i(0)}>
            Ürün turu
          </p>
          <h2 id="tur-h" className="xp-h2 r" style={i(1)}>
            Ürünü 88 saniyede tanıyın.
          </h2>
          <p className="xp-lead r" style={i(2)}>
            Genel bakıştan banka ayarlarına on kısa bölüm. Listeden istediğiniz bölüme atlayın.
          </p>
        </div>

        <div className="xp-tour-grid" data-reveal>
          <div className="xp-player r" style={i(0)}>
            <video
              ref={videoRef}
              src={`${MEDIA}tour.mp4`}
              poster={`${MEDIA}tour-poster.jpg`}
              preload="none"
              playsInline
              controls={started}
              onTimeUpdate={onTime}
              aria-label="ExPorta ürün tanıtım filmi"
            />
            <button
              type="button"
              className={`xp-play${started ? ' is-gone' : ''}`}
              onClick={() => play()}
              aria-label="Ürün turunu oynat"
              tabIndex={started ? -1 : 0}
            >
              <span className="xp-play-btn">
                <i>
                  <Play aria-hidden="true" />
                </i>
                <span>
                  Turu izle <small>1:28 · sesli</small>
                </span>
              </span>
            </button>
          </div>

          <ol className="xp-chapters r" style={i(1)} aria-label="Bölümler">
            {CHAPTERS.map((c, n) => (
              <li key={c.title}>
                <button
                  type="button"
                  className={n === active ? 'is-on' : undefined}
                  aria-current={n === active ? 'true' : undefined}
                  onClick={() => play(c.t)}
                >
                  <b>{String(n + 1).padStart(2, '0')}</b>
                  <span>{c.title}</span>
                  <time>{stamp(c.t)}</time>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 5. Features: the everyday tools, each shown, not just named         */
/* ------------------------------------------------------------------ */

export const FeaturesSection: React.FC = () => (
  <section id="ozellikler" className="xp-sec xp-feat" aria-labelledby="ozellik-h">
    <div className="xp-wrap">
      <div className="xp-feat-head" data-reveal>
        <div>
          <p className="xp-label r" style={i(0)}>
            Özellikler
          </p>
          <h2 id="ozellik-h" className="xp-h2 r" style={i(1)}>
            İhracat masasında ne gerekiyorsa.
          </h2>
        </div>
        <p className="xp-lead r" style={i(2)}>
          Belge üretmenin etrafındaki her iş aynı yerde: listeler, şablonlar, numaralar, notlar ve firma bilgileri.
        </p>
      </div>

      <div className="xp-bento" data-reveal>
        <article className="xp-tile xp-t-a r" style={i(0)}>
          <h3>Excel'den içe aktarma</h3>
          <p>Mevcut müşteri ve ürün listenizi Excel'den yükleyin. Sütunları eşleştirin, hatalı satırları aktarmadan önce görün.</p>
          <div className="xp-tile-art" aria-hidden="true">
            <div className="xp-map-col is-xls">
              <span>Firma Adı</span>
              <span>GTİP</span>
              <span>Birim Fiyat</span>
            </div>
            <svg className="xp-map-arrows live" viewBox="0 0 56 120" preserveAspectRatio="none">
              <path d="M2 20 C 30 20, 26 20, 54 20" />
              <path d="M2 60 C 30 60, 26 60, 54 60" />
              <path d="M2 100 C 30 100, 26 100, 54 100" />
            </svg>
            <div className="xp-map-col is-xp">
              <span>Müşteri</span>
              <span>GTİP kodu</span>
              <span>Fiyat (EUR)</span>
            </div>
          </div>
        </article>

        <article className="xp-tile xp-t-b r" style={i(1)}>
          <h3>Üç şablon</h3>
          <p>Classic, Modern ve Compact. Şablon değişir, rakamlar değişmez.</p>
          <div className="xp-tile-art xp-tmpls" aria-hidden="true">
            {['Classic', 'Modern', 'Compact'].map((t) => (
              <div key={t}>
                <div className={`xp-tmpl is-${t.toLowerCase()}`}>
                  <i className="h" />
                  <i />
                  <i style={{ width: '70%' }} />
                  <i />
                  <i style={{ width: '50%' }} />
                </div>
                <span className="xp-tmpl-name">{t}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="xp-tile xp-t-c r" style={i(2)}>
          <h3>Otomatik numaralar</h3>
          <p>Belge numaraları sizin formatınızda, sırayla verilir. Format değişiklikleri kayda geçer.</p>
          <div className="xp-tile-art xp-num" aria-hidden="true">
            <div>
              <span>Önceki</span>
              <b>INV-2026-ELEK-013</b>
            </div>
            <div>
              <span>Sıradaki</span>
              <b>
                INV-2026-ELEK-<em>014</em>
              </b>
            </div>
          </div>
        </article>

        <article className="xp-tile xp-t-d r" style={i(3)}>
          <h3>Özel alanlar</h3>
          <p>Sektörünüze özel bilgileri müşteri ve ürün kartlarına ekleyin.</p>
          <div className="xp-tile-art xp-chips" aria-hidden="true">
            <span>Menşe</span>
            <span>Lot no</span>
            <span className="is-new">+ Sertifika</span>
          </div>
        </article>

        <article className="xp-tile xp-t-e r" style={i(4)}>
          <h3>PDF ve yazdırma</h3>
          <p>Her belgeyi önizleyin, PDF olarak indirin ya da doğrudan yazdırın.</p>
          <div className="xp-tile-art xp-pdf" aria-hidden="true">
            <span>
              <FileDown /> PDF indir
            </span>
            <span>
              <Printer /> Yazdır
            </span>
          </div>
        </article>

        <article className="xp-tile xp-t-f r" style={i(5)}>
          <h3>Notlar ve hatırlatıcılar</h3>
          <p>Sevkiyatla ilgili notlar ve kontrol listeleri işin yanında durur.</p>
          <ul className="xp-tile-art xp-notes" aria-hidden="true">
            <li className="is-done">
              <i />
              <span>VGM formunu gönder</span>
            </li>
            <li className="is-done">
              <i />
              <span>Proformayı alıcıya ilet</span>
            </li>
            <li>
              <i />
              <span>Konşimento taslağını kontrol et</span>
            </li>
          </ul>
        </article>

        <article className="xp-tile xp-t-g r" style={i(6)}>
          <h3>Firma ve banka bilgileri</h3>
          <p>Logonuz, adresiniz ve banka bilgileriniz her belgeye kendiliğinden yazılır.</p>
          <div className="xp-tile-art xp-bank" aria-hidden="true">
            <span>Banka</span>
            <b>Örnek Bank A.Ş.</b>
            <span>IBAN</span>
            <b>TR00 0000 0000 ••••</b>
            <span>SWIFT</span>
            <b>ORNKTRIS</b>
          </div>
        </article>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* 6. About and trust                                                  */
/* ------------------------------------------------------------------ */

export const AboutSection: React.FC = () => (
  <section id="hakkinda" className="xp-sec xp-about" aria-labelledby="hakkinda-h">
    <div className="xp-wrap xp-about-grid">
      <div data-reveal>
        <p className="xp-label r" style={i(0)}>
          Hakkında
        </p>
        <h2 id="hakkinda-h" className="xp-about-statement r" style={i(1)}>
          ExPorta, ihracat yapan <span>KOBİ'ler</span> için kuruldu.
        </h2>
        <p className="xp-about-body r" style={i(2)}>
          Dış ticaret ekibi çoğu zaman bir ya da iki kişidir. Teklifi hazırlayan, yüklemeyi takip eden ve faturayı kesen
          aynı kişidir. ExPorta bu kişinin masasını tek ekranda toplar: müşteriler, ürünler, sevkiyatlar ve yedi ihracat
          belgesi.
        </p>
        <svg className="xp-about-arc" viewBox="0 0 340 60" aria-hidden="true">
          <path d="M6 52 Q170 -6 330 44" />
          <circle cx="330" cy="44" r="5" />
        </svg>
      </div>

      <dl className="xp-facts" data-reveal>
        <div className="r" style={i(0)}>
          <dt>Kimin için</dt>
          <dd>Düzenli ihracat yapan üreticiler ve dış ticaret şirketleri. Tek kişilik ekipler de, büyüyen ekipler de.</dd>
        </div>
        <div className="r" style={i(1)}>
          <dt>Verileriniz</dt>
          <dd>
            Supabase (PostgreSQL) altyapısında saklanır. Her şirket ayrı bir kayıt alanında tutulur ve yalnızca o şirketin
            üyeleri erişebilir.
          </dd>
        </div>
        <div className="r" style={i(2)}>
          <dt>Başlarken</dt>
          <dd>
            Ücretsiz planla hemen kullanmaya başlarsınız. Rehberli başlangıç ilk sevkiyatınızın yedi adımında yol
            gösterir.
          </dd>
        </div>
        <div className="r" style={i(3)}>
          <dt>Ücretli planlar</dt>
          <dd>Pro ve Kurumsal planlara geçiş şimdilik bizimle birlikte, elle yapılır.</dd>
        </div>
      </dl>
    </div>
  </section>
);
