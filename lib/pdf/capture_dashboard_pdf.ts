/**
 * High-fidelity UI-to-PDF — html2pdf (pagebreak-aware) with html2canvas fallback.
 * Client-only: dynamic imports avoid SSR bundle issues.
 */

import {
  adjustSliceHeightForBlocks,
  collectPdfBlockRects,
  PDF_BLOCK_CONTAIN_CSS,
  PDF_HTML2PDF_PAGEBREAK,
} from './pdf_pagebreak';
import {
  PDF_CAPTURE_MARGIN_MM,
  PDF_FOOTER_BAND_HEIGHT_MM,
  PDF_LEGAL_DISCLAIMER_COMPACT,
  VALUATION_REPORT_FILENAME,
} from './theme';
import { blobToPdfBase64 } from './pdf_base64';

const BRAND_BG = '#080B11';
const IMAGE_SETTLE_MS = 500;

export interface CapturePdfOptions {
  filename?: string;
  /** Device pixel ratio multiplier (default 2). */
  scale?: number;
  /** When true, return base64 only — caller triggers download after relay completes. */
  deferBrowserDownload?: boolean;
}

export interface CapturePdfResult {
  filename: string;
  pdfBase64: string;
}

function injectPrintColorStyles(doc: Document): void {
  const style = doc.createElement('style');
  style.textContent = `
    ${PDF_BLOCK_CONTAIN_CSS}
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-root-container,
    #valubot-report-capture {
      background: ${BRAND_BG} !important;
      overflow: visible !important;
      height: auto !important;
      min-height: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: right !important;
      unicode-bidi: embed !important;
    }
    .pdf-root-container *,
    #valubot-report-capture * {
      max-width: 100%;
      box-sizing: border-box;
    }
    .pdf-card-contain,
    .vb-bento-card,
    .chart-wrapper-block,
    .chart-block-wrapper,
    .bento-grid-item {
      width: 100% !important;
      max-width: 100% !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      box-shadow: none !important;
      overflow: visible !important;
    }
    .overflow-hidden,
    .overflow-x-hidden,
    .overflow-y-hidden,
    .overflow-y-auto {
      overflow: visible !important;
    }
    .h-screen, .min-h-screen, .h-80, .h-96 {
      height: auto !important;
      min-height: 0 !important;
    }
    .chart-wrapper-block,
    .chart-block-wrapper {
      max-height: 250px !important;
      height: auto !important;
    }
    .chart-wrapper-block canvas,
    .chart-wrapper-block svg,
    .chart-wrapper-block .recharts-wrapper,
    .chart-wrapper-block .recharts-surface,
    .chart-block-wrapper canvas,
    .chart-block-wrapper svg,
    .chart-block-wrapper .recharts-wrapper,
    .chart-block-wrapper .recharts-surface {
      max-height: 250px !important;
      width: 100% !important;
      height: auto !important;
    }
    .pdf-diagnostics-grid,
    .pdf-scenario-grid {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      gap: 0.75rem !important;
    }
    .pdf-diagnostics-grid > *,
    .pdf-scenario-grid > * {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
    }
    table {
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
    }
    thead {
      display: table-header-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    canvas, svg {
      max-width: 100% !important;
      height: auto !important;
    }
    .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl, .max-w-3xl, .max-w-2xl, .max-w-xl {
      max-width: 100% !important;
      width: 100% !important;
      padding-inline: 0 !important;
    }
    [data-pdf-exclude] {
      display: none !important;
    }
    .valubot-pdf-legal-stamp {
      color: #94a3b8 !important;
    }
    .valubot-pdf-capturing *,
    .valubot-pdf-capturing *::before,
    .valubot-pdf-capturing *::after {
      animation: none !important;
      transition: none !important;
    }
    html, body {
      overflow: visible !important;
      height: auto !important;
    }
  `;
  doc.head.appendChild(style);
}

