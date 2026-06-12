import type { BackupRelayPayload } from '../backup/backup_relay_types';
import type { LeadUpsertBody, LeadUpsertEvent } from './leads_types';
import { VALUBOT_MONDAY_COLUMNS } from './valubot_monday_sync';

/**
 * Five-field frontend wire → Monday.com board mapping.
 * Item title uses fullName; identity fields map to dedicated column types.
 */
export const MONDAY_FIVE_FIELD_WIRE = {
  fullName: {
    wireKey: 'fullName' as const,
    mondayTarget: 'item_name' as const,
    description: 'Primary item title header (שם מלא)',
  },
  companyName: {
    wireKey: 'companyName' as const,
    columnId: VALUBOT_MONDAY_COLUMNS.companyName,
    description: 'Company name text column (שם חברה)',
  },
  userPhone: {
    wireKey: 'userPhone' as const,
    columnId: VALUBOT_MONDAY_COLUMNS.phone,
    description: 'Active mobile contact column (טלפון)',
  },
  nationalId: {
    wireKey: 'nationalId' as const,
    columnId: VALUBOT_MONDAY_COLUMNS.nationalId,
    description: 'National ID / corporate registration (תעודת זהות / ח.פ)',
  },
  userEmail: {
    wireKey: 'userEmail' as const,
    columnId: VALUBOT_MONDAY_COLUMNS.email,
    description: 'Verified email column (אימייל)',
  },
} as const;

/** @deprecated Use `MONDAY_FIVE_FIELD_WIRE` */
export const MONDAY_SIX_FIELD_WIRE = MONDAY_FIVE_FIELD_WIRE;

export type MondayFiveFieldKey = keyof typeof MONDAY_FIVE_FIELD_WIRE;

/** @deprecated Use `MondayFiveFieldKey` */
export type MondaySixFieldKey = MondayFiveFieldKey;

/** Merges ת.ז. and ח.פ. wizard/API inputs into the Monday nationalId column value. */
export function resolveMondayNationalId(
  nationalId: string,
  corporateTaxId?: string,
): string {
  const national = nationalId.trim();
  const corporate = (corporateTaxId ?? '').trim();
  return national || corporate;
}

/** Snapshot of the five lead fields for structured logging / API responses. */
export function snapshotMondayFiveFields(payload: BackupRelayPayload): Record<
  MondayFiveFieldKey,
  string
> {
  return {
    fullName: payload.fullName,
    userPhone: payload.userPhone,
    companyName: payload.companyName,
    nationalId: resolveMondayNationalId(payload.nationalId, payload.corporateTaxId),
    userEmail: payload.userEmail,
  };
}

/** @deprecated Use `snapshotMondayFiveFields` */
export function snapshotMondaySixFields(
  payload: BackupRelayPayload,
): Record<MondayFiveFieldKey, string> {
  return snapshotMondayFiveFields(payload);
}

/** Maps relay payload → LeadUpsertBody (Monday handler input). */
export function buildMondayLeadUpsertFromRelay(
  payload: BackupRelayPayload,
  event: LeadUpsertEvent,
): LeadUpsertBody {
  const nationalId = resolveMondayNationalId(payload.nationalId, payload.corporateTaxId);
  return {
    event,
    fullName: payload.fullName,
    companyName: payload.companyName,
    userEmail: payload.userEmail,
    userPhone: payload.userPhone,
    nationalId,
    corporateTaxId: payload.corporateTaxId,
    sectorLabel: payload.sectorLabel || undefined,
    industryCode: payload.industry || undefined,
    valuationMidpoint: payload.valuationMidpoint,
    locale: payload.locale,
  };
}

export function mondayWireFieldManifest(): Array<{
  field: MondayFiveFieldKey;
  target: string;
  columnId?: string;
}> {
  return (Object.keys(MONDAY_FIVE_FIELD_WIRE) as MondayFiveFieldKey[]).map((field) => {
    const spec = MONDAY_FIVE_FIELD_WIRE[field];
    if ('mondayTarget' in spec && spec.mondayTarget === 'item_name') {
      return { field, target: 'item_name' };
    }
    const columnId = 'columnId' in spec ? spec.columnId : undefined;
    return {
      field,
      target: 'column',
      columnId: columnId || '(board discovery)',
    };
  });
}
