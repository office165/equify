import {
  formatCurrency,
  formatILS,
  normalizeCurrencyCode,
  type ReportingCurrencyCode,
} from './utils/formatCurrency';
import {
  getCachedFxRates,
  refreshFxRates,
  type FxRatesSnapshot,
} from './utils/fxService';
import type { ValuationInputs } from './valuation';
import type { EquifyWizardFinancials } from './wizard/map_equify_wizard';

export interface NormalizedInputs {
  revenue_ils: number;
  ebitda_ils: number;
  net_debt_ils: number;
  original_currency: ReportingCurrencyCode;
  exchange_rate_used: number;
}

/** ILS per one unit of foreign currency (e.g. 3.69 ILS per USD). */
export function getIlsPerForeignUnit(
  currency: ReportingCurrencyCode | string | undefined,
  rates: FxRatesSnapshot = getCachedFxRates(),
): number {
  const code = normalizeCurrencyCode(currency);
  if (code === 'ILS') return 1;
  const fromIls = rates.fromIls[code];
  if (!Number.isFinite(fromIls) || fromIls <= 0) return 1;
  return 1 / fromIls;
}

/** Multiply reporting-currency amounts → ILS (same numeric scale). */
export function getReportingToIlsMultiplier(
  currency: ReportingCurrencyCode | string | undefined,
  rates: FxRatesSnapshot = getCachedFxRates(),
): number {
  return getIlsPerForeignUnit(currency, rates);
}

function scaleK(value: number, multiplier: number): number {
  if (!Number.isFinite(value)) return value;
  return value * multiplier;
}

/** Scale a single ₪K / $K / €K field to ILS ₪K storage. */
export function convertReportingKToIlsK(
  amountK: number,
  currency: ReportingCurrencyCode | string | undefined,
  rates?: FxRatesSnapshot,
): number {
  return scaleK(amountK, getReportingToIlsMultiplier(currency, rates));
}

/** Scale all wizard monetary K fields to ILS — engine input path only. */
export function scaleEquifyFinancialsToIlsK(
  financials: EquifyWizardFinancials,
  currency: ReportingCurrencyCode | string | undefined,
  rates: FxRatesSnapshot = getCachedFxRates(),
): EquifyWizardFinancials {
  const m = getReportingToIlsMultiplier(currency, rates);
  if (m === 1) return financials;

  const scaleYear = (y: { revenueK: number; ebitdaK: number }) => ({
    revenueK: scaleK(y.revenueK, m),
    ebitdaK: scaleK(y.ebitdaK, m),
  });

  return {
    ...financials,
    y2024: scaleYear(financials.y2024),
    y2025: scaleYear(financials.y2025),
    y2026: scaleYear(financials.y2026),
    rev: scaleK(financials.rev, m),
    grossDebtK: scaleK(financials.grossDebtK, m),
    cashK: scaleK(financials.cashK, m),
    normalizedOwnerSalaryK: scaleK(financials.normalizedOwnerSalaryK, m),
    projectedEbitdaK: financials.projectedEbitdaK.map((v) => scaleK(v, m)) as [
      number,
      number,
      number,
    ],
    backlogSignedK: scaleK(financials.backlogSignedK, m),
    debt: scaleK(financials.debt, m),
  };
}

export interface RawWizardInputs {
  currency: ReportingCurrencyCode;
  revenue: number;
  ebitda: number;
  net_debt: number;
}

/** Normalize headline wizard inputs to ILS before valuation math. */
export async function normalizeToILS(
  inputs: RawWizardInputs,
  rates?: FxRatesSnapshot,
): Promise<NormalizedInputs> {
  const snapshot = rates ?? (await refreshFxRates());
  const original_currency = normalizeCurrencyCode(inputs.currency);

  if (original_currency === 'ILS') {
    return {
      revenue_ils: inputs.revenue,
      ebitda_ils: inputs.ebitda,
      net_debt_ils: inputs.net_debt,
      original_currency: 'ILS',
      exchange_rate_used: 1,
    };
  }

  const rate = getIlsPerForeignUnit(original_currency, snapshot);
  return {
    revenue_ils: inputs.revenue * rate,
    ebitda_ils: inputs.ebitda * rate,
    net_debt_ils: inputs.net_debt * rate,
    original_currency,
    exchange_rate_used: rate,
  };
}

