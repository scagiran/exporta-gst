import React, { useEffect, useMemo, useRef, useState } from 'react';

const i = (n: number) => ({ '--i': n } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* 2. One record, seven documents: the visitor changes one number      */
/* ------------------------------------------------------------------ */

const KOLI_MIN = 200;
const KOLI_MAX = 600;
const GROSS_PER = 30.29; // kg per carton
const NET_PER = 28.45;
const PRICE_PER = 146; // EUR per carton

const kg = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const eur = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' });

type Field = 'tutar' | 'koli' | 'brut' | 'net';
const FIELD_LABEL: Record<Field, string> = { tutar: 'Tutar', koli: 'Koli', brut: 'Brüt ağırlık', net: 'Net ağırlık' };

const SEVEN: { step: string; name: string; no: string; fields: Field[] }[] = [
  { step: '01', name: 'Teklif', no: 'QT-2026-014', fields: ['tutar'] },
  { step: '02', name: 'Proforma', no: 'PI-202610-ELEK-014', fields: ['tutar'] },
  { step: '03', name: 'Satış Emri', no: 'SO-2026-014', fields: ['koli'] },
  { step: '04', name: 'Gerçek Yükleme', no: 'AL-2026-014', fields: ['koli', 'brut'] },
  { step: '05', name: 'Ticari Fatura', no: 'INV-2026-ELEK-014', fields: ['tutar', 'brut'] },
  { step: '06', name: 'Çeki Listesi', no: 'PL-2026-014', fields: ['net', 'brut'] },
  { step: '07', name: 'Konşimento Talimatı', no: 'SI-2026-014', fields: ['koli', 'brut'] },
];

export const OneRecordSection: React.FC = () => {
  const [koli, setKoli] = useState(412);
  const [ver, setVer] = useState(0);

  const values = useMemo<Record<Field, string>>(
    () => ({
      koli: kg.format(koli),
      brut: `${kg.format(koli * GROSS_PER)} kg`,
      net: `${kg.format(koli * NET_PER)} kg`,
      tutar: eur.format(koli * PRICE_PER),
    }),
    [koli]
  );

  const change = (next: number) => {
    const v = Math.min(KOLI_MAX, Math.max(KOLI_MIN, Math.round(next)));
    if (v === koli) return;
    setKoli(v);
    setVer((x) => x + 1);
  };

  const fill = `${((koli - KOLI_MIN) / (KOLI_MAX - KOLI_MIN)) * 100}%`;

  return (
    <section id="tek-kayit" className="xp-sec xp-night xp-one" aria-labelledby="tek-h">
      <div className="xp-wrap">
        <div className="xp-one-head" data-reveal>
          <div>
            <p className="xp-label r" style={i(0)}>
              ExPorta ile
            </p>
            <h2 id="tek-h" className="xp-h2 r" style={i(1)}>
              Bir kez girin. Yedi belge birlikte güncellensin.
            </h2>
          </div>
          <p className="xp-lead r" style={i(2)}>
            Müşteri, ürün ve yükleme bilgisi tek bir sevkiyat kaydında durur. Belgeler bu kayıttan üretildiği için hepsi
            aynı rakamı taşır. Koli adedini değiştirip kendiniz görün.
          </p>
        </div>

        <div className="xp-one-grid" data-reveal>
          <div className="xp-master r" style={i(0)}>
            <div className="xp-master-top">
              <b>SHP-2026-014</b>
              <span>Master sevkiyat</span>
            </div>
            <h3>ElektroTech GmbH</h3>
            <p className="xp-master-meta">Hamburg, Almanya · FOB Mersin</p>
            <dl>
              <dt>Ürün</dt>
              <dd>Bakır kablo makarası</dd>
              <dt>Koli başı brüt</dt>
              <dd>30,29 kg</dd>
              <dt>Koli başı net</dt>
              <dd>28,45 kg</dd>
              <dt>Birim fiyat</dt>
              <dd>€146,00</dd>
            </dl>
            <div className="xp-koli">
              <label htmlFor="koli-range">
                Koli adedi <output htmlFor="koli-range">{kg.format(koli)}</output>
              </label>
              <div className="xp-koli-ctl">
                <button type="button" onClick={() => change(koli - 1)} aria-label="Bir koli azalt">
                  −
                </button>
                <input
                  id="koli-range"
                  className="xp-range"
                  type="range"
                  min={KOLI_MIN}
                  max={KOLI_MAX}
                  step={1}
                  value={koli}
                  onChange={(e) => change(Number(e.target.value))}
                  style={{ '--fill': fill } as React.CSSProperties}
                />
                <button type="button" onClick={() => change(koli + 1)} aria-label="Bir koli artır">
                  +
                </button>
              </div>
              <p className="xp-koli-hint">Kaydırın ya da düğmelere basın.</p>
            </div>
          </div>

          <div className="r" style={i(1)}>
            <div className="xp-sync">
              <strong>
                <span className="xp-sync-dot live" aria-hidden="true" />7 / 7 belge aynı rakamda
              </strong>
              <span aria-live="polite">
                {ver === 0 ? 'Koli: 412' : `Koli güncellendi: ${kg.format(koli)}`}
              </span>
            </div>
            <ul className="xp-docs">
              {SEVEN.map((d, n) => (
                <li key={d.no} className="xp-doc">
                  <div>
                    <span className="xp-doc-step">{d.step}</span>
                    <h4>{d.name}</h4>
                    <p className="xp-doc-no">{d.no}</p>
                  </div>
                  <div className="xp-doc-rows">
                    {d.fields.map((f) => (
                      <div key={f} className="xp-doc-row">
                        <span>{FIELD_LABEL[f]}</span>
                        <b key={`${f}-${ver}`} className={ver > 0 ? 'flash' : undefined} style={i(n)}>
                          {values[f]}
                        </b>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="xp-one-note">Örnek veridir. Kendi hesabınızda kendi müşteri ve ürünleriniz yer alır.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 3. The route: seven stops joined by the logo's own arc              */
/* ------------------------------------------------------------------ */

const STOPS = [
  { en: 'Quotation', tr: 'Teklif', line: 'Fiyat ve teslim şartı alıcıya gider.' },
  { en: 'Proforma', tr: 'Ön fatura', line: 'Onaylanan teklif proformaya dönüşür.' },
  { en: 'Sales Order', tr: 'Satış emri', line: 'Sipariş kesinleşir, hazırlık başlar.' },
  { en: 'Actual Loading', tr: 'Gerçek yükleme', line: 'Kantardan gelen koli ve ağırlık burada girilir.', key: true },
  { en: 'Commercial Invoice', tr: 'Ticari fatura', line: 'Yüklenen miktar üzerinden kesilir.' },
  { en: 'Packing List', tr: 'Çeki listesi', line: 'Ağırlıklar faturayla birebir aynıdır.' },
  { en: 'Shipping Instruction', tr: 'Konşimento talimatı', line: 'Taşıyıcıya aynı rakamlarla gider.' },
];

const X = (n: number) => 100 + n * 200;
const BASE_Y = 118;
const ROUTE_D = STOPS.slice(1)
  .map((_, n) => `Q${X(n) + 100} 18 ${X(n + 1)} ${BASE_Y}`)
  .reduce((d, seg) => `${d} ${seg}`, `M${X(0)} ${BASE_Y}`);

export const RouteSection: React.FC = () => {
  const blockRef = useRef<HTMLDivElement>(null);
  const drawnRef = useRef<SVGPathElement>(null);
  const shipRef = useRef<SVGGElement>(null);
  const vListRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const block = blockRef.current;
    const drawn = drawnRef.current;
    const ship = shipRef.current;
    const vList = vListRef.current;
    if (!block || !drawn || !ship || !vList) return;

    const len = drawn.getTotalLength();
    drawn.style.strokeDasharray = `${len}`;
    const stopsSvg = Array.from(block.querySelectorAll<SVGCircleElement>('.stop'));
    const stopsHtml = Array.from(block.querySelectorAll<HTMLElement>('.xp-stops li'));
    const stopsV = Array.from(vList.querySelectorAll<HTMLElement>('li'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    let last = -1;
    let pastCount = -1;
    let raf: number | null = null;

    const apply = (p: number) => {
      if (Math.abs(p - last) < 0.002 && p !== 0 && p !== 1) return;
      last = p;
      drawn.style.strokeDashoffset = `${len * (1 - p)}`;
      const pt = drawn.getPointAtLength(len * p);
      ship.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      vList.style.setProperty('--route-p', p.toFixed(3));
      const count = Math.floor(p * 6 + 0.02) + 1;
      if (count !== pastCount) {
        pastCount = count;
        [stopsSvg, stopsHtml, stopsV].forEach((list) =>
          list.forEach((el, n) => el.classList.toggle('is-past', n < count))
        );
      }
    };

    const measure = () => {
      raf = null;
      if (reduce.matches) return apply(1);
      const r = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.35;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.5)));
      apply(p);
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(measure);
    };
    const onReduce = () => {
      last = -1;
      measure();
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    reduce.addEventListener('change', onReduce);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      reduce.removeEventListener('change', onReduce);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="rota" className="xp-sec xp-route" aria-labelledby="rota-h">
      <div className="xp-wrap">
        <div className="xp-route-head" data-reveal>
          <p className="xp-label r" style={i(0)}>
            Nasıl çalışır
          </p>
          <h2 id="rota-h" className="xp-h2 r" style={i(1)}>
            Tekliften talimata, yedi durak.
          </h2>
          <p className="xp-lead r" style={i(2)}>
            Her sevkiyat aynı rotadan geçer. Bir durakta girdiğiniz bilgi sonraki duraklara kendiliğinden taşınır.
          </p>
        </div>

        <div ref={blockRef}>
          <svg className="xp-route-svg" viewBox="0 0 1400 150" aria-hidden="true">
            <path className="ghost" d={ROUTE_D} />
            <path ref={drawnRef} className="drawn" d={ROUTE_D} />
            {STOPS.map((s, n) => (
              <circle key={s.en} className="stop" cx={X(n)} cy={BASE_Y} r="9" />
            ))}
            <g ref={shipRef} transform={`translate(${X(0)} ${BASE_Y})`}>
              <circle className="halo live" r="10" />
              <circle className="ship" r="7" />
            </g>
          </svg>
          <ol className="xp-stops">
            {STOPS.map((s, n) => (
              <li key={s.en} className={s.key ? 'is-key' : undefined}>
                <span className="xp-stop-no">0{n + 1}</span>
                <strong>{s.en}</strong>
                <em>{s.tr}</em>
                <p>{s.line}</p>
              </li>
            ))}
          </ol>
          <ol ref={vListRef} className="xp-route-vertical">
            {STOPS.map((s, n) => (
              <li key={s.en}>
                <span>
                  0{n + 1} · {s.en}
                </span>
                <strong>{s.tr}</strong>
                <p>{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
