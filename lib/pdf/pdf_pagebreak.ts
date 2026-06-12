/**
 * Page-break helpers for canvas PDF slicing — snap cuts to protected block edges.
 */

export interface PdfBlockRect {
  topPx: number;
  bottomPx: number;
  heightPx: number;
}

const MIN_SLICE_PX = 48;

export function collectPdfBlockRects(
  root: HTMLElement,
  canvasScale: number,
): PdfBlockRect[] {
  const rootRect = root.getBoundingClientRect();
  const maxBottom = root.scrollHeight * canvasScale;
  const blocks: PdfBlockRect[] = [];

  root.querySelectorAll('.pdf-block-contain, .pdf-card-break').forEach((node) => {
    const el = node as HTMLElement;
    if (el.closest('[data-pdf-exclude]')) return;

    const hasNestedBlock = el.querySelector(
      ':scope .pdf-block-contain, :scope .pdf-card-break',
    );
    if (hasNestedBlock) return;

    const rect = el.getBoundingClientRect();
    const topPx = Math.max(0, Math.floor((rect.top - rootRect.top) * canvasScale));
    const bottomPx = Math.min(
      maxBottom,
      Math.ceil((rect.bottom - rootRect.top) * canvasScale),
    );

    if (bottomPx - topPx > 4) {
      blocks.push({ topPx, bottomPx, heightPx: bottomPx - topPx });
    }
  });

  return blocks.sort((a, b) => a.topPx - b.topPx);
}

export function adjustSliceHeightForBlocks(
  srcY: number,
  idealSliceH: number,
  canvasHeight: number,
  blocks: PdfBlockRect[],
): number {
  let sliceH = Math.min(idealSliceH, canvasHeight - srcY);
  if (sliceH <= 0) return 0;

  let sliceEnd = srcY + sliceH;

  for (const block of blocks) {
    const splitsBlock =
      block.topPx < sliceEnd &&
      block.bottomPx > sliceEnd &&
      block.topPx >= srcY - 1;

    if (!splitsBlock) continue;

    const pushBeforeBlock = block.topPx - srcY;
    if (pushBeforeBlock >= MIN_SLICE_PX) {
      sliceH = pushBeforeBlock;
      sliceEnd = srcY + sliceH;
      break;
    }

    if (block.heightPx <= idealSliceH) {
      sliceH = Math.min(block.bottomPx - srcY, canvasHeight - srcY);
      sliceEnd = srcY + sliceH;
      break;
    }
  }

  return Math.max(MIN_SLICE_PX, Math.min(sliceH, canvasHeight - srcY));
}

/** SAFE pdf-card-break — no inline-block (preserves flex/grid). */
export const PDF_CARD_BREAK_CSS = `
  .pdf-card-break {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    -webkit-column-break-inside: avoid !important;
  }
  @media print {
    .pdf-card-break {
      display: block !important;
    }
  }
`;

export const PDF_BLOCK_CONTAIN_CSS = `
  ${PDF_CARD_BREAK_CSS}
  .pdf-block-contain {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    -webkit-column-break-inside: avoid !important;
    display: block !important;
    width: 100%;
    position: relative;
    overflow: visible;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .pdf-block-contain-spaced {
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }
  @media print {
    .pdf-block-contain {
      display: block !important;
    }
  }
  h2, h3 {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }
  thead {
    display: table-header-group !important;
  }
  .pdf-root-container,
  #valubot-report-capture {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow: visible !important;
  }
  .pdf-card-contain,
  .bento-grid-item,
  .vb-bento-card,
  .chart-wrapper-block,
  .chart-block-wrapper {
    width: 100% !important;
    max-width: 100% !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
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
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .h-screen,
  .min-h-screen,
  .h-80,
  .h-96 {
    height: auto !important;
    min-height: 0 !important;
  }
  .valubot-pdf-capturing,
  .valubot-pdf-capturing #valubot-report-capture,
  .pdf-mode,
  .pdf-mode #valubot-report-capture {
    overflow: visible !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    width: 100% !important;
    max-width: 100% !important;
    direction: rtl !important;
    text-align: right !important;
    unicode-bidi: embed !important;
  }
  .valubot-pdf-capturing table,
  .pdf-mode table {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    table-layout: fixed !important;
  }
  .valubot-pdf-capturing canvas,
  .valubot-pdf-capturing svg,
  .pdf-mode canvas,
  .pdf-mode svg {
    max-width: 100% !important;
    height: auto !important;
  }
  .valubot-pdf-capturing .max-w-7xl,
  .valubot-pdf-capturing .max-w-6xl,
  .valubot-pdf-capturing .max-w-5xl,
  .valubot-pdf-capturing .max-w-4xl,
  .valubot-pdf-capturing .max-w-3xl,
  .valubot-pdf-capturing .max-w-2xl,
  .valubot-pdf-capturing .max-w-xl,
  .pdf-mode .max-w-7xl,
  .pdf-mode .max-w-6xl,
  .pdf-mode .max-w-5xl,
  .pdf-mode .max-w-4xl,
  .pdf-mode .max-w-3xl,
  .pdf-mode .max-w-2xl,
  .pdf-mode .max-w-xl {
    max-width: 100% !important;
    width: 100% !important;
    padding-inline: 0 !important;
  }
  .valubot-pdf-capturing .overflow-hidden,
  .pdf-mode .overflow-hidden {
    overflow: visible !important;
  }
  .valubot-pdf-capturing *,
  .pdf-mode * {
    animation: none !important;
    transition: none !important;
  }
`;

export const PDF_HTML2PDF_PAGEBREAK = {
  mode: ['avoid-all', 'css', 'legacy'] as const,
  before: '.pdf-page-break-before',
  after: '.pdf-page-break-after',
  avoid: '.pdf-block-contain, .pdf-card-break',
};
