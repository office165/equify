import type {
  QualityGrade,
  ValuationComputed,
  ValuationInputs,
  ValuationScenarios,
} from '../valuation';
import {
  applySectorMarginGuardrails,
  computeDynamicMultiple,
} from './adaptive_calibration';
import { computeBlendedEbitda } from './blended_ebitda';
import { applyBacklogInflectionAccelerator } from './backlog_inflection_accelerator';
import {
  computeBacklogCoverageRatio,
  computeOrganicForwardRevenue2027K,
} from './backlog_metrics';
import { computeFinalEnterpriseValue } from './compute_final_enterprise_value';
import { computeSpecificRiskPremium } from './specific_risk_premium';
import { resolveCurrentYearEbitdaK } from './backlog_valuation';
import { capGrowthPctForMethodology } from './sector_methodology_matrix';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';
import {
  resolveScaleModifierProfile,
} from './scale_modifier_pipeline';
import { computeDcfWithGrowthDecayDetailed, buildValuationScenarios, type DcfWithGuard, type TerminalMethod } from './scenario_matrix';
import { parseCapexPct, resolveCapexIndustryKey, computeFCFF } from './capex_fcf';
import { calibrateCenterOfGravity } from './base_case_calibration';
import { createValuationStrategy } from './strategies/valuation_strategy';
import { resolveEbitdaBaseForMultipleLeg } from './cyclical_ebitda_normalization';
import { resolveActiveEffectiveMultiple } from './multiple_override';
import {
  normalizeMultipleForPrivateCompany,
  resolveDlomFactor,
  type MultipleNormalizationBreakdown,
} from './normalize_multiple';
import { sizePremiumDecilePp } from './private_company_layer';
import { computeCapmWacc } from './capm_wacc';
import {
  backlogReductionV2,
  computeWaccV2,
  exitMultipleCrossCheck,
  fadeR1Floor,
  r1FadePremiumAtZero,
  V2_THIN_MARGIN_BOUNDARY,
  redistributeZeroLegWeight,
  resolveManualReview,
  resolveMethodVersion,
  resolveV2Components,
  revenueMultipleV2,
  type MethodVersion,
  type V2Components,
  type ValuationV2Detail,
} from './method_v2';
import {
  buildProfitabilityMethodologyNoteHe,
  applyNormalizedEbitdaRegimeLabel,
  resolveProfitabilityRegime,
  type RegimeResolution,
} from './profitability_regime';
import { resolveEngineBlendWeights } from './resolve_display_weights';
import {
  buildNormalizedEbitdaNoteHe,
  resolveNormalizedEbitdaFromInputs,
  type NormalizedEbitdaResult,
} from './normalized_ebitda';
import { resolveSubSectorRevenueMultiple } from './sub_sector_default_multiple';
import type { TurnaroundDcfParams } from './scenario_matrix';
import { resolveNonOperatingAssets } from './non_operating_assets';

function qualityScoreGrade(qs: number): QualityGrade {
  if (qs >= 85) return 'A';
  if (qs >= 75) return 'A−';
  if (qs >= 65) return 'B+';
  if (qs >= 55) return 'B';
  if (qs >= 45) return 'B−';
  return 'C+';
}

/** Conservative owner-salary normalization when field omitted (₪K). */
const BASELINE_OWNER_SALARY_NORM_K = 250;

function resolveNormalizedOwnerSalaryK(raw: number | undefined): number {
  const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  return v > 0 ? v : BASELINE_OWNER_SALARY_NORM_K;
}

function resolveExplicitOwnerSalaryAddBackK(raw: number | undefined): number {
  const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  return v > 0 ? v : 0;
}

function computeQualityScore(
  inputs: Pick<
    ValuationInputs,
    'recurring' | 'topCustomer' | 'founderDep' | 'competition' | 'ip' | 'contracts' | 'growth'
  >,
): number {
  const { recurring, topCustomer, founderDep, competition, ip, contracts, growth } =
    inputs;

  const qRec = recurring * 0.28;
  const qConc = (1 - topCustomer / 100) * 22;
  const qFound = founderDep ? 0 : 14;
  const qComp = competition ? 0 : 10;
  const qIP = ip ? 12 : 0;
  const qContr = contracts ? 10 : 0;
  const qGrowth = Math.min(14, growth * 0.5);

  return Math.round(
    Math.min(100, qRec + qConc + qFound + qComp + qIP + qContr + qGrowth),
  );
}

