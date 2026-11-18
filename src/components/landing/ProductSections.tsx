import React, { useRef, useState } from 'react';
import { Play, FileDown, Printer } from 'lucide-react';
import { MEDIA } from './media';
import { DeskScene } from './DeskScene';
import { useLang } from '../../i18n';
import { accent } from './accent';

const i =(n: number) => ({ '--i': n } as React.CSSProperties);

/* ------------------------------------------------------------------ */
/* 4. The tour: the ExPorta film, with its ten chapters                */
/* ------------------------------------------------------------------ */

/** Chapter start times in the film; titles come from the messages, in the same order. */
const CHAPTERS = [5.5, 12.6, 19.1, 27.7, 35.6, 44.3, 50.7, 56.9, 64.7, 70.9];

const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const TourSection: React.FC = () => {
  const { t } = useLang();
  const tour = t.tour;
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
    for (let n = 0; n < CHAPTERS.length; n++) if (v.currentTime >= CHAPTERS[n] - 0.2) idx = n;
    if (v.currentTime >= 78) idx = -1;
    if (idx !== active) setActive(idx);
  };

  return (
    <section id="tur" className="xp-sec xp-night xp-tour" aria-labelledby="tur-h">
      <div className="xp-wrap">
        <div data-reveal>
          <p className="xp-label r" style={i(0)}>
            {tour.label}
          </p>
          <h2 id="tur-h" className="xp-h2 r" style={i(1)}>
            {tour.title}
          </h2>
          <p className="xp-lead r" style={i(2)}>
            {tour.lead}
          </p>
          {tour.filmNote && (
            <p className="xp-tour-note r" style={i(3)}>
              {tour.filmNote}
            </p>
          )}
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
              aria-label={tour.videoAria}
            />
            <button
              type="button"
              className={`xp-play${started ? ' is-gone' : ''}`}
              onClick={() => play()}
              aria-label={tour.playAria}
              tabIndex={started ? -1 : 0}
            >
              <span className="xp-play-btn">
                <i>
                  <Play aria-hidden="true" />
                </i>
                <span>
                  {tour.watch} <small>{tour.duration}</small>
                </span>
              </span>
            </button>
          </div>

          <ol className="xp-chapters r" style={i(1)} aria-label={tour.chaptersAria}>
            {CHAPTERS.map((at, n) => (
              <li key={n}>
                <button
                  type="button"
                  className={n === active ? 'is-on' : undefined}
                  aria-current={n === active ? 'true' : undefined}
                  onClick={() => play(at)}
                >
                  <b>{String(n + 1).padStart(2, '0')}</b>
                  <span>{tour.chapters[n]}</span>
                  <time>{stamp(at)}</time>
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

export const FeaturesSection: React.FC = () => {
  const { t } = useLang();
  const f = t.features;
  return (
    <section id="ozellikler" className="xp-sec xp-feat" aria-labelledby="ozellik-h">
      <div className="xp-wrap">
        <div className="xp-feat-head" data-reveal>
          <div>
            <p className="xp-label r" style={i(0)}>
              {f.label}
            </p>
            <h2 id="ozellik-h" className="xp-h2 r" style={i(1)}>
              {f.title}
            </h2>
          </div>
          <p className="xp-lead r" style={i(2)}>
            {f.lead}
          </p>
        </div>

        <div className="xp-bento" data-reveal>
          <article className="xp-tile xp-t-a r" style={i(0)}>
            <h3>{f.excel.title}</h3>
            <p>{f.excel.body}</p>
            <div className="xp-tile-art" aria-hidden="true">
              <div className="xp-map-col is-xls">
                {f.excel.from.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
              <svg className="xp-map-arrows live" viewBox="0 0 56 120" preserveAspectRatio="none">
                <path d="M2 20 C 30 20, 26 20, 54 20" />
                <path d="M2 60 C 30 60, 26 60, 54 60" />
                <path d="M2 100 C 30 100, 26 100, 54 100" />
              </svg>
              <div className="xp-map-col is-xp">
                {f.excel.to.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="xp-tile xp-t-b r" style={i(1)}>
            <h3>{f.templates.title}</h3>
            <p>{f.templates.body}</p>
            <div className="xp-tile-art xp-tmpls" aria-hidden="true">
              {['Classic', 'Modern', 'Compact'].map((name) => (
                <div key={name}>
                  <div className={`xp-tmpl is-${name.toLowerCase()}`}>
                    <i className="h" />
                    <i />
                    <i style={{ width: '70%' }} />
                    <i />
                    <i style={{ width: '50%' }} />
                  </div>
                  <span className="xp-tmpl-name">{name}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="xp-tile xp-t-c r" style={i(2)}>
            <h3>{f.numbering.title}</h3>
            <p>{f.numbering.body}</p>
            <div className="xp-tile-art xp-num" aria-hidden="true">
              <div>
                <span>{f.numbering.prev}</span>
                <b>INV-2026-ELEK-013</b>
              </div>
              <div>
                <span>{f.numbering.next}</span>
                <b>
                  INV-2026-ELEK-<em>014</em>
                </b>
              </div>
            </div>
          </article>

          <article className="xp-tile xp-t-d r" style={i(3)}>
            <h3>{f.custom.title}</h3>
            <p>{f.custom.body}</p>
            <div className="xp-tile-art xp-chips" aria-hidden="true">
              {f.custom.chips.map((c, n) => (
                <span key={c} className={n === f.custom.chips.length - 1 ? 'is-new' : undefined}>
                  {c}
                </span>
              ))}
            </div>
          </article>

          <article className="xp-tile xp-t-e r" style={i(4)}>
            <h3>{f.pdf.title}</h3>
            <p>{f.pdf.body}</p>
            <div className="xp-tile-art xp-pdf" aria-hidden="true">
              <span>
                <FileDown /> {f.pdf.download}
              </span>
              <span>
                <Printer /> {f.pdf.print}
              </span>
            </div>
          </article>

          <article className="xp-tile xp-t-f r" style={i(5)}>
            <h3>{f.notes.title}</h3>
            <p>{f.notes.body}</p>
            <ul className="xp-tile-art xp-notes" aria-hidden="true">
              {f.notes.items.map((item, n) => (
                <li key={item} className={n < 2 ? 'is-done' : undefined}>
                  <i />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="xp-tile xp-t-g r" style={i(6)}>
            <h3>{f.bank.title}</h3>
            <p>{f.bank.body}</p>
            <div className="xp-tile-art xp-bank" aria-hidden="true">
              <span>{f.bank.bankLabel}</span>
              <b>{f.bank.bankName}</b>
              <span>IBAN</span>
              <b>{f.bank.iban}</b>
              <span>SWIFT</span>
              <b>{f.bank.swift}</b>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* 6. About and trust                                                  */
/* ------------------------------------------------------------------ */

export const AboutSection: React.FC = () => {
  const { t } = useLang();
  const a = t.about;
  return (
    <section id="hakkinda" className="xp-sec xp-about" aria-labelledby="hakkinda-h">
      <div className="xp-wrap xp-about-grid">
        <div data-reveal>
          <p className="xp-label r" style={i(0)}>
            {a.label}
          </p>
          <h2 id="hakkinda-h" className="xp-about-statement r" style={i(1)}>
            {accent(a.statement)}
          </h2>
          <p className="xp-about-body r" style={i(2)}>
            {a.body}
          </p>
          <DeskScene />
        </div>

        <dl className="xp-facts" data-reveal>
          {a.facts.map((fact, n) => (
            <div key={n} className="r" style={i(n)}>
              <dt>{fact.dt}</dt>
              <dd>{fact.dd}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
