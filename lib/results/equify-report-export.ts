'use client';

import type { ValuationLocale } from '../../api_client';
import { getIndustryLabel } from '../constants/industries';
import { coerceWizardSectorSelection, getSectorDisplayLabel } from '../constants/industry_config';
import {
  captureLeadAfterReportExport,
  type LeadPersistenceInput,
} from '../pdf/lead_persistence_queue';
import {
  DEFAULT_EQUIFY_WIZARD_STATE,
  type EquifyWizardState,
} from '../wizard/map_equify_wizard';
import { loadEquifyWizardState } from '../wizard/equify_storage';
import { captureWizardLeadIdentifiers } from '../wizard/lead_wire';
import { mapEquifyToWizardFormValues } from '../wizard/map_equify_wizard';
import { resolveDisplayCompanyName } from '../wizard/resolve_company_display';
import { syncFinancialsDerived } from '../wizard/financial_history';
import { getCachedFxRates } from '../utils/fxService';
import type { ValuationData } from '../pdf-template/types';
import {
  buildValuationReportSnapshot,
  type ValuationReportSnapshot,
} from './valuation-report-snapshot';

const MATRIX_STORAGE_KEY = 'valubot.lastValuationMatrix';

export interface EquifyReportExportOptions {
  equityValue: number;
  reportId?: string;
  companyName?: string;
  industryCode?: string;
  locale?: ValuationLocale;
  /** Live wizard state — required for atomic snapshot export. */
  state?: EquifyWizardState | null;
  /** Pre-computed PDF layout from the live dashboard — single source of truth for export numbers. */
  valuationData?: ValuationData;
}

export interface EquifyReportExportPayload {
  state: EquifyWizardState;
  snapshot: ValuationReportSnapshot;
  reportId?: string;
  filename: string;
  locale: ValuationLocale;
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const plain = /filename="?([^";\n]+)"?/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}

function defaultPdfFilename(companyName: string): string {
  const safe = companyName.trim() || 'equify';
  return `דוח_${safe}.pdf`;
}

function defaultHtmlFilename(companyName: string): string {
  const safe = companyName.trim() || 'equify';
  return `דוח_${safe}.html`;
}

