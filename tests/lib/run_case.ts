/**
 * Runs a fictional case through the exact customer report path:
 * mapWizardToValuationData (lib/pdf-template/map-from-wizard.ts) with static FX.
 */
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import type { ValuationData } from '../../lib/pdf-template/types';
import { STATIC_FX_FROM_ILS, type FxRatesSnapshot } from '../../lib/utils/fxService';
import { buildWizardState, type CaseSpec } from './fixtures';
import { withQuietConsole } from './quiet';

/** Deterministic FX for all tests: no network, fixed fallback rates. */
export const TEST_FX: FxRatesSnapshot = {
  fromIls: { ...STATIC_FX_FROM_ILS },
  source: 'fallback',
  asOf: 'static',
  fetchedAt: 0,
};

export function runCase(spec: CaseSpec): ValuationData {
  return withQuietConsole(() =>
    mapWizardToValuationData(buildWizardState(spec), `TEST-${spec.id}`, 'he', TEST_FX),
  );
}

function r2(n: number | undefined | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export interface CaseSnapshot {
  equity: number | null;
  enterpriseValue: number | null;
  bearEquity: number | null;
  bullEquity: number | null;
  dcfEv: number | null;
  ebitdaEv: number | null;
  revenueEv: number | null;
  weightDcf: number | null;
  weightEbitda: number | null;
  weightRev: number | null;
  waccPct: number | null;
  qualityScore: number | null;
  effectiveMult: number | null;
  revenueMultiple: number | null;
  fcffM: Array<number | null>;
  terminalPvM: number | null;
  terminalSharePct: number | null;
  netDebt: number | null;
  keyFindings: string;
  ebitdaBlendedNote: string;
}

export function extractSnapshot(data: ValuationData): CaseSnapshot {
  const w = data.financialCore?.blendWeights;
  return {
    equity: r2(data.equity),
    enterpriseValue: r2(data.enterpriseValue),
    bearEquity: r2(data.bearEquity),
    bullEquity: r2(data.bullEquity),
    dcfEv: r2(data.dcfEv),
    ebitdaEv: r2(data.ebitdaEv),
    revenueEv: r2(data.revenueEv),
    weightDcf: r2(w ? w.dcf * 100 : null),
    weightEbitda: r2(w ? w.ebitda * 100 : null),
    weightRev: r2(w ? w.rev * 100 : null),
    waccPct: r2(data.waccPct),
    qualityScore: r2(data.qualityScore),
    effectiveMult: r2(data.effectiveMult),
    revenueMultiple: r2(data.revenueMultiple),
    fcffM: data.dcfRows.map((r) => r2(r.fcffM)),
    terminalPvM: r2(data.terminalPvM),
    terminalSharePct: r2(data.terminalSharePct),
    netDebt: r2(data.netDebt),
    keyFindings: data.keyFindings ?? '',
    ebitdaBlendedNote: data.ebitdaBlendedNote ?? '',
  };
}
