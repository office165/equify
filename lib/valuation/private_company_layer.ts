/**
 * Methodology 2, private company layer (round 3, part A). Off unless METHOD_V2=on.
 *
 * Every value carries its source, the date of the source and whether it was verified in round 3.
 * Network used for verification: pages.stern.nyu.edu (Damodaran), kroll.com and bvresources.com
 * only. Kroll's size premia sit behind the Cost of Capital Navigator subscription, and the
 * BVResources free downloads refused automated access (HTTP 403), so neither could be verified.
 *
 *   1. Marketability discount on the DCF leg (verified range). The DCF is discounted at rates built
 *      from public company data (Damodaran Global betas, ERP, CRP), so it gives a marketable value.
 *      The same factor the multiples get (0.8, up to 0.9 for a mature company by size) makes it a
 *      private company value.
 *   2. Size premium (NOT VERIFIED as a function of size). The only verified numbers are the
 *      bottom size decile premium in Damodaran's ERP paper and his later update. No verified source
 *      in the allowed network gives the premium as a continuous function of company size (decile
 *      breakpoints, or Kroll's regression on sales), so the section stops here: methodology 2 keeps
 *      the existing size overlay (alpha of scale_modifier_pipeline) and the sourced point value is
 *      available for analysis only (component sizePremiumDecile, not part of V2_ALL).
 */

export interface PrivateLayerSource {
  title: string;
  author: string;
  url: string;
  /** Date of the document (as printed, or the last data year when the document is undated). */
  date: string;
  /** Page of the PDF (1 based) where the number is printed. */
  page?: number;
  verified: boolean;
  note?: string;
}

export const PRIVATE_LAYER_SOURCES = {
  liquidityPaper: {
    title: 'Marketability and Value: Measuring the Illiquidity Discount',
    author: 'Aswath Damodaran, Stern School of Business',
    url: 'https://pages.stern.nyu.edu/~adamodar/pdfiles/papers/liquidity.pdf',
    date: '2005-07',
    verified: true,
  },
  erpPaper2008: {
    title: 'Equity Risk Premiums (ERP): Determinants, Estimation and Implications',
    author: 'Aswath Damodaran',
    url: 'https://pages.stern.nyu.edu/~adamodar/pdfiles/papers/ERPfull.pdf',
    date: '2008-09',
    page: 32,
    verified: true,
    note: 'Table 7, excess returns by market value class, US stocks 1927 to 2007 (Fama/French data).',
  },
  pvtCoSlides: {
    title: 'Private Company Valuations (slides)',
    author: 'Aswath Damodaran',
    url: 'https://pages.stern.nyu.edu/~adamodar/pdfiles/country/PvtCoValuations.pdf',
    date: 'data to 2022',
    page: 8,
    verified: true,
    note: 'Small firm premium 1927 to 2022; page 13: the small cap premium has not existed since 1981.',
  },
  krollNavigator: {
    title: 'Kroll Cost of Capital Navigator, CRSP Deciles Size Study',
    author: 'Kroll',
    url: 'https://www.kroll.com/en/tools-and-platforms/cost-of-capital/frequently-asked-questions',
    date: 'n/a',
    verified: false,
    note: 'Size premia by decile are sold by subscription (U.S. Cost of Capital Module). Not verified.',
  },
  bvrSizeArticles: {
    title: 'BVResources free downloads on size premia (decile 10)',
    author: 'Business Valuation Resources',
    url: 'https://www.bvresources.com/docs/default-source/free-downloads/bvu-new-study-challenges-decile-10.pdf',
    date: 'n/a',
    verified: false,
    note: 'HTTP 403 to automated access in round 3. Not verified.',
  },
} satisfies Record<string, PrivateLayerSource>;

// ---------------------------------------------------------------------------------------------
// 1. Marketability discount (DLOM) evidence, as reported in Damodaran (2005). Verified.
// ---------------------------------------------------------------------------------------------

export interface DlomEvidence {
  study: string;
  period: string;
  /** Discount (decimal), or [low, high]. */
  discount: number | [number, number];
  kind: 'restricted-stock' | 'private-placement' | 'pre-ipo' | 'private-acquisitions';
  page: number;
}

/** liquidity.pdf, pages 28 to 30 and 52 (PDF page numbers). */
export const DLOM_EVIDENCE: DlomEvidence[] = [
  { study: 'Maher (1976)', period: '1969-1973', discount: 0.3543, kind: 'restricted-stock', page: 28 },
  { study: 'Silber (1991), median', period: '1981-1988', discount: 0.3375, kind: 'restricted-stock', page: 28 },
  { study: 'Johnson (1999)', period: 'n/a', discount: 0.2, kind: 'restricted-stock', page: 28 },
  { study: 'Bajaj, Dennis, Ferris and Sarin (2001), attributed to marketability', period: '1990-1997', discount: 0.0723, kind: 'private-placement', page: 29 },
  { study: 'Emory (1996), five months before the IPO', period: 'n/a', discount: 0.45, kind: 'pre-ipo', page: 30 },
  { study: 'Willamette Associates, three years before the IPO', period: 'n/a', discount: [0.32, 0.75], kind: 'pre-ipo', page: 30 },
  { study: 'Koeplin, Sarin and Shapiro (2000), private vs public acquisition multiples', period: '1984-1998', discount: [0.2, 0.3], kind: 'private-acquisitions', page: 52 },
];

