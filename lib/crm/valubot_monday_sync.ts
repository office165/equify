/**
 * Valubot → Monday.com sync — board 18393484200, group EQUIFY LEADS VALUEBOT.
 */

import {
  formatMondayErrorBody,
  MondayApiError,
  mondayGraphqlOrThrow,
  requireMondayBoardId,
} from './monday_api';
import {
  createMondayLeadViaGraphql,
  normalizePhoneForMonday,
  updateMondayLeadColumnsViaGraphql,
  VALUBOT_GROUP_ID,
} from './monday_graphql_lead';
import { uploadMondayColumnFile } from './monday_client';
import { VALUBOT_MONDAY_COLUMNS } from './valubot_monday_columns';
import {
  mapLeadSourceToMondayDropdown,
  mapValuationPurposeToNeedLabel,
  resolveLeadStatusLabel,
  resolveProcessStageLabel,
} from './monday_stage_mapping';
import type { LeadUpsertEvent, ValubotLeadRecord } from './leads_types';
import { appendSyncLog } from './leads_sync_log';

export { VALUBOT_MONDAY_COLUMNS, type ValubotMondayColumnKey } from './valubot_monday_columns';

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripNumber(value: number | null | undefined): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return String(Math.round(value));
}

function todayDateColumn(): { date: string } {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { date };
}

function statusValue(label: string): { label: string } {
  return { label };
}

function dropdownValue(label: string): { labels: string[] } {
  return { labels: [label] };
}

function resolveNationalId(lead: ValubotLeadRecord): string {
  const national = lead.nationalId?.trim() ?? '';
  const corporate = lead.corporateTaxId?.trim() ?? '';
  return national || corporate;
}

function resolveItemTitle(lead: ValubotLeadRecord): string {
  return (
    lead.fullName.trim() ||
    lead.companyName.trim() ||
    lead.userEmail.trim() ||
    'Unknown lead'
  );
}

function buildColumnValuesFromLead(
  lead: ValubotLeadRecord,
  event?: LeadUpsertEvent,
): Record<string, unknown> {
  const c = VALUBOT_MONDAY_COLUMNS;
  const values: Record<string, unknown> = {};
  const noteParts: string[] = [];

  if (lead.fullName.trim()) {
    values[c.customerName] = lead.fullName.trim();
  }
  if (lead.userEmail) {
    values[c.email] = {
      email: lead.userEmail.trim().toLowerCase(),
      text: lead.userEmail.trim().toLowerCase(),
    };
  }
  if (lead.userPhone) {
    values[c.phone] = normalizePhoneForMonday(lead.userPhone);
  }

  const nationalId = resolveNationalId(lead);
  if (nationalId) {
    values[c.nationalId] = nationalId;
  }

  if (lead.companyName.trim()) {
    values[c.companyName] = lead.companyName.trim();
  }

  const processStage = resolveProcessStageLabel(lead, event);
  if (processStage) {
    values[c.processStage] = statusValue(processStage);
  }

  const leadStatus = resolveLeadStatusLabel(event);
  if (leadStatus) {
    values[c.leadStatus] = statusValue(leadStatus);
  }

  const needLabel = mapValuationPurposeToNeedLabel(lead.valuationPurpose);
  if (needLabel) {
    values[c.needPurpose] = statusValue(needLabel);
  }

  values[c.leadSource] = dropdownValue(mapLeadSourceToMondayDropdown(lead.source));
  values[c.category] = dropdownValue('עסקי');

  if (lead.sectorLabel?.trim()) {
    values[c.sector] = dropdownValue(lead.sectorLabel.trim());
  } else if (lead.industryCode?.trim()) {
    values[c.sector] = dropdownValue(lead.industryCode.trim());
  }

  if (lead.package) {
    values[c.package] = statusValue(lead.package);
  }

  const valuation = stripNumber(lead.valuationMidpoint);
  if (valuation) values[c.valuationMidpoint] = valuation;

  const quality = stripNumber(lead.qualityScore);
  if (quality) values[c.qualityScore] = quality;

  if (!lead.mondayItemId) {
    values[c.createdAt] = todayDateColumn();
  }

  if (lead.aiNotes?.trim()) noteParts.push(lead.aiNotes.trim());
  if (noteParts.length) {
    values[c.aiNotes] = noteParts.join('\n');
  }

  return values;
}

export async function findMondayItemIdByEmail(email: string): Promise<string | null> {
  const boardId = requireMondayBoardId();
  const columnId = VALUBOT_MONDAY_COLUMNS.email;
  const normalized = email.trim().toLowerCase();

  const data = await mondayGraphqlOrThrow<{
    items_page_by_column_values: {
      items: { id: string; name: string }[];
    };
  }>(
    `query ($boardId: ID!, $columnId: String!, $columnValues: [String!]!) {
      items_page_by_column_values(
        board_id: $boardId,
        limit: 1,
        columns: [{ column_id: $columnId, column_values: $columnValues }]
      ) {
        items { id name }
      }
    }`,
    { boardId, columnId, columnValues: [normalized] },
  );

  const items = data.items_page_by_column_values?.items ?? [];
  return items[0]?.id ?? null;
}

