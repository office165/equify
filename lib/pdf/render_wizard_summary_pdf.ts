import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { WizardSummaryPdfDocument } from './WizardSummaryPdfDocument';

/**
 * Fallback PDF (עמוד יחיד) — כש-Puppeteer/Chromium לא זמין (למשל Vercel Edge).
 * לדוח מלא 8 עמודים השתמש ב-buildPdfHtml + Puppeteer.
 */
export async function renderWizardSummaryPdfBuffer(
  state: EquifyWizardState,
  reportId?: string,
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(WizardSummaryPdfDocument, { state, reportId }) as React.ReactElement,
  );
  return Buffer.from(buffer);
}
