/**
 * Monday.com GraphQL CRM client — lead items, column mapping, file uploads.
 */

import {
  mondayGraphqlOrThrow,
  requireMondayApiKey,
  requireMondayBoardId,
} from './monday_api';
import {
  createMondayLeadViaGraphql,
  normalizePhoneForMonday,
} from './monday_graphql_lead';

const MONDAY_FILE_API_URL = 'https://api.monday.com/v2/file';
const MONDAY_API_VERSION = '2023-10';

/** Adjustable via env — defaults match common VALUBOT board layouts. */
export interface MondayColumnMap {
  email?: string;
  phone?: string;
  companyName?: string;
  nationalId?: string;
  corporateTaxId?: string;
  valuationMidpoint?: string;
  sector?: string;
  files?: string;
}

export interface MondayLeadPayload {
  userEmail: string;
  userPhone: string;
  userId: string;
  userCorporateTaxId?: string;
  displayName?: string;
}

export interface MondayRelayPayload {
  fullName: string;
  companyName: string;
  userEmail: string;
  userPhone: string;
  nationalId: string;
  corporateTaxId?: string;
  valuationMidpoint: number;
  /** Localized sector label (e.g. אנרגיה מתחדשת) */
  sectorLabel?: string;
  /** Stable industry code (e.g. renewable_energy) */
  industryCode?: string;
}

interface MondayBoardColumn {
  id: string;
  title: string;
  type: string;
}

