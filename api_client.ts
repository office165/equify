/**
 * Client integration layer — wizard intake → live API → forecast matrix for dashboard.
 * Includes locale persistence and financial diagnostics derived from wizard inputs.
 */

import type { ValuationWizardFormValues } from './ValuationWizard';
import { ensureAbsolute } from './lib/utils/ensureAbsoluteFinancial';
import { parseFinancialInput } from './lib/utils/financialParser';
import type { LifecycleStage, MultiplesRange } from './lib/valuation/multiples';
import type { ForecastMatrixWithDiagnostics } from './valuation_forecast';

// =============================================================================
// Locale (English / Hebrew)
// =============================================================================

export type ValuationLocale = 'en' | 'he';

export const VALUATION_LOCALE_STORAGE_KEY = 'valubot.locale';

export function readValuationLocale(): ValuationLocale {
  if (typeof window === 'undefined') return 'he';
  try {
    const stored = window.localStorage.getItem(VALUATION_LOCALE_STORAGE_KEY);
    if (stored === 'en') return 'en';
    if (stored === 'he') return 'he';
    return 'he';
  } catch {
    return 'he';
  }
}

export function writeValuationLocale(locale: ValuationLocale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VALUATION_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore quota / private mode */
  }
}

const API_ERRORS: Record<ValuationLocale, { calculateFailed: string }> = {
  en: { calculateFailed: 'Valuation request failed.' },
  he: { calculateFailed: 'בקשת הערכת השווי נכשלה.' },
};

export function getApiErrorMessage(
  locale: ValuationLocale,
  key: keyof (typeof API_ERRORS)['en'],
): string {
  return API_ERRORS[locale][key];
}

// =============================================================================
// Financial diagnostics (from wizard intake)
// =============================================================================

const DEFAULT_TAX_RATE = 0.23;

export type DiagnosticStatus = 'healthy' | 'watch' | 'stress' | 'na';

export interface FinancialDiagnosticMetric {
  id: string;
  value: number | null;
  formatted: string;
  status: DiagnosticStatus;
  benchmarkNote?: string;
}

export interface FinancialDiagnosticsPayload {
  liquidity: {
    currentRatio: FinancialDiagnosticMetric;
    quickRatio: FinancialDiagnosticMetric;
  };
  leverage: {
    netDebtToEbitda: FinancialDiagnosticMetric;
    debtToEquity: FinancialDiagnosticMetric;
  };
  operational: {
    assetTurnover: FinancialDiagnosticMetric;
    netProfitMargin: FinancialDiagnosticMetric;
  };
  proxies: {
    totalAssetsProxy: number;
    shortTermObligationsProxy: number;
    currentAssetsProxy: number;
    quickAssetsProxy: number;
    netDebt: number;
    equityBookProxy: number;
    estimatedNetIncome: number;
  };
}

export interface DiagnosticsInputsSnapshot {
  annual_revenue: number;
  ebitda: number;
  ebit: number;
  total_debt: number;
  cash: number;
  interest_expense: number;
  free_cash_flow: number;
  tax_rate: number;
}

export type { ForecastMatrixWithDiagnostics };

