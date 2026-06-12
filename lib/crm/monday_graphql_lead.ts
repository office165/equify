/**
 * Monday.com lead ingestion — GraphQL variables (JSON! scalar), no string concat.
 */

import { mondayGraphqlOrThrow, requireMondayBoardId } from './monday_api';
import { VALUBOT_MONDAY_COLUMNS } from './valubot_monday_columns';

export const VALUBOT_GROUP_ID = 'group_mm43e3aq';

/** Operation `createLead` → Monday `create_item` with variable-bound column_values. */
export const CREATE_LEAD_MUTATION = `mutation createLead($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON!) {
  create_item(
    board_id: $boardId,
    group_id: $groupId,
    item_name: $itemName,
    column_values: $columnValues,
    create_labels_if_missing: true
  ) { id }
}`;

export const UPDATE_LEAD_COLUMNS_MUTATION = `mutation updateLeadColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
  change_multiple_column_values(
    board_id: $boardId,
    item_id: $itemId,
    column_values: $columnValues,
    create_labels_if_missing: true
  ) { id }
}`;

export function normalizePhoneForMonday(phone: string): {
  phone: string;
  countryShortName: string;
} {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) {
    return { phone: digits, countryShortName: 'IL' };
  }
  if (digits.startsWith('0')) {
    return { phone: `972${digits.slice(1)}`, countryShortName: 'IL' };
  }
  return { phone: digits || phone.trim(), countryShortName: 'IL' };
}

export interface FiveFieldLeadInput {
  fullName: string;
  userPhone: string;
  companyName: string;
  nationalId: string;
  userEmail: string;
}

export function buildFiveFieldColumnValues(
  input: FiveFieldLeadInput,
): Record<string, unknown> {
  const c = VALUBOT_MONDAY_COLUMNS;
  const values: Record<string, unknown> = {};

  if (input.fullName.trim()) {
    values[c.customerName] = input.fullName.trim();
  }
  if (input.userEmail.trim()) {
    const email = input.userEmail.trim().toLowerCase();
    values[c.email] = { email, text: email };
  }
  if (input.userPhone.trim()) {
    values[c.phone] = normalizePhoneForMonday(input.userPhone);
  }
  if (input.nationalId.trim()) {
    values[c.nationalId] = input.nationalId.trim();
  }
  if (input.companyName.trim()) {
    values[c.companyName] = input.companyName.trim();
  }

  return values;
}

/** Monday JSON! scalar — stringify the column map once in the variables block. */
export function serializeMondayColumnValues(
  columnValues: Record<string, unknown>,
): string {
  return JSON.stringify(columnValues);
}

export async function createMondayLeadViaGraphql(params: {
  itemName: string;
  columnValues: Record<string, unknown>;
  groupId?: string;
  boardId?: string;
}): Promise<string> {
  const data = await mondayGraphqlOrThrow<{ create_item: { id: string } }>(
    CREATE_LEAD_MUTATION,
    {
      boardId: params.boardId ?? requireMondayBoardId(),
      groupId: params.groupId ?? VALUBOT_GROUP_ID,
      itemName: params.itemName,
      columnValues: serializeMondayColumnValues(params.columnValues),
    },
  );
  return data.create_item.id;
}

export async function updateMondayLeadColumnsViaGraphql(
  itemId: string,
  columnValues: Record<string, unknown>,
  boardId?: string,
): Promise<void> {
  await mondayGraphqlOrThrow(UPDATE_LEAD_COLUMNS_MUTATION, {
    boardId: boardId ?? requireMondayBoardId(),
    itemId,
    columnValues: serializeMondayColumnValues(columnValues),
  });
}
