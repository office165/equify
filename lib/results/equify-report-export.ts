'use client';

import type { ValuationLocale } from '../../api_client';
import { getIndustryLabel } from '../constants/industries';
import { getSectorDisplayLabel } from '../constants/industry_config';
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

const MATRIX_STORAGE_KEY = 'valubot.lastValuationMatrix';

export interface EquifyReportExportOptions {
  equityValue: number;
  reportId?: string;
  companyName?: string;
  industryCode?: string;
  locale?: ValuationLocale;
  /** Live wizard state — preferred over sessionStorage when exporting PDF/HTML. */
  state?: EquifyWizardState | null;
}

export interface EquifyReportExportPayload {
  state: EquifyWizardState;
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
      companyName: displayName,
    },
    financials: syncFinancialsDerived(base.financials),
  };
}

/** Builds POST body for /api/generate-pdf and /api/generate-html. */
export function buildEquifyReportExportPayload(
  options: EquifyReportExportOptions,
  format: 'pdf' | 'html',
): EquifyReportExportPayload {
  const locale = options.locale ?? 'he';
  const state = resolvePdfWizardState(locale, options.companyName, options.state);
  const displayCompany = resolveDisplayCompanyName(
    options.companyName ?? state.profile.companyName,
    locale,
  );

  return {
    state,
    reportId: options.reportId,
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
    valuationMidpoint: options.equityValue,
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
      const err = (await response.json()) as { error?: string; message?: string };
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

  const payload = buildEquifyReportExportPayload(options, 'pdf');
  await downloadFromReportApi('/api/generate-pdf', payload, payload.filename, payload.locale);
  await captureLeadAfterSuccessfulExport(options, payload);
}

/** Downloads the same dynamic 8-page HTML report as a standalone .html file. */
export async function downloadEquifyHtml(options: EquifyReportExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload = buildEquifyReportExportPayload(options, 'html');
  await downloadFromReportApi('/api/generate-html', payload, payload.filename, payload.locale);
  await captureLeadAfterSuccessfulExport(options, payload);
}
