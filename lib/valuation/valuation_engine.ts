import type {
  QualityGrade,
  ValuationComputed,
  ValuationInputs,
  ValuationScenarios,
} from '../valuation';
import {
  applySectorMarginGuardrails,
  computeConcentrationWaccPremium,
  computeDynamicMultiple,
} from './adaptive_calibration';
import { computeBlendedEbitda } from './blended_ebitda';
import { applyBacklogInflectionAccelerator } from './backlog_inflection_accelerator';
import {
  computeBacklogCoverageRatio,
  computeOrganicForwardRevenue2027K,
  applyBacklogEquityUplift,
} from './backlog_metrics';
import { resolveCurrentYearEbitdaK } from './backlog_valuation';
import { capGrowthPctForMethodology } from './sector_methodology_matrix';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';
import { resolveValuationBlendWeights } from './valuation_weights_registry';
import {
  applyScaleAdjustedBlendWeights,
  applyScaleMultipleDampener,
  resolveScaleModifierProfile,
} from './scale_modifier_pipeline';
import { computeDcfWithGrowthDecay, buildValuationScenarios } from './scenario_matrix';
import { parseCapexPct, resolveCapexIndustryKey, computeFCFF } from './capex_fcf';
import { calibrateCenterOfGravity } from './base_case_calibration';
import { createValuationStrategy } from './strategies/valuation_strategy';
import { resolveEbitdaBaseForMultipleLeg } from './cyclical_ebitda_normalization';
import { resolveActiveEffectiveMultiple } from './multiple_override';
import { computeCapmWacc } from './capm_wacc';

function qualityScoreGrade(qs: number): QualityGrade {
  if (qs >= 85) return 'A';
  if (qs >= 75) return 'A−';
  if (qs >= 65) return 'B+';
  if (qs >= 55) return 'B';
  if (qs >= 45) return 'B−';
  return 'C+';
}

function computeSpecificRiskPremium(
  inputs: Pick<
    ValuationInputs,
    'recurring' | 'topCustomer' | 'founderDep' | 'competition' | 'ip' | 'contracts'
  >,
): { totalPp: number; sizePp: number; alphaPp: number } {
  const { recurring, topCustomer, founderDep, competition, ip, contracts } = inputs;
  const qualityPr =
    (founderDep ? 0.6 : 0) +
    (competition ? 0.4 : 0) +
    (ip ? -0.3 : 0) +
    (contracts ? -0.2 : 0);
  const recurPr = (1 - recurring / 100) * 0.8;
  const concPr = computeConcentrationWaccPremium(topCustomer);
  const sizePp = 3.1;
  const alphaPp = qualityPr + recurPr + concPr;
  return { totalPp: sizePp + alphaPp, sizePp, alphaPp };
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
}): number {
  return computeDcfWithGrowthDecay({
    ebitdaK: params.ebitdaK,
    revK: params.revK,
    capexLevelPct: parseCapexPct(params.capexLevelPct),
    dcfGrowthPct: params.dcfGrowthPct,
    wacc: params.wacc,
    industry: resolveCapexIndustryKey(params.sector, params.subSector),
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
  const { alphaPp } = computeSpecificRiskPremium({
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
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
    specificRiskPremiumPp: alphaPp,
  });

  const dcfGrowthPct = growth;
  const scaleProfile = resolveScaleModifierProfile({
    lifecycle,
    lifecycleAdj,
    rev: revK,
    revenue2026K: revK,
  });
  const baseBlendWeights = resolveValuationBlendWeights({
    subSectorId: inputs.subSector,
    strategy: sectorConfig.strategy,
  });
  const blendWeights = applyScaleAdjustedBlendWeights(
    baseBlendWeights,
    scaleProfile,
    sectorConfig.strategy,
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
  const qs = qsRaw;
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
  const multipleFloor = sectorConfig.minMultiple * 0.78;
  let effectiveMult = multipleResolution.activeMultiple;
  if (!multipleResolution.isManual) {
    effectiveMult = applyScaleMultipleDampener(
      effectiveMult,
      scaleProfile,
      multipleFloor,
    );
  }
  const automaticEffectiveMult = multipleResolution.isManual
    ? qsAdjustedMult
    : applyScaleMultipleDampener(
        multipleResolution.automaticMultiple,
        scaleProfile,
        multipleFloor,
      );

  const dcf = computeDcf({
    ebitdaK: ebitda,
    revK,
    capexLevelPct: parseCapexPct(capexLevelPct),
    dcfGrowthPct: growth,
    wacc,
    sector: inputs.sector,
    subSector: inputs.subSector,
  });

  const fcfIndustry = resolveCapexIndustryKey(inputs.sector, inputs.subSector);
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

  const ev =
    dcf * blendWeights.dcf +
    legs.ebtMult * blendWeights.ebitda +
    legs.revMult * blendWeights.rev;
  const rawEquity = ev - debt;

  const organicForwardRevenue2027K = computeOrganicForwardRevenue2027K(revK, growth);
  const backlogCoverageRatio = computeBacklogCoverageRatio(
    backlogSignedK,
    organicForwardRevenue2027K,
  );

  const cog = calibrateCenterOfGravity({
    rawEvK: ev,
    rawEquityK: rawEquity,
    debtK: debt,
    revenue2026K: revK,
    revK,
    backlogSignedK,
    backlogInflectionActive: backlog.backlogInflectionActive,
    organicForwardRevenue2027K,
    backlogCoverageRatio,
  });

  const backlogEquity = applyBacklogEquityUplift(
    cog.calibratedEquityK,
    backlog.inflectionIntensity,
  );
  const calibratedEquityK = backlogEquity.equityK;
  const calibratedEvK = cog.calibratedEvK + backlogEquity.upliftK;

  console.log(
    '[FCF Audit]',
    JSON.stringify({
      industry: fcfIndustry,
      ebitda,
      revenue: revK,
      capexPct: parseCapexPct(capexLevelPct),
      breakdown: fcffAudit.breakdown,
      finalEquityValue: calibratedEquityK,
      backlogEquityUpliftPct: backlogEquity.uplift.upliftPctPoints,
      backlogEquityUpliftK: backlogEquity.upliftK,
    }),
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
    ebtMult: legs.ebtMult,
    revMult: legs.revMult,
    revMultiplier: legs.revMultiplier,
    dcf,
    ev: calibratedEvK,
    equity: calibratedEquityK,
    rawEv: cog.rawEvK,
    rawEquity: cog.rawEquityK,
    equityBeforeBacklogUplift: cog.calibratedEquityK,
    backlogEquityUpliftK: backlogEquity.upliftK,
    backlogEquityUpliftPct: backlogEquity.uplift.upliftPctPoints,
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
    ],
    calibratedYears: calibration.calibratedYears,
    historicalAvgMarginPct: calibration.historicalAvgMarginPct,
    forwardEbitda2027K: backlog.forwardEbitda2027K,
    waccBacklogAdjustment,
    multipleBase: multipleResult.baseMultiple,
    multipleConcentrationPenalty: multipleResult.concentrationPenalty,
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
