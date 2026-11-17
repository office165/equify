/**
 * Reads the per-sub-sector methodology from the production code (no logic of its own
 * beyond calling public functions with reference inputs). Used by the methodology map
 * document and by the lock test.
 */
import {
  getInstitutionalSubSectorConfig,
  getSubSectorEngineDefaults,
  getSubSectorMultAdj,
  getSubSectorValuationProfile,
  resolveSubSectorMultiplesIndustry,
} from '../../lib/constants/industry_config';
import type { EquifyLifecycleKey } from '../../lib/valuation';
import { computeFCFF, resolveCapexIndustryKey } from '../../lib/valuation/capex_fcf';
import { shouldApplyCyclicalEbitdaNormalization } from '../../lib/valuation/cyclical_ebitda_normalization';
import { resolveActiveEffectiveMultiple } from '../../lib/valuation/multiple_override';
import { normalizeMultipleForPrivateCompany } from '../../lib/valuation/normalize_multiple';
import { resolveEngineBlendWeights } from '../../lib/valuation/resolve_display_weights';
import {
  resolveSectorMethodologyConfig,
  resolveSectorMethodologyKey,
} from '../../lib/valuation/sector_methodology_resolver';
import { resolveSubSectorRevenueMultiple } from '../../lib/valuation/sub_sector_default_multiple';
import { resolveSectorUnleveredBeta } from '../../lib/wizard/sector_market_defaults';
import { LIFECYCLES, SUBSECTORS } from './cases';

/** Reference company used to read weights "after all layers": revenue 30M, healthy margin 15%. */
export const REF_REVENUE_K = 30_000;
export const REF_MARGIN = 0.15;

export interface MethodologyRow {
  sector: string;
  subSector: string;
  methodologyProfile: string;
  strategy: string;
  weights: Record<EquifyLifecycleKey, { dcf: number; ebitda: number; rev: number }>;
  multipleSource: string;
  defaultMultiple: number;
  multipleType: string;
  configMinMultiple: number;
  configMaxMultiple: number;
  boundsMin: number;
  boundsMax: number;
  effectiveMultipleRef: number;
  revenueMultipleRaw: number;
  revenueMultipleEffective: number;
  dlomGrowth: number;
  dlomMatureRef: number;
  scaleFactorRef: number;
  maxHistoricalMarginPct: number;
  growthCapPct: number;
  unleveredBeta: number;
  depreciationPctOfRevenue: number;
  capexBase: string;
  multiplesIndustry: string;
  cyclicalNormalization: boolean;
  lossRegime: boolean;
  backlogInflection: boolean;
  waccBasePctConfigured: number | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

function multipleSource(sector: any, subSector: string, strategy: string): { source: string; type: string } {
  const engine = getSubSectorEngineDefaults(sector, subSector);
  if (engine?.defaultMultipleValue) {
    return { source: 'engine defaults (industry_config)', type: engine.defaultMultipleType };
  }
  const inst = getInstitutionalSubSectorConfig(sector, subSector);
  if (inst?.defaultMultiple) {
    return { source: 'institutional table (industry_config)', type: 'EBITDA' };
  }
  const profile = getSubSectorValuationProfile(sector, subSector);
  if (profile) {
    if (profile.primaryMultiple === 'pbv' || profile.primaryMultiple === 'nav') {
      return { source: `valuation profile ${profile.primaryMultiple} range`, type: profile.primaryMultiple.toUpperCase() };
    }
    if (profile.multipleRange) {
      return { source: `valuation profile ${profile.primaryMultiple} range`, type: profile.primaryMultiple };
    }
    return { source: `market offline median x multAdj (${profile.primaryMultiple})`, type: profile.primaryMultiple };
  }
  return {
    source: 'market offline median x multAdj',
    type: strategy === 'current_run_rate_revenue' ? 'EV/Revenue' : 'EV/EBITDA',
  };
}

export function buildMethodologyMap(): MethodologyRow[] {
  return SUBSECTORS.map(({ sector, subSector }) => {
    const cfg = resolveSectorMethodologyConfig(sector, subSector);
    const industry = resolveCapexIndustryKey(sector, subSector);
    const weights = {} as MethodologyRow['weights'];
    for (const lc of LIFECYCLES) {
      const w = resolveEngineBlendWeights({
        sector,
        subSector,
        strategy: cfg.strategy,
        revenueK: REF_REVENUE_K,
        ebitdaK: REF_REVENUE_K * REF_MARGIN,
        lifecycle: lc,
        revK: REF_REVENUE_K,
      }).weights;
      weights[lc] = { dcf: r4(w.dcf), ebitda: r4(w.ebitda), rev: r4(w.rev) };
    }
    const mult = resolveActiveEffectiveMultiple({
      inputs: { sector, subSector, isManualMultiple: false, customMultiple: null },
      sectorConfig: cfg,
    });
    const norm = (raw: number, lc: string, rev = REF_REVENUE_K) =>
      normalizeMultipleForPrivateCompany({
        rawMultiple: raw,
        revenueK: rev,
        industry,
        lifecycleStage: lc,
        isManualOverride: false,
      });
    const lo = norm(0.0001, 'growth').adjustedMultiple;
    const hi = norm(10_000, 'growth').adjustedMultiple;
    const eff = norm(mult.activeMultiple, 'growth');
    const revRaw = resolveSubSectorRevenueMultiple({ sector, subSector, sectorConfig: cfg });
    const revEff = norm(revRaw, 'growth').adjustedMultiple;
    const fcff = computeFCFF({ ebitda: 200, revenue: 1000, capexPct: 5, industry, growthRate: 0.05 });
    const src = multipleSource(sector, subSector, cfg.strategy);
    const engine = getSubSectorEngineDefaults(sector, subSector);
    void getSubSectorMultAdj;
    return {
      sector,
      subSector,
      methodologyProfile: resolveSectorMethodologyKey(sector, subSector),
      strategy: cfg.strategy,
      weights,
      multipleSource: src.source,
      defaultMultiple: mult.configuredDefaultMultiple,
      multipleType: src.type,
      configMinMultiple: r2(cfg.minMultiple),
      configMaxMultiple: r2(cfg.maxMultiple),
      boundsMin: lo,
      boundsMax: hi,
      effectiveMultipleRef: eff.adjustedMultiple,
      revenueMultipleRaw: revRaw,
      revenueMultipleEffective: revEff,
      dlomGrowth: eff.breakdown.dlomFactor,
      dlomMatureRef: r4(norm(mult.activeMultiple, 'mature').breakdown.dlomFactor),
      scaleFactorRef: eff.breakdown.scaleFactor,
      maxHistoricalMarginPct: r2(cfg.maxHistoricalMargin * 100),
      growthCapPct: r2(cfg.growthCap * 100),
      unleveredBeta: resolveSectorUnleveredBeta(sector),
      depreciationPctOfRevenue: r2((fcff.breakdown.depreciation / 1000) * 100),
      capexBase: fcff.breakdown.capexBase,
      multiplesIndustry: resolveSubSectorMultiplesIndustry(sector, subSector),
      cyclicalNormalization: shouldApplyCyclicalEbitdaNormalization(sector, subSector),
      lossRegime: true,
      backlogInflection: true,
      waccBasePctConfigured: engine?.waccBasePct ?? null,
    };
  });
}