function readMatrixCompanyName(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(MATRIX_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { meta?: { company_name?: string } };
    return parsed.meta?.company_name?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function resolvePdfWizardState(
  locale: ValuationLocale,
  companyNameHint?: string,
  stateOverride?: EquifyWizardState | null,
): EquifyWizardState {
  const stored = stateOverride ?? loadEquifyWizardState();
  const base = stored ?? DEFAULT_EQUIFY_WIZARD_STATE;
  const coerced = coerceWizardSectorSelection(base.profile.sector, base.profile.subSector);
  const rawName =
    stored?.profile?.companyName?.trim() ||
    companyNameHint?.trim() ||
    readMatrixCompanyName() ||
    '';
  const displayName = resolveDisplayCompanyName(rawName, locale);

  return {
    ...base,
    profile: {
      ...base.profile,
      sector: coerced.sector,
      subSector: coerced.subSector,
      companyName: displayName,
    },
    financials: syncFinancialsDerived(base.financials),
  };
}

/** Builds atomic POST body for /api/generate-pdf and /api/generate-html. */
export async function buildEquifyReportExportPayload(
  options: EquifyReportExportOptions,
  format: 'pdf' | 'html',
): Promise<EquifyReportExportPayload> {
  const locale = options.locale ?? 'he';
  const state = resolvePdfWizardState(locale, options.companyName, options.state);
  const displayCompany = resolveDisplayCompanyName(
    options.companyName ?? state.profile.companyName,
    locale,
  );

  const fxRates = getCachedFxRates();
  const snapshot = buildValuationReportSnapshot({
    state,
    locale,
    reportId: options.reportId,
    fxRates,
    valuationData: options.valuationData,
  });

  const equityDelta = Math.abs(snapshot.valuationData.equity - options.equityValue);
  const equityTolerance = Math.max(25_000, options.equityValue * 0.02);
  if (equityDelta > equityTolerance) {
    const message =
      locale === 'he'
        ? 'נתוני הדוח לא תואמים למסך התוצאות. רענן את העמוד והורד שוב.'
        : 'Report numbers do not match the live results screen. Refresh and download again.';
    throw new Error(message);
  }

  return {
    state,
    snapshot,
    reportId: options.reportId ?? snapshot.reportId,
    filename:
      format === 'html'
        ? defaultHtmlFilename(displayCompany)
        : defaultPdfFilename(displayCompany),
    locale,
  };
}

function buildLeadPersistenceInput(
  options: EquifyReportExportOptions,
  payload: EquifyReportExportPayload,
): LeadPersistenceInput {
  const formValues = mapEquifyToWizardFormValues(payload.state);
  const ids = captureWizardLeadIdentifiers(formValues);
  const displayCompany = resolveDisplayCompanyName(
    options.companyName ?? payload.state.profile.companyName,
    payload.locale,
  );
  const industryCode = options.industryCode ?? formValues.industry;
  const sectorLabel =
    (industryCode ? getIndustryLabel(industryCode, payload.locale) : undefined) ||
    getSectorDisplayLabel(
      payload.state.profile.sector,
      payload.state.profile.subSector,
      payload.locale,
    );

  return {
    fullName: ids.fullName,
    companyName: displayCompany,
    nationalId: ids.nationalId,
    corporateTaxId: ids.corporateTaxId,
    userPhone: ids.userPhone,
    userEmail: ids.userEmail,
    valuationMidpoint: payload.snapshot.valuationData.equity,
    industry: industryCode,
    sectorLabel,
    locale: payload.locale,
  };
}

async function captureLeadAfterSuccessfulExport(
  options: EquifyReportExportOptions,
  payload: EquifyReportExportPayload,
): Promise<void> {
  try {
    await captureLeadAfterReportExport(buildLeadPersistenceInput(options, payload));
  } catch (err) {
    console.error('[equify-export] CRM capture failed (export already succeeded)', err);
  }
}

async function downloadFromReportApi(
  endpoint: '/api/generate-pdf' | '/api/generate-html',
  payload: EquifyReportExportPayload,
  fallbackFilename: string,
  locale: ValuationLocale,
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Snapshot-Hash': payload.snapshot.snapshotHash,
    },
    body: JSON.stringify({
      state: payload.state,
      snapshot: payload.snapshot,
      reportId: payload.reportId,
      filename: payload.filename,
      locale: payload.locale,
    }),
  });

  if (!response.ok) {
    let message =
      locale === 'he'
        ? endpoint === '/api/generate-pdf'
          ? 'יצירת PDF נכשלה. נסה שוב בעוד רגע.'
          : 'יצירת HTML נכשלה. נסה שוב בעוד רגע.'
        : endpoint === '/api/generate-pdf'
          ? 'PDF generation failed. Please try again shortly.'
          : 'HTML generation failed. Please try again shortly.';
    try {
      const err = (await response.json()) as { error?: string; message?: string; code?: string };
      if (err.code === 'STALE_SNAPSHOT') {
        message =
          locale === 'he'
            ? 'נתוני הדוח השתנו מאז טעינת העמוד. רענן את התוצאות והורד שוב.'
            : 'Report data changed since the page loaded. Refresh results and download again.';
      }
      message = err.error ?? err.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error(
      locale === 'he'
        ? 'קובץ ריק התקבל מהשרת.'
        : 'Received an empty file from the server.',
    );
  }

  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
    fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/** Generates the 8-page institutional PDF via Puppeteer API route. */
export async function downloadEquifyPdf(options: EquifyReportExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload = await buildEquifyReportExportPayload(options, 'pdf');
  await downloadFromReportApi('/api/generate-pdf', payload, payload.filename, payload.locale);
  await captureLeadAfterSuccessfulExport(options, payload);
}

/** Downloads the same dynamic 8-page HTML report as a standalone .html file. */
export async function downloadEquifyHtml(options: EquifyReportExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload = await buildEquifyReportExportPayload(options, 'html');
  await downloadFromReportApi('/api/generate-html', payload, payload.filename, payload.locale);
  await captureLeadAfterSuccessfulExport(options, payload);
}
