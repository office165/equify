/** Locked column geometry for Equify PDF report tables (TH/TD sync). */

export function reportColgroup(widthsPct: number[]): string {
  const cols = widthsPct
    .map((w) => `<col style="width:${w.toFixed(4)}%" />`)
    .join('');
  return `<colgroup>${cols}</colgroup>`;
}

/** Label column + N equal numeric columns summing to 100%. */
export function labelPlusEqualCols(labelPct: number, numericCols: number): number[] {
  if (numericCols <= 0) return [100];
  const rest = 100 - labelPct;
  const each = rest / numericCols;
  return [labelPct, ...Array.from({ length: numericCols }, () => each)];
}

export const BLEND_TABLE_WIDTHS = [38, 22, 18, 22] as const;
export const WACC_TABLE_WIDTHS = [62, 38] as const;
export const MULTIPLES_TABLE_WIDTHS = [24, 16, 16, 44] as const;
export const SCENARIO_TABLE_WIDTHS = [16, 14, 14, 12, 12, 16, 16] as const;
export const QUALITY_FACTOR_WIDTHS = [44, 36, 20] as const;

export function trajectoryTableWidths(yearCount: number): number[] {
  return labelPlusEqualCols(18, yearCount);
}

export function dcfHorizonTableWidths(yearCount: number): number[] {
  return labelPlusEqualCols(20, yearCount + 1);
}

export function sensitivityMatrixWidths(waccColCount: number): number[] {
  return labelPlusEqualCols(16, waccColCount);
}

export function ebitdaSensitivityWidths(multColCount: number): number[] {
  return labelPlusEqualCols(18, multColCount);
}

export function compsTableWidths(): number[] {
  return [6, 22, 10, 12, 12, 12, 10, 16];
}

export function emptyCells(count: number, className = 'n'): string {
  return Array.from({ length: count }, () => `<td class="${className}"></td>`).join('');
}
