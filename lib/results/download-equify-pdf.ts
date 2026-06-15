'use client';

import type { ValuationLocale } from '../../api_client';
import { getIndustryLabel } from '../constants/industries';
import { queueLeadPersistenceBeforeExport } from '../pdf/lead_persistence_queue';
import {
  DEFAULT_EQUIFY_WIZARD_STATE,
  type EquifyWizardState,
} from '../wizard/map_equify_wizard';
import { loadEquifyWizardState } from '../wizard/equify_storage';
import { captureWizardLeadIdentifiers } from '../wizard/lead_wire';
import { mapEquifyToWizardFormValues } from '../wizard/map_equify_wizard';
import { resolveDisplayCompanyName } from '../wizard/resolve_company_display';

const MATRIX_STORAGE_KEY = 'valubot.lastValuationMatrix';

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
): EquifyWizardState {
  const stored = loadEquifyWizardState();
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
  };
}

export interface DownloadEquifyPdfOptions {
  equityValue: number;
  reportId?: string;
  companyName?: string;
  industryCode?: string;
  locale?: ValuationLocale;
}

/** Generates PDF via /api/generate-pdf and triggers a secure browser download. */
export async function downloadEquifyPdf(
  options: DownloadEquifyPdfOptions,
): Promise<void> {
  if (typeof window === 'undefined') return;

  const locale = options.locale ?? 'he';

  try {
    const state = resolvePdfWizardState(locale, options.companyName);
    const formValues = mapEquifyToWizardFormValues(state);
    const ids = captureWizardLeadIdentifiers(formValues);
    const displayCompany = resolveDisplayCompanyName(
      options.companyName ?? state.profile.companyName,
      locale,
    );
    const sectorLabel = options.industryCode
      ? getIndustryLabel(options.industryCode, locale)
      : undefined;

    queueLeadPersistenceBeforeExport({
      fullName: ids.fullName,
      companyName: displayCompany,
      nationalId: ids.nationalId,
      corporateTaxId: ids.corporateTaxId,
      userPhone: ids.userPhone,
      userEmail: ids.userEmail,
      valuationMidpoint: options.equityValue,
      industry: options.industryCode ?? formValues.industry,
      sectorLabel,
      locale,
    });

    const payload = {
      state,
      reportId: options.reportId,
      filename: defaultPdfFilename(displayCompany),
      locale,
    };

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message =
        locale === 'he'
          ? 'יצירת PDF נכשלה. נסה שוב בעוד רגע.'
          : 'PDF generation failed. Please try again shortly.';
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
        locale === 'he' ? 'קובץ PDF ריק התקבל מהשרת.' : 'Received an empty PDF from the server.',
      );
    }

    const filename =
      parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
      defaultPdfFilename(displayCompany);

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      locale === 'he' ? 'יצירת PDF נכשלה. נסה שוב.' : 'PDF generation failed. Please try again.',
    );
  }
}