function computeDcf(params: {
  ebitdaK: number;
  revK: number;
  capexLevelPct: number;
  dcfGrowthPct: number;
  wacc: number;
  sector?: ValuationInputs['sector'];
  subSector?: string;
  turnaround?: TurnaroundDcfParams;
  terminalGrowthRate?: number;
  terminalMethod?: TerminalMethod;
  capexGuard?: boolean;
}): DcfWithGuard {
  return computeDcfWithGrowthDecayDetailed({
    terminalMethod: params.terminalMethod,
    capexGuard: params.capexGuard,
    ebitdaK: params.ebitdaK,
    revK: params.revK,
    capexLevelPct: parseCapexPct(params.capexLevelPct),
    dcfGrowthPct: params.dcfGrowthPct,
    wacc: params.wacc,
    industry: resolveCapexIndustryKey(params.sector, params.subSector),
    turnaround: params.turnaround,
    terminalGrowthRate: params.terminalGrowthRate,
  });
}

/**
 * Core valuation engine — Adaptive calibration layer + sectorConfigs + Backlog Inflection.
 *
 * Pipeline:
 * 1. Resolve sectorConfigs profile (industry | services | saas)
 * 2. Winsorize per-year EBITDA margins (maxHistoricalMargin guardrails)
 * 3. Cap growth at sector growthCap
 * 4. Apply backlog inflection (mitigates CAPM Alpha at full backlog coverage)
 * 5. DCF on weighted EBITDA blend (2025 / 2026 / 2027F)
 * 6. Quality-score linear multiple + concentration penalty
 * 7. Scale Modifier Pipeline (lifecycle × revenue → WACC overlay, multiple dampener, blend shift)
 * 8. EV = sub-sector DCF / multiples blend (valuation weights registry)
 */
/**
 * Optional overrides for sensitivity runs (round 2, finding 6). Empty = the normal engine.
 * Used only by the report sensitivity tables; they never change a reported value.
 */
export interface EngineOverrides {
  /** Replace the CAPM WACC (%) after it is computed. */
  waccPct?: number;
  /** Terminal (Gordon) growth rate as a decimal (default 0.025). */
  terminalGrowthRate?: number;
  /** Replace the normalized effective multiple (EBITDA or revenue, per the sub-sector strategy). */
  effectiveMultiple?: number;
  /** Skip the [FCF Audit] log line. */
  silent?: boolean;
  /** Methodology version. Default: METHOD_V2 from the environment. */
  method?: MethodVersion;
  /** Analysis only (comparison report): turn on single parts of methodology 2. */
  v2Components?: Partial<V2Components>;
}