/** Synchronous normalize for engine pipeline (uses cached / fallback FX). */
export function normalizeToILSSync(
  inputs: RawWizardInputs,
  rates: FxRatesSnapshot = getCachedFxRates(),
): NormalizedInputs {
  const original_currency = normalizeCurrencyCode(inputs.currency);

  if (original_currency === 'ILS') {
    return {
      revenue_ils: inputs.revenue,
      ebitda_ils: inputs.ebitda,
      net_debt_ils: inputs.net_debt,
      original_currency: 'ILS',
      exchange_rate_used: 1,
    };
  }

  const rate = getIlsPerForeignUnit(original_currency, rates);
  return {
    revenue_ils: inputs.revenue * rate,
    ebitda_ils: inputs.ebitda * rate,
    net_debt_ils: inputs.net_debt * rate,
    original_currency,
    exchange_rate_used: rate,
  };
}

export interface ValuationOutputFormatted {
  primary_ils: string;
  secondary_usd: string;
  secondary_eur: string;
  rate_timestamp: string;
  usd_rate_used: number;
  eur_rate_used: number;
  equity_ils: number;
  equity_usd: number;
  equity_eur: number;
}

/** Display-only conversion after ILS equity is computed. */
export async function formatValuationOutput(
  equity_value_ils: number,
  rates?: FxRatesSnapshot,
): Promise<ValuationOutputFormatted> {
  const snapshot = rates ?? (await refreshFxRates());
  return formatValuationOutputSync(equity_value_ils, snapshot);
}

/** Synchronous display conversion — uses cached FX snapshot. */
export function formatValuationOutputSync(
  equity_value_ils: number,
  rates: FxRatesSnapshot = getCachedFxRates(),
): ValuationOutputFormatted {
  const usd_rate_used = getIlsPerForeignUnit('USD', rates);
  const eur_rate_used = getIlsPerForeignUnit('EUR', rates);
  const equity_usd = equity_value_ils / usd_rate_used;
  const equity_eur = equity_value_ils / eur_rate_used;

  return {
    primary_ils: formatILS(equity_value_ils),
    secondary_usd: formatCurrency(equity_usd, 'USD'),
    secondary_eur: formatCurrency(equity_eur, 'EUR'),
    rate_timestamp: new Date().toISOString(),
    usd_rate_used,
    eur_rate_used,
    equity_ils: equity_value_ils,
    equity_usd,
    equity_eur,
  };
}

/** Apply ILS normalization to {@link ValuationInputs} monetary fields. */
export function normalizeValuationInputsToIls(
  inputs: ValuationInputs,
  currency: ReportingCurrencyCode | string | undefined,
  rates: FxRatesSnapshot = getCachedFxRates(),
): ValuationInputs {
  const m = getReportingToIlsMultiplier(currency, rates);
  if (m === 1) return inputs;

  const scale = (v: number | undefined): number | undefined =>
    v == null ? v : scaleK(v, m);
  const scaleArray = (arr: number[] | undefined): number[] | undefined =>
    arr == null ? arr : arr.map((v) => scaleK(v, m));

  return {
    ...inputs,
    rev: scaleK(inputs.rev, m),
    debt: scaleK(inputs.debt, m),
    grossDebt: scaleK(inputs.grossDebt ?? 0, m),
    cash: scaleK(inputs.cash ?? 0, m),
    normalizedOwnerSalary: scaleK(inputs.normalizedOwnerSalary ?? 0, m),
    revenue2026K: scaleK(inputs.revenue2026K ?? inputs.rev, m),
    revenue2024K: scale(inputs.revenue2024K),
    revenue2025K: scale(inputs.revenue2025K),
    ebitda2024K: scale(inputs.ebitda2024K),
    ebitda2025K: scale(inputs.ebitda2025K),
    ebitda2026K: scale(inputs.ebitda2026K),
    ebitda2027K: scale(inputs.ebitda2027K ?? undefined),
    projectedEbitdaK: scaleArray(inputs.projectedEbitdaK),
    backlogSignedK: scaleK(inputs.backlogSignedK ?? 0, m),
  };
}
