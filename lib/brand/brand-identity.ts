/** Canonical client-facing brand strings — single source of truth for SEO & UI. */

export const BRAND_NAME = 'equify BY SBC';
export const BRAND_NAME_SHORT = 'equify';
export const BRAND_SUB = 'BY SBC';

/** Home `/` SEO — also drives default + OG/Twitter via site-metadata. */
export const HOME_TITLE = 'equify BY SBC | שווי עסק לקראת M&A וגיוס';
export const HOME_DESCRIPTION =
  'דוח הערכת שווי לבעלי עסקים ומנהלים: DCF ומכפילי שוק מכוילים לישראל. לשימוש במשא ומתן, גיוס הון ותכנון.';

/** Aliases — keep call sites in sync with HOME_* (single source). */
export const BRAND_TITLE = HOME_TITLE;
export const BRAND_DESCRIPTION = HOME_DESCRIPTION;

export const BRAND_OG_ALT = `${BRAND_NAME}: הערכת שווי חכמה לעסקים`;

export const BRAND_HOME_ARIA = `${BRAND_NAME}, דף הבית`;

export const BRAND_LOGO_TITLE = `${BRAND_NAME}, פלטפורמת הערכות שווי`;

export { EQUIFY_SITE_LOGO_SRC, EQUIFY_STACKED_LOGO_SRC } from './brand-logo';
