/**
 * Server-safe inline Equify logo for Puppeteer PDF HTML (light-bg default).
 */

import {
  EQUIFY_ARROW_GRADIENT,
  EQUIFY_ARROW_PATH,
  EQUIFY_BAR_BOTTOM_PATH,
  EQUIFY_BAR_MIDDLE_PATH,
  EQUIFY_BAR_TOP_PATH,
  EQUIFY_LOCKUP,
  EQUIFY_MARK_VIEWBOX,
  EQUIFY_SLICE_PATH,
  EQUIFY_STEM_PATH,
} from '../../components/brand/equify-mark-paths';

export type EquifyLogoHtmlVariant = 'light-bg' | 'dark-bg';

function colors(variant: EquifyLogoHtmlVariant) {
  if (variant === 'dark-bg') {
    return { ink: '#FFFFFF', sub: 'rgba(255,255,255,0.5)', slice: '#0A0F0D' };
  }
  return { ink: '#0D1B2A', sub: 'rgba(13,27,42,0.55)', slice: '#FFFFFF' };
}

function arrowGradientDef(gradId: string, ink: string): string {
  const g = EQUIFY_ARROW_GRADIENT;
  return `<linearGradient id="${gradId}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${ink}"/><stop offset="100%" stop-color="${g.endColor}"/></linearGradient>`;
}

function markPaths(ink: string, slice: string, gradId: string): string {
  return `<path d="${EQUIFY_STEM_PATH}" fill="${ink}"/>
  <path d="${EQUIFY_BAR_BOTTOM_PATH}" fill="${ink}"/>
  <path d="${EQUIFY_BAR_MIDDLE_PATH}" fill="${ink}"/>
  <path d="${EQUIFY_BAR_TOP_PATH}" fill="${ink}"/>
  <path d="${EQUIFY_ARROW_PATH}" fill="url(#${gradId})"/>
  <path d="${EQUIFY_SLICE_PATH}" fill="${slice}"/>`;
}

function markSvg(ink: string, slice: string, gradId: string, w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EQUIFY_MARK_VIEWBOX}" width="${w}" height="${h}" fill="none" role="img" aria-hidden="true" style="display:block;flex-shrink:0" dir="ltr">
  <defs>${arrowGradientDef(gradId, ink)}</defs>
  ${markPaths(ink, slice, gradId)}
</svg>`;
}

/** Icon + wordmark lockup as inline HTML (no external assets). */
export function equifyLogoHtml(
  variant: EquifyLogoHtmlVariant = 'light-bg',
  opts: { heightPt?: number; showSubBrand?: boolean } = {},
): string {
  const { ink, sub, slice } = colors(variant);
  const h = opts.heightPt ?? 28;
  const gradId = `equify-mint-lockup-${variant}`;
  const L = EQUIFY_LOCKUP;

  const lockupSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${L.viewBox}" height="${h}" fill="none" role="img" aria-hidden="true" style="display:block" dir="ltr">
  <defs>${arrowGradientDef(gradId, ink)}</defs>
  <g transform="translate(0, ${L.markY}) scale(${L.markScale})">
    ${markPaths(ink, slice, gradId)}
  </g>
  <text x="${L.wordmarkX}" y="${L.wordmarkY}" fill="${ink}" font-family="Manrope,Inter,ui-sans-serif,system-ui,sans-serif" font-size="${L.wordmarkSize}" font-weight="700" letter-spacing="-0.01em">equify</text>
  ${
    opts.showSubBrand !== false
      ? `<text x="${L.subBrandX}" y="${L.subBrandY}" fill="${sub}" font-family="Manrope,Inter,ui-sans-serif,system-ui,sans-serif" font-size="9" font-weight="500" letter-spacing="0.18em" text-anchor="end">BY SBC</text>`
      : ''
  }
</svg>`;

  return lockupSvg;
}

/** Icon-only for compact PDF headers */
export function equifyMarkHtml(
  variant: EquifyLogoHtmlVariant = 'light-bg',
  heightPt = 24,
): string {
  const { ink, slice } = colors(variant);
  const gradId = `equify-mark-${variant}`;
  const w = Math.round(heightPt);
  return markSvg(ink, slice, gradId, w, heightPt);
}
