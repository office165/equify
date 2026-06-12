import {
  LEGAL_DISCLAIMER_COMPACT_EN,
  LEGAL_DISCLAIMER_COMPACT_HE,
  LEGAL_DISCLAIMER_EN,
  LEGAL_DISCLAIMER_HE,
} from '../legal/disclaimer';

/** Valubot institutional PDF brand palette */
export const PDF_COLORS = {
  darkGreen: '#080B11',
  mint: '#00F5A0',
  mintSoft: '#d1fae5',
  white: '#ffffff',
  pageBg: '#f8fafc',
  slate: '#1e293b',
  slateMuted: '#64748b',
  border: '#a7f3d0',
  bear: '#94a3b8',
  base: '#0D111A',
  bull: '#10B981',
} as const;

export const VALUATION_REPORT_FILENAME = 'Equify_Valuation_Report.pdf';

/** DOM class for printable legal stamp inside report capture root. */
export const PDF_LEGAL_STAMP_CLASS = 'valubot-pdf-legal-stamp';

/** Hardcoded legal copy for every PDF page footer band (Hebrew primary in print). */
export const PDF_LEGAL_DISCLAIMER_FULL_HE = LEGAL_DISCLAIMER_HE;
export const PDF_LEGAL_DISCLAIMER_FULL_EN = LEGAL_DISCLAIMER_EN;
export const PDF_LEGAL_DISCLAIMER_COMPACT = LEGAL_DISCLAIMER_COMPACT_HE;
export const PDF_LEGAL_DISCLAIMER_COMPACT_EN = LEGAL_DISCLAIMER_COMPACT_EN;
/** @deprecated Use `PDF_LEGAL_DISCLAIMER_FULL_HE` */
export const PDF_LEGAL_DISCLAIMER_FULL = LEGAL_DISCLAIMER_HE;

export const PDF_FOOTER_BAND_HEIGHT_MM = 14;

/** A4 printable area margins (mm) for client canvas / html2pdf capture. */
export const PDF_CAPTURE_MARGIN_MM = 5;

/** html2pdf pagebreak modes — honor `.pdf-block-contain` break-inside rules. */
export const PDF_PAGE_BREAK_MODES = ['avoid-all', 'css', 'legacy'] as const;
