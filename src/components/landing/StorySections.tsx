import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../../i18n';

const i = (n: number) => ({ '--i': n } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* 2. One record, seven documents: the visitor changes one number      */
/* ------------------------------------------------------------------ */

/** Cartons on the order; the slider is the quantity actually loaded. */
const ORDERED = 412;
const KOLI_MIN = 200;
const KOLI_MAX = 600;
const GROSS_PER = 30.29; // kg per carton
const NET_PER = 28.45;
const PRICE_PER = 146; // EUR per carton

type Field = 'tutar' | 'koli' | 'brut' | 'net';

/** The seven documents in their sequence; names come from the messages, in the same order. */
const SEVEN: { step: string; no: string; fields: Field[] }[] = [
  { step: '01', no: 'QT-2026-014', fields: ['tutar'] },
  { step: '02', no: 'PI-202610-ELEK-014', fields: ['tutar'] },
  { step: '03', no: 'SO-2026-014', fields: ['koli'] },
  { step: '04', no: 'AL-2026-014', fields: ['koli', 'brut'] },
  { step: '05', no: 'INV-2026-ELEK-014', fields: ['tutar', 'brut'] },
  { step: '06', no: 'PL-2026-014', fields: ['net', 'brut'] },
  { step: '07', no: 'SI-2026-014', fields: ['koli', 'brut'] },
];

export const OneRecordSection: React.FC = () => {
  const { t, num, money } = useLang();
  const o = t.one;
  const [koli, setKoli] = useState(412);
  const [ver, setVer] = useState(0);

  const whole = (n: number) => num(n, { maximumFractionDigits: 0 });
  // Order documents keep the ordered quantity; loading documents follow what was loaded.
  const valuesFor = (cartons: number): Record<Field, string> => ({
    koli: whole(cartons),
    brut: `${whole(cartons * GROSS_PER)} kg`,
    net: `${whole(cartons * NET_PER)} kg`,
    tutar: money(cartons * PRICE_PER, 'EUR'),
  });
  const orderedValues = valuesFor(ORDERED);
  const loadedValues = valuesFor(koli);
  const twoDp = (n: number) => num(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
              {o.label}
            </p>
            <h2 id="tek-h" className="xp-h2 r" style={i(1)}>
              {o.title}
            </h2>
          </div>
          <p className="xp-lead r" style={i(2)}>
            {o.lead}
          </p>
        </div>

        <div className="xp-one-grid" data-reveal>
          <div className="xp-master r" style={i(0)}>
            <div className="xp-master-top">
              <b>SHP-2026-014</b>
              <span>{o.master}</span>
            </div>
            <h3>ElektroTech GmbH</h3>
            <p className="xp-master-meta">{o.meta}</p>
            <dl>
              <dt>{o.product}</dt>
              <dd>{o.productName}</dd>
              <dt>{o.grossPer}</dt>
              <dd>{twoDp(GROSS_PER)} kg</dd>
              <dt>{o.netPer}</dt>
              <dd>{twoDp(NET_PER)} kg</dd>
              <dt>{o.unitPrice}</dt>
              <dd>{money(PRICE_PER, 'EUR')}</dd>
            </dl>
            <div className="xp-koli">
              <label htmlFor="koli-range">
                {o.cartons} <output htmlFor="koli-range">{whole(koli)}</output>
              </label>
              <div className="xp-koli-ctl">
                <button type="button" onClick={() => change(koli - 1)} aria-label={o.fewer}>
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
                <button type="button" onClick={() => change(koli + 1)} aria-label={o.more}>
                  +
                </button>
              </div>
              <p className="xp-koli-hint">{o.hint}</p>
            </div>
          </div>

          <div className="r" style={i(1)}>
            <div className="xp-sync">
              <strong>
                <span className="xp-sync-dot live" aria-hidden="true" />
                {o.sync(whole(ORDERED), whole(koli))}
              </strong>
              <span aria-live="polite">{ver === 0 ? o.live(whole(412)) : o.updated(whole(koli))}</span>
            </div>
            <ul className="xp-docs">
              {SEVEN.map((d, n) => (
                <li key={d.no} className="xp-doc">
                  <div>
                    <span className="xp-doc-step">{d.step}</span>
                    <h4>{o.docs[n]}</h4>
                    <p className="xp-doc-no">{d.no}</p>
                  </div>
                  <div className="xp-doc-rows">
                    {d.fields.map((f) => (
                      <div key={f} className="xp-doc-row">
                        <span>{o.fields[f]}</span>
                        <b key={`${f}-${n < 3 ? 0 : ver}`} className={ver > 0 && n >= 3 ? 'flash' : undefined} style={i(n)}>
                          {(n < 3 ? orderedValues : loadedValues)[f]}
                        </b>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="xp-one-note">{o.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 3. The route: seven stops joined by the logo's own arc              */
/* ------------------------------------------------------------------ */

/** Seven stops; the fourth (actual loading) is where the weighbridge figures enter. */
const STOP_COUNT = 7;
const KEY_STOP = 3;

const X = (n: number) => 100 + n * 200;
const BASE_Y = 118;
const ROUTE_D = Array.from({ length: STOP_COUNT - 1 })
  .map((_, n) => `Q${X(n) + 100} 18 ${X(n + 1)} ${BASE_Y}`)
  .reduce((d, seg) => `${d} ${seg}`, `M${X(0)} ${BASE_Y}`);

export const RouteSection: React.FC = () => {
  const { t } = useLang();
  const r = t.route;
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
            {r.label}
          </p>
          <h2 id="rota-h" className="xp-h2 r" style={i(1)}>
            {r.title}
          </h2>
          <p className="xp-lead r" style={i(2)}>
            {r.lead}
          </p>
        </div>

        <div ref={blockRef}>
          <svg className="xp-route-svg" viewBox="0 0 1400 150" aria-hidden="true">
            <path className="ghost" d={ROUTE_D} />
            <path ref={drawnRef} className="drawn" d={ROUTE_D} />
            {r.stops.map((_, n) => (
              <circle key={n} className="stop" cx={X(n)} cy={BASE_Y} r="9" />
            ))}
            <g ref={shipRef} transform={`translate(${X(0)} ${BASE_Y})`}>
              <circle className="halo live" r="10" />
              <circle className="ship" r="7" />
            </g>
          </svg>
          <ol className="xp-stops">
            {r.stops.map((s, n) => (
              <li key={n} className={n === KEY_STOP ? 'is-key' : undefined}>
                <span className="xp-stop-no">0{n + 1}</span>
                <strong>{s.primary}</strong>
                <em>{s.secondary}</em>
                <p>{s.line}</p>
              </li>
            ))}
          </ol>
          <ol ref={vListRef} className="xp-route-vertical">
            {r.stops.map((s, n) => (
              <li key={n}>
                <span>
                  0{n + 1} · {s.primary}
                </span>
                <strong>{s.secondary}</strong>
                <p>{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
