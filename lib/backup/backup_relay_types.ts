/** Six lead fields shipped to Monday.com (+ optional PDF). */
export interface RelayLeadWireFields {
  fullName: string;
  companyName: string;
  nationalId: string;
  corporateTaxId: string;
  userPhone: string;
  userEmail: string;
}

/** Standardized client → server backup relay contract (no secrets). */
export interface BackupRelayRequestBody extends Partial<RelayLeadWireFields> {
  valuationMidpoint?: number;
  /** Stable industry code (e.g. renewable_energy) */
  industry?: string;
  /** Localized sector label (e.g. אנרגיה מתחדשת) */
  sectorLabel?: string;
  /** UI locale for outbound WhatsApp templates */
  locale?: 'he' | 'en';
  pdfBase64?: string;
}

export interface BackupRelayPayload extends RelayLeadWireFields {
  valuationMidpoint: number;
  industry: string;
  sectorLabel: string;
  locale: 'he' | 'en';
  pdfBase64: string;
  /** Populated on the server after base64 decode — never sent from the client. */
  pdfBuffer?: Buffer | null;
}

export type RelayServiceKey = 'monday' | 'supabase' | 'resend' | 'whatsapp';

export interface RelayServiceResult {
  service: RelayServiceKey;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  detail?: Record<string, unknown>;
  error?: string;
}

export interface BackupRelayResponse {
  ok: true;
  receivedAt: string;
  results: Record<RelayServiceKey, RelayServiceResult>;
}
