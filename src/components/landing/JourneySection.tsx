import React, { useEffect, useMemo, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

/*
 * "Bugün": the same data typed seven times, told as a shipment that never
 * makes its ship. A truck leaves the warehouse, is weighed at 12.480 kg,
 * the packing list says 12.840 kg, customs stops it, the container is not
 * loaded because the documents disagree, and the ship sails without it.
 * Desktop: scrubbed by scroll inside a pinned stage. Phones: plays once when
 * it comes into view. Reduced motion: the final frame, no movement.
 */

const i = (n: number) => ({ '--i': n } as React.CSSProperties);

// ---- the world (SVG units). Only a window of it is on screen at a time. ----
const WORLD_W = 3700;
const Y0 = 300; // top of the visible band
const VH = 420; // height of the visible band
const VH_END = 600; // the camera pulls back at the end so the departing ship is in frame
const GROUND_LINE = Y0 + VH; // bottom of the frame stays on the ground while zooming
const STOP = { depot: 230, kantar: 975, customs: 1665 };
const TRUCK_LEN = 400;

const ADDRESS = 'ElektroTech GmbH, Industriestr. 88, Hamburg';
const RETYPED = ['Teklif', 'Proforma', 'Satış Emri'];
const FILES = ['teklif_v3.pdf', 'teklif_v3_son.pdf', 'teklif_son_SON.pdf'];
const FILE_OFFSETS: [number, number][] = [
  [-30, 352],
  [130, 326],
  [270, 360],
];

/** Static-hero gates, the same five used by the hero. */
const GATES = [
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)',
];
const REDUCE = '(prefers-reduced-motion: reduce)';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (p: number, e0: number, e1: number) => {
  const t = clamp((p - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const kgFmt = new Intl.NumberFormat('tr-TR');

const truckX = (p: number) => {
  if (p < 0.08) return STOP.depot;
  if (p < 0.3) return lerp(STOP.depot, STOP.kantar, smoothstep(p, 0.08, 0.3));
  if (p < 0.55) return STOP.kantar;
  if (p < 0.68) return lerp(STOP.kantar, STOP.customs, smoothstep(p, 0.55, 0.68));
  return STOP.customs;
};

/** Ledger steps: which scroll stretch each of the three points owns. */
const STEPS: [number, number][] = [
  [0, 0.12],
  [0.1, 0.38],
  [0.4, 0.95],
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export const JourneySection: React.FC = () => {
  const secRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const playRef = useRef<(() => void) | null>(null);

  // A far skyline for parallax, seeded so it is the same on every load.
  const skyline = useMemo(() => {
    const r = rng(7311);
    const out: { x: number; w: number; h: number; chimney: boolean; saw: boolean }[] = [];
    for (let x = -120; x < 2700; ) {
      const w = 50 + r() * 90;
      out.push({ x, w, h: 40 + r() * 140, chimney: r() > 0.72, saw: r() > 0.7 });
      x += w + 8 + r() * 40;
    }
    return out;
  }, []);

  const waves = useMemo(() => {
    let d = '';
    for (const y of [662, 692]) {
      d += `M2600 ${y}`;
      for (let x = 2600; x < 4500; x += 80) d += ` q20 -7 40 0 t40 0`;
    }
    return d;
  }, []);

  useEffect(() => {
    const sec = secRef.current;
    const scene = sceneRef.current;
    const svg = svgRef.current;
    if (!sec || !scene || !svg) return;

    const q = <T extends Element>(sel: string) => sec.querySelector(sel) as T;
    const far = q<SVGGElement>('[data-far]');
    const truck = q<SVGGElement>('[data-truck]');
    const wheels = Array.from(sec.querySelectorAll<SVGGElement>('[data-wheel]'));
    const puffs = Array.from(sec.querySelectorAll<SVGCircleElement>('[data-puff]'));
    const led = q<SVGTextElement>('[data-led]');
    const arm = q<SVGGElement>('[data-arm]');
    const lightRed = q<SVGCircleElement>('[data-light-red]');
    const lightGreen = q<SVGCircleElement>('[data-light-green]');
    const ship = q<SVGGElement>('[data-ship]');
    const typeCard = q<HTMLElement>('[data-type]');
    const typeTab = q<HTMLElement>('[data-type-tab]');
    const typeText = q<HTMLElement>('[data-type-text]');
    const typeCount = q<HTMLElement>('[data-type-count]');
    const files = Array.from(sec.querySelectorAll<HTMLElement>('[data-file]'));
    const docs = q<HTMLElement>('[data-docs]');
    const plValue = q<HTMLElement>('[data-pl]');
    const stamp = q<HTMLElement>('[data-stamp]');
    const wait = q<HTMLElement>('[data-wait]');
    const hand = q<HTMLElement>('[data-hand]');
    const bank = q<HTMLElement>('[data-bank]');
    const steps = Array.from(sec.querySelectorAll<HTMLElement>('[data-step]'));

    // Delta-gated writers: each (element, property) pair is only touched when its value changes.
    const cache = new Map<Element, Map<string, string>>();
    const put = (el: Element | null, key: string, value: string, apply: (el: Element) => void) => {
      if (!el) return;
      let m = cache.get(el);
      if (!m) cache.set(el, (m = new Map()));
      if (m.get(key) === value) return;
      m.set(key, value);
      apply(el);
    };
    const setAttr = (el: Element | null, name: string, value: string) =>
      put(el, `@${name}`, value, (e) => e.setAttribute(name, value));
    const sty = (el: HTMLElement | SVGElement | null, prop: string, value: string) =>
      put(el, prop, value, (e) => (e as HTMLElement).style.setProperty(prop, value));
    const setText = (el: Element | null, value: string) => put(el, '#text', value, (e) => (e.textContent = value));
    const setClass = (el: Element | null, cls: string, on: boolean) =>
      put(el, `.${cls}`, String(on), (e) => e.classList.toggle(cls, on));

    let boxW = 1;
    let boxH = 1;
    const widths = new Map<HTMLElement, number>();
    const measure = () => {
      boxW = scene.clientWidth || 1;
      boxH = scene.clientHeight || 1;
      widths.clear();
    };
    /** Overlay width, read once per resize; used to keep labels inside the scene on narrow screens. */
    const widthOf = (el: HTMLElement) => {
      let w = widths.get(el);
      if (w === undefined) widths.set(el, (w = el.offsetWidth));
      return w;
    };

    const render = (p: number) => {
      // camera: follow the truck, then pull back to show customs and the port
      const pull = smoothstep(p, 0.7, 0.86);
      const vh = lerp(VH, VH_END, pull);
      const y0 = GROUND_LINE - vh;
      const winW = (vh * boxW) / boxH;
      const s = boxH / vh; // px per world unit
      const tx = truckX(p);
      const speed = Math.abs(truckX(Math.min(1, p + 0.004)) - tx);

      const follow = tx + TRUCK_LEN / 2 - 0.42 * winW;
      const endView = Math.max(follow, Math.min(1700, 3170 - winW));
      const cam = clamp(lerp(follow, endView, pull), -40, WORLD_W - winW);
      setAttr(svg, 'viewBox', `${cam.toFixed(1)} ${y0.toFixed(1)} ${winW.toFixed(1)} ${vh.toFixed(1)}`);
      setAttr(far, 'transform', `translate(${(cam * 0.55).toFixed(1)} 0)`);

      // the truck: position, a road bounce, turning wheels, exhaust while it moves
      const bounce = speed > 0.3 ? Math.sin(tx * 0.09) * 1.4 : 0;
      setAttr(truck, 'transform', `translate(${tx.toFixed(1)} ${bounce.toFixed(2)})`);
      const turn = ((tx / (2 * Math.PI * 20)) * 360) % 360;
      wheels.forEach((w) => setAttr(w, 'transform', `rotate(${turn.toFixed(1)})`));
      const puffO = clamp(speed / 5, 0, 1) * 0.75;
      puffs.forEach((c, n) => {
        const phase = ((tx * 0.6 + n * 18) % 54) / 54;
        sty(c, 'opacity', (puffO * (1 - phase)).toFixed(2));
        setAttr(c, 'transform', `translate(${(-phase * 46).toFixed(1)} ${(-phase * 34).toFixed(1)})`);
      });

      // the weighbridge counts up
      const w = 12480 * smoothstep(p, 0.31, 0.4);
      setText(led, `${kgFmt.format(Math.round(w / 10) * 10)} kg`);

      // customs: the barrier drops and the light turns red as the truck rolls up
      const down = smoothstep(p, 0.58, 0.64);
      setAttr(arm, 'transform', `rotate(${(78 * (1 - down)).toFixed(1)} 2300 585)`);
      setClass(lightRed, 'is-on', p >= 0.6);
      setClass(lightGreen, 'is-on', p < 0.6);

      // the ship sails without it, once the camera has pulled back to show it
      setAttr(ship, 'transform', `translate(${(540 * smoothstep(p, 0.86, 1)).toFixed(1)} 0)`);

      // HTML overlays ride on the same camera
      const place = (el: HTMLElement | null, wx: number, wy: number, keepInside = false) => {
        if (!el) return;
        let sx = (wx - cam) * s;
        if (keepInside) sx = clamp(sx, 8, Math.max(8, boxW - widthOf(el) - 8));
        sty(el, 'transform', `translate3d(${sx.toFixed(1)}px, ${((wy - y0) * s).toFixed(1)}px, 0)`);
      };

      // 01: the address, typed again for each document
      place(typeCard, 40, 312);
      const rep = p < 0.02 ? 0 : Math.min(2, Math.floor((p - 0.02) / 0.05) + 1);
      const t = rep === 0 || p >= 0.12 ? 1 : (p - 0.02 - (rep - 1) * 0.05) / 0.05;
      setText(typeTab, RETYPED[rep]);
      setText(typeText, ADDRESS.slice(0, Math.round(ADDRESS.length * t)));
      setText(typeCount, `${rep + 1}. kez yazılıyor`);

      // 02: which one is the latest? file names swirl around the truck
      const fk = smoothstep(p, 0.1, 0.14) * (1 - smoothstep(p, 0.3, 0.34));
      files.forEach((el, n) => {
        const [ox, oy] = FILE_OFFSETS[n];
        const bob = Math.sin(p * 60 + n * 2.1) * 7;
        place(el, tx + ox, oy + bob);
        sty(el, 'opacity', fk.toFixed(2));
      });

      // 03: invoice and packing list ride with the truck; one of them is wrong
      place(docs, tx + 30, 306);
      sty(docs, 'opacity', smoothstep(p, 0.42, 0.47).toFixed(2));
      const swapped = p >= 0.5;
      setText(plValue, swapped ? '12.840 kg' : '12.480 kg');
      setClass(plValue, 'is-off', swapped);
      const st = smoothstep(p, 0.66, 0.7);
      sty(stamp, 'opacity', st.toFixed(2));
      sty(stamp, 'transform', `rotate(-9deg) scale(${(1.5 - 0.5 * st).toFixed(3)})`);

      // the wait, and the bank
      place(wait, 2330, 318, true);
      sty(wait, 'opacity', smoothstep(p, 0.7, 0.74).toFixed(2));
      sty(hand, 'transform', `rotate(${((p - 0.7) * 1440).toFixed(1)}deg)`);
      // On a narrow scene the warning goes to the open sky above, clear of the documents.
      place(bank, 2330, boxW < 560 ? 140 : 372, true);
      sty(bank, 'opacity', smoothstep(p, 0.8, 0.84).toFixed(2));

      // ledger: the point being told now, with its own progress
      const active = p < 0.1 ? 0 : p < 0.4 ? 1 : 2;
      steps.forEach((el, n) => {
        setClass(el, 'is-on', n === active);
        const [a, b] = STEPS[n];
        sty(el, '--fill', clamp((p - a) / (b - a), 0, 1).toFixed(3));
      });
    };

    // ---- drive modes ----
    let mode: 'scroll' | 'play' | 'still' | null = null;
    let target = 0;
    let shown = 0;
    let rafId: number | null = null;
    let lastTick = 0;
    let onScreen = false;
    let playT = 0; // 0..1 time-based progress
    let playing = false;
    let playLast = 0;

    const progress = () => {
      const range = sec.offsetHeight - window.innerHeight;
      if (range <= 0) return 0;
      return clamp(-sec.getBoundingClientRect().top / range, 0, 1);
    };

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
      render(shown);
    };
    const onScroll = () => {
      target = progress();
      if (rafId === null && onScreen) rafId = requestAnimationFrame(tick);
    };

    const playTick = (now: number) => {
      const dt = Math.min(100, now - (playLast || now));
      playLast = now;
      playT = Math.min(1, playT + dt / 11000);
      render(playT);
      if (playT < 1 && playing && onScreen) {
        rafId = requestAnimationFrame(playTick);
      } else {
        rafId = null;
        playLast = 0;
        if (playT >= 1) {
          playing = false;
          replayRef.current?.classList.add('is-on');
        }
      }
    };
    const startPlay = () => {
      if (mode !== 'play' || rafId !== null) return;
      playing = true;
      rafId = requestAnimationFrame(playTick);
    };
    playRef.current = () => {
      replayRef.current?.classList.remove('is-on');
      playT = 0;
      render(0);
      startPlay();
    };

    const stop = () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      playing = false;
      lastTick = 0;
      playLast = 0;
    };
    const applyMode = () => {
      const next = window.matchMedia(REDUCE).matches
        ? 'still'
        : GATES.some((g) => window.matchMedia(g).matches)
          ? 'play'
          : 'scroll';
      if (next === mode) return;
      stop();
      mode = next;
      cache.clear();
      measure();
      const r = (mode === 'play' ? scene : sec).getBoundingClientRect();
      onScreen = r.bottom > 0 && r.top < window.innerHeight;
      replayRef.current?.classList.remove('is-on');
      if (mode === 'still') {
        render(1);
      } else if (mode === 'play') {
        playT = 0;
        render(0);
        if (onScreen) startPlay();
      } else {
        window.addEventListener('scroll', onScroll, { passive: true });
        shown = target = progress();
        render(shown);
      }
    };

    // The pinned section is taller than any screen, so it is watched with no threshold;
    // the phone playback waits until most of the scene itself is in view.
    const io = new IntersectionObserver(([entry]) => {
      if (mode === 'play') return;
      onScreen = entry.isIntersecting;
      if (onScreen && mode === 'scroll') onScroll();
    });
    io.observe(sec);
    const sceneIo = new IntersectionObserver(
      ([entry]) => {
        if (mode !== 'play') return;
        onScreen = entry.isIntersecting;
        if (onScreen && playT < 1) startPlay();
      },
      { threshold: 0.45 }
    );
    sceneIo.observe(scene);

    const ro = new ResizeObserver(() => {
      measure();
      cache.clear();
      render(mode === 'scroll' ? shown : mode === 'play' ? playT : 1);
    });
    ro.observe(scene);

    const mqls = GATES.map((g) => window.matchMedia(g));
    mqls.forEach((m) => m.addEventListener('change', applyMode));
    applyMode();

    return () => {
      stop();
      io.disconnect();
      sceneIo.disconnect();
      ro.disconnect();
      mqls.forEach((m) => m.removeEventListener('change', applyMode));
      playRef.current = null;
    };
  }, []);

  return (
    <section ref={secRef} id="dert" className="xp-sec xp-jr" aria-labelledby="dert-h">
      <div className="xp-jr-stage">
        <div className="xp-wrap xp-jr-head" data-reveal>
          <div>
            <p className="xp-label r" style={i(0)}>
              Bugün
            </p>
            <h2 id="dert-h" className="xp-jr-h2 r" style={i(1)}>
              Aynı bilgi, yedi belge, yedi kez yazılıyor.
            </h2>
          </div>
          <div className="xp-jr-leads r" style={i(2)}>
            <p>
              Alıcının adresi teklife, proformaya, faturaya, çeki listesine ve talimata ayrı ayrı giriliyor. Yüklemede bir
              koli eksilince beş dosyayı tek tek açıp düzeltmeniz gerekiyor.
            </p>
            <p>
              Biri gözden kaçarsa belgeler birbirini tutmuyor. Gümrük bekletiyor, evrak uyuşmazlığı yüzünden konteyner gemiye
              yüklenemiyor.
            </p>
          </div>
        </div>

        <div className="xp-wrap xp-jr-scene-wrap">
          <p className="sr-only-xp">
            Animasyon: kamyon depodan çıkıyor. Alıcı adresi her belge için yeniden yazılıyor, dosyalar karışıyor. Kantarda
            12.480 kg tartılıyor ama çeki listesine 12.840 kg yazılıyor. Gümrükte uyuşmazlık damgası basılıyor, kamyon
            bekliyor, evrak uyuşmazlığı yüzünden konteyner gemiye yüklenemiyor ve gemi onsuz limandan ayrılıyor.
          </p>
          <div ref={sceneRef} className="xp-jr-scene">
            <svg ref={svgRef} className="xp-jr-svg" viewBox={`0 ${Y0} 1400 ${VH}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <defs>
                <pattern id="xp-stripes" width="24" height="10" patternUnits="userSpaceOnUse">
                  <rect width="12" height="10" fill="#d9304f" />
                  <rect x="12" width="12" height="10" fill="#fafbfa" />
                </pattern>
                <linearGradient id="xp-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f7f9f8" />
                  <stop offset="1" stopColor="#eaf0ef" />
                </linearGradient>
              </defs>

              <rect x="-200" y="0" width="4400" height="800" fill="url(#xp-sky)" />

              {/* far skyline, parallax */}
              <g data-far>
                {skyline.map((b, n) => (
                  <g key={n} fill="#dfe6e7">
                    <rect x={b.x} y={620 - b.h} width={b.w} height={b.h} />
                    {b.saw && (
                      <path
                        d={`M${b.x} ${620 - b.h} l${b.w / 4} -14 v14 l${b.w / 4} -14 v14 l${b.w / 4} -14 v14 l${b.w / 4} -14 v14 z`}
                      />
                    )}
                    {b.chimney && <rect x={b.x + b.w * 0.7} y={620 - b.h - 36} width="9" height="36" />}
                  </g>
                ))}
              </g>

              {/* road and ground */}
              <rect x="-200" y="620" width="2850" height="70" fill="#dce3e4" />
              <line x1="-200" y1="620" x2="2650" y2="620" stroke="#0f2b48" strokeWidth="2" />
              <line x1="-200" y1="655" x2="2650" y2="655" stroke="#fafbfa" strokeWidth="4" strokeDasharray="40 34" />
              <rect x="-200" y="690" width="2850" height="40" fill="#e6eceb" />

              {/* warehouse */}
              <g>
                <polygon points="26,472 300,428 574,472" fill="#e3e9ea" stroke="#0f2b48" strokeWidth="2" strokeLinejoin="round" />
                <rect x="40" y="472" width="520" height="148" fill="#f7f9f8" stroke="#0f2b48" strokeWidth="2" />
                <rect x="372" y="520" width="150" height="100" fill="#cfd9db" stroke="#0f2b48" strokeWidth="1.5" />
                {[540, 560, 580, 600].map((y) => (
                  <line key={y} x1="372" y1={y} x2="522" y2={y} stroke="#8597a2" strokeWidth="1" />
                ))}
                <rect x="62" y="506" width="140" height="78" rx="6" fill="#0f2b48" />
                <rect x="76" y="522" width="80" height="6" rx="3" fill="#2dd4bf" opacity="0.9" />
                <rect x="76" y="538" width="108" height="6" rx="3" fill="#2dd4bf" opacity="0.55" />
                <rect x="76" y="554" width="64" height="6" rx="3" fill="#2dd4bf" opacity="0.55" />
                <rect className="xp-jr-cursor live" x="144" y="552" width="3" height="10" fill="#eafffb" />
                <rect x="62" y="486" width="74" height="16" rx="2" fill="#0f2b48" />
                <text x="99" y="498" textAnchor="middle" className="xp-jr-svg-mono" fill="#fafbfa" fontSize="11">
                  DEPO
                </text>
              </g>

              {/* weighbridge */}
              <g>
                <rect x="960" y="612" width="430" height="10" rx="2" fill="#8597a2" />
                {[980, 1060, 1140, 1220, 1300, 1370].map((x) => (
                  <circle key={x} cx={x} cy="617" r="2" fill="#475a6b" />
                ))}
                <rect x="1392" y="488" width="134" height="14" rx="3" fill="#0f2b48" />
                <rect x="1402" y="502" width="114" height="118" fill="#f7f9f8" stroke="#0f2b48" strokeWidth="2" />
                <rect x="1412" y="518" width="94" height="36" rx="5" fill="#0b1a2b" />
                <text data-led x="1459" y="542" textAnchor="middle" className="xp-jr-svg-mono" fill="#2dd4bf" fontSize="15">
                  0 kg
                </text>
                <text x="1459" y="586" textAnchor="middle" className="xp-jr-svg-mono" fill="#0f2b48" fontSize="11">
                  KANTAR
                </text>
              </g>

              {/* customs */}
              <g>
                <rect x="2060" y="432" width="14" height="188" fill="#33475a" />
                <rect x="2416" y="432" width="14" height="188" fill="#33475a" />
                <rect x="2050" y="408" width="390" height="26" rx="3" fill="#0f2b48" />
                <text x="2245" y="426" textAnchor="middle" className="xp-jr-svg-mono" fill="#fafbfa" fontSize="13">
                  GÜMRÜK
                </text>
                <rect x="2082" y="446" width="26" height="54" rx="6" fill="#0b1a2b" />
                <circle data-light-red className="xp-jr-light is-red" cx="2095" cy="461" r="8" />
                <circle data-light-green className="xp-jr-light is-green is-on" cx="2095" cy="485" r="8" />
                <rect x="2316" y="500" width="96" height="120" fill="#f7f9f8" stroke="#0f2b48" strokeWidth="2" />
                <rect x="2330" y="518" width="68" height="40" fill="#cfe0e3" stroke="#0f2b48" strokeWidth="1.5" />
                <rect x="2290" y="560" width="20" height="60" fill="#0f2b48" />
                <g data-arm transform="rotate(78 2300 585)">
                  <rect x="2080" y="580" width="222" height="10" rx="2" fill="url(#xp-stripes)" stroke="#0f2b48" strokeWidth="1" />
                </g>
              </g>

              {/* port: quay, water, crane, ship */}
              <g>
                <rect x="2600" y="636" width="1700" height="100" fill="#d5e5e8" />
                <path className="xp-jr-waves live" d={waves} fill="none" stroke="#b6d0d6" strokeWidth="2" />
                <rect x="2560" y="620" width="50" height="110" fill="#b2c0c5" stroke="#0f2b48" strokeWidth="1.5" />
                <g stroke="#0f2b48" strokeWidth="5" strokeLinecap="round" fill="none">
                  <line x1="2640" y1="636" x2="2668" y2="402" />
                  <line x1="2730" y1="636" x2="2702" y2="402" />
                  <line x1="2600" y1="402" x2="3020" y2="402" />
                  <line x1="2668" y1="402" x2="2686" y2="360" />
                  <line x1="2702" y1="402" x2="2686" y2="360" />
                </g>
                <line x1="2900" y1="402" x2="2900" y2="520" stroke="#0f2b48" strokeWidth="2" />
                <rect x="2886" y="520" width="28" height="12" fill="#0f2b48" />
                <g data-ship>
                  {[
                    [2800, 570, '#0b7368'],
                    [2852, 570, '#2f6fdb'],
                    [2904, 570, '#d9304f'],
                    [2956, 570, '#1f9d55'],
                    [3008, 570, '#4a5b6e'],
                    [2826, 532, '#8597a2'],
                    [2878, 532, '#0b7368'],
                    [2930, 532, '#1f9d55'],
                  ].map(([x, y, c], n) => (
                    <rect key={n} x={x as number} y={y as number} width="50" height="38" fill={c as string} stroke="#0f2b48" strokeWidth="1.2" />
                  ))}
                  <rect x="3070" y="500" width="44" height="108" fill="#f7f9f8" stroke="#0f2b48" strokeWidth="2" />
                  <rect x="3078" y="512" width="28" height="10" fill="#0f2b48" />
                  <polygon points="2770,608 3150,608 3120,668 2800,668" fill="#0f2b48" />
                  <line x1="2790" y1="628" x2="3136" y2="628" stroke="#d9304f" strokeWidth="4" />
                </g>
              </g>

              {/* the truck */}
              <g data-truck transform={`translate(${STOP.depot} 0)`}>
                <g data-puffs>
                  {[0, 1, 2].map((n) => (
                    <circle key={n} data-puff cx="303" cy="492" r={7 + n * 3} fill="#c9d3d6" opacity="0" />
                  ))}
                </g>
                <rect x="298" y="498" width="7" height="34" rx="2" fill="#33475a" />
                <rect x="0" y="503" width="292" height="97" rx="3" fill="#0b7368" />
                {Array.from({ length: 19 }, (_, n) => (
                  <line key={n} x1={12 + n * 14.5} y1="508" x2={12 + n * 14.5} y2="596" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
                ))}
                <text x="18" y="530" className="xp-jr-svg-mono" fill="#eafffb" fontSize="13">
                  SHP-2026-014
                </text>
                <text x="18" y="588" className="xp-jr-svg-mono" fill="rgba(234,255,251,0.7)" fontSize="10">
                  412 koli
                </text>
                <rect x="0" y="598" width="402" height="12" rx="2" fill="#0b1a2b" />
                <path d="M300 600 V546 Q300 530 316 530 H368 Q380 530 386 542 L398 566 V600 Z" fill="#0f2b48" />
                <polygon points="338,540 372,540 386,566 338,566" fill="#cfe0e3" />
                <rect x="392" y="574" width="8" height="20" rx="2" fill="#33475a" />
                <circle cx="394" cy="568" r="4" fill="#fafbfa" />
                {[52, 104, 232, 352].map((cx) => (
                  <g key={cx} transform={`translate(${cx} 612)`}>
                    <g data-wheel>
                      <circle r="20" fill="#0b1a2b" />
                      <circle r="8" fill="#8597a2" />
                      <line x1="-16" y1="0" x2="16" y2="0" stroke="#475a6b" strokeWidth="3" />
                      <line x1="0" y1="-16" x2="0" y2="16" stroke="#475a6b" strokeWidth="3" />
                    </g>
                  </g>
                ))}
              </g>
            </svg>

            {/* overlays that ride on the same camera */}
            <div className="xp-jr-over" aria-hidden="true">
              <div className="xp-jr-type" data-type>
                <div className="xp-jr-type-top">
                  <span data-type-tab>Teklif</span>
                  <b data-type-count>1. kez yazılıyor</b>
                </div>
                <small>Alıcı adresi</small>
                <p>
                  <span data-type-text>{ADDRESS}</span>
                  <i className="live" />
                </p>
              </div>

              {FILES.map((f) => (
                <span key={f} className="xp-jr-file" data-file>
                  {f}
                </span>
              ))}

              <div className="xp-jr-docs" data-docs>
                <div className="xp-jr-doc">
                  <span>Ticari Fatura</span>
                  <b>12.480 kg</b>
                </div>
                <div className="xp-jr-doc">
                  <span>Çeki Listesi</span>
                  <b data-pl>12.480 kg</b>
                </div>
                <span className="xp-jr-stamp" data-stamp>
                  UYUŞMAZLIK
                </span>
              </div>

              <div className="xp-jr-chip is-wait" data-wait>
                <span className="xp-jr-clock">
                  <i data-hand />
                </span>
                Gümrükte bekliyor
              </div>
              <div className="xp-jr-chip is-bank" data-bank>
                <span>
                  Konteyner gemiye yüklenemedi
                  <small>Sebep: evrak uyuşmazlığı</small>
                </span>
              </div>
            </div>

            <button ref={replayRef} type="button" className="xp-jr-replay" onClick={() => playRef.current?.()}>
              <RotateCcw aria-hidden="true" /> Tekrar oynat
            </button>
          </div>
        </div>

        <ol className="xp-wrap xp-jr-ledger">
          <li data-step>
            <b>01</b>
            <div>
              <strong>Kopyala, yapıştır, kontrol et.</strong>
              <span>Her sevkiyatta, her belge için yeniden.</span>
            </div>
            <i aria-hidden="true" />
          </li>
          <li data-step>
            <b>02</b>
            <div>
              <strong>Hangisi son hali?</strong>
              <span>
                <code>teklif_v3.pdf</code>, <code>teklif_v3_son.pdf</code>, <code>teklif_son_SON.pdf</code>
              </span>
            </div>
            <i aria-hidden="true" />
          </li>
          <li data-step>
            <b>03</b>
            <div>
              <strong>Küçük bir fark, uzun bir bekleme.</strong>
              <span>Faturada 12.480 kg, çeki listesinde 12.840 kg.</span>
            </div>
            <i aria-hidden="true" />
          </li>
        </ol>
      </div>
    </section>
  );
};
