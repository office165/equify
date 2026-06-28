/** Light-mode print lockup for PDF / Puppeteer — transparent PNG on white. */
export const EQUIFY_PDF_LOGO_SRC = '/equify_print_logo_8x.png';

/** Master viewBox width / height (438×182). */
export const EQUIFY_PDF_LOGO_ASPECT = 438 / 182;

/** Public URL — natively transparent stacked SVG wordmark (web UI only). */
export const EQUIFY_SITE_LOGO_SRC = '/equify_site_logo.svg';

/** @deprecated Use {@link EQUIFY_SITE_LOGO_SRC}. */
export const EQUIFY_STACKED_LOGO_SRC = EQUIFY_SITE_LOGO_SRC;

/** Master viewBox width / height (512×265). */
export const EQUIFY_SITE_LOGO_ASPECT = 512 / 265;

/** @deprecated Use {@link EQUIFY_SITE_LOGO_ASPECT}. */
export const EQUIFY_STACKED_LOGO_ASPECT = EQUIFY_SITE_LOGO_ASPECT;

export function equifyStackedLogoSize(heightPx: number): { width: number; height: number } {
  const height = Math.max(1, Math.round(heightPx));
  return { width: Math.round(height * EQUIFY_SITE_LOGO_ASPECT), height };
}

export function equifyPdfLogoSize(heightPt: number): { widthPt: number; heightPt: number } {
  const height = Math.max(1, Math.round(heightPt));
  return { widthPt: Math.round(height * EQUIFY_PDF_LOGO_ASPECT), heightPt: height };
}
