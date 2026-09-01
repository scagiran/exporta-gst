import html2pdf from 'html2pdf.js';

function convertOklchToRgb(
  lRaw: string,
  cRaw: string,
  hRaw: string,
  aRaw?: string
): string {
  let L = parseFloat(lRaw);
  if (lRaw.endsWith('%') || L > 1) L = L / 100;
  let C = parseFloat(cRaw);
  if (cRaw.endsWith('%')) C = parseFloat(cRaw) / 100;
  let H = parseFloat(hRaw);
  let A = 1;
  if (aRaw) {
    A = parseFloat(aRaw);
    if (aRaw.endsWith('%')) A = A / 100;
  }

  if (isNaN(L) || isNaN(C) || isNaN(H)) {
    return 'rgb(128, 128, 128)';
  }

  // OKLCH -> OKLAB
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLAB -> Linear RGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLin = -1.2684380041 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Gamma correction
  const toSrgb = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped >= 0.0031308
      ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
      : 12.92 * clamped;
  };

  const r = Math.round(toSrgb(rLin) * 255);
  const g = Math.round(toSrgb(gLin) * 255);
  const bComp = Math.round(toSrgb(bLin) * 255);

  if (A < 1) {
    return `rgba(${r}, ${g}, ${bComp}, ${A.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${bComp})`;
}

export function replaceOklchInText(text: string): string {
  if (!text || !text.includes('oklch')) return text;
  return text.replace(
    /oklch\(\s*([\d.%]+)[\s,]+([\d.%]+)[\s,]+([\d.]+)(?:deg)?(?:\s*[\/,]\s*([\d.%]+))?\s*\)/gi,
    (_, l, c, h, a) => convertOklchToRgb(l, c, h, a)
  );
}

/**
 * html2pdf builds an invisible `position:fixed; z-index:1000` overlay on
 * <body> during capture and removes it in a `.then()` once html2canvas
 * resolves. If html2canvas rejects (bad colour function, tainted canvas, …)
 * that cleanup never runs and the orphan overlay silently swallows every
 * click app-wide until a reload. Always sweep it ourselves.
 */
function removeOrphanedHtml2pdfNodes(): void {
  document
    .querySelectorAll('.html2pdf__overlay, .html2pdf__container')
    .forEach((n) => n.remove());
}

/**
 * Wait until the given document's web fonts are actually loaded and swapped in.
 *
 * The app's Google Fonts <link> uses `display=swap`, so text is first laid out
 * with a fallback face whose glyph advance widths differ from Plus Jakarta Sans.
 * If we capture/print before the real font is ready, every line is measured with
 * the wrong metrics — headers wrap where they wouldn't on screen and the extra
 * line-heights push the document onto a second page. `fonts.ready` resolves once
 * all pending font loads for that document settle; the timeout is a safety net
 * so a stalled font never blocks the export forever.
 */
async function waitForFonts(doc: Document, timeoutMs = 3000): Promise<void> {
  const fontSet: FontFaceSet | undefined = doc.fonts;
  if (!fontSet) return;
  try {
    await Promise.race([
      fontSet.ready,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    /* fonts.ready rejects only on a font error — capture with what we have */
  }
}

export async function downloadPdfFromElement(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const options = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: cleanFilename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      // useCORS + allowTaint:false keeps the canvas clean so the final
      // toDataURL() can't throw a SecurityError on the Supabase / Unsplash
      // images. Every remote <img> in DocumentRenderer sets
      // crossOrigin="anonymous" and those hosts send ACAO:*.
      useCORS: true,
      allowTaint: false,
      logging: false,
      letterRendering: true,
      // html2canvas defaults scrollX/scrollY to window.pageXOffset/pageYOffset
      // and offsets the capture by them. html2pdf renders its own clone in an
      // offscreen container pinned to top:0/left:0, so any page scroll behind
      // the modal made the capture grab document (0,0) — the navbar/sidebar —
      // instead of the document. Force the offset to zero.
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        // Drop on-screen-only aids (product image gallery) from the capture.
        clonedDoc.querySelectorAll('.doc-capture-hide').forEach((el) => el.remove());

        // Clean up any oklch color references in style tags
        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((s) => {
          if (s.textContent && s.textContent.includes('oklch')) {
            s.textContent = replaceOklchInText(s.textContent);
          }
        });

        // Clean up any oklch in inline styles
        const inlineElements = clonedDoc.querySelectorAll('[style*="oklch"]');
        inlineElements.forEach((el) => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr) {
            el.setAttribute('style', replaceOklchInText(styleAttr));
          }
        });
      },
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const,
    },
    // avoid-all: never split an element across a page boundary. These are
    // single-page business documents by design. A4 minus the 10mm margin
    // above gives an inner height of 277mm ≈ 1046px CSS at 96dpi; the
    // DocumentRenderer roots are min-h-[1000px], so with the real font
    // loaded the whole document sits inside one page with ~46px of
    // headroom — no forced scale-down needed.
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    // Measure with the real font, not the swap fallback (see waitForFonts).
    await waitForFonts(document);
    await html2pdf().set(options).from(element).save();
  } catch (err) {
    console.error('[ExPorta] PDF oluşturulamadı:', err);
    throw err;
  } finally {
    removeOrphanedHtml2pdfNodes();
  }
}