function formatRatio(value: number | null, decimals = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function statusCurrentRatio(ratio: number | null): DiagnosticStatus {
  if (ratio === null) return 'na';
  if (ratio >= 1.5) return 'healthy';
  if (ratio >= 1.0) return 'watch';
  return 'stress';
}

function statusQuickRatio(ratio: number | null): DiagnosticStatus {
  if (ratio === null) return 'na';
  if (ratio >= 1.0) return 'healthy';
  if (ratio >= 0.8) return 'watch';
  return 'stress';
}

function statusNetDebtEbitda(ratio: number | null): DiagnosticStatus {
  if (ratio === null) return 'na';
  if (ratio <= 2.5) return 'healthy';
  if (ratio <= 4.0) return 'watch';
  return 'stress';
}

function statusDebtToEquity(ratio: number | null): DiagnosticStatus {
  if (ratio === null) return 'na';
  if (ratio <= 1.0) return 'healthy';
  if (ratio <= 2.0) return 'watch';
  return 'stress';
}

function statusAssetTurnover(turnover: number | null): DiagnosticStatus {
  if (turnover === null) return 'na';
  if (turnover >= 0.8) return 'healthy';
  if (turnover >= 0.5) return 'watch';
  return 'stress';
}

function statusNetMargin(margin: number | null): DiagnosticStatus {
  if (margin === null) return 'na';
  if (margin >= 0.1) return 'healthy';
  if (margin >= 0.03) return 'watch';
  return 'stress';
}

/**
 * Derive liquidity, leverage, and efficiency metrics from wizard financial inputs.
 * Uses transparent proxies where full balance-sheet lines are not collected.
 */
export function computeFinancialDiagnostics(
  inputs: DiagnosticsInputsSnapshot,
): FinancialDiagnosticsPayload {
  const revenue = Math.max(inputs.annual_revenue, 0);
  const ebitda = inputs.ebitda;
  const cash = Math.max(inputs.cash, 0);
  const debt = Math.max(inputs.total_debt, 0);
  const interest = Math.max(inputs.interest_expense, 0);

  const monthlyRevenue = revenue > 0 ? revenue / 12 : 0;
  const currentAssetsProxy = cash + monthlyRevenue * 2;
  const quickAssetsProxy = cash + monthlyRevenue * 0.8;
  const shortTermObligationsProxy = debt * 0.35 + interest;
  const totalAssetsProxy = Math.max(
    revenue * 1.2 + cash + debt * 0.5,
    currentAssetsProxy + debt * 0.65,
    1,
  );

  const netDebt = debt - cash;
  const equityBookProxy = Math.max(revenue * 2.5 - netDebt, revenue * 0.5, 1);
  const tax = inputs.tax_rate;
  const estimatedNetIncome =
    ebitda > 0 ? ebitda * (1 - tax) * 0.72 : inputs.ebit * (1 - tax);

  const currentRatio =
    shortTermObligationsProxy > 0
      ? currentAssetsProxy / shortTermObligationsProxy
      : null;
  const quickRatio =
    shortTermObligationsProxy > 0
      ? quickAssetsProxy / shortTermObligationsProxy
      : null;
  const netDebtToEbitda =
    ebitda > 0 ? netDebt / ebitda : null;
  const debtToEquity = equityBookProxy > 0 ? debt / equityBookProxy : null;
  const assetTurnover =
    totalAssetsProxy > 0 && revenue > 0 ? revenue / totalAssetsProxy : null;
  const netProfitMargin =
    revenue > 0 && Number.isFinite(estimatedNetIncome)
      ? estimatedNetIncome / revenue
      : null;

  const metric = (
    id: string,
    value: number | null,
    formatted: string,
    status: DiagnosticStatus,
    benchmarkNote?: string,
  ): FinancialDiagnosticMetric => ({
    id,
    value,
    formatted,
    status,
    benchmarkNote,
  });

  return {
    liquidity: {
      currentRatio: metric(
        'current_ratio',
        currentRatio,
        formatRatio(currentRatio),
        statusCurrentRatio(currentRatio),
        'אזור נוחות אופייני: ≥ 1.5×',
      ),
      quickRatio: metric(
        'quick_ratio',
        quickRatio,
        formatRatio(quickRatio),
        statusQuickRatio(quickRatio),
        'אזור נוחות אופייני: ≥ 1.0×',
      ),
    },
    leverage: {
      netDebtToEbitda: metric(
        'net_debt_ebitda',
        netDebtToEbitda,
        formatRatio(netDebtToEbitda),
        statusNetDebtEbitda(netDebtToEbitda),
        'טכנולוגיה ברמת אשראי: לרוב < 3.0×',
      ),
      debtToEquity: metric(
        'debt_to_equity',
        debtToEquity,
        formatRatio(debtToEquity),
        statusDebtToEquity(debtToEquity),
        'חברה פרטית שמרנית: לרוב < 1.5×',
      ),
    },
    operational: {
      assetTurnover: metric(
        'asset_turnover',
        assetTurnover,
        formatRatio(assetTurnover),
        statusAssetTurnover(assetTurnover),
        'גבוה יותר = יותר הכנסות לכל שקל נכסים',
      ),
      netProfitMargin: metric(
        'net_profit_margin',
        netProfitMargin,
        formatPct(netProfitMargin),
        statusNetMargin(netProfitMargin),
        'יעדי רווחיות SaaS בקנה מידה: לרוב > 15%',
      ),
    },
    proxies: {
      totalAssetsProxy,
      shortTermObligationsProxy,
      currentAssetsProxy,
      quickAssetsProxy,
      netDebt,
      equityBookProxy,
      estimatedNetIncome,
    },
  };
}

export function buildDiagnosticsInputsFromWizard(
  values: ValuationWizardFormValues,
  taxRate = DEFAULT_TAX_RATE,
): DiagnosticsInputsSnapshot {
  const revenue = parseNumber(values.annualRevenue, 0);
  const ebitda = parseNumber(values.ebitda, 0);
  const ebitEstimate = ebitda > 0 ? ebitda * 0.85 : 0;

  return {
    annual_revenue: revenue,
    ebitda,
    ebit: ebitEstimate,
    total_debt: parseNumber(values.totalDebt, 0),
    cash: parseNumber(values.cashAndEquivalents, 0),
    interest_expense: parseNumber(values.interestExpense, 0),
    free_cash_flow: parseNumber(values.freeCashFlow, 0),
    tax_rate: taxRate,
  };
}

export const VALUATION_CALCULATE_PATH = '/api/v1/valuation/calculate';
/** Mock-isolated Pages API — no database dependency for OTP auth. */
export const AUTH_WHATSAPP_PATH = '/api/auth/whatsapp';
export const AUTH_REQUEST_OTP_PATH = AUTH_WHATSAPP_PATH;
export const AUTH_VERIFY_OTP_PATH = AUTH_WHATSAPP_PATH;
export const VALUATION_PDF_PATH = (valuationId: string) =>
  `/api/v1/reports/valuation/${valuationId}/pdf`;
/** Stateless Puppeteer PDF — POST forecastMatrix + overrides. */
export const VALUATION_PDF_STATELESS_PATH = '/api/v1/reports/valuation/pdf';
export const VALUATION_DISPATCH_PATH = '/api/v1/reports/valuation/dispatch';

export const AUTH_SESSION_STORAGE_KEY = 'valubot.auth.session';

export const ON_DEMAND_CHECKOUT_AMOUNT_ILS = 99;
export const ON_DEMAND_CURRENCY = 'ILS' as const;

/** Payload shape aligned with server_gateway ValuationCalculateDto + wizard fields. */
export interface ValuationCalculateRequest {
  companyId: string;
  valuationTitle?: string;
  rawRdExpenses: number[];
  purpose?: string;
  wizard: ValuationWizardFormValues;
}

export interface PaymentVerification {
  verified: true;
  gatewayTransactionId: string;
  gatewaySaleId: string;
  amount: number;
  currency: typeof ON_DEMAND_CURRENCY;
  status: 'success';
}

export interface ValuationCalculateSuccessResponse {
  status: 'completed';
  valuationId: string;
  entitlement: 'on_demand_token' | 'subscription';
  payment: PaymentVerification;
  forecast_matrix_json: ForecastMatrixWithDiagnostics;
  /** Explicit lifecycle stage (optional — also on wizard.lifecycleStage) */
  stage?: LifecycleStage;
  /** Israeli multiples low / base / high EV range */
  valuationRange?: { low: number; base: number; high: number } | null;
  selectedMultiple?: {
    multiple: string;
    label: string;
    rationale: string;
  } | null;
  multiplesUsed?: MultiplesRange | null;
}

function parseNumber(value: string, fallback = 0): number {
  if (!value.trim()) return fallback;
  const n = parseFinancialInput(value);
  return Number.isFinite(n) ? n : fallback;
}

function slugCompanyId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `company-${Date.now()}`;
}

