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
      useCORS: true,
      allowTaint: true,
      logging: false,
      letterRendering: true,
      onclone: (clonedDoc: Document) => {
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
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    await html2pdf().set(options).from(element).save();
  } catch (err) {
    console.error('PDF export failed, triggering window.print fallback', err);
    window.print();
  }
}

export function printElement(element: HTMLElement): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((s) => s.outerHTML)
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Yazdır - Exporta Document</title>
        ${styles}
        <style>
          body { background: white !important; margin: 0; padding: 20px; }
          @page { size: A4; margin: 10mm; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 400);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
