import React, { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, ArrowDown, ChevronDown } from 'lucide-react';
import { MEDIA } from './media';
import { readHomeCity } from '../../lib/homeCity';

const MAP_URL = `${MEDIA}world.json`;
const MAP_BYTES = 919206; // fallback when Content-Length is missing

/** Natural Earth 1 projection of the 50m countries, pre-projected into a 2000-unit plane. */
type MapData = {
  w: number;
  h: number;
  proj: { k: number; tx: number; ty: number };
  bounds: [number, number, number, number];
  turkeyBounds: [number, number, number, number];
  turkeyCenter: [number, number];
  land: string;
  borders: string;
  turkey: string;
  graticule: string;
  cities: Record<string, [number, number]>;
};

/** Natural Earth 1, the same formula d3-geo used to build world.json, for cities placed at runtime. */
function project(map: MapData, lon: number, lat: number): [number, number] {
  const l = (lon * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  const p2 = p * p;
  const p4 = p2 * p2;
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
  const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return [map.proj.tx + map.proj.k * x, map.proj.ty - map.proj.k * y];
}

/** Static-hero gates. Must match the media query in landing.css character for character. */
const GATES = [
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)',
];

const ORIGIN = 'origin';
const ROUTES = ['Hamburg', 'Rotterdam', 'Londra', 'Kazablanka', 'Bakü', 'Dubai', 'New York'];
/** Label side for cities that sit close together at world scale. */
const PLACE: Record<string, string> = { Londra: 'left', Rotterdam: 'below', Hamburg: 'above', 'Bakü': 'above' };
/** The only Turkish cities named on the map, unless the visitor's own city is known. */
const CONTEXT = ['İstanbul', 'Ankara'];
const EQUATOR_KM = 40075;

