import type { LeadUpsertEvent, LeadSource, ValubotLeadRecord } from './leads_types';

/** Wizard funnel stages — column "שלב בתהליך" (`color_mm468x53`). */
export const MONDAY_PROCESS_STAGE_LABELS = {
  wizard_step1: 'התחיל אשף',
  wizard_completed: 'השלים אשף',
  pdf_downloaded: 'הוריד PDF',
  whatsapp_sent: 'הוריד PDF',
  payment: 'שילם',
} as const satisfies Record<LeadUpsertEvent, string>;

/**
 * CRM funnel — column "סטטוס ליד" (`color_mkz4s295`).
 * Maps to closest existing board labels; wizard detail lives in שלב בתהליך.
 */
export const MONDAY_LEAD_STATUS_BY_EVENT: Record<LeadUpsertEvent, string> = {
  wizard_step1: 'חדש',
  wizard_completed: 'נוצר קשר',
  pdf_downloaded: 'כשיר',
  whatsapp_sent: 'כשיר',
  payment: 'הועבר לפייפליין',
};

export function resolveProcessStageLabel(
  lead: ValubotLeadRecord,
  event?: LeadUpsertEvent,
): string | undefined {
  if (lead.processStage) return lead.processStage;
  if (event) return MONDAY_PROCESS_STAGE_LABELS[event];
  return undefined;
}

export function resolveLeadStatusLabel(event?: LeadUpsertEvent): string | undefined {
  if (!event) return undefined;
  return MONDAY_LEAD_STATUS_BY_EVENT[event];
}

/** Maps wizard valuation purpose → column "מה הצורך?" (`color_mkz5d1mk`). */
export function mapValuationPurposeToNeedLabel(purpose?: string | null): string | undefined {
  if (!purpose?.trim()) return undefined;
  const map: Record<string, string> = {
    'M&A_SALE': 'הון / מכירת חברה / חיפוש שותף',
    CAPITAL_RAISE: 'הלוואה',
    TAX: 'עודפים',
    INTERNAL_REPORT: 'דוח פנימי',
  };
  return map[purpose] ?? purpose;
}

/** Maps lead source → column "מקור ליד" (`dropdown_mkz4myng`). */
export function mapLeadSourceToMondayDropdown(source?: LeadSource | null): string {
  const map: Record<LeadSource, string> = {
    organic: 'SBC',
    linkedin: 'אחר',
    twitter: 'אחר',
    reddit: 'אחר',
  };
  return source ? map[source] : 'SBC';
}
