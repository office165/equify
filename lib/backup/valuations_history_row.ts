import type { BackupRelayPayload } from './backup_relay_types';
import type { ValuationsHistoryInsertRow } from './archive_valuation_report';

/** Maps relay payload fields to live `valuations_history` snake_case columns. */
export function buildValuationsHistoryInsertRow(
  payload: BackupRelayPayload,
  pdfUrl: string,
): ValuationsHistoryInsertRow {
  return {
    user_email: payload.userEmail,
    user_phone: payload.userPhone,
    full_name: payload.fullName,
    national_id: payload.nationalId,
    corporate_tax_id: payload.corporateTaxId,
    sector: payload.sectorLabel,
    valuation_midpoint: payload.valuationMidpoint,
    pdf_url: pdfUrl,
  };
}
