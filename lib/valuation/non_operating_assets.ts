/**
 * Non-operating assets and holdings in other companies (round 4, part B). Off unless
 * CREDIT_CHAPTER=on: the wizard only fills them when the flag is on, and without them nothing moves.
 *
 * Bridge: operating value (EV) - net debt + non-operating assets = equity to the owners.
 * Value of the holding:
 *   - an estimated value of the held company was given: value x holding share;
 *   - only pre-tax profit was given: profit x the system's industry multiple after the
 *     marketability discount (no size discount) x holding share.
 * The report marks the line as an estimate ("הערכה").
 */
export interface NonOperatingAssetsInput {
  /** Holding share in the held company, percent (0 to 100). */
  holdingPct: number;
  /** Estimated value of the whole held company (₪K). */
  estimatedValueK?: number;
  /** Pre-tax profit of the whole held company (₪K). */
  preTaxProfitK?: number;
}

export interface NonOperatingAssetsResult {
  /** Value added to the equity (₪K). */
  valueK: number;
  basis: 'value' | 'profit';
  holdingPct: number;
  /** Value of the whole held company (₪K). */
  companyValueK: number;
  /** Multiple used on the pre-tax profit (profit basis only). */
  multiple?: number;
  preTaxProfitK?: number;
  isEstimate: true;
}

export function resolveNonOperatingAssets(
  input: NonOperatingAssetsInput | undefined,
  industryMultipleAfterMarketability: number,
): NonOperatingAssetsResult | undefined {
  if (!input) return undefined;
  const pct = Math.min(100, Math.max(0, Number(input.holdingPct) || 0));
  if (pct <= 0) return undefined;
  const value = Number(input.estimatedValueK) || 0;
  const profit = Number(input.preTaxProfitK) || 0;
  if (value > 0) {
    return { valueK: (value * pct) / 100, basis: 'value', holdingPct: pct, companyValueK: value, isEstimate: true };
  }
  const mult = Number.isFinite(industryMultipleAfterMarketability) ? Math.max(0, industryMultipleAfterMarketability) : 0;
  if (profit > 0 && mult > 0) {
    const companyValueK = profit * mult;
    return {
      valueK: (companyValueK * pct) / 100,
      basis: 'profit',
      holdingPct: pct,
      companyValueK,
      multiple: mult,
      preTaxProfitK: profit,
      isEstimate: true,
    };
  }
  return undefined;
}