function absoluteFinancialString(raw: string): string {
  if (!raw.trim()) return '';
  const n = ensureAbsolute(parseNumber(raw, 0));
  return n ? String(n) : '';
}

/** Map wizard form values to the POST body expected by `/api/v1/valuation/calculate`. */
export function buildCalculateRequestPayload(
  values: ValuationWizardFormValues,
): ValuationCalculateRequest {
  const wizard: ValuationWizardFormValues = {
    ...values,
    annualRevenue: absoluteFinancialString(values.annualRevenue),
    ebitda: absoluteFinancialString(values.ebitda),
    freeCashFlow: absoluteFinancialString(values.freeCashFlow),
    interestExpense: absoluteFinancialString(values.interestExpense),
    totalDebt: absoluteFinancialString(values.totalDebt),
    cashAndEquivalents: absoluteFinancialString(values.cashAndEquivalents),
    netDebt: absoluteFinancialString(values.netDebt),
    rdExpensesY1: absoluteFinancialString(values.rdExpensesY1),
    rdExpensesY2: absoluteFinancialString(values.rdExpensesY2),
    rdExpensesY3: absoluteFinancialString(values.rdExpensesY3),
    rdExpensesY4: absoluteFinancialString(values.rdExpensesY4),
    rdExpensesY5: absoluteFinancialString(values.rdExpensesY5),
  };

  const rawRdExpenses = [
    wizard.rdExpensesY1,
    wizard.rdExpensesY2,
    wizard.rdExpensesY3,
    wizard.rdExpensesY4,
    wizard.rdExpensesY5,
  ].map((v) => ensureAbsolute(parseNumber(v, 0)));

  return {
    companyId: slugCompanyId(wizard.companyName),
    valuationTitle: wizard.companyName.trim() || undefined,
    rawRdExpenses,
    purpose: wizard.valuationPurpose || undefined,
    wizard,
  };
}

