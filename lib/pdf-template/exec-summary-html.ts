import { escHtml } from '../pdf/print/print_formatters';
import type { ValuationData } from './types';

/** Trusted HTML from formatters, or escaped plain text when overridden. */
export function resolveExecutiveSummaryHtml(
  data: ValuationData,
  buildDefaultHtml: (d: ValuationData) => string,
): string {
  const custom = data.executiveSummary?.trim();
  if (custom) return escHtml(custom);
  return buildDefaultHtml(data);
}

/** User moat / notes callout — omitted when blank. */
export function buildMoatNotesCalloutHtml(data: ValuationData): string {
  const notes = data.moatNotes?.trim();
  if (!notes) return '';

  const label =
    data.locale === 'en'
      ? 'Competitive advantage / notes:'
      : 'יתרון תחרותי / הערות:';

  return `<div class="callout gold exec-moat-callout"><b>${escHtml(label)}</b> ${escHtml(notes)}</div>`;
}
