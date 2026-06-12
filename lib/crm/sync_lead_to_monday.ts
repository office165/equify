import { createMondayLeadItem } from './monday_client';
import {
  insertCrmLead,
  updateCrmLeadMondaySync,
  type CrmLeadInsert,
  type CrmLeadRow,
} from './crm_leads_repository';
import {
  normalizeCorporateTaxId,
  type LeadIdentifierFields,
} from '../validation/user_identifiers';

/** Lead capture input — aligned with API body and Monday payload. */
export type LeadCaptureInput = LeadIdentifierFields;

function toCrmLeadInsert(input: LeadCaptureInput): CrmLeadInsert {
  return {
    userPhone: input.userPhone,
    userId: input.userId,
    userCorporateTaxId: normalizeCorporateTaxId(input.userCorporateTaxId),
    userEmail: input.userEmail,
    status: 'STARTED',
  };
}

export interface LeadCaptureResult {
  lead: CrmLeadRow;
  mondayItemId: string | null;
  mondayError: string | null;
}

export async function captureLeadWithMondaySync(
  input: LeadCaptureInput,
): Promise<LeadCaptureResult> {
  const lead = await insertCrmLead(toCrmLeadInsert(input));

  let mondayItemId: string | null = null;
  let mondayError: string | null = null;

  try {
    const monday = await createMondayLeadItem({
      userEmail: input.userEmail,
      userPhone: input.userPhone,
      userId: input.userId,
      userCorporateTaxId: normalizeCorporateTaxId(input.userCorporateTaxId),
    });
    mondayItemId = monday.itemId;
    await updateCrmLeadMondaySync(lead.id, {
      mondayItemId,
      mondaySyncError: null,
    });
  } catch (err) {
    mondayError = err instanceof Error ? err.message : 'Monday sync failed';
    console.error('[crm] Monday sync failed for lead', lead.id, mondayError, err);
    try {
      await updateCrmLeadMondaySync(lead.id, {
        mondaySyncError: mondayError,
      });
    } catch (updateErr) {
      console.error('[crm] Failed to persist Monday sync error', updateErr);
    }
  }

  return {
    lead: {
      ...lead,
      monday_item_id: mondayItemId,
      monday_sync_error: mondayError,
    },
    mondayItemId,
    mondayError,
  };
}