/** POST to calculate endpoint (live PostgreSQL via Next.js API route). */
export async function postCalculateValuation(
  values: ValuationWizardFormValues,
  options?: { locale?: ValuationLocale },
): Promise<ValuationCalculateSuccessResponse> {
  const locale = options?.locale ?? readValuationLocale();
  const payload = buildCalculateRequestPayload(values);

  const response = await fetch(VALUATION_CALCULATE_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': locale === 'he' ? 'he-IL' : 'en-US',
    },
    body: JSON.stringify({ ...payload, locale }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      text ||
        `${getApiErrorMessage(locale, 'calculateFailed')} (${response.status})`,
    );
  }

  return response.json() as Promise<ValuationCalculateSuccessResponse>;
}

/** POST calculate with inline PDF response (`Equify_Valuation_Report.pdf`). */
export async function postCalculateValuationPdf(
  values: ValuationWizardFormValues,
  options?: { locale?: ValuationLocale },
): Promise<Blob> {
  const locale = options?.locale ?? readValuationLocale();
  const payload = buildCalculateRequestPayload(values);

  const response = await fetch(`${VALUATION_CALCULATE_PATH}?format=pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
      'Accept-Language': locale === 'he' ? 'he-IL' : 'en-US',
    },
    body: JSON.stringify({ ...payload, locale, returnPdf: true }),
  });

  if (!response.ok) {
    const payloadErr = await response.json().catch(() => ({}));
    throw new Error(
      (payloadErr as { error?: string }).error ??
        `${getApiErrorMessage(locale, 'calculateFailed')} (${response.status})`,
    );
  }

  return response.blob();
}

/** End-to-end MVP flow — in-memory valuation JSON (no database). */
export async function runValuationFlow(
  values: ValuationWizardFormValues,
  options?: { locale?: ValuationLocale; downloadPdf?: boolean },
): Promise<ValuationCalculateSuccessResponse> {
  const locale = options?.locale ?? readValuationLocale();
  const payload = buildCalculateRequestPayload(values);
  const session = readAuthSession();

  const response = await fetch(`${VALUATION_CALCULATE_PATH}?format=json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': locale === 'he' ? 'he-IL' : 'en-US',
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    },
    body: JSON.stringify({
      ...payload,
      locale,
      returnPdf: false,
      email: session?.user.email,
      phone: session?.user.phoneE164,
    }),
  });

  if (!response.ok) {
    const payloadErr = await response.json().catch(() => ({}));
    throw new Error(
      (payloadErr as { error?: string }).error ??
        `${getApiErrorMessage(locale, 'calculateFailed')} (${response.status})`,
    );
  }

  const result = (await response.json()) as ValuationCalculateSuccessResponse & {
    forecast_matrix_json: ValuationCalculateSuccessResponse['forecast_matrix_json'];
    valuationId: string;
    payment?: PaymentVerification;
  };

  const normalized: ValuationCalculateSuccessResponse = {
    status: 'completed',
    valuationId: result.valuationId,
    entitlement: result.entitlement ?? 'on_demand_token',
    payment: result.payment ?? {
      verified: true,
      gatewayTransactionId: `txn_${result.valuationId.slice(0, 8)}`,
      gatewaySaleId: `sale_${result.valuationId.slice(0, 8)}`,
      amount: ON_DEMAND_CHECKOUT_AMOUNT_ILS,
      currency: ON_DEMAND_CURRENCY,
      status: 'success',
    },
    forecast_matrix_json: result.forecast_matrix_json,
  };

  // PDF is generated client-side from the live dashboard (html2canvas + jsPDF).
  void options?.downloadPdf;

  return normalized;
}