/**
 * Opens a print-only window containing just `element`.
 *
 * Two things the old version got wrong:
 *  - It copied `<link rel="stylesheet">` tags verbatim. Their `href` is a
 *    root-relative path ("/assets/index-*.css") which, written into an
 *    about:blank document, resolves against about:blank and never loads —
 *    so the printout was an unstyled dump. Hrefs are now absolutised.
 *  - `<style>` blocks still contained `oklch()` colours, which some print
 *    engines drop. They are run through the same cleanup as the PDF path.
 *  - It printed on the popup's `load` event, which fires when the copied
 *    stylesheet <link>s are *fetched* — not when the @font-face files they
 *    reference have downloaded and swapped in. Printing then measured text
 *    with the fallback font: headers wrapped and the document spilled onto a
 *    second page. Now it waits for the popup document's `fonts.ready`.
 * Returns false when the popup was blocked so the caller can tell the user.
 */
export function printElement(element: HTMLElement): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  // Clone so we can drop on-screen-only aids (the product image gallery)
  // without touching the live preview — mirrors the PDF path's onclone strip.
  const captureRoot = element.cloneNode(true) as HTMLElement;
  captureRoot
    .querySelectorAll('.doc-capture-hide')
    .forEach((el) => el.remove());

  const head = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((node) => {
      if (node.tagName === 'LINK') {
        // Resolve relative href against the real origin.
        const abs = (node as HTMLLinkElement).href;
        return `<link rel="stylesheet" href="${abs}">`;
      }
      const css = node.textContent || '';
      return `<style>${css.includes('oklch') ? replaceOklchInText(css) : css}</style>`;
    })
    .join('\n');

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Yazdır — ExPorta Belge</title>
    ${head}
    <style>
      html, body {
        background: #fff !important;
        margin: 0;
        /* No body padding: @page margin below is the only page inset. Body
           padding here would stack on top of it, shrinking the printable
           area ~40px and pushing the document (min-h 1000px) onto a 2nd
           page. Keep this consistent with the PDF path, whose 10mm
           html2pdf margin is likewise the sole inset. */
        padding: 0;
        /* Ensure the popup actually requests the same web fonts, so
           fonts.ready has something to wait for and print metrics match
           the on-screen preview. */
        font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
      }
      /* A4 minus 10mm all round ≈ 1047px usable at 96dpi — the document
         root's min-height is 1000px, leaving ~47px of headroom. */
      @page { size: A4; margin: 10mm; }
    </style>
  </head>
  <body>${captureRoot.outerHTML}</body>
</html>`);
  printWindow.document.close();

  const trigger = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Print only after the popup's own web fonts have loaded and swapped in.
  // The `load` event alone fires when the <link> stylesheets are fetched, not
  // when their @font-face files are ready — printing then would use fallback
  // metrics and re-introduce the wrapping / 2-page overflow.
  const afterFontsReady = () => {
    const winFonts: FontFaceSet | undefined = printWindow.document.fonts;
    if (winFonts) {
      Promise.race([
        winFonts.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]).then(trigger, trigger);
    } else {
      setTimeout(trigger, 400);
    }
  };

  if (printWindow.document.readyState === 'complete') {
    afterFontsReady();
  } else {
    printWindow.addEventListener('load', afterFontsReady);
  }

  return true;
}
