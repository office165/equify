/**
 * Integrated Equify mark — blocky geometric E with diagonal arrow (navy → mint).
 * viewBox 0 0 48 48.
 */

export const EQUIFY_MARK_VIEWBOX = '0 0 48 48';

/** Vertical stem */
export const EQUIFY_STEM_PATH = 'M4 6h7v36H4z';

/** Bottom bar — notch where arrow passes */
export const EQUIFY_BAR_BOTTOM_PATH = 'M11 31h7.5l3-2.8 3 2.8H30v6H11z';

/** Middle bar */
export const EQUIFY_BAR_MIDDLE_PATH = 'M11 20h5l2.6-2.4L21.2 20H27v5H11z';

/** Top bar */
export const EQUIFY_BAR_TOP_PATH = 'M11 9h4l2-1.8L19 9H24v5H11z';

/** Diagonal white slice — separates arrow base from E (fill = page/bg color) */
export const EQUIFY_SLICE_PATH = 'M9.5 8.5 13.5 4.5 16.5 7.5 12.5 11.5z';

/** Arrow shaft + head — exits upper-right */
export const EQUIFY_ARROW_PATH =
  'M12 42 15 42 37.5 11 41.5 7 46 11 42 15 19.5 38.5z';

export const EQUIFY_ARROW_GRADIENT = {
  x1: 14,
  y1: 42,
  x2: 42,
  y2: 8,
  endColor: '#34D399',
} as const;

/** Lockup geometry — icon scale relative to wordmark cap-height */
export const EQUIFY_LOCKUP = {
  viewBox: '0 0 188 42',
  markScale: 0.46,
  markY: 4,
  wordmarkX: 34,
  wordmarkY: 28,
  wordmarkSize: 26,
  subBrandX: 120,
  subBrandY: 40,
  gap: 12,
} as const;
