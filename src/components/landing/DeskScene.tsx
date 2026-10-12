import React, { useEffect, useRef } from 'react';

/*
 * "Hakkında": one person does the quote, the loading and the invoice. Scattered
 * files float around their desk while their role keeps changing; then the
 * monitor turns on and every file flies into one screen: customers, products,
 * shipments and the seven documents. Scrubbed by scroll, reversible; reduced
 * motion shows the final frame.
 */

const ROLES = ['Teklif hazırlıyor', 'Yüklemeyi takip ediyor', 'Faturayı kesiyor'];
const FINAL_ROLE = 'Hepsi tek ekranda';

type Tile = { x: number; y: number; label: string; value: string };
const TILES: Tile[] = [
  { x: 266, y: 116, label: 'Müşteriler', value: '24' },
  { x: 347, y: 116, label: 'Ürünler', value: '138' },
  { x: 266, y: 165, label: 'Sevkiyatlar', value: '6 aktif' },
  { x: 347, y: 165, label: 'Belgeler', value: '7 / 7' },
];
const TILE_W = 75;
const TILE_H = 43;

type Item = { label: string; tab: string; x: number; y: number; rot: number; tile: number };
const CARD_W = 112;
const CARD_H = 28;
const ITEMS: Item[] = [
  { label: 'müşteriler.xlsx', tab: '#1f9d55', x: 0, y: 6, rot: -5, tile: 0 },
  { label: 'E-posta: adres', tab: '#2f6fdb', x: 122, y: 0, rot: 4, tile: 0 },
  { label: 'teklif_v3.pdf', tab: '#d9304f', x: 2, y: 50, rot: 3, tile: 3 },
  { label: 'E-posta: yükleme', tab: '#2f6fdb', x: 120, y: 46, rot: -3, tile: 2 },
  { label: 'GTİP listesi.xlsx', tab: '#1f9d55', x: 124, y: 122, rot: -4, tile: 1 },
  { label: 'Konteyner no?', tab: '#0f2b48', x: 130, y: 166, rot: 5, tile: 2 },
  { label: 'fatura_v2.docx', tab: '#2f6fdb', x: 124, y: 212, rot: -3, tile: 3 },
];
const SHRINK = 0.32;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (p: number, e0: number, e1: number) => {
  const t = clamp((p - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** When each file leaves the desk and lands on the screen. */
const flight = (i: number): [number, number] => [0.46 + i * 0.035, 0.64 + i * 0.035];

export const DeskScene: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const q = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
    const items = Array.from(svg.querySelectorAll<SVGGElement>('[data-item]'));
    const tiles = Array.from(svg.querySelectorAll<SVGGElement>('[data-tile]'));
    const head = q<SVGGElement>('[data-head]');
    const badge = q<SVGGElement>('[data-badge]');
    const badgeText = q<SVGTextElement>('[data-badge-text]');
    const screenOn = q<SVGGElement>('[data-screen-on]');
    const glow = q<SVGRectElement>('[data-glow]');
    const arc = q<SVGPathElement>('[data-arc]');
    const dot = q<SVGCircleElement>('[data-dot]');
    const arcLen = arc.getTotalLength();
    arc.style.strokeDasharray = `${arcLen}`;

    // delta-gated writes per (element, key)
    const cache = new Map<Element, Map<string, string>>();
    const put = (el: Element, key: string, value: string, apply: () => void) => {
      let m = cache.get(el);
      if (!m) cache.set(el, (m = new Map()));
      if (m.get(key) === value) return;
      m.set(key, value);
      apply();
    };
    const attr = (el: Element, name: string, value: string) => put(el, '@' + name, value, () => el.setAttribute(name, value));
    const style = (el: SVGElement, prop: string, value: string) => put(el, prop, value, () => el.style.setProperty(prop, value));

    const render = (p: number) => {
      // phase A: one person, three jobs
      const role = p < 0.14 ? 0 : p < 0.28 ? 1 : 2;
      const done = p >= 0.82;
      put(badgeText, '#text', done ? FINAL_ROLE : ROLES[role], () => (badgeText.textContent = done ? FINAL_ROLE : ROLES[role]));
      put(badge, '.done', String(done), () => badge.classList.toggle('is-done', done));
      const turn = p < 0.42 ? [-9, 7, -5][role] : lerp(-5, 10, smoothstep(p, 0.42, 0.52));
      attr(head, 'transform', `rotate(${turn.toFixed(1)} 92 157)`);

      // the screen turns on
      const on = smoothstep(p, 0.4, 0.5);
      style(screenOn, 'opacity', on.toFixed(3));
      style(glow, 'opacity', (on * 0.35).toFixed(3));

      // the files: floating, then flying into their tile
      items.forEach((el, i) => {
        const it = ITEMS[i];
        const [a, b] = flight(i);
        const e = smoothstep(p, a, b);
        const bob = Math.sin(p * 26 + i * 1.7) * 4 * (1 - e);
        const tile = TILES[it.tile];
        const tx = tile.x + TILE_W / 2 - (CARD_W * SHRINK) / 2;
        const ty = tile.y + TILE_H / 2 - (CARD_H * SHRINK) / 2;
        const x = lerp(it.x, tx, e);
        const y = lerp(it.y + bob, ty, e);
        const s = lerp(1, SHRINK, e);
        attr(el, 'transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) rotate(${(it.rot * (1 - e)).toFixed(1)} ${CARD_W / 2} ${CARD_H / 2})`);
        style(el, 'opacity', (1 - smoothstep(e, 0.7, 1)).toFixed(3));
      });

      // each tile fills in when its last file lands
      tiles.forEach((el, k) => {
        const last = Math.max(...ITEMS.map((it, i) => (it.tile === k ? flight(i)[1] : 0)));
        const t = smoothstep(p, last - 0.06, last + 0.02);
        style(el, 'opacity', (0.18 + 0.82 * t).toFixed(3));
        put(el, '.lit', String(t > 0.99), () => el.classList.toggle('is-lit', t > 0.99));
      });

      // the logo's arc draws over the screen
      const d = smoothstep(p, 0.82, 0.96);
      style(arc, 'stroke-dashoffset', (arcLen * (1 - d)).toFixed(1));
      style(dot, 'opacity', smoothstep(p, 0.94, 0.98).toFixed(3));
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf: number | null = null;
    const progress = () => {
      const r = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.92; // top of the scene enters the screen
      const end = vh * 0.5 - r.height / 2; // the scene sits in the middle
      return clamp((start - r.top) / (start - end), 0, 1);
    };
    const measure = () => {
      raf = null;
      render(reduce.matches ? 1 : progress());
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(measure);
    };
    const onReduce = () => {
      cache.clear();
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
    <div ref={wrapRef} className="xp-desk-scene">
      <svg
        ref={svgRef}
        viewBox="0 0 440 280"
        role="img"
        aria-label="Animasyon: tek bir kişi teklif, yükleme ve fatura arasında koşturuyor; etrafındaki dağınık dosyalar tek bir ekranda müşteriler, ürünler, sevkiyatlar ve yedi belge olarak toplanıyor."
      >
        {/* desk */}
        <rect x="0" y="262" width="440" height="7" rx="2" fill="#d2dadb" />
        <line x1="0" y1="262" x2="440" y2="262" stroke="#0f2b48" strokeWidth="1.5" />
        <rect x="170" y="255" width="58" height="7" rx="2" fill="#8597a2" />

        {/* the person */}
        <rect x="46" y="176" width="10" height="86" rx="4" fill="#b2c0c5" />
        <path d="M68 166 Q92 156 116 166 L124 262 H60 Z" fill="#33475a" />
        <path d="M116 190 Q140 214 168 236" stroke="#33475a" strokeWidth="10" strokeLinecap="round" fill="none" />
        <g data-head>
          <circle cx="92" cy="140" r="16" fill="#0f2b48" />
          <path d="M78 136 Q92 120 106 136" stroke="#2dd4bf" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* the role badge */}
        <g data-badge className="xp-desk-badge">
          <rect x="12" y="86" width="160" height="26" rx="13" />
          <text data-badge-text x="92" y="103" textAnchor="middle">
            {ROLES[0]}
          </text>
        </g>

        {/* the monitor */}
        <rect data-glow x="226" y="80" width="220" height="152" rx="22" fill="#2dd4bf" opacity="0" className="xp-desk-glow" />
        <rect x="238" y="92" width="196" height="128" rx="9" fill="#0f2b48" />
        <rect x="245" y="99" width="182" height="114" rx="3" fill="#12263a" />
        <g data-screen-on opacity="0">
          <rect x="245" y="99" width="182" height="114" rx="3" fill="#f2f5f4" />
          <rect x="245" y="99" width="182" height="12" rx="3" fill="#0f2b48" />
          <rect x="245" y="105" width="182" height="6" fill="#0f2b48" />
          <rect x="245" y="111" width="16" height="102" fill="#12263a" />
          {[122, 134, 146, 158].map((y) => (
            <rect key={y} x="249" y={y} width="8" height="3" rx="1.5" fill={y === 146 ? '#2dd4bf' : '#475a6b'} />
          ))}
          {TILES.map((t) => (
            <g key={t.label} data-tile className="xp-desk-tile" opacity="0.18">
              <rect x={t.x} y={t.y} width={TILE_W} height={TILE_H} rx="5" />
              <text className="lbl" x={t.x + 7} y={t.y + 15}>
                {t.label}
              </text>
              <text className="val" x={t.x + 7} y={t.y + 34}>
                {t.value}
              </text>
            </g>
          ))}
        </g>
        <rect x="326" y="220" width="20" height="35" fill="#33475a" />
        <rect x="304" y="255" width="64" height="7" rx="3" fill="#0f2b48" />

        {/* the logo's arc, drawn last */}
        <path data-arc d="M262 70 Q336 38 412 64" fill="none" stroke="#0b7368" strokeWidth="3.5" strokeLinecap="round" />
        <circle data-dot cx="412" cy="64" r="4.5" fill="#0b7368" opacity="0" />

        {/* the scattered files */}
        {ITEMS.map((it) => (
          <g key={it.label} data-item className="xp-desk-item" transform={`translate(${it.x} ${it.y}) rotate(${it.rot} ${CARD_W / 2} ${CARD_H / 2})`}>
            <rect width={CARD_W} height={CARD_H} rx="6" />
            <rect width="6" height={CARD_H} rx="3" fill={it.tab} />
            <text x="14" y="18.5">
              {it.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