function absolutizeImageSources(doc: Document, origin: string): void {
  doc.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement;
    const src = img.getAttribute('src');
    if (src?.startsWith('/')) {
      img.src = `${origin}${src}`;
    }
    img.crossOrigin = 'anonymous';
    img.loading = 'eager';
    img.decoding = 'sync';
  });
}

async function preloadImages(root: HTMLElement): Promise<void> {
  const sources = new Set<string>();

  root.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement;
    if (img.src) {
      sources.add(img.src);
    }
    const src = img.getAttribute('src');
    if (src?.startsWith('/')) {
      sources.add(`${window.location.origin}${src}`);
    }
  });

  await Promise.all(
    [...sources].map(
      (src) =>
        new Promise<void>((resolve) => {
          const probe = new Image();
          probe.crossOrigin = 'anonymous';
          probe.onload = () => resolve();
          probe.onerror = () => resolve();
          probe.src = src;
        }),
    ),
  );
}

async function waitForDomImages(root: HTMLElement): Promise<void> {
  const images = [...root.querySelectorAll('img')];
  await Promise.all(
    images.map(
      (node) =>
        new Promise<void>((resolve) => {
          const img = node as HTMLImageElement;
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );
}

function buildHtml2CanvasCloneHandler(origin: string) {
  return (doc: Document) => {
    injectPrintColorStyles(doc);
    absolutizeImageSources(doc, origin);
    doc.querySelectorAll('[data-pdf-exclude]').forEach((node) => {
      (node as HTMLElement).style.display = 'none';
    });
    const root = doc.getElementById('valubot-report-capture');
    if (root) {
      root.style.background = BRAND_BG;
    }
  };
}

async function captureWithHtml2Pdf(
  element: HTMLElement,
  options: CapturePdfOptions,
  scale: number,
  origin: string,
): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default;
  const margin = PDF_CAPTURE_MARGIN_MM;
  const footerBand = PDF_FOOTER_BAND_HEIGHT_MM;

  const html2pdfOptions = {
    margin: [margin, margin, margin + footerBand, margin] as [
      number,
      number,
      number,
      number,
    ],
    filename: options.filename ?? VALUATION_REPORT_FILENAME,
    image: { type: 'jpeg' as const, quality: 0.92 },
    html2canvas: {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: BRAND_BG,
      logging: false,
      windowWidth: 794,
      scrollX: 0,
      scrollY: -window.scrollY,
      imageTimeout: 15000,
      onclone: buildHtml2CanvasCloneHandler(origin),
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'] as const,
      before: PDF_HTML2PDF_PAGEBREAK.before,
      after: PDF_HTML2PDF_PAGEBREAK.after,
      avoid: PDF_HTML2PDF_PAGEBREAK.avoid,
    },
  };

  const worker = html2pdf().set(html2pdfOptions);

  return (await worker.from(element).outputPdf('blob')) as Blob;
}

async function captureFooterStrip(
  html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>,
  widthPx: number,
): Promise<HTMLCanvasElement | null> {
  const footer = document.createElement('div');
  footer.setAttribute('aria-hidden', 'true');
  footer.style.cssText = [
    `width:${widthPx}px`,
    `background:${BRAND_BG}`,
    'color:#94a3b8',
    'font-size:9px',
    'line-height:1.45',
    'padding:10px 12px',
    'direction:rtl',
    'text-align:right',
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif',
    'box-sizing:border-box',
  ].join(';');
  footer.textContent = PDF_LEGAL_DISCLAIMER_COMPACT;
  footer.style.position = 'fixed';
  footer.style.left = '-10000px';
  footer.style.top = '0';
  document.body.appendChild(footer);

  try {
    return await html2canvas(footer, {
      scale: 2,
      backgroundColor: BRAND_BG,
      logging: false,
      width: widthPx,
    });
  } catch {
    return null;
  } finally {
    document.body.removeChild(footer);
  }
}

async function captureWithCanvasSlice(
  element: HTMLElement,
  options: CapturePdfOptions,
  scale: number,
  origin: string,
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: BRAND_BG,
    logging: false,
    windowWidth: 794,
    scrollX: 0,
    scrollY: -window.scrollY,
    imageTimeout: 15000,
    onclone: buildHtml2CanvasCloneHandler(origin),
  });

  const blockRects = collectPdfBlockRects(element, scale);
  const footerCanvas = await captureFooterStrip(html2canvas, canvas.width);

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = PDF_CAPTURE_MARGIN_MM;
  const footerBandMm = PDF_FOOTER_BAND_HEIGHT_MM;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2 - footerBandMm;
  const imgHeightMm = (canvas.height * printableWidth) / canvas.width;
  const idealSliceHeightPx = (printableHeight / imgHeightMm) * canvas.height;

  const pageCanvas = document.createElement('canvas');
  const pageCtx = pageCanvas.getContext('2d');
  if (!pageCtx) {
    throw new Error('Canvas 2D context unavailable');
  }

  let srcY = 0;
  let pageIndex = 0;

  while (srcY < canvas.height) {
    const sliceH = adjustSliceHeightForBlocks(
      srcY,
      idealSliceHeightPx,
      canvas.height,
      blockRects,
    );
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    pageCtx.fillStyle = BRAND_BG;
    pageCtx.fillRect(0, 0, pageCanvas.width, sliceH);
    pageCtx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      sliceH,
      0,
      0,
      canvas.width,
      sliceH,
    );

    const sliceData = pageCanvas.toDataURL('image/png');
    const sliceImgHeightMm = (sliceH * printableWidth) / canvas.width;

    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(sliceData, 'PNG', margin, margin, printableWidth, sliceImgHeightMm);

    if (footerCanvas) {
      const footerImgHeightMm = (footerCanvas.height * printableWidth) / footerCanvas.width;
      const footerY = pageHeight - margin - footerImgHeightMm;
      pdf.addImage(
        footerCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        footerY,
        printableWidth,
        Math.min(footerImgHeightMm, footerBandMm),
      );
    }

    srcY += sliceH;
    pageIndex += 1;
  }

  return pdf.output('blob') as Blob;
}

