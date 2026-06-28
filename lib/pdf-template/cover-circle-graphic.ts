import { buildEquifyCoverRingsSvg } from './equify-pdf-charts';

/** Scale bullseye typography for large equity values (NIS). */
export function coverValSizeClass(equityNis: number): string {
  const m = Math.abs(equityNis) / 1_000_000;
  if (m >= 100) return 'cover-val--xl';
  if (m >= 10) return 'cover-val--lg';
  return '';
}

/**
 * Circular ring graphic with valuation HTML absolutely centered in the safe inner zone.
 * Company metadata must sit outside this stage (see cover-header in equify-pdf-pages).
 */
export function buildCoverCircleStageHtml(equityValHtml: string, equityNis: number): string {
  const sizeClass = coverValSizeClass(equityNis);
  return `<div class="cover-circle-stage">
    <div class="cover-rings-layer" aria-hidden="true">${buildEquifyCoverRingsSvg()}</div>
    <div class="cover-bullseye${sizeClass ? ` ${sizeClass}` : ''}">
      <div class="cover-bullseye-inner">${equityValHtml}</div>
    </div>
  </div>`;
}
