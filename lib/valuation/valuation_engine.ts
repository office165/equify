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
import { resolveCurrentYearEbitdaK } from './backlog_valuation';
import { capGrowthPctForMethodology } from './sector_methodology_matrix';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';
import { createValuationStrategy } from './strategies/valuation_strategy';

function qualityScoreGrade(qs: number): QualityGrade {
  if (qs >= 85) return 'A';
  if (qs >= 75) return 'A−';
  if (qs >= 65) return 'B+';
  if (qs >= 55) return 'B';
  if (qs >= 45) return 'B−';
  return 'C+';
}

function computeWacc(inputs: Pick<
  ValuationInputs,
  | 'lifecycleAdj'
  | 'recurring'
  | 'topCustomer'
  | 'founderDep'
  | 'competition'
  | 'ip'
  | 'contracts'
>): number {
  const {
    lifecycleAdj,
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
  } = inputs;

  const rf = 4.3;
  const erp = 5.4;
  const crp = 1.6;
  const sizePr = 3.1;
  const qualityPr =
    (founderDep ? 0.6 : 0) +
    (competition ? 0.4 : 0) +
    (ip ? -0.3 : 0) +
    (contracts ? -0.2 : 0);
  const recurPr = (1 - recurring / 100) * 0.8;
  const concPr = topCustomer > 40 ? 0.8 : topCustomer > 20 ? 0.4 : 0;

  return Math.max(
    10,
    Math.min(
      25,
      rf + erp + crp + sizePr + qualityPr + recurPr + concPr - lifecycleAdj * 3,
    ),
  );
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
}): number {
  const { ebitdaK, revK, capexLevelPct, dcfGrowthPct, wacc } = params;
  const capexK = revK * (capexLevelPct / 100);
  const fcffConversion = Math.max(0.55, 0.85 - capexLevelPct / 100);

  let pv = 0;
  let fcff = ebitdaK * fcffConversion - capexK * 0.15;
  const g = Math.max(-0.05, dcfGrowthPct / 100);
  const w = wacc / 100;

  for (let i = 1; i <= 5; i += 1) {
    fcff *= 1 + g;
    pv += fcff / (1 + w) ** i;
  }

  const gTerm = 0.025;
  const tv = (fcff * (1 + gTerm)) / (w - gTerm) / (1 + w) ** 5;
  return pv + tv;
}

/**
 * Core valuation engine — Adaptive calibration layer + sectorConfigs + Backlog Inflection.
 *
 * Pipeline:
 * 1. Resolve sectorConfigs profile (industry | services | saas)
 * 2. Winsorize per-year EBITDA margins (maxHistoricalMargin guardrails)
 * 3. Cap growth at sector growthCap
 * 4. Apply backlog inflection (70/30 weights, forward EBITDA, WACC −1%)
 * 5. DCF on blended historical EBITDA (2024–2026)
 * 6. Quality-score linear multiple + concentration penalty
 * 7. EV = Σ (leg × effective weight)
 */