/**
 * The range methodology 2 uses (and the multiples already use): a discount of 20% (factor 0.8),
 * down to 10% (factor 0.9) for a mature company by size. It sits inside the restricted stock and
 * private acquisition evidence (20% to 35%, and 20% to 30% on multiples) at its low end, which
 * Damodaran supports for larger and profitable firms: Silber's regression (page 38) has the
 * discount falling with revenues and lower for firms with positive earnings, and the pre-IPO
 * numbers are biased upward by successful IPOs (page 31).
 */
export const DLOM_POLICY = {
  baseFactor: 0.8,
  maxFactor: 0.9,
  evidenceRange: [0.2, 0.35] as [number, number],
  source: PRIVATE_LAYER_SOURCES.liquidityPaper,
} as const;

/** Silber (1991) regression as printed in liquidity.pdf page 38. */
export const SILBER_REGRESSION_TEXT =
  'LN(RPRS) = 4.33 + 0.036 ln(REV) - 0.142 LN(RBRT) + 0.174 DERN + 0.332 DCUST';

// ---------------------------------------------------------------------------------------------
// 2. Size premium. Point value verified, size gradient NOT verified.
// ---------------------------------------------------------------------------------------------

/** Damodaran ERP paper (Sept 2008), Table 7: excess return by market value decile, 1927 to 2007. */
export const SIZE_DECILE_EXCESS_RETURNS_1927_2007: Array<{ decile: string; pct: number; stdErrPct: number }> = [
  { decile: 'Smallest', pct: 4.71, stdErrPct: 2.01 },
  { decile: '2', pct: 1.9, stdErrPct: 1.17 },
  { decile: '3', pct: 1.44, stdErrPct: 0.8 },
  { decile: '4', pct: 0.76, stdErrPct: 0.56 },
  { decile: '5', pct: 0.01, stdErrPct: 0.54 },
  { decile: '6', pct: -0.23, stdErrPct: 0.51 },
  { decile: '7', pct: -0.6, stdErrPct: 0.55 },
  { decile: '8', pct: -1.69, stdErrPct: 0.83 },
  { decile: '9', pct: -2.25, stdErrPct: 1.05 },
  { decile: 'Largest', pct: -4.05, stdErrPct: 1.6 },
];

/** Damodaran, Private Company Valuations slides (data to 2022), page 8. */
export const SIZE_PREMIUM_UPDATE_1927_2022 = {
  fullPeriodPct: 3.31,
  since1981Pct: -0.56,
  source: PRIVATE_LAYER_SOURCES.pvtCoSlides,
} as const;

export const SIZE_PREMIUM_STATUS = {
  /** Bottom decile premium (pp): verified point value, Damodaran Table 7. */
  smallestDecilePp: 4.71,
  smallestDecileStdErrPp: 2.01,
  pointVerified: true,
  /** Premium as a continuous function of revenue or value: no verified source. */
  gradientVerified: false,
  note:
    'Size premium as a continuous function of size: not verified (Kroll by subscription, BVResources refused, Damodaran gives deciles without breakpoints). Methodology 2 keeps the existing size overlay.',
} as const;

/**
 * Analysis only (component sizePremiumDecile): the verified bottom decile premium, flat. Every
 * Equify company is far below the bottom decile breakpoint of US listed stocks, but the breakpoint
 * itself is not verified, so the value is not used in methodology 2.
 */
export function sizePremiumDecilePp(): number {
  return SIZE_PREMIUM_STATUS.smallestDecilePp;
}

// ---------------------------------------------------------------------------------------------
// Report lines (methodology 2, page 4). One line each.
// ---------------------------------------------------------------------------------------------

/**
 * Page 4, methodology 2: short lines for the 64mm column under the WACC chart (one line each,
 * checked by the layout test): the DCF discount with its source, the reason, the size premium.
 */
export function dcfMarketabilityLinesHe(factor: number): string[] {
  const pct = Math.round((1 - factor) * 100);
  return [
    `הנחת סחירות על ה DCF: ${pct}% (Damodaran, 2005).`,
    'ה DCF מהוון בשיעורי חברות ציבוריות, ולכן ערכו סחיר.',
  ];
}

export function sizePremiumLineHe(pp: number, basis: 'overlay' | 'damodaran-decile' = 'overlay'): string {
  return basis === 'damodaran-decile'
    ? `פרמיית גודל: ${pp.toFixed(1)} נק' (Damodaran, ERP 2008).`
    : `פרמיית גודל: ${pp.toFixed(1)} נק'. מקור לפי גודל לא אומת.`;
}