function columnFromEnv(): MondayColumnMap {
  return {
    email: process.env.MONDAY_COLUMN_EMAIL?.trim() || undefined,
    phone: process.env.MONDAY_COLUMN_PHONE?.trim() || undefined,
    companyName: process.env.MONDAY_COLUMN_COMPANY_NAME?.trim() || undefined,
    nationalId: process.env.MONDAY_COLUMN_NATIONAL_ID?.trim() || undefined,
    corporateTaxId:
      process.env.MONDAY_COLUMN_CORPORATE_TAX_ID?.trim() || undefined,
    valuationMidpoint:
      process.env.MONDAY_COLUMN_VALUATION_MIDPOINT?.trim() || undefined,
    sector: process.env.MONDAY_COLUMN_SECTOR?.trim() || undefined,
    files: process.env.MONDAY_COLUMN_FILES?.trim() || 'files',
  };
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function resolveColumnsFromBoard(columns: MondayBoardColumn[]): MondayColumnMap {
  const map: MondayColumnMap = {};

  for (const column of columns) {
    const title = normalizeTitle(column.title);

    if (
      !map.email &&
      (column.type === 'email' ||
        title.includes('email') ||
        title.includes('אימייל') ||
        title.includes('דוא'))
    ) {
      map.email = column.id;
      continue;
    }

    if (
      !map.phone &&
      (column.type === 'phone' ||
        title.includes('phone') ||
        title.includes('טלפון') ||
        title.includes('נייד'))
    ) {
      map.phone = column.id;
      continue;
    }

    if (
      !map.companyName &&
      (column.type === 'text' || column.type === 'long_text') &&
      (title.includes('שם חברה') ||
        title.includes('company name') ||
        title.includes('legal name') ||
        title.includes('שם משפטי') ||
        title.includes('שם מסחרי'))
    ) {
      map.companyName = column.id;
      continue;
    }

    if (
      !map.nationalId &&
      (title.includes('ת.ז') ||
        title.includes('ת"ז') ||
        title.includes('תז') ||
        title.includes('national id') ||
        title.includes('id number'))
    ) {
      map.nationalId = column.id;
      continue;
    }

    if (
      !map.corporateTaxId &&
      map.nationalId !== column.id &&
      (title.includes('ח.פ') ||
        title.includes('חפ') ||
        title.includes('corporate') ||
        title.includes('company number') ||
        (title.includes('tax id') && !title.includes('national')))
    ) {
      map.corporateTaxId = column.id;
      continue;
    }

    if (
      !map.valuationMidpoint &&
      (column.type === 'numbers' || column.type === 'numeric') &&
      (title.includes('valuation') ||
        title.includes('שווי') ||
        title.includes('midpoint') ||
        title.includes('mid-point') ||
        title.includes('enterprise'))
    ) {
      map.valuationMidpoint = column.id;
      continue;
    }

    if (
      !map.sector &&
      (column.type === 'text' ||
        column.type === 'long_text' ||
        column.type === 'status' ||
        column.type === 'dropdown') &&
      (title.includes('sector') ||
        title.includes('industry') ||
        title.includes('ענף') ||
        title.includes('תחום'))
    ) {
      map.sector = column.id;
      continue;
    }

    if (
      !map.files &&
      (column.type === 'file' ||
        title === 'files' ||
        title.includes('file') ||
        title.includes('קבצים') ||
        title.includes('מסמכ'))
    ) {
      map.files = column.id;
    }
  }

  return map;
}

let cachedColumnMap: MondayColumnMap | null = null;

export async function resolveMondayColumnMap(): Promise<MondayColumnMap> {
  const fromEnv = columnFromEnv();

  const envComplete =
    fromEnv.email &&
    fromEnv.phone &&
    fromEnv.nationalId &&
    fromEnv.corporateTaxId &&
    fromEnv.valuationMidpoint &&
    fromEnv.files;

  if (envComplete) {
    return fromEnv;
  }

  if (cachedColumnMap) {
    return mergeColumnMaps(fromEnv, cachedColumnMap);
  }

  const boardId = requireMondayBoardId();
  const data = await mondayGraphqlOrThrow<{
    boards: { columns: MondayBoardColumn[] }[];
  }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
        }
      }
    }`,
    { boardId: [boardId] },
  );

  const columns = data.boards[0]?.columns ?? [];
  const discovered = resolveColumnsFromBoard(columns);
  cachedColumnMap = discovered;

  return mergeColumnMaps(fromEnv, discovered);
}

function mergeColumnMaps(
  envMap: MondayColumnMap,
  discovered: MondayColumnMap,
): MondayColumnMap {
  return {
    email: envMap.email ?? discovered.email,
    phone: envMap.phone ?? discovered.phone,
    companyName: envMap.companyName ?? discovered.companyName,
    nationalId: envMap.nationalId ?? discovered.nationalId,
    corporateTaxId: envMap.corporateTaxId ?? discovered.corporateTaxId,
    valuationMidpoint: envMap.valuationMidpoint ?? discovered.valuationMidpoint,
    sector: envMap.sector ?? discovered.sector,
    files: envMap.files ?? discovered.files ?? 'files',
  };
}

function buildLeadColumnValues(
  payload: MondayLeadPayload,
  columns: MondayColumnMap,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const corporateTaxId = (payload.userCorporateTaxId ?? '').trim();

  if (columns.email) {
    values[columns.email] = {
      email: payload.userEmail,
      text: payload.userEmail,
    };
  }
  if (columns.phone) {
    values[columns.phone] = normalizePhoneForMonday(payload.userPhone);
  }
  if (columns.nationalId) {
    values[columns.nationalId] = payload.userId;
  }
  if (columns.corporateTaxId && corporateTaxId) {
    values[columns.corporateTaxId] = corporateTaxId;
  }

  return values;
}

function buildRelayColumnValues(
  payload: MondayRelayPayload,
  columns: MondayColumnMap,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const corporateTaxId = (payload.corporateTaxId ?? '').trim();

  if (columns.email) {
    values[columns.email] = {
      email: payload.userEmail,
      text: payload.userEmail,
    };
  }

  if (columns.phone) {
    values[columns.phone] = normalizePhoneForMonday(payload.userPhone);
  }

  if (columns.companyName) {
    values[columns.companyName] = String(payload.companyName ?? '').trim();
  }

  if (columns.nationalId) {
    values[columns.nationalId] = String(payload.nationalId ?? '').trim();
  }

  if (columns.corporateTaxId) {
    values[columns.corporateTaxId] = corporateTaxId;
  }

  if (columns.valuationMidpoint && Number.isFinite(payload.valuationMidpoint)) {
    values[columns.valuationMidpoint] = String(
      Math.round(payload.valuationMidpoint),
    );
  }

  const sectorText = (payload.sectorLabel ?? payload.industryCode ?? '').trim();
  if (columns.sector && sectorText) {
    values[columns.sector] = sectorText;
  }

  return values;
}

function normalizeMondayLeadPayload(payload: MondayLeadPayload): MondayLeadPayload {
  return {
    userEmail: payload.userEmail.trim().toLowerCase(),
    userPhone: payload.userPhone.trim(),
    userId: payload.userId.trim(),
    userCorporateTaxId: (payload.userCorporateTaxId ?? '').trim(),
    displayName: payload.displayName?.trim() || undefined,
  };
}

function normalizeMondayRelayPayload(payload: MondayRelayPayload): MondayRelayPayload {
  const fullName = payload.fullName.trim() || payload.userEmail.trim();
  return {
    fullName,
    companyName: payload.companyName.trim() || fullName,
    userEmail: payload.userEmail.trim().toLowerCase(),
    userPhone: payload.userPhone.trim(),
    nationalId: payload.nationalId.trim(),
    corporateTaxId: (payload.corporateTaxId ?? '').trim(),
    valuationMidpoint: Number.isFinite(payload.valuationMidpoint)
      ? payload.valuationMidpoint
      : 0,
    sectorLabel: payload.sectorLabel?.trim() || undefined,
    industryCode: payload.industryCode?.trim() || undefined,
  };
}

async function createMondayBoardItem(params: {
  itemName: string;
  columnValues: Record<string, unknown>;
}): Promise<{ itemId: string }> {
  const itemId = await createMondayLeadViaGraphql({
    itemName: params.itemName,
    columnValues: params.columnValues,
  });
  return { itemId };
}

export async function createMondayLeadItem(
  payload: MondayLeadPayload,
): Promise<{ itemId: string }> {
  const safePayload = normalizeMondayLeadPayload(payload);
  const itemName =
    safePayload.displayName?.trim() ||
    safePayload.userEmail ||
    'Unknown lead';

  let columnValues: Record<string, unknown> = {};
  try {
    const columns = await resolveMondayColumnMap();
    columnValues = buildLeadColumnValues(safePayload, columns);
    console.log('[monday] lead column_values mapped', {
      itemName,
      columnIds: Object.keys(columnValues),
    });
  } catch (err) {
    console.error('Monday API Error: column resolution failed', err);
  }

  return createMondayBoardItem({ itemName, columnValues });
}

export async function createMondayRelayItem(
  payload: MondayRelayPayload,
): Promise<{ itemId: string; columnMap: MondayColumnMap }> {
  const safePayload = normalizeMondayRelayPayload(payload);
  const itemName = safePayload.fullName.trim() || safePayload.userEmail || 'Unknown lead';

  let columns: MondayColumnMap = {};
  let columnValues: Record<string, unknown> = {};

  try {
    columns = await resolveMondayColumnMap();
    columnValues = buildRelayColumnValues(safePayload, columns);
    console.log('[monday] relay column_values mapped', {
      itemName,
      columnIds: Object.keys(columnValues),
      columnMap: columns,
    });
  } catch (mappingError) {
    console.error('DEBUG: MONDAY_COLUMN_MAPPING EXECUTION ERROR:', mappingError);
  }

  let itemId: string;
  try {
    ({ itemId } = await createMondayBoardItem({ itemName, columnValues }));
  } catch (itemError) {
    console.error(
      'DEBUG: MONDAY_ITEM EXECUTION ERROR: create_item failed with column_values, retrying title-only',
      itemError,
    );
    ({ itemId } = await createMondayBoardItem({ itemName, columnValues: {} }));
  }

  return { itemId, columnMap: columns };
}

/**
 * Monday.com native multipart upload — `variables[file]` binding per live API spec.
 * @see https://developer.monday.com/api-reference/docs/files
 */
export async function uploadMondayColumnFile(params: {
  itemId: string;
  columnId?: string;
  fileBuffer: Buffer;
  filename?: string;
}): Promise<{ assetId: string }> {
  const { itemId, fileBuffer } = params;
  const columnId = params.columnId?.trim() || 'files';
  const filename = params.filename?.trim() || `Valuation_${Date.now()}.pdf`;
  const apiKey = requireMondayApiKey();

  const query = `mutation ($file: File!) { add_file_to_column (item_id: ${itemId}, column_id: "${columnId}", file: $file) { id } }`;

  const pdfBlob = new Blob([new Uint8Array(fileBuffer)], {
    type: 'application/pdf',
  });

  const formData = new FormData();
  formData.append('query', query);
  formData.append('variables[file]', pdfBlob, filename);

  let response: Response;
  try {
    response = await fetch(MONDAY_FILE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'API-Version': MONDAY_API_VERSION,
      },
      body: formData,
    });
  } catch (err) {
    console.error('DEBUG: MONDAY_FILE EXECUTION ERROR:', err);
    throw err;
  }

  const body = (await response.json()) as {
    data?: { add_file_to_column?: { id: string } };
    errors?: { message: string }[];
  };

  if (!response.ok || body.errors?.length) {
    const error = new Error(
      body.errors?.map((e) => e.message).join('; ') ||
        `Monday file API HTTP ${response.status}`,
    );
    console.error('DEBUG: MONDAY_FILE EXECUTION ERROR:', body);
    throw error;
  }

  const assetId = body.data?.add_file_to_column?.id;
  if (!assetId) {
    const error = new Error('Monday file upload returned no asset id.');
    console.error('DEBUG: MONDAY_FILE EXECUTION ERROR:', body);
    throw error;
  }

  return { assetId };
}