// =============================================================================
// WhatsApp OTP authentication (passwordless)
// =============================================================================

export interface AuthSessionResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    organizationId: string;
    phoneE164: string;
  };
}

export function readAuthSession(): AuthSessionResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSessionResponse;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSessionResponse): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function requestWhatsAppOtp(
  phone: string,
): Promise<{ expiresInSeconds: number }> {
  const response = await fetch(AUTH_REQUEST_OTP_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: string }).error ?? 'OTP request failed',
    );
  }
  return response.json() as Promise<{ expiresInSeconds: number }>;
}

export async function verifyWhatsAppOtp(
  phone: string,
  code: string,
): Promise<AuthSessionResponse> {
  const response = await fetch(AUTH_VERIFY_OTP_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: string }).error ?? 'OTP verification failed',
    );
  }
  const session = (await response.json()) as AuthSessionResponse;
  writeAuthSession(session);
  return session;
}

export async function dispatchValuationReport(params: {
  valuationId: string;
  locale?: ValuationLocale;
  email?: string;
  phone?: string;
}): Promise<{ pdfBytes: number; emailSent: boolean; whatsappSent: boolean }> {
  const session = readAuthSession();
  const response = await fetch(VALUATION_DISPATCH_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: string }).error ?? 'Report dispatch failed',
    );
  }
  return response.json() as Promise<{
    pdfBytes: number;
    emailSent: boolean;
    whatsappSent: boolean;
  }>;
}

/** Download valuation PDF via Puppeteer API (stateless POST). */
export async function downloadValuationPdf(
  _valuationId: string,
  locale: ValuationLocale = 'he',
  options?: { forecastMatrix?: ForecastMatrixWithDiagnostics },
): Promise<Blob> {
  if (!options?.forecastMatrix) {
    throw new Error('forecastMatrix is required for PDF download.');
  }

  const response = await fetch(VALUATION_PDF_STATELESS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      forecastMatrix: options.forecastMatrix,
      locale,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { message?: string }).message ??
        (payload as { error?: string }).error ??
        'PDF download failed.',
    );
  }

  return response.blob();
}

/** Trigger browser download of a valuation PDF blob. */
export function saveValuationPdfBlob(blob: Blob, filename = 'Equify_Valuation_Report.pdf'): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
