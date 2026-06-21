import type {
  QualityGrade,
  ValuationComputed,
  ValuationInputs,
  ValuationScenarios,
} from '../valuation';
import { computeBlendedEbitda } from './blended_ebitda';
import { applyBacklogInflectionAccelerator } from './backlog_inflection_accelerator';
import {
  resolveBaseEbitdaForMultiple,
  resolveCurrentYearEbitdaK,
} from './backlog_valuation';
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

function computeEffectiveMultiple(params: {
  sectorMult: number;
  subSectorMult: number;
  dcfGrowthPct: number;
  qs: number;
  minMultiple: number;
  maxMultiple: number;
}): number {
  const { sectorMult, subSectorMult, dcfGrowthPct, qs, minMultiple, maxMultiple } =
    params;

  const combinedSectorMult = sectorMult * subSectorMult;
  const baseM = 5.2;
  const growthM = Math.min(3.5, dcfGrowthPct * 0.14);
  const qualM = ((qs - 50) / 100) * 2.8;
  const raw = (baseM + growthM + qualM) * combinedSectorMult;

  return Math.max(minMultiple, Math.min(maxMultiple, raw));
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
 * Core valuation engine — sector strategy pattern + backlog inflection accelerator.
 *
 * Pipeline:
 * 1. Resolve sectorConfigs profile
 * 2. Cap growth at growthCap
 * 3. Apply backlog inflection (weights, DCF growth, forward EBITDA)
 * 4. Blended historical EBITDA for DCF FCFF
 * 5. Strategy pattern → EBITDA / revenue legs
 * 6. Combined EV = Σ (leg × sector/backlog weight) — includes weightRev for SaaS
 */
export function computeValuation(inputs: ValuationInputs): ValuationComputed {
  const {
    rev,
    margin,
    growth,
    debt,
    sector = 'other',
    sectorMult,
    subSectorMult = 1,
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
    hasSignificantBacklog,
    backlogSignedK = 0,
  } = inputs;

  const methodologyConfig = resolveSectorMethodologyConfig(sector);
  const cappedGrowthPct = capGrowthPctForMethodology(growth, methodologyConfig);

  const backlogInflection = applyBacklogInflectionAccelerator({
    sectorConfig: methodologyConfig,
    inputs: {
      hasSignificantBacklog,
      backlogSignedK,
      growth,
      rev,
      margin,
      revenue2026K,
      ebitda2027K,
      ebitda2026K,
      normalizedOwnerSalary,
    },
    cappedGrowthPct,
  });

  const dcfGrowthPct = backlogInflection.acceleratedGrowthPct;
  const blendWeights = backlogInflection.blendWeights;

  const ebitdaBlend = computeBlendedEbitda(
    {
      rev: revenue2026K ?? rev,
      margin,
      normalizedOwnerSalary,
      ebitda2024K,
      ebitda2025K,
      ebitda2026K,
    },
    dcfGrowthPct,
  );
  const ebitda = ebitdaBlend.blended;

  const wacc = computeWacc({
    lifecycleAdj,
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
  });

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

  const effectiveMult = computeEffectiveMultiple({
    sectorMult,
    subSectorMult,
    dcfGrowthPct,
    qs,
    minMultiple: methodologyConfig.minMultiple,
    maxMultiple: methodologyConfig.maxMultiple,
  });

  const strategy = createValuationStrategy(methodologyConfig);
  const currentYearEbitdaK = resolveCurrentYearEbitdaK({
    ebitda2026K,
    rev: revenue2026K ?? rev,
    margin,
  });
  const revenueRunRateK = revenue2026K ?? rev;

  const strategyLegs = strategy.computeLegs({
    inputs,
    config: methodologyConfig,
    effectiveMult,
    ebitdaBlend,
    backlog: backlogInflection,
    currentYearEbitdaK,
    revenueRunRateK,
  });

  const baseEbitdaForMultiple = resolveBaseEbitdaForMultiple(
    {
      ebitda2024K,
      ebitda2025K,
      ebitda2027K,
      ebitda2026K,
      rev: revenue2026K ?? rev,
      margin,
    },
    backlogInflection.forwardEbitda2027K ?? strategyLegs.ebitdaBaseForMultiple,
    backlogInflection.inflectionIntensity > 0,
  );

  const dcf = computeDcf({
    ebitdaK: ebitda,
    revK: revenue2026K ?? rev,
    capexLevelPct,
    dcfGrowthPct,
    wacc,
  });

  const ebtMult = strategyLegs.ebtMult;
  const revMult = strategyLegs.revMult;
  const revMultiplier = strategyLegs.revMultiplier;

  const ev =
    dcf * blendWeights.dcf +
    ebtMult * blendWeights.ebitda +
    revMult * blendWeights.rev;
  const equity = Math.max(0, ev - debt);

  return {
    ebitda,
    ebitdaBlend,
    wacc,
    qs,
    qsGrade,
    effectiveMult,
    ebtMult,
    revMult,
    revMultiplier,
    dcf,
    ev,
    equity,
    blendWeights,
    dcfGrowthPct,
    baseEbitdaForMultiple,
    inflectionIntensity: backlogInflection.inflectionIntensity,
    methodologyStrategy: methodologyConfig.strategy,
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

/** Pure runner for tests, PDF pipeline, and hooks. */
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