const HOOK = 'Siz de Excel ve e-posta arasında mı kayboluyorsunuz?';
const DOCS = ['Teklif', 'Proforma', 'Satış Emri', 'Yükleme', 'Ticari Fatura', 'Çeki Listesi', 'Talimat'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (p: number, e0: number, e1: number) => {
  const t = clamp((p - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** One camera stop: zoom (1 = the world spans the viewport width), focus point, and where on screen it sits. */
type View = { s: number; fx: number; fy: number; ax: number; ay: number };
type Key = View & { p: number };

/** Where each export route draws in scroll progress (0 → 1). */
const routeFrac = (i: number, p: number) => clamp((p - (0.5 + i * 0.026)) / 0.13, 0, 1);

interface HeroMapProps {
  onSignup: () => void;
  onSignin: () => void;
}

export const HeroMap: React.FC<HeroMapProps> = ({ onSignup, onSignin }) => {
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);

  // The company's city, if this browser has seen its settings before. Read once per visit.
  const home = useMemo(() => readHomeCity(), []);

  // Seeded once, so the scatter is identical on every load.
  const hookWords = useMemo(() => {
    const words = HOOK.split(' ');
    const r = rng(20261011);
    return words.map((w, i) => ({
      w,
      em: i === words.length - 1,
      style: {
        '--th': (i * 0.07).toFixed(3),
        '--jx': `${Math.round(-40 - r() * 120)}px`,
        '--jy': `${Math.round((r() - 0.5) * 140)}px`,
        '--jr': `${Math.round((r() - 0.5) * 24)}deg`,
      } as React.CSSProperties,
    }));
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ring = ringRef.current;
    const ctx = canvas?.getContext('2d');
    if (!hero || !stage || !canvas || !ring || !ctx) return;

    const kmEl = stage.querySelector<HTMLElement>('[data-km]');
    const routesEl = stage.querySelector<HTMLElement>('[data-routes]');
    const bands = Array.from(stage.querySelectorAll<HTMLElement>('.band')).map((el) => ({
      el,
      a: Number(el.dataset.a),
      b: Number(el.dataset.b),
      ramp: el.dataset.ramp ? Number(el.dataset.ramp) : 0,
      first: el.dataset.first === '1',
      last: el.dataset.last === '1',
      scatter: el.dataset.exit === 'scatter',
      op: -1,
      k: -1,
      o: -1,
      live: false,
    }));
    const pinEls = new Map<string, HTMLElement>();
    stage.querySelectorAll<HTMLElement>('[data-pin]').forEach((el) => pinEls.set(el.dataset.pin as string, el));
    const pinState = new Map<string, { x: number; y: number; o: number }>();

    let atEnd = false;
    let isWorld = false;
    let disposed = false;
    let scrubOn = false;
    let started = false;
    const fetchCtrl = new AbortController();

    let map: MapData | null = null;
    let paths: { land: Path2D; borders: Path2D; turkey: Path2D; graticule: Path2D } | null = null;
    /** Where the routes leave from: the company's city, or the middle of Turkey. */
    let origin: [number, number] = [0, 0];

    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let keys: Key[] = [];
    let staticView: View | null = null;

    let target = 0;
    let shown = 0;
    let rafId: number | null = null;
    let lastTick = 0;
    let heroOnScreen = true;
    let lastReadout = 0;
    let readKm = '';
    let readRoutes = '';

    let loadK = 0;
    let loadRaf: number | null = null;

    const heroProgress = () => {
      const range = hero.offsetHeight - window.innerHeight;
      if (range <= 0) return 0;
      return clamp(-hero.getBoundingClientRect().top / range, 0, 1);
    };

    // ---- the camera path: Turkey framed whole, then the whole world ----
    const buildKeys = () => {
      if (!map) return;
      const [x0, y0, x1, y1] = map.bounds;
      const k1 = vw / map.w; // px per map unit at s = 1
      const fit = Math.min((0.9 * vw) / (x1 - x0), (0.58 * vh) / (y1 - y0)) / k1;
      const [tx0, ty0, tx1, ty1] = map.turkeyBounds;
      const turkeyFit = Math.min((0.5 * vw) / (tx1 - tx0), (0.6 * vh) / (ty1 - ty0)) / k1;
      const cx = (tx0 + tx1) / 2;
      const cy = (ty0 + ty1) / 2;
      const [ox, oy] = origin;
      const wx = (x0 + x1) / 2;
      const wy = (y0 + y1) / 2;
      keys = [
        { p: 0, s: turkeyFit, fx: cx, fy: cy, ax: 0.7, ay: 0.5 },
        { p: 0.2, s: turkeyFit * 0.86, fx: cx, fy: cy, ax: 0.7, ay: 0.5 },
        { p: 0.46, s: 4.2, fx: ox, fy: oy, ax: 0.66, ay: 0.46 },
        { p: 0.74, s: fit, fx: wx, fy: wy, ax: 0.5, ay: 0.37 },
        { p: 1, s: fit * 0.97, fx: wx, fy: wy, ax: 0.5, ay: 0.36 },
      ];
      staticView =
        vw < 900
          ? { s: 2.7, fx: lerp(ox, wx, 0.15), fy: oy, ax: 0.5, ay: 0.27 }
          : { s: fit, fx: wx, fy: wy, ax: 0.5, ay: 0.36 };
    };

    const viewAt = (p: number): View => {
      for (let i = 1; i < keys.length; i++) {
        const b = keys[i];
        if (p <= b.p) {
          const a = keys[i - 1];
          const t = smoothstep(p, a.p, b.p);
          return {
            s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)),
            fx: lerp(a.fx, b.fx, t),
            fy: lerp(a.fy, b.fy, t),
            ax: lerp(a.ax, b.ax, t),
            ay: lerp(a.ay, b.ay, t),
          };
        }
      }
      return keys[keys.length - 1];
    };

    const setPin = (name: string, x: number, y: number, o: number) => {
      const el = pinEls.get(name);
      if (!el) return;
      const prev = pinState.get(name) || { x: -1e9, y: -1e9, o: -1 };
      if (Math.abs(prev.x - x) > 0.3 || Math.abs(prev.y - y) > 0.3) {
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        prev.x = x;
        prev.y = y;
      }
      if (Math.abs(prev.o - o) > 0.01 || (o === 0 && prev.o !== 0) || (o === 1 && prev.o !== 1)) {
        el.style.opacity = o.toFixed(2);
        prev.o = o;
      }
      pinState.set(name, prev);
    };

    // ---- drawing: one frame of the map for a camera view and route progress ----
    const draw = (view: View, routeP: number, now = performance.now()) => {
      if (!map || !paths) return;
      const k = (vw / map.w) * view.s;
      const tx = view.ax * vw - view.fx * k;
      const ty = view.ay * vh - view.fy * k;
      const toScreen = ([x, y]: [number, number]): [number, number] => [x * k + tx, y * k + ty];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty);

      ctx.lineWidth = 1 / k;
      ctx.strokeStyle = 'rgba(150, 196, 208, 0.075)';
      ctx.stroke(paths.graticule);

      ctx.fillStyle = '#11283d';
      ctx.fill(paths.land);
      ctx.fillStyle = '#183f58';
      ctx.fill(paths.turkey);

      ctx.lineWidth = 0.75 / k;
      ctx.strokeStyle = 'rgba(170, 205, 220, 0.15)';
      ctx.stroke(paths.borders);
      ctx.lineWidth = 1 / k;
      ctx.strokeStyle = 'rgba(170, 205, 220, 0.3)';
      ctx.stroke(paths.land);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.55)';
      ctx.stroke(paths.turkey);

      // Export routes: the logo's arc, drawn outwards from the origin.
      const [ox, oy] = origin;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.8 / k;
      ctx.shadowColor = 'rgba(45, 212, 191, 0.6)';
      ctx.shadowBlur = 8 * dpr;
      let drawnCount = 0;
      const heads: [number, number][] = [];
      ROUTES.forEach((name, i) => {
        const f = routeFrac(i, routeP);
        if (f <= 0 || !map) return;
        if (f >= 1) drawnCount++;
        const [dx, dy] = map.cities[name];
        const mx = (ox + dx) / 2;
        const my = (oy + dy) / 2;
        const len = Math.hypot(dx - ox, dy - oy);
        let nx = -(dy - oy) / len;
        let ny = (dx - ox) / len;
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const cx = mx + nx * len * 0.3;
        const cy = my + ny * len * 0.3;
        // de Casteljau: the first f of the quadratic curve
        const q1x = lerp(ox, cx, f);
        const q1y = lerp(oy, cy, f);
        const q2x = lerp(q1x, lerp(cx, dx, f), f);
        const q2y = lerp(q1y, lerp(cy, dy, f), f);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(q1x, q1y, q2x, q2y);
        ctx.stroke();
        if (f < 1) heads.push([q2x, q2y]);
      });
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#eafffb';
      heads.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2.6 / k, 0, Math.PI * 2);
        ctx.fill();
      });

      // HTML pins ride on top, so their labels stay crisp. At world scale the
      // origin label tucks under its dot so the nearby routes keep their names.
      const world = view.s < 2.2 || !scrubOn;
      if (world !== isWorld) {
        isWorld = world;
        stage.classList.toggle('is-world', world);
      }
      // A known city is always marked; otherwise the origin is only a dot once routes leave.
      const [kx, ky] = toScreen(origin);
      setPin(ORIGIN, kx, ky, home ? 1 : smoothstep(routeP, 0.47, 0.52));
      ROUTES.forEach((name, i) => {
        const [x, y] = toScreen(map!.cities[name]);
        setPin(name, x, y, smoothstep(routeFrac(i, routeP), 0.82, 1));
      });
      const ctxO = smoothstep(view.s, 5, 8);
      CONTEXT.forEach((name) => {
        const [x, y] = toScreen(map!.cities[name]);
        setPin(name, x, y, home && home.name === name ? 0 : ctxO);
      });

      // The readout: how much of the world is in view, how many routes are out (about 10Hz).
      if (now - lastReadout > 100) {
        lastReadout = now;
        const km = EQUATOR_KM / view.s;
        const step = km > 10000 ? 1000 : km > 3000 ? 500 : 100;
        const kmText = km > 30000 ? 'Tüm dünya' : `≈ ${(Math.round(km / step) * step).toLocaleString('tr-TR')} km`;
        if (kmText !== readKm && kmEl) {
          readKm = kmText;
          kmEl.textContent = kmText;
        }
        const routesText = `${drawnCount} / ${ROUTES.length}`;
        if (routesText !== readRoutes && routesEl) {
          readRoutes = routesText;
          routesEl.textContent = routesText;
        }
      }
    };

    const render = (p: number) => {
      if (!map) return;
      if (scrubOn) draw(viewAt(p), p);
      else if (staticView) draw(staticView, 1);
    };

    // ---- captions: delta-gated writes only ----
    const updateCaptions = (p: number) => {
      for (const b of bands) {
        const f = Math.min(0.02, (b.b - b.a) / 3);
        let op = (b.first ? 1 : smoothstep(p, b.a, b.a + f)) * (b.last ? 1 : 1 - smoothstep(p, b.b - f, b.b));
        let o = 0;
        if (b.scatter) {
          // The question comes apart word by word, then its scrim lets go.
          o = smoothstep(p, b.b - 0.06, b.b);
          op = 1 - smoothstep(p, b.b - 0.02, b.b);
        }
        let k = clamp((p - b.a) / (b.ramp || Math.min(0.025, (b.b - b.a) * 0.35)), 0, 1);
        if (b.first) k = Math.max(k, loadK);

        if (Math.abs(op - b.op) > 0.004) {
          b.op = op;
          b.el.style.opacity = op.toFixed(3);
          const live = op > 0.6;
          if (live !== b.live) {
            b.live = live;
            b.el.classList.toggle('is-live', live);
          }
        }
        if (Math.abs(k - b.k) > 0.008 || (k === 1 && b.k !== 1) || (k === 0 && b.k !== 0)) {
          b.k = k;
          b.el.style.setProperty('--k', k.toFixed(3));
        }
        if (b.scatter && (Math.abs(o - b.o) > 0.008 || (o === 0 && b.o !== 0) || (o === 1 && b.o !== 1))) {
          b.o = o;
          b.el.style.setProperty('--o', o.toFixed(3));
        }
      }
      const end = p > 0.8;
      if (end !== atEnd) {
        atEnd = end;
        stage.classList.toggle('at-end', end);
      }
    };

    // ---- the lerp loop: frame-rate independent, rests when converged ----
    const tick = (now: number) => {
      const dt = Math.min(100, now - (lastTick || now));
      lastTick = now;
      shown += (target - shown) * (1 - Math.pow(1 - 0.12, dt / 16.667));
      if (Math.abs(target - shown) < 0.0004) {
        shown = target;
        rafId = null;
        lastTick = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
      draw(viewAt(shown), shown, now);
      updateCaptions(shown);
    };

    const onScroll = () => {
      target = heroProgress();
      if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
    };

    // ---- canvas size follows the stage ----
    const resize = () => {
      vw = stage.clientWidth;
      vh = stage.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      buildKeys();
      render(shown);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    // ---- the streamed map loader with an honest ring ----
    const setRing = (frac: number) => ring.style.setProperty('--ld', String(Math.round(126 * (1 - frac))));
    const loadMap = async () => {
      let watchdog = window.setTimeout(() => fetchCtrl.abort(), 20000);
      const res = await fetch(MAP_URL, { signal: fetchCtrl.signal });
      if (!res.ok || !res.body) throw new Error(`map ${res.status}`);
      const total = Number(res.headers.get('Content-Length')) || MAP_BYTES;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      let lastRing = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => fetchCtrl.abort(), 20000);
        chunks.push(value);
        got += value.length;
        const now = performance.now();
        if (now - lastRing > 100) {
          lastRing = now;
          setRing(Math.min(1, got / total));
        }
      }
      window.clearTimeout(watchdog);
      if (disposed) return;
      setRing(1);
      const text = await new Blob(chunks as BlobPart[]).text();
      map = JSON.parse(text) as MapData;
      paths = {
        land: new Path2D(map.land),
        borders: new Path2D(map.borders),
        turkey: new Path2D(map.turkey),
        graticule: new Path2D(map.graticule),
      };
      origin = home ? project(map, home.lon, home.lat) : map.turkeyCenter;
      buildKeys();
      render(shown);
      stage.classList.add('map-ready');
    };
    const startLoad = () => {
      if (started || disposed) return;
      started = true;
      loadMap().catch(() => {
        if (!disposed) stage.classList.add('map-failed');
      });
    };

    // Band one opens assembled: a one-time ramp that hands over to scroll.
    const startLoadRamp = () => {
      if (loadRaf !== null || loadK >= 1) return;
      const t0 = performance.now();
      const ramp = (now: number) => {
        const t = clamp((now - t0) / 1100, 0, 1);
        loadK = 1 - Math.pow(1 - t, 3);
        updateCaptions(shown);
        loadRaf = t < 1 && !disposed ? requestAnimationFrame(ramp) : null;
      };
      loadRaf = requestAnimationFrame(ramp);
    };

    // ---- live gates: scroll-driven zoom, or the composed still map ----
    const enableScrub = () => {
      if (scrubOn) return;
      scrubOn = true;
      window.addEventListener('scroll', onScroll, { passive: true });
      bands.forEach((b) => {
        b.op = -1;
        b.k = -1;
        b.o = -1;
      });
      atEnd = false;
      pinState.clear();
      shown = target = heroProgress();
      startLoadRamp();
      updateCaptions(shown);
      render(shown);
    };
    const disableScrub = () => {
      if (!scrubOn) return;
      scrubOn = false;
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pinState.clear();
      render(shown);
    };
    const applyHeroMode = () => {
      if (GATES.some((q) => window.matchMedia(q).matches)) disableScrub();
      else enableScrub();
    };
    const mqls = GATES.map((q) => window.matchMedia(q));
    mqls.forEach((m) => m.addEventListener('change', applyHeroMode));

    const io = new IntersectionObserver(([entry]) => {
      heroOnScreen = entry.isIntersecting;
      hero.classList.toggle('on', heroOnScreen);
      if (heroOnScreen && scrubOn) onScroll();
    });
    io.observe(hero);

    vw = stage.clientWidth;
    vh = stage.clientHeight;
    applyHeroMode();
    startLoad();

    return () => {
      disposed = true;
      disableScrub();
      mqls.forEach((m) => m.removeEventListener('change', applyHeroMode));
      io.disconnect();
      ro.disconnect();
      fetchCtrl.abort();
      if (loadRaf !== null) cancelAnimationFrame(loadRaf);
    };
  }, []);

  const skipToSettle = () => {
    const hero = heroRef.current;
    if (!hero) return;
    window.scrollTo({ top: hero.offsetTop + hero.offsetHeight - window.innerHeight, behavior: 'smooth' });
  };

  return (
    <section ref={heroRef} className="xp-hero" aria-label="ExPorta tanıtım">
      <div ref={stageRef} className="xp-stage">
        {/* ---- the map: scroll-driven on desktops, a composed still everywhere else ---- */}
        <canvas ref={canvasRef} className="xp-map" aria-hidden="true" />
        <div className="xp-pins" aria-hidden="true">
          <div className={`xp-pin is-origin${home ? '' : ' is-anon'}`} data-pin={ORIGIN} style={{ opacity: 0 }}>
            <i className="live" />
            {home && (
              <span>
                {home.name}
                <small>Şirketinizin şehri</small>
              </span>
            )}
          </div>
          {ROUTES.map((name) => (
            <div key={name} className="xp-pin is-dest" data-pin={name} data-place={PLACE[name]} style={{ opacity: 0 }}>
              <i />
              <span>{name}</span>
            </div>
          ))}
          {CONTEXT.map((name) => (
            <div key={name} className="xp-pin is-ctx" data-pin={name} style={{ opacity: 0 }}>
              <i />
              <span>{name}</span>
            </div>
          ))}
        </div>
        <div className="xp-scrim" aria-hidden="true" />

        <div className="xp-scrubonly">
          <h1 className="sr-only-xp">ExPorta. İhracatın Dijital Kapısı. Sevkiyattan belgeye, tüm ihracatınız tek platformda.</h1>

          <div className="band xp-b1" data-a="0" data-b="0.19" data-first="1" data-exit="scatter">
            <p className="xp-b1-kicker">Proforma, fatura, çeki listesi…</p>
            <p className="xp-b1-line">
              <span className="sr-only-xp">{HOOK}</span>
              <span aria-hidden="true">
                {hookWords.map(({ w, em, style }, i) => (
                  <React.Fragment key={i}>
                    <span className={`w${em ? ' em' : ''}`} style={style}>
                      {w}
                    </span>{' '}
                  </React.Fragment>
                ))}
              </span>
            </p>
          </div>

          <div className="band xp-b2" data-a="0.22" data-b="0.47" data-ramp="0.14">
            <p className="xp-b2-head">
              Tek veri kaynağı. <span>Sıfır karmaşa.</span>
            </p>
            <p className="xp-b2-label">Bir sevkiyat kaydı, yedi belge</p>
            <ul className="xp-docrow">
              {DOCS.map((d, i) => (
                <li key={d} style={{ '--th': (0.12 + i * 0.09).toFixed(2) } as React.CSSProperties}>
                  <i aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="xp-settle">
            <div className="band xp-b3" data-a="0.52" data-b="1" data-last="1" data-ramp="0.1">
              <p className="xp-b3-head">
                {['İhracatın', 'Dijital', 'Kapısı.'].map((w, i) => (
                  <React.Fragment key={w}>
                    <span className={`w${i > 0 ? ' em' : ''}`} style={{ '--th': (i * 0.16).toFixed(2) } as React.CSSProperties}>
                      {w}
                    </span>{' '}
                  </React.Fragment>
                ))}
              </p>
              <p className="xp-b3-sub">Sevkiyattan belgeye, tüm ihracatınız tek platformda.</p>
            </div>
            <div className="band xp-b4" data-a="0.8" data-b="1" data-last="1" data-ramp="0.08">
              <div className="xp-b4-row">
                <button type="button" className="xp-btn is-gate" onClick={onSignup}>
                  Ücretsiz hesap aç <ArrowRight aria-hidden="true" />
                </button>
                <button type="button" className="xp-btn is-line-light" onClick={onSignin}>
                  Giriş yap
                </button>
              </div>
              <p className="xp-b4-micro">Ücretsiz planla başlayın, kart bilgisi istemiyoruz.</p>
            </div>
          </div>

          <dl className="xp-readout xp-hud-chip" aria-hidden="true">
            <div>
              <dt>Çıkış</dt>
              <dd>{home ? `${home.name}, Türkiye` : 'Türkiye'}</dd>
            </div>
            <div>
              <dt>Görünen alan</dt>
              <dd data-km />
            </div>
            <div>
              <dt>Rota</dt>
              <dd data-routes>0 / 7</dd>
            </div>
          </dl>


          <div className="xp-corner">
            <svg ref={ringRef} className="xp-ring" viewBox="0 0 48 48" aria-hidden="true">
              <circle className="track" cx="24" cy="24" r="20" fill="none" strokeWidth="3" />
              <circle
                className="fill"
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="126"
              />
            </svg>
            <ChevronDown className="xp-cue" aria-hidden="true" />
            <button type="button" className="xp-skiphero" onClick={skipToSettle}>
              Sonuna atla <ArrowDown aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ---- the composed still hero (phones, portrait tablets, reduced motion) ---- */}
        <div className="xp-static">
          <p className="xp-static-kicker">Tek veri kaynağı. Sıfır karmaşa.</p>
          <h1>
            İhracatın <span>Dijital Kapısı.</span>
          </h1>
          <p className="xp-static-sub">Sevkiyattan belgeye, tüm ihracatınız tek platformda.</p>
          <div className="xp-static-cta">
            <button type="button" className="xp-btn is-gate" onClick={onSignup}>
              Ücretsiz hesap aç <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className="xp-btn is-line-light" onClick={onSignin}>
              Giriş yap
            </button>
          </div>
          <p className="xp-static-micro">Ücretsiz planla başlayın, kart bilgisi istemiyoruz.</p>
        </div>
      </div>
    </section>
  );
};