export function computeValuation(inputs: ValuationInputs): ValuationComputed {
  const sectorConfig = resolveSectorMethodologyConfig(inputs.sector);
  const calibration = applySectorMarginGuardrails(inputs, sectorConfig);
  const calibrated = calibration.inputs;

  const {
    rev,
    margin,
    growth,
    debt,
    lifecycleAdj,
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
    ebitda2027K,
    backlogSignedK,
    projectedEbitdaK,
  } = calibrated;

  const cappedGrowthPct = capGrowthPctForMethodology(growth, sectorConfig);
  const revK = revenue2026K ?? rev;
  const currentYearEbitdaK =
    ebitda2026K ??
    resolveCurrentYearEbitdaK({ ebitda2026K, rev: revK, margin });

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
    cappedGrowthPct,
    historicalAvgMarginPct: calibration.historicalAvgMarginPct,
  });

  const dcfGrowthPct = backlog.acceleratedGrowthPct;
  const blendWeights = backlog.blendWeights;
  const baseEbitdaForMultiple = backlog.baseEbitdaForMultiple;

  const ebitdaBlend = computeBlendedEbitda(
    {
      rev: revK,
      margin,
      normalizedOwnerSalary,
      ebitda2024K,
      ebitda2025K,
      ebitda2026K: currentYearEbitdaK,
    },
    dcfGrowthPct,
  );
  const ebitda = ebitdaBlend.blended;

  const waccBase = computeWacc({
    lifecycleAdj,
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
  });
  const waccBacklogAdjustment = backlog.waccAdjustmentPct;
  const wacc = Math.max(10, Math.min(25, waccBase + waccBacklogAdjustment));

  const qs = computeQualityScore({
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
    growth,
  });
  const qsGrade = qualityScoreGrade(qs);

  const multipleResult = computeDynamicMultiple({
    config: sectorConfig,
    qualityScore: qs,
    topCustomerPct: topCustomer,
  });
  const effectiveMult = multipleResult.multiple;

  const dcf = computeDcf({
    ebitdaK: ebitda,
    revK,
    capexLevelPct,
    dcfGrowthPct,
    wacc,
  });

  const strategy = createValuationStrategy(sectorConfig);
  const legs = strategy.computeLegs({
    inputs: calibrated,
    config: sectorConfig,
    effectiveMult,
    ebitdaBlend,
    backlog,
    currentYearEbitdaK,
    revenueRunRateK: revK,
  });

  const ev =
    dcf * blendWeights.dcf +
    legs.ebtMult * blendWeights.ebitda +
    legs.revMult * blendWeights.rev;
  const equity = Math.max(0, ev - debt);

  return {
    ebitda,
    ebitdaBlend,
    wacc,
    qs,
    qsGrade,
    effectiveMult,
    ebtMult: legs.ebtMult,
    revMult: legs.revMult,
    revMultiplier: legs.revMultiplier,
    dcf,
    ev,
    equity,
    blendWeights,
    dcfGrowthPct,
    baseEbitdaForMultiple,
    inflectionIntensity: backlog.inflectionIntensity,
    methodologyStrategy: sectorConfig.strategy,
    backlogInflectionActive: backlog.backlogInflectionActive,
    backlogRatio: backlog.backlogRatio,
    calibrationWarnings: calibration.warnings.map((w) => w.message),
    calibratedYears: calibration.calibratedYears,
    historicalAvgMarginPct: calibration.historicalAvgMarginPct,
    forwardEbitda2027K: backlog.forwardEbitda2027K,
    waccBacklogAdjustment,
    multipleBase: multipleResult.baseMultiple,
    multipleConcentrationPenalty: multipleResult.concentrationPenalty,
  };
}

/** Bear / Base / Bull scenario envelope around computed valuation. */
export function computeScenarios(
  computed: ValuationComputed,
  inputs: Pick<ValuationInputs, 'growth' | 'debt' | 'sector'>,
): ValuationScenarios {
  const { dcf, ebtMult, revMult, ev, equity, wacc, effectiveMult, blendWeights } =
    computed;
  const { growth, debt } = inputs;

  const bearEv =
    dcf * blendWeights.dcf * 0.72 +
    ebtMult * blendWeights.ebitda * 0.78 +
    revMult * blendWeights.rev * 0.8;
  const bullEv =
    dcf * blendWeights.dcf * 1.28 +
    ebtMult * blendWeights.ebitda * 1.24 +
    revMult * blendWeights.rev * 1.18;
  const bearEq = Math.max(0, bearEv - debt);
  const bullEq = Math.max(0, bullEv - debt);

  const bearGrowth = Math.max(-5, growth - 6);
  const bullGrowth = growth + 6;

  return {
    bearEv,
    bullEv,
    bearEq,
    bullEq,
    baseEq: equity,
    rows: [
      {
        label: 'bear',
        growthPct: bearGrowth,
        ebitdaAdj: '−2%',
        waccPct: wacc + 1.6,
        multDisplay: `×${(effectiveMult * 0.78).toFixed(1)}`,
        ev: bearEv,
        equity: bearEq,
      },
      {
        label: 'base',
        growthPct: growth,
        ebitdaAdj: '—',
        waccPct: wacc,
        multDisplay: `×${effectiveMult.toFixed(1)}`,
        ev,
        equity,
      },
      {
        label: 'bull',
        growthPct: bullGrowth,
        ebitdaAdj: '+2%',
        waccPct: wacc - 1.4,
        multDisplay: `×${(effectiveMult * 1.18).toFixed(1)}`,
        ev: bullEv,
        equity: bullEq,
      },
    ],
  };
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
