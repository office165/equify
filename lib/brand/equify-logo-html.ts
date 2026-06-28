/**
 * Server-safe inline Equify logo for Puppeteer PDF HTML.
 * Uses embedded PNG only — no Tailwind classes or SVG (print-safe).
 */

import { equifyPdfLogoSize } from './brand-logo';
import { equifyPdfLogoDataUrl } from './brand-logo-data-url';

export type EquifyLogoHtmlVariant = 'light-bg' | 'dark-bg';

/** Stacked wordmark as inline `<img>` with hardcoded print dimensions (no CSS classes). */
export function equifyLogoHtml(
  _variant: EquifyLogoHtmlVariant = 'light-bg',
  opts: { heightPt?: number; showSubBrand?: boolean } = {},
): string {
  void opts.showSubBrand;
  void _variant;
  const heightPt = opts.heightPt ?? 28;
  const { widthPt, heightPt: hPt } = equifyPdfLogoSize(heightPt);
  const src = equifyPdfLogoDataUrl();
  return `<span style="display:inline-block;margin:0;padding:0;border:none;background:transparent;line-height:0;"><img src="${src}" alt="equify BY SBC" width="${widthPt}" height="${hPt}" style="display:block;width:${widthPt}pt;height:${hPt}pt;object-fit:contain;margin:0;padding:0;border:none;background:transparent;" dir="ltr" /></span>`;
}

/** @deprecated Icon-only mark — use equifyLogoHtml for PDF headers. */
export function equifyMarkHtml(
  _variant: EquifyLogoHtmlVariant = 'light-bg',
  heightPt = 28,
): string {
  return equifyLogoHtml(_variant, { heightPt });
}

export { EQUIFY_PDF_LOGO_ASPECT, EQUIFY_SITE_LOGO_ASPECT, EQUIFY_STACKED_LOGO_ASPECT } from './brand-logo';
