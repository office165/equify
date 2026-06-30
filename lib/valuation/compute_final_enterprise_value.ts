import { BACKLOG_EQUITY_UPLIFT_COEFFICIENT } from './backlog_metrics';

export interface ModelBlendContributionsK {
  dcf: number;
  ebitda: number;
  rev: number;
  backlogAdjustment: number;
}

export interface FinalEnterpriseValueResult {
  enterpriseValueK: number;
  equityK: number;
  modelBlendContributions: ModelBlendContributionsK;
  backlogEquityUpliftK: number;
  backlogEquityUpliftPct: number;
  auditTrail: {
    dcfContribution: number;
    ebitdaContribution: number;
    revContribution: number;
    baseBlend: number;
    backlogAdjustment: number;
    sumCheck: number;
  };
}

/**
 * SINGLE SOURCE OF TRUTH for enterprise value.
 * This function is the ONLY place that may produce a final EV.
 * Every report field (enterpriseValue, modelBlendContributions sum,
 * scenario EVs) must derive from THIS computation — never recompute
 * independently downstream.
 *
 * ROOT CAUSE (confirmed — stale snapshot): `enterpriseValue` was set in the
 * valuation engine AFTER backlog equity uplift (`calibratedEvK + upliftK`),
 * while `modelBlend` rows were built later in the PDF mapper from raw leg
 * EVs × blend weights only. Same logical quantity, two computation timestamps —
 * the 13% gap is exactly the missing backlog adjustment row.
 */
export function computeFinalEnterpriseValue(params: {
  dcfLegEvK: number;
  ebitdaLegEvK: number;
  revLegEvK: number;
  blendWeights: { dcf: number; ebitda: number; rev: number };
  backlogInflectionWeight: number;
  equityBeforeUpliftK: number;
  debtK: number;
}): FinalEnterpriseValueResult {
  const {
    dcfLegEvK,
    ebitdaLegEvK,
    revLegEvK,
    blendWeights,
    backlogInflectionWeight,
    equityBeforeUpliftK,
    debtK,
  } = params;

  const dcfContribution = dcfLegEvK * blendWeights.dcf;
  const ebitdaContribution = ebitdaLegEvK * blendWeights.ebitda;
  const revContribution = revLegEvK * blendWeights.rev;
  const baseBlend = dcfContribution + ebitdaContribution + revContribution;

  const w = Math.max(0, Math.min(1, backlogInflectionWeight));
  const backlogAdjustment =
    equityBeforeUpliftK > 0 && w > 0
      ? equityBeforeUpliftK * BACKLOG_EQUITY_UPLIFT_COEFFICIENT * w
      : 0;

  const enterpriseValueK = Math.round((baseBlend + backlogAdjustment) * 100) / 100;

  const modelBlendContributions: ModelBlendContributionsK = {
    dcf: Math.round(dcfContribution * 100) / 100,
    ebitda: Math.round(ebitdaContribution * 100) / 100,
    rev: Math.round(revContribution * 100) / 100,
    backlogAdjustment: Math.round(backlogAdjustment * 100) / 100,
  };

  const sumCheck = Object.values(modelBlendContributions).reduce((a, b) => a + b, 0);

  if (
    enterpriseValueK > 0 &&
    Math.abs(sumCheck - enterpriseValueK) > enterpriseValueK * 0.001
  ) {
    throw new Error(
      `[INVARIANT VIOLATION] computeFinalEnterpriseValue produced inconsistent output: ` +
        `sum=${sumCheck} vs ev=${enterpriseValueK}. This must never happen — fix the formula above.`,
    );
  }

  const equityK = Math.max(0, Math.round((enterpriseValueK - debtK) * 100) / 100);
  const backlogEquityUpliftPct = w > 0 ? BACKLOG_EQUITY_UPLIFT_COEFFICIENT * w * 100 : 0;

  return {
    enterpriseValueK,
    equityK,
    modelBlendContributions,
    backlogEquityUpliftK: modelBlendContributions.backlogAdjustment,
    backlogEquityUpliftPct,
    auditTrail: {
      dcfContribution,
      ebitdaContribution,
      revContribution,
      baseBlend,
      backlogAdjustment,
      sumCheck,
    },
  };
}

/** Sum of model blend contributions (₪K) — must equal {@link ValuationComputed.ev}. */
export function sumModelBlendContributionsK(
  contributions: ModelBlendContributionsK,
): number {
  return (
    contributions.dcf +
    contributions.ebitda +
    contributions.rev +
    contributions.backlogAdjustment
  );
}
