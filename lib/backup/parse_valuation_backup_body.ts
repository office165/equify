import type { ValuationDualBackupInput } from './run_valuation_dual_backup';
import { sanitizePdfBase64 } from './sanitize_pdf_base64';

export interface ValuationBackupRequestBody {
  userEmail?: string;
  userPhone?: string;
  userId?: string;
  userCorporateTaxId?: string;
  valuationMidPoint?: number;
  currency?: string;
  valuationId?: string;
  pdfBase64?: string;
  filename?: string;
}

export function parseValuationBackupBody(
  body: ValuationBackupRequestBody,
): ValuationDualBackupInput | null {
  const userEmail = String(body.userEmail ?? '').trim();
  const userPhone = String(body.userPhone ?? '').trim();
  const userId = String(body.userId ?? '').trim();
  const pdfBase64 = sanitizePdfBase64(String(body.pdfBase64 ?? ''));

  if (!userEmail || !userPhone || !userId || !pdfBase64) {
    return null;
  }

  return {
    userEmail,
    userPhone,
    userId,
    userCorporateTaxId: String(body.userCorporateTaxId ?? '').trim(),
    valuationMidPoint:
      typeof body.valuationMidPoint === 'number' &&
      Number.isFinite(body.valuationMidPoint)
        ? body.valuationMidPoint
        : 0,
    currency: String(body.currency ?? 'ILS').trim() || 'ILS',
    valuationId: String(body.valuationId ?? '').trim() || undefined,
    pdfBase64,
    filename: String(body.filename ?? 'Equify_Valuation_Report.pdf').trim(),
  };
}
