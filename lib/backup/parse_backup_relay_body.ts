import { normalizePhoneE164 } from '../phone/normalize_e164';
import { sanitizePdfBase64 } from './sanitize_pdf_base64';
import type { BackupRelayPayload, BackupRelayRequestBody } from './backup_relay_types';

export function parseBackupRelayBody(
  body: BackupRelayRequestBody,
): BackupRelayPayload | null {
  const userEmail = String(body.userEmail ?? '').trim().toLowerCase();
  const userPhone = normalizePhoneE164(String(body.userPhone ?? ''));
  const fullName = String(body.fullName ?? '').trim();
  const companyName = String(body.companyName ?? '').trim();
  const rawNationalId = String(body.nationalId ?? '').trim();
  const corporateTaxId = String(body.corporateTaxId ?? '').trim() || '';
  const nationalId = rawNationalId || corporateTaxId;
  const industry = String(body.industry ?? '').trim();
  const sectorLabel = String(body.sectorLabel ?? '').trim();
  const valuationMidpoint =
    typeof body.valuationMidpoint === 'number' && Number.isFinite(body.valuationMidpoint)
      ? body.valuationMidpoint
      : 0;
  const pdfBase64 = sanitizePdfBase64(String(body.pdfBase64 ?? ''));
  const locale = body.locale === 'en' ? 'en' : 'he';

  if (!userEmail || !userPhone || !nationalId || !fullName || !companyName) {
    return null;
  }

  return {
    userEmail,
    userPhone,
    fullName,
    companyName,
    nationalId,
    corporateTaxId,
    industry,
    sectorLabel,
    locale,
    valuationMidpoint,
    pdfBase64,
  };
}