/**
 * Capture a DOM subtree and save as a multi-page A4 PDF.
 * Preserves Tailwind styles, RTL text, chart SVGs, brand backgrounds, and logos.
 */
export async function captureElementToPdf(
  element: HTMLElement,
  options: CapturePdfOptions = {},
): Promise<CapturePdfResult> {
  if (typeof window === 'undefined') {
    throw new Error('captureElementToPdf must run in the browser');
  }

  const filename = options.filename ?? VALUATION_REPORT_FILENAME;
  const scale = options.scale ?? 2;
  const origin = window.location.origin;

  element.classList.add('valubot-pdf-capturing', 'pdf-root-container');
  const previousWidth = element.style.width;
  const previousMaxWidth = element.style.maxWidth;
  const previousBoxSizing = element.style.boxSizing;
  element.style.width = '100%';
  element.style.maxWidth = '100%';
  element.style.boxSizing = 'border-box';

  try {
    await preloadImages(element);
    await waitForDomImages(element);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise((r) => setTimeout(r, IMAGE_SETTLE_MS));
    await document.fonts.ready;

    let pdfBlob: Blob;
    try {
      pdfBlob = await captureWithHtml2Pdf(element, options, scale, origin);
    } catch (html2pdfError) {
      console.warn('[PDF] html2pdf capture failed — falling back to block-aware slice', html2pdfError);
      pdfBlob = await captureWithCanvasSlice(element, options, scale, origin);
    }

    const pdfBase64 = await blobToPdfBase64(pdfBlob);
    if (!options.deferBrowserDownload) {
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }
    return { filename, pdfBase64 };
  } finally {
    element.classList.remove('valubot-pdf-capturing', 'pdf-root-container');
    element.style.width = previousWidth;
    element.style.maxWidth = previousMaxWidth;
    element.style.boxSizing = previousBoxSizing;
  }
}
