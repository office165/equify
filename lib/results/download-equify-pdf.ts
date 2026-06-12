'use client';

import { getIndustryLabel } from '../constants/industries';
import { queueLeadPersistenceBeforeExport } from '../pdf/lead_persistence_queue';
import { loadEquifyWizardState } from '../wizard/equify_storage';
import { captureWizardLeadIdentifiers } from '../wizard/lead_wire';
import { mapEquifyToWizardFormValues } from '../wizard/map_equify_wizard';

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
  const safe = companyName.replace(/[^\w\u0590-\u05FF]+/g, '-').slice(0, 40);
  return `equify-${safe || 'valuation'}.pdf`;
}

export interface DownloadEquifyPdfOptions {
  equityValue: number;
  reportId?: string;
  companyName?: string;
  industryCode?: string;
  locale?: 'he' | 'en';
}

/** מפיק PDF מ-/api/generate-pdf ומוריד מיד לדפדפן. */
export async function downloadEquifyPdf(
  options: DownloadEquifyPdfOptions,
): Promise<void> {
  if (typeof window === 'undefined') return;

  const state = loadEquifyWizardState();
  if (!state?.profile?.companyName) {
    throw new Error('חסרים נתוני אשף. הרץ הערכה חדשה מהאשף.');
  }

  const formValues = mapEquifyToWizardFormValues(state);
  const ids = captureWizardLeadIdentifiers(formValues);
  const sectorLabel = options.industryCode
    ? getIndustryLabel(options.industryCode, options.locale ?? 'he')
    : undefined;

  queueLeadPersistenceBeforeExport({
    fullName: ids.fullName,
    companyName: ids.companyName,
    nationalId: ids.nationalId,
    corporateTaxId: ids.corporateTaxId,
    userPhone: ids.userPhone,
    userEmail: ids.userEmail,
    valuationMidpoint: options.equityValue,
    industry: options.industryCode ?? formValues.industry,
    sectorLabel,
    locale: options.locale ?? 'he',
  });

  const companyName = options.companyName ?? state.profile.companyName;
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state,
      reportId: options.reportId,
      filename: defaultPdfFilename(companyName),
    }),
  });

  if (!response.ok) {
    let message = 'יצירת PDF נכשלה. נסה שוב בעוד רגע.';
    try {
      const err = (await response.json()) as { error?: string; message?: string };
      message = err.error ?? err.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
    defaultPdfFilename(companyName);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
