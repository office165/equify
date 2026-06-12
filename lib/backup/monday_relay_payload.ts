import type { BackupRelayPayload } from './backup_relay_types';
import type { MondayRelayPayload } from '../crm/monday_client';

/**
 * Maps normalized backup relay payload → Monday `create_item` configuration.
 * `fullName` becomes the board item title (main name column).
 */
export function buildMondayRelayPayload(
  payload: BackupRelayPayload,
): MondayRelayPayload {
  return {
    fullName: payload.fullName,
    companyName: payload.companyName,
    userEmail: payload.userEmail,
    userPhone: payload.userPhone,
    nationalId: payload.nationalId,
    corporateTaxId: payload.corporateTaxId || undefined,
    valuationMidpoint: payload.valuationMidpoint,
    sectorLabel: payload.sectorLabel || undefined,
    industryCode: payload.industry || undefined,
  };
}
