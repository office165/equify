/** Valubot lead lifecycle stages mirrored on Monday.com שלב בתהליך. */
export type LeadProcessStage =
  | 'התחיל אשף'
  | 'השלים אשף'
  | 'הוריד PDF'
  | 'שילם';

export type LeadPackage = 'Flash' | 'Pro' | 'Enterprise';

export type LeadSource = 'organic' | 'linkedin' | 'twitter' | 'reddit';

export type LeadSyncStatus = 'synced' | 'pending_sync' | 'failed';

export type ValuationPurposeCode =
  | 'M&A_SALE'
  | 'CAPITAL_RAISE'
  | 'TAX'
  | 'INTERNAL_REPORT';

export interface ValubotLeadRecord {
  id: string;
  sessionId: string;
  fullName: string;
  companyName: string;
  userEmail: string;
  userPhone: string;
  nationalId: string;
  corporateTaxId: string;
  sectorLabel: string | null;
  industryCode: string | null;
  valuationPurpose: ValuationPurposeCode | null;
  processStage: LeadProcessStage | null;
  package: LeadPackage | null;
  valuationMidpoint: number | null;
  qualityScore: number | null;
  source: LeadSource | null;
  aiNotes: string | null;
  mondayItemId: string | null;
  syncStatus: LeadSyncStatus;
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadUpsertEvent =
  | 'wizard_step1'
  | 'wizard_completed'
  | 'pdf_downloaded'
  | 'whatsapp_sent'
  | 'payment';

export interface LeadUpsertBody {
  event: LeadUpsertEvent;
  sessionId?: string;
  leadId?: string;
  fullName?: string;
  companyName?: string;
  userEmail?: string;
  userPhone?: string;
  nationalId?: string;
  corporateTaxId?: string;
  sectorLabel?: string;
  industryCode?: string;
  valuationPurpose?: ValuationPurposeCode;
  valuationMidpoint?: number;
  qualityScore?: number;
  source?: LeadSource;
  package?: LeadPackage;
  aiNotes?: string;
  locale?: 'he' | 'en';
}

export interface LeadSyncLogEntry {
  at: string;
  leadId: string;
  event: LeadUpsertEvent | 'replay' | 'health_probe';
  attempt: number;
  ok: boolean;
  mondayItemId?: string | null;
  error?: string;
  responseBody?: unknown;
  stage?: string;
}
