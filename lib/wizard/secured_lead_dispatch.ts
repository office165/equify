import type { LeadUpsertBody, LeadUpsertEvent } from '../crm/leads_types';
import type { SecuredLeadFiveFieldPayload } from './lead_wire';

export type { SecuredLeadFiveFieldPayload };

export function toLeadUpsertBody(
  five: SecuredLeadFiveFieldPayload,
  event: LeadUpsertEvent,
  extras: Omit<
    LeadUpsertBody,
    keyof SecuredLeadFiveFieldPayload | 'event'
  > = {},
): LeadUpsertBody {
  return {
    event,
    fullName: five.fullName,
    companyName: five.companyName,
    userPhone: five.userPhone,
    nationalId: five.nationalId,
    userEmail: five.userEmail,
    ...extras,
  };
}

export function logMondayIngestionInitiated(
  payload: Record<string, unknown>,
): void {
  console.log('🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:', payload);
}

export function logMondayRoutingFailure(error: unknown): void {
  console.error('❌ MONDAY ROUTING FAILURE:', error);
}