export async function updateMondayItemColumns(
  itemId: string,
  columnValues: Record<string, unknown>,
): Promise<void> {
  await updateMondayLeadColumnsViaGraphql(itemId, columnValues);
}

export async function createMondayValubotItem(
  lead: ValubotLeadRecord,
  event?: LeadUpsertEvent,
): Promise<string> {
  const itemName = resolveItemTitle(lead);
  const columnValues = buildColumnValuesFromLead(lead, event);

  console.log('🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:', {
    action: 'create_item',
    itemName,
    fullName: lead.fullName,
    companyName: lead.companyName,
    userPhone: lead.userPhone,
    nationalId: resolveNationalId(lead),
    userEmail: lead.userEmail,
    columnKeys: Object.keys(columnValues),
    event,
  });

  return createMondayLeadViaGraphql({
    itemName,
    columnValues,
    groupId: VALUBOT_GROUP_ID,
  });
}

export async function getMondayItemDetails(itemId: string): Promise<{
  id: string;
  name: string;
  groupTitle: string | null;
  columnValues: { id: string; text: string; value: string }[];
}> {
  const data = await mondayGraphqlOrThrow<{
    items: {
      id: string;
      name: string;
      group: { title: string } | null;
      column_values: { id: string; text: string; value: string }[];
    }[];
  }>(
    `query ($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        group { title }
        column_values { id text value }
      }
    }`,
    { itemIds: [itemId] },
  );

  const item = data.items[0];
  if (!item) throw new Error(`Monday item ${itemId} not found`);
  return {
    id: item.id,
    name: item.name,
    groupTitle: item.group?.title ?? null,
    columnValues: item.column_values,
  };
}

export function mondayItemUrl(itemId: string): string {
  const boardId = requireMondayBoardId();
  return `https://smallbizclubils-team.monday.com/boards/${boardId}/pulses/${itemId}`;
}

export async function syncLeadToMonday(
  lead: ValubotLeadRecord,
  options?: { event?: LeadUpsertEvent | 'replay'; pdfBuffer?: Buffer | null },
): Promise<{ itemId: string }> {
  if (!process.env.MONDAY_API_KEY?.trim()) {
    throw new Error('MONDAY_API_KEY is not configured.');
  }

  const event =
    options?.event && options.event !== 'replay' ? options.event : undefined;
  let lastError: Error | null = null;
  let lastResponseBody: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      let itemId = lead.mondayItemId;

      if (!itemId && lead.userEmail) {
        itemId = await findMondayItemIdByEmail(lead.userEmail);
      }

      const columnValues = buildColumnValuesFromLead(lead, event);

      if (itemId) {
        await updateMondayItemColumns(itemId, columnValues);
      } else {
        itemId = await createMondayValubotItem(lead, event);
      }

      if (options?.pdfBuffer?.byteLength && itemId) {
        try {
          await uploadMondayColumnFile({
            itemId,
            columnId: VALUBOT_MONDAY_COLUMNS.files,
            fileBuffer: options.pdfBuffer,
            filename: `Valuation_${Date.now()}.pdf`,
          });
        } catch (fileErr) {
          console.warn('[monday] PDF upload failed (non-blocking)', fileErr);
        }
      }

      appendSyncLog({
        at: new Date().toISOString(),
        leadId: lead.id,
        event: options?.event ?? 'replay',
        attempt,
        ok: true,
        mondayItemId: itemId,
      });

      return { itemId };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof MondayApiError) {
        lastResponseBody = err.responseBody;
        console.error(
          `[monday] sync attempt ${attempt}/${MAX_ATTEMPTS} failed`,
          lastError.message,
          JSON.stringify(err.responseBody, null, 2),
        );
      } else {
        console.error(`[monday] sync attempt ${attempt}/${MAX_ATTEMPTS} failed`, lastError);
      }

      appendSyncLog({
        at: new Date().toISOString(),
        leadId: lead.id,
        event: options?.event ?? 'replay',
        attempt,
        ok: false,
        error: formatMondayErrorBody(err),
        responseBody: lastResponseBody ?? (err instanceof MondayApiError ? err.responseBody : undefined),
      });

      if (attempt < MAX_ATTEMPTS) {
        await sleep(2 ** attempt * 250);
      }
    }
  }

  throw lastError ?? new Error('Monday sync failed');
}

export async function deleteMondayItem(itemId: string): Promise<void> {
  await mondayGraphqlOrThrow(
    `mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id } }`,
    { itemId },
  );
}
