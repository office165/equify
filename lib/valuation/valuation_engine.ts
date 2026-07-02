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
import { computeDcfWithGrowthDecay, buildValuationScenarios } from './scenario_matrix';
import { parseCapexPct, resolveCapexIndustryKey, computeFCFF } from './capex_fcf';
import { calibrateCenterOfGravity } from './base_case_calibration';
import { createValuationStrategy } from './strategies/valuation_strategy';
import { resolveEbitdaBaseForMultipleLeg } from './cyclical_ebitda_normalization';
import { resolveActiveEffectiveMultiple } from './multiple_override';
import {
  normalizeMultipleForPrivateCompany,
  type MultipleNormalizationBreakdown,
} from './normalize_multiple';
import { computeCapmWacc } from './capm_wacc';
import {
  buildProfitabilityMethodologyNoteHe,
  resolveProfitabilityRegime,
  type RegimeResolution,
} from './profitability_regime';
import { resolveEngineBlendWeights } from './resolve_display_weights';
import { resolveSubSectorRevenueMultiple } from './sub_sector_default_multiple';
import type { TurnaroundDcfParams } from './scenario_matrix';

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
}): number {
  return computeDcfWithGrowthDecay({
    ebitdaK: params.ebitdaK,
    revK: params.revK,
    capexLevelPct: parseCapexPct(params.capexLevelPct),
    dcfGrowthPct: params.dcfGrowthPct,
    wacc: params.wacc,
    industry: resolveCapexIndustryKey(params.sector, params.subSector),
    turnaround: params.turnaround,
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
export function computeValuation(inputs: ValuationInputs): ValuationComputed {
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
    ebitda2027K,
    backlogSignedK,
    projectedEbitdaK,
  } = calibrated;

  const cappedGrowthPct = capGrowthPctForMethodology(growth, sectorConfig);
  const revK = revenue2026K ?? rev;
  const currentYearEbitdaK =
    ebitda2026K ??
    resolveCurrentYearEbitdaK({ ebitda2026K, rev: revK, margin });

  const ownerSalaryNormK = resolveNormalizedOwnerSalaryK(normalizedOwnerSalary);
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
    },
    cappedGrowthPct: growth,
    historicalAvgMarginPct: calibration.historicalAvgMarginPct,
    specificRiskPremiumPp: specificRisk.totalPremiumPp,
  });

  const dcfGrowthPct = growth;
  const scaleProfile = resolveScaleModifierProfile({
    lifecycle,
    lifecycleAdj,
    rev: revK,
    revenue2026K: revK,
  });
  const { weights: blendWeights, regime: profitabilityRegime } = resolveEngineBlendWeights({
    sector: inputs.sector,
    subSector: inputs.subSector,
    strategy: sectorConfig.strategy,
    revenueK: revK,
    ebitdaK: currentYearEbitdaK,
    lifecycle,
    lifecycleAdj,
    revK,
  });

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
      normalizedOwnerSalary: ownerSalaryNormK,
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
  const ebitda = ebitdaBlend.blended;

  const waccBacklogAdjustment = backlog.waccAdjustmentPct;
  const backlogAlphaReductionPp = Math.abs(waccBacklogAdjustment);
  const { wacc, waccBreakdown } = computeCapmWacc({
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

  const qsRaw = computeQualityScore({
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
    growth,
  });
  const ownerSalaryOmitted = !(normalizedOwnerSalary > 0);
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
  });
  const effectiveMult = normalization.adjustedMultiple;

  const automaticNormalization = normalizeMultipleForPrivateCompany({
    rawMultiple: multipleResolution.automaticMultiple,
    revenueK: revK,
    industry: fcfIndustry,
    lifecycleStage: lifecycle ?? 'growth',
    isManualOverride: false,
  });
  const automaticEffectiveMult = automaticNormalization.adjustedMultiple;

  const turnaroundDcf: TurnaroundDcfParams | undefined =
    profitabilityRegime.turnaroundYears > 0 &&
    (profitabilityRegime.regime === 'loss_making' ||
      profitabilityRegime.regime === 'deep_loss')
      ? {
          currentMargin: revK > 0 ? currentYearEbitdaK / revK : 0,
          sectorNormalMargin: sectorConfig.maxHistoricalMargin,
          turnaroundYears: profitabilityRegime.turnaroundYears,
        }
      : undefined;

  const dcf = computeDcf({
    ebitdaK: ebitda,
    revK,
    capexLevelPct: parseCapexPct(capexLevelPct),
    dcfGrowthPct: growth,
    wacc,
    sector: inputs.sector,
    subSector: inputs.subSector,
    turnaround: turnaroundDcf,
  });

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

  if (blendWeights.ebitda <= 0 || currentYearEbitdaK <= 0) {
    ebitdaLegEvK = 0;
  }

  if (blendWeights.rev > 0 && revLegEvK <= 0) {
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
  const calibratedEquityK = finalEv.equityK;
  const calibratedEvK = finalEv.enterpriseValueK;

  console.log(
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