export function computeValuation(inputs: ValuationInputs, overrides: EngineOverrides = {}): ValuationComputed {
  const v2c = resolveV2Components({ method: overrides.method, components: overrides.v2Components });
  const methodVersion: MethodVersion = overrides.v2Components
    ? 'v2'
    : resolveMethodVersion(overrides.method);
  const matureRowMethod: MethodVersion = v2c.matureRow ? 'v2' : 'v1';
  const sectorConfig = resolveSectorMethodologyConfig(inputs.sector, inputs.subSector);
  const calibration = applySectorMarginGuardrails(inputs, sectorConfig);
  const calibrated = calibration.inputs;

  const {
    rev,
    margin,
    growth,
    debt,
    lifecycle,
    lifecycleAdj,
    grossDebt,
    cash,
    unleveredBeta,
    marketEvEbitda,
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
    normalizedOwnerSalary = 0,
    capexLevelPct = 0,
    ebitda2024K,
    ebitda2025K,
    ebitda2026K,
    revenue2026K,
    revenue2025K,
    revenue2024K,
    ebitda2027K,
    backlogSignedK,
    projectedEbitdaK,
  } = calibrated;

  const cappedGrowthPct = capGrowthPctForMethodology(growth, sectorConfig);
  const revK = revenue2026K ?? rev;
  const currentYearEbitdaK =
    ebitda2026K ??
    resolveCurrentYearEbitdaK({ ebitda2026K, rev: revK, margin });

  const normalizedEbitda = resolveNormalizedEbitdaFromInputs({
    ebitda2024K,
    ebitda2025K,
    ebitda2026K: currentYearEbitdaK,
    revenue2024K,
    revenue2025K,
    revenue2026K: revK,
    rev: revK,
    margin,
  });
  const regimeEbitdaK = normalizedEbitda.normalizedEbitdaK;

  const explicitOwnerSalaryAddBackK = resolveExplicitOwnerSalaryAddBackK(normalizedOwnerSalary);
  const specificRisk = computeSpecificRiskPremium({
    topCustomerPct: topCustomer,
    founderDependency: founderDep,
    ipProtection: ip,
    hasLongTermContracts: contracts,
  });

  const backlog = applyBacklogInflectionAccelerator({
    sectorConfig,
    inputs: {
      backlogSignedK,
      projectedEbitdaK,
      ebitda2027K,
      ebitda2026K: currentYearEbitdaK,
      ebitda2024K,
      ebitda2025K,
      rev,
      margin,
      revenue2026K: revK,
      revenue2024K,
      revenue2025K,
    },
    cappedGrowthPct: growth,
    historicalAvgMarginPct: calibration.historicalAvgMarginPct,
    specificRiskPremiumPp: specificRisk.totalPremiumPp,
  });

  const dcfGrowthPct = growth;
  const scaleProfile = resolveScaleModifierProfile(
    {
      lifecycle,
      lifecycleAdj,
      rev: revK,
      revenue2026K: revK,
    },
    { method: matureRowMethod },
  );
  const { weights: resolvedBlendWeights, regime: rawProfitabilityRegime } = resolveEngineBlendWeights({
    method: matureRowMethod,
    sector: inputs.sector,
    subSector: inputs.subSector,
    strategy: sectorConfig.strategy,
    revenueK: revK,
    ebitdaK: regimeEbitdaK,
    lifecycle,
    lifecycleAdj,
    revK,
  });
  const profitabilityRegime = applyNormalizedEbitdaRegimeLabel(
    rawProfitabilityRegime,
    normalizedEbitda,
  );

  const baseEbitdaForMultiple = resolveEbitdaBaseForMultipleLeg(
    calibrated,
    backlog.baseEbitdaForMultiple,
  );

  const backlogForMultipleLeg = {
    ...backlog,
    baseEbitdaForMultiple,
  };

  const ebitdaBlend = computeBlendedEbitda(
    {
      rev: revK,
      margin,
      ownerSalaryAddBackK: explicitOwnerSalaryAddBackK,
      ebitda2024K,
      ebitda2025K,
      ebitda2026K: currentYearEbitdaK,
      revenue2025K,
      revenue2026K: revK,
      projectedEbitdaK,
      ebitda2027K,
      growthPct: growth,
    },
    growth,
  );
  const ownerSalaryOmitted = explicitOwnerSalaryAddBackK === 0;
  const ebitda =
    ownerSalaryOmitted && !ebitdaBlend.hasPastActual
      ? ebitdaBlend.blended + BASELINE_OWNER_SALARY_NORM_K
      : ebitdaBlend.blended;

  // Finding 29 (methodology 2): the backlog reduction no longer offsets concentration and founder
  // dependency, and is cut when the top customer is above 50%.
  const backlogV2 =
    v2c.backlogNoOffset && backlog.waccAdjustmentPct !== 0
      ? backlogReductionV2({
          v1ReductionPp: backlog.waccAdjustmentPct,
          breakdownPp: {
            concentrationRisk: specificRisk.breakdown.concentrationRisk * 100,
            founderRisk: specificRisk.breakdown.founderRisk * 100,
            ipRisk: specificRisk.breakdown.ipRisk * 100,
            contractRisk: specificRisk.breakdown.contractRisk * 100,
          },
          topCustomerPct: topCustomer,
        })
      : undefined;
  const waccBacklogAdjustment = backlogV2 ? backlogV2.v2Pp : backlog.waccAdjustmentPct;
  const backlogAlphaReductionPp = Math.abs(waccBacklogAdjustment);
  const capm = computeCapmWacc({
    sector: inputs.sector,
    lifecycle,
    lifecycleAdj,
    unleveredBeta,
    grossDebtK: grossDebt,
    cashK: cash,
    netDebtK: debt,
    ebitdaK: ebitda,
    revenueK: revK,
    evEbitdaMultiple: marketEvEbitda,
    sectorConfig,
    backlogAlphaReductionPp,
    scalePremiumOverlayPp: scaleProfile.waccSizePremiumOverlayPp,
    specificRiskPremiumPp: specificRisk.totalPremiumPp,
    profitabilityLossPremiumPp: profitabilityRegime.waccPremium * 100,
    specificRiskBreakdownPp: {
      concentrationRisk: specificRisk.breakdown.concentrationRisk * 100,
      founderRisk: specificRisk.breakdown.founderRisk * 100,
      ipRisk: specificRisk.breakdown.ipRisk * 100,
      contractRisk: specificRisk.breakdown.contractRisk * 100,
    },
  });
  // Methodology 2 (W1): CRP, Damodaran beta and industry D/E weights. Same size, specific and
  // loss premiums as methodology 1.
  const capmV2 = v2c.w1
    ? computeWaccV2({
        sector: inputs.sector,
        subSector: inputs.subSector,
        // Round 3: the verified bottom decile premium replaces the overlay only in analysis runs
        // (sizePremiumDecile is not part of V2_ALL, its size gradient is not verified).
        alphaPp: v2c.sizePremiumDecile ? sizePremiumDecilePp() : capm.waccBreakdown.alpha,
        specificRiskPremiumPp: capm.waccBreakdown.specificRiskPremium,
        specificRiskBreakdownPp: capm.waccBreakdown.specificRiskBreakdown,
        profitabilityLossPremiumPp: capm.waccBreakdown.profitabilityLossPremium,
      })
    : undefined;
  const wacc = overrides.waccPct ?? (capmV2 ? capmV2.wacc : capm.wacc);
  const waccBreakdown = capmV2 ? capmV2.waccBreakdown : capm.waccBreakdown;

  const qsRaw = computeQualityScore({
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
    growth,
  });
  const qs = Math.min(qsRaw, profitabilityRegime.qualityScoreCap);
  const qsGrade = qualityScoreGrade(qs);
  const ownerSalaryWarnings: string[] = ownerSalaryOmitted
    ? ['[equify-calibration] שכר בעלים לא הוזן — נורמליזציה ל-₪250K (DCF בלבד, ללא השפעה על ציון איכות)']
    : [];

  const multipleResult = computeDynamicMultiple({
    config: sectorConfig,
    qualityScore: qs,
    topCustomerPct: topCustomer,
    tier1Contracts: contracts,
    backlogInflectionActive: backlog.backlogInflectionActive,
  });
  let qsAdjustedMult = multipleResult.multiple;
  if (backlog.backlogInflectionActive) {
    const smbMidMultipleCap =
      sectorConfig.minMultiple * 0.79 +
      (qs / 100) * (sectorConfig.maxMultiple - sectorConfig.minMultiple) * 0.35;
    qsAdjustedMult = Math.min(qsAdjustedMult, smbMidMultipleCap);
  }

  const multipleResolution = resolveActiveEffectiveMultiple({
    inputs: calibrated,
    sectorConfig,
  });

  const fcfIndustry = resolveCapexIndustryKey(inputs.sector, inputs.subSector);
  const normalization = normalizeMultipleForPrivateCompany({
    rawMultiple: multipleResolution.activeMultiple,
    revenueK: revK,
    industry: fcfIndustry,
    lifecycleStage: lifecycle ?? 'growth',
    isManualOverride: multipleResolution.isManual,
    continuousScale: v2c.continuousSize,
  });
  // Finding 30 (methodology 2): the multiple's concentration penalty enters the EBITDA leg (not in
  // the revenue strategy, where the effective multiple is a revenue multiple, and not on a manual
  // multiple). The quality score itself still only sets the width of the range.
  const concentrationMultipleFactor =
    v2c.concentrationMultiple &&
    !multipleResolution.isManual &&
    sectorConfig.strategy !== 'current_run_rate_revenue' &&
    multipleResult.baseMultiple > 0
      ? Math.min(1, multipleResult.multiple / multipleResult.baseMultiple)
      : 1;
  const effectiveMult = overrides.effectiveMultiple ?? normalization.adjustedMultiple * concentrationMultipleFactor;

  const automaticNormalization = normalizeMultipleForPrivateCompany({
    rawMultiple: multipleResolution.automaticMultiple,
    revenueK: revK,
    industry: fcfIndustry,
    lifecycleStage: lifecycle ?? 'growth',
    isManualOverride: false,
    continuousScale: v2c.continuousSize,
  });
  const automaticEffectiveMult = automaticNormalization.adjustedMultiple;

  const recoveryAnchorMargin =
    normalizedEbitda.isCurrentYearAnomalous &&
    normalizedEbitda.anomalyDirection === 'downside' &&
    normalizedEbitda.historicalAvgMarginPct != null
      ? (normalizedEbitda.historicalAvgMarginPct / 100) * 0.8
      : sectorConfig.maxHistoricalMargin;

  const turnaroundDcf: TurnaroundDcfParams | undefined =
    profitabilityRegime.turnaroundYears > 0 &&
    (profitabilityRegime.regime === 'loss_making' ||
      profitabilityRegime.regime === 'deep_loss')
      ? {
          currentMargin: revK > 0 ? currentYearEbitdaK / revK : 0,
          sectorNormalMargin: recoveryAnchorMargin,
          turnaroundYears: profitabilityRegime.turnaroundYears,
        }
      : undefined;

  const dcfDetailed = computeDcf({
    ebitdaK: ebitda,
    revK,
    capexLevelPct: parseCapexPct(capexLevelPct),
    dcfGrowthPct: growth,
    wacc,
    sector: inputs.sector,
    subSector: inputs.subSector,
    turnaround: turnaroundDcf,
    terminalGrowthRate: overrides.terminalGrowthRate,
    terminalMethod: v2c.t1 ? 'v2-gordon' : 'v1-capped',
    capexGuard: !v2c.noCapexGuard,
  });
  // Methodology 2, round 3: the DCF is discounted at public company rates (Damodaran betas, ERP,
  // CRP), so it is a marketable value. The multiples' marketability factor (0.8, up to 0.9 for a
  // mature company by size) makes it a private company value.
  const dcfMarketableK = dcfDetailed.evK;
  const dcfMarketabilityFactor = v2c.dcfMarketability ? resolveDlomFactor(lifecycle ?? 'growth', revK) : 1;
  const dcf = dcfMarketableK * dcfMarketabilityFactor;
  /** Terminal value share of the DCF leg (%), from the actual projection (replaces the constant 57). */
  const terminalSharePct = dcfDetailed.projection.terminalShare * 100;

  const fcffAudit = computeFCFF({
    ebitda,
    revenue: revK,
    capexPct: parseCapexPct(capexLevelPct),
    industry: fcfIndustry,
    growthRate: Math.max(0, growth) / 100,
  });

  const strategy = createValuationStrategy(sectorConfig);
  const legs = strategy.computeLegs({
    inputs: calibrated,
    config: sectorConfig,
    effectiveMult,
    ebitdaBlend,
    backlog: backlogForMultipleLeg,
    currentYearEbitdaK,
    revenueRunRateK: revK,
  });

  let ebitdaLegEvK = legs.ebtMult;
  let revLegEvK = legs.revMult;
  let revMultiplier = legs.revMultiplier;

  if (resolvedBlendWeights.ebitda <= 0 || baseEbitdaForMultiple <= 0) {
    ebitdaLegEvK = 0;
  }

  // R1 with the gradual floor (round 3): R1 option B applies and the floor fades (finding 26).
  const r1FadeActive = v2c.r1 && v2c.r1GradualFloor && sectorConfig.strategy !== 'current_run_rate_revenue';
  // Methodology 2 (finding 22): the weight of a zero EBITDA leg moves to the other legs.
  const blendWeights = v2c.zeroLeg
    ? redistributeZeroLegWeight(resolvedBlendWeights, ebitdaLegEvK > 0 ? baseEbitdaForMultiple : 0, revK, {
        toRevenueLegFirst: r1FadeActive,
      })
    : resolvedBlendWeights;

  let revenueMultipleDetail: ValuationV2Detail['revenueMultiple'];
  let r1FloorFade: ValuationV2Detail['r1FloorFade'];
  // R1 option B (round 3): only where the revenue multiple is a secondary leg. Where it is the main
  // method (current_run_rate_revenue: software, fintech, cyber) the V1 multiple stays, with the
  // continuous size factor.
  if (v2c.r1 && blendWeights.rev > 0 && sectorConfig.strategy !== 'current_run_rate_revenue') {
    // Methodology 2 (R1, decision 1 of 17.11.2026): margin-adjusted Damodaran EV/Sales.
    const factors = normalizeMultipleForPrivateCompany({
      rawMultiple: 1,
      revenueK: revK,
      industry: fcfIndustry,
      lifecycleStage: lifecycle ?? 'growth',
      isManualOverride: false,
      continuousScale: v2c.continuousSize,
      skipIndustryBounds: true,
    }).breakdown;
    // A manual multiple only replaces R1 in the revenue strategy, which option B keeps out of R1.
    const revenueStrategyManual = false;
    revenueMultipleDetail = revenueMultipleV2({
      sector: inputs.sector,
      subSector: inputs.subSector,
      normalizedEbitdaK: normalizedEbitda.normalizedEbitdaK,
      revenueK: revK,
      privateFactor: factors.dlomFactor * factors.scaleFactor,
      fallbackRawMultiple: resolveSubSectorRevenueMultiple({
        sector: inputs.sector,
        subSector: inputs.subSector,
        sectorConfig,
      }),
      isManual: revenueStrategyManual,
      manualMultiple: effectiveMult,
    });
    revMultiplier = revenueMultipleDetail.multiple;
    revLegEvK = Math.round(revK * revMultiplier * 100) / 100;

    // Finding 26, option (b): the floor fades out as the margin nears the thin-margin boundary.
    const fadeMargin = revenueMultipleDetail.companyMargin ?? 0;
    if (v2c.r1GradualFloor && revenueMultipleDetail.basis === 'damodaran-margin' && fadeMargin < V2_THIN_MARGIN_BOUNDARY) {
      const weightsAt = (ebitdaK: number) => {
        const { weights } = resolveEngineBlendWeights({
          method: matureRowMethod,
          sector: inputs.sector,
          subSector: inputs.subSector,
          strategy: sectorConfig.strategy,
          revenueK: revK,
          ebitdaK,
          lifecycle,
          lifecycleAdj,
          revK,
        });
        return v2c.zeroLeg ? redistributeZeroLegWeight(weights, ebitdaK, revK, { toRevenueLegFirst: true }) : weights;
      };
      const r1LegAt = (ebitdaK: number) =>
        revK *
        revenueMultipleV2({
          sector: inputs.sector,
          subSector: inputs.subSector,
          normalizedEbitdaK: ebitdaK,
          revenueK: revK,
          privateFactor: factors.dlomFactor * factors.scaleFactor,
          fallbackRawMultiple: 0,
          isManual: false,
        }).multiple;
      const boundaryEbitdaK = revK * V2_THIN_MARGIN_BOUNDARY;
      const bw = weightsAt(boundaryEbitdaK);
      const premiumAtZeroK = r1FadePremiumAtZero({
        boundaryMultiplesK: bw.ebitda * boundaryEbitdaK * effectiveMult + bw.rev * r1LegAt(boundaryEbitdaK),
        at: (m) => {
          const w = weightsAt(revK * m);
          return { revWeight: w.rev, ebitdaWeight: w.ebitda, r1RevLegEvK: r1LegAt(revK * m), ebitdaLegEvK: revK * m * effectiveMult };
        },
      });
      const fade = fadeR1Floor({
        r1RevLegEvK: revLegEvK,
        ebitdaLegEvK,
        revWeight: blendWeights.rev,
        margin: fadeMargin,
        premiumAtZeroK,
      });
      if (fade.revLegEvK !== revLegEvK) {
        r1FloorFade = fade;
        revLegEvK = Math.round(fade.revLegEvK * 100) / 100;
        revMultiplier = revK > 0 ? revLegEvK / revK : revMultiplier;
      }
    }
  } else if (blendWeights.rev > 0 && revLegEvK <= 0) {
    const rawRevMultiple = resolveSubSectorRevenueMultiple({
      sector: inputs.sector,
      subSector: inputs.subSector,
      sectorConfig,
      market:
        inputs.marketEvEbitda != null || inputs.marketEvRevenue != null
          ? {
              evEbitda: inputs.marketEvEbitda,
              evRevenue: inputs.marketEvRevenue,
            }
          : undefined,
    });
    const revNormalization = normalizeMultipleForPrivateCompany({
      rawMultiple: rawRevMultiple,
      revenueK: revK,
      industry: fcfIndustry,
      lifecycleStage: lifecycle ?? 'growth',
      isManualOverride: false,
      continuousScale: v2c.continuousSize,
    });
    revMultiplier = revNormalization.adjustedMultiple;
    revLegEvK = Math.round(revK * revMultiplier * 100) / 100;
  }

  const rawEvK =
    dcf * blendWeights.dcf +
    ebitdaLegEvK * blendWeights.ebitda +
    revLegEvK * blendWeights.rev;
  const rawEquity = rawEvK - debt;

  const organicForwardRevenue2027K = computeOrganicForwardRevenue2027K(revK, growth);
  const backlogCoverageRatio = computeBacklogCoverageRatio(
    backlogSignedK,
    organicForwardRevenue2027K,
  );

  const cog = calibrateCenterOfGravity({
    rawEvK,
    rawEquityK: rawEquity,
    debtK: debt,
    revenue2026K: revK,
    revK,
    backlogSignedK,
    backlogInflectionActive: backlog.backlogInflectionActive,
    organicForwardRevenue2027K,
    backlogCoverageRatio,
  });

  const finalEv = computeFinalEnterpriseValue({
    dcfLegEvK: dcf,
    ebitdaLegEvK,
    revLegEvK,
    blendWeights,
    backlogInflectionWeight: backlog.inflectionIntensity,
    equityBeforeUpliftK: cog.calibratedEquityK,
    debtK: debt,
  });
  const calibratedEvK = finalEv.enterpriseValueK;
  // Round 4 (CREDIT_CHAPTER): EV - net debt + non-operating assets = equity to the owners.
  // Absent input: nothing changes. Multiple for a profit-only holding: the industry multiple after
  // the marketability discount (no size discount).
  const nonOperatingAssets = resolveNonOperatingAssets(
    inputs.nonOperatingAssets,
    automaticNormalization.breakdown.rawMultiple * automaticNormalization.breakdown.dlomFactor,
  );
  const operatingEquityK = finalEv.equityK;
  const calibratedEquityK = operatingEquityK + (nonOperatingAssets?.valueK ?? 0);

  let v2Detail: ValuationV2Detail | undefined;
  if (methodVersion === 'v2') {
    const terminal = dcfDetailed.projection.terminal;
    v2Detail = {
      components: v2c,
      waccInputs: capmV2?.inputs,
      revenueMultiple: revenueMultipleDetail,
      exitCrossCheck: terminal
        ? exitMultipleCrossCheck({
            sector: inputs.sector,
            subSector: inputs.subSector,
            terminalEbitdaK: terminal.ebitdaK,
            gordonTvK: terminal.tvK,
            gordonPvK: dcfDetailed.projection.terminalPvK,
            discountFactor: terminal.discountFactor,
            dlomFactor: normalization.breakdown.dlomFactor,
          })
        : undefined,
      manualReview: v2c.manualReview
        ? resolveManualReview({ evK: calibratedEvK, debtK: debt, equityK: operatingEquityK, revenueK: revK })
        : undefined,
      weightsBeforeZeroLeg: blendWeights !== resolvedBlendWeights ? { ...resolvedBlendWeights } : undefined,
      dcfMarketability: v2c.dcfMarketability ? { factor: dcfMarketabilityFactor, marketableK: dcfMarketableK } : undefined,
      r1FloorFade,
      sizePremium: { pp: waccBreakdown.alpha, basis: v2c.sizePremiumDecile ? 'damodaran-decile' : 'overlay' },
      ...(backlogV2
        ? {
            backlogReduction: {
              v1Pp: backlog.waccAdjustmentPct,
              v2Pp: backlogV2.v2Pp,
              generalShare: backlogV2.generalShare,
              topCustomerFactor: backlogV2.topCustomerFactor,
            },
          }
        : {}),
      ...(v2c.concentrationMultiple ? { concentrationMultipleFactor } : {}),
    };
  }

  if (!overrides.silent) console.log(
    '[FCF Audit]',
    JSON.stringify({
      industry: fcfIndustry,
      ebitda,
      revenue: revK,
      capexPct: parseCapexPct(capexLevelPct),
      breakdown: fcffAudit.breakdown,
      finalEquityValue: calibratedEquityK,
      backlogEquityUpliftPct: finalEv.backlogEquityUpliftPct,
      backlogEquityUpliftK: finalEv.backlogEquityUpliftK,
    }),
  );

  const normalizedNote = buildNormalizedEbitdaNoteHe(
    normalizedEbitda,
    { ebitda2024K, ebitda2025K, ebitda2026K: currentYearEbitdaK },
    (k) => `₪${(k / 1000).toFixed(1)}M`,
  );

  const methodologyNote = buildProfitabilityMethodologyNoteHe(
    profitabilityRegime,
    profitabilityRegime.regime !== 'healthy'
      ? {
          dcf: blendWeights.dcf,
          ebitdaMultiple: blendWeights.ebitda,
          revenueMultiple: blendWeights.rev,
        }
      : undefined,
  );

  return {
    ebitda,
    ebitdaBlend,
    wacc,
    waccBreakdown,
    qs,
    qsGrade,
    effectiveMult,
    automaticEffectiveMult: multipleResolution.automaticMultiple,
    configuredDefaultMultiple: multipleResolution.configuredDefaultMultiple,
    isManualMultiple: multipleResolution.isManual,
    ebtMult: ebitdaLegEvK,
    revMult: revLegEvK,
    revMultiplier,
    dcf,
    terminalSharePct,
    ev: calibratedEvK,
    equity: calibratedEquityK,
    rawEv: cog.rawEvK,
    rawEquity: cog.rawEquityK,
    equityBeforeBacklogUplift: cog.calibratedEquityK,
    backlogEquityUpliftK: finalEv.backlogEquityUpliftK,
    backlogEquityUpliftPct: finalEv.backlogEquityUpliftPct,
    modelBlendContributions: finalEv.modelBlendContributions,
    centerOfGravityFactor: cog.calibrationFactor,
    forwardRunRateK: cog.forwardRunRateK,
    blendWeights,
    dcfGrowthPct,
    baseEbitdaForMultiple,
    inflectionIntensity: backlog.inflectionIntensity,
    methodologyStrategy: sectorConfig.strategy,
    backlogInflectionActive: backlog.backlogInflectionActive,
    backlogRatio: backlog.backlogRatio,
    calibrationWarnings: [
      ...calibration.warnings.map((w) => w.message),
      ...ownerSalaryWarnings,
      ...(normalizedNote ? [normalizedNote] : []),
      ...(methodologyNote ? [methodologyNote] : []),
    ],
    calibratedYears: calibration.calibratedYears,
    historicalAvgMarginPct: calibration.historicalAvgMarginPct,
    forwardEbitda2027K: backlog.forwardEbitda2027K,
    waccBacklogAdjustment,
    multipleBase: multipleResult.baseMultiple,
    multipleConcentrationPenalty: multipleResult.concentrationPenalty,
    multipleNormalizationBreakdown: normalization.breakdown,
    rawMultiple: normalization.breakdown.rawMultiple,
    profitabilityRegime,
    normalizedEbitda,
    methodVersion,
    dcfDetail: dcfDetailed,
    v2: v2Detail,
    ...(nonOperatingAssets ? { nonOperatingAssets } : {}),
  };
}

/** Bear / Base / Bull — QS-driven relative variance ribbon. */
export function computeScenarios(
  computed: ValuationComputed,
  inputs: Pick<
    ValuationInputs,
    | 'growth'
    | 'debt'
    | 'capexLevelPct'
    | 'rev'
    | 'revenue2026K'
    | 'sector'
    | 'subSector'
    | 'backlogSignedK'
    | 'isManualMultiple'
    | 'customMultiple'
  >,
): ValuationScenarios {
  return buildValuationScenarios(computed, inputs);
}

/** Pure runner for tests, PDF pipeline, and useValuation hook. */
export function runValuationEngine(inputs: ValuationInputs): {
  computed: ValuationComputed;
  scenarios: ValuationScenarios;
} {
  const computed = computeValuation(inputs);
  return {
    computed,
    scenarios: computeScenarios(computed, inputs),
  };
}
