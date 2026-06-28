import type { ValuationLocale } from '../../api_client';
import { coerceWizardSectorSelection } from '../constants/industry_config';
import { mapWizardToValuationData } from '../pdf-template/map-from-wizard';
import type { ValuationData } from '../pdf-template/types';
import type { FxRatesSnapshot } from '../utils/fxService';
import { getCachedFxRates } from '../utils/fxService';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { syncFinancialsDerived } from '../wizard/financial_history';

export const VALUATION_SNAPSHOT_VERSION = 1 as const;

/** Atomic, client-computed payload for PDF/HTML rendering — server must not re-run valuation. */
export interface ValuationReportSnapshot {
  version: typeof VALUATION_SNAPSHOT_VERSION;
  snapshotHash: string;
  computedAt: string;
  reportId?: string;
  locale: ValuationLocale;
  fxRates: FxRatesSnapshot;
  inputsDigest: string;
  valuationData: ValuationData;
}

export interface SnapshotBuildOptions {
  state: EquifyWizardState;
  locale?: ValuationLocale;
  reportId?: string;
  fxRates?: FxRatesSnapshot;
  /** Pre-computed layout data from the live dashboard — skips engine recompute at export. */
  valuationData?: ValuationData;
}

export type SnapshotVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

function roundMoney(n: number): number {
  return Math.round(n);
}

function fnv1aHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

/** Deterministic wizard-input fingerprint — excludes volatile display-only fields. */
export function buildSnapshotInputsDigest(state: EquifyWizardState): string {
  const synced = {
    ...state,
    financials: syncFinancialsDerived(state.financials),
  };

  const payload = {
    profile: {
      sector: synced.profile.sector,
      subSector: synced.profile.subSector,
      lifecycle: synced.profile.lifecycle,
      currency: synced.profile.currency,
      fiscalYear: synced.profile.fiscalYear,
      companyName: synced.profile.companyName.trim(),
    },
    financials: {
      y2024: synced.financials.y2024,
      y2025: synced.financials.y2025,
      y2026: synced.financials.y2026,
      rev: synced.financials.rev,
      margin: synced.financials.margin,
      growth: synced.financials.growth,
      grossDebtK: synced.financials.grossDebtK,
      cashK: synced.financials.cashK,
      normalizedOwnerSalaryK: synced.financials.normalizedOwnerSalaryK,
      capexLevelPct: synced.financials.capexLevelPct,
      projectedEbitdaK: synced.financials.projectedEbitdaK,
      backlogSignedK: synced.financials.backlogSignedK,
      customMultiple: synced.financials.customMultiple,
      isManualMultiple: synced.financials.isManualMultiple,
      sectorDefaultsFor: synced.financials.sectorDefaultsFor,
    },
    risk: synced.risk,
    goal: synced.goal,
  };

  return fnv1aHex(stableStringify(payload));
}

export function computeSnapshotHash(parts: {
  inputsDigest: string;
  fxRates: FxRatesSnapshot;
  locale: ValuationLocale;
  reportId?: string;
  valuationData: Pick<
    ValuationData,
    'equity' | 'enterpriseValue' | 'waccPct' | 'qualityScore' | 'sector' | 'sectorLabel'
  >;
}): string {
  const fingerprint = stableStringify({
    v: VALUATION_SNAPSHOT_VERSION,
    inputsDigest: parts.inputsDigest,
    fx: {
      fromIls: parts.fxRates.fromIls,
      source: parts.fxRates.source,
      asOf: parts.fxRates.asOf,
    },
    locale: parts.locale,
    reportId: parts.reportId ?? null,
    equity: roundMoney(parts.valuationData.equity),
    enterpriseValue: roundMoney(parts.valuationData.enterpriseValue),
    waccPct: Math.round(parts.valuationData.waccPct * 100) / 100,
    qualityScore: Math.round(parts.valuationData.qualityScore),
    sector: parts.valuationData.sector,
    sectorLabel: parts.valuationData.sectorLabel,
  });

  return fnv1aHex(fingerprint);
}

/** Captures the live client valuation state at export time — single source of truth for PDF/HTML. */
export function buildValuationReportSnapshot(
  options: SnapshotBuildOptions,
): ValuationReportSnapshot {
  const locale = options.locale ?? 'he';
  const fxRates = options.fxRates ?? getCachedFxRates();
  const coerced = coerceWizardSectorSelection(
    options.state.profile.sector,
    options.state.profile.subSector,
  );
  const syncedState: EquifyWizardState = {
    ...options.state,
    profile: {
      ...options.state.profile,
      sector: coerced.sector,
      subSector: coerced.subSector,
    },
    financials: syncFinancialsDerived(options.state.financials),
  };
  const inputsDigest = buildSnapshotInputsDigest(syncedState);
  const valuationData =
    options.valuationData ??
    mapWizardToValuationData(syncedState, options.reportId, locale, fxRates);
  const snapshotHash = computeSnapshotHash({
    inputsDigest,
    fxRates,
    locale,
    reportId: options.reportId ?? valuationData.reportId,
    valuationData,
  });

  return {
    version: VALUATION_SNAPSHOT_VERSION,
    snapshotHash,
    computedAt: new Date().toISOString(),
    reportId: options.reportId ?? valuationData.reportId,
    locale,
    fxRates,
    inputsDigest,
    valuationData,
  };
}

export function verifyValuationReportSnapshot(
  snapshot: ValuationReportSnapshot,
  state?: EquifyWizardState | null,
): SnapshotVerifyResult {
  if (snapshot.version !== VALUATION_SNAPSHOT_VERSION) {
    return { ok: false, reason: 'Unsupported snapshot version.' };
  }

  if (!snapshot.valuationData || typeof snapshot.valuationData.equity !== 'number') {
    return { ok: false, reason: 'Snapshot missing valuationData.' };
  }

  if (state) {
    const expectedInputs = buildSnapshotInputsDigest(state);
    if (expectedInputs !== snapshot.inputsDigest) {
      return {
        ok: false,
        reason: 'Wizard inputs changed since snapshot was captured.',
      };
    }
  }

  const expectedHash = computeSnapshotHash({
    inputsDigest: snapshot.inputsDigest,
    fxRates: snapshot.fxRates,
    locale: snapshot.locale,
    reportId: snapshot.reportId,
    valuationData: snapshot.valuationData,
  });

  if (expectedHash !== snapshot.snapshotHash) {
    return { ok: false, reason: 'Snapshot hash mismatch — payload may be stale or tampered.' };
  }

  return { ok: true };
}
