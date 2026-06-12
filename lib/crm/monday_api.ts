/**
 * Shared Monday.com GraphQL client with full response capture on failure.
 */

const MONDAY_API_URL = 'https://api.monday.com/v2';
const MONDAY_API_VERSION = '2023-10';

export interface MondayGraphqlResult<T> {
  data?: T;
  errors?: { message: string; path?: string[] }[];
  extensions?: Record<string, unknown>;
  httpStatus: number;
  raw: unknown;
}

export class MondayApiError extends Error {
  readonly responseBody: unknown;
  readonly httpStatus: number;

  constructor(message: string, responseBody: unknown, httpStatus: number) {
    super(message);
    this.name = 'MondayApiError';
    this.responseBody = responseBody;
    this.httpStatus = httpStatus;
  }
}

export function requireMondayApiKey(): string {
  const key = process.env.MONDAY_API_KEY?.trim();
  if (!key) throw new Error('MONDAY_API_KEY is not configured.');
  return key;
}

export function requireMondayBoardId(): string {
  return process.env.MONDAY_BOARD_ID?.trim() || '18393484200';
}

export async function mondayGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<MondayGraphqlResult<T>> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: requireMondayApiKey(),
      'API-Version': MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const raw = await response.json();
  const body = raw as {
    data?: T;
    errors?: { message: string; path?: string[] }[];
    extensions?: Record<string, unknown>;
  };

  return {
    data: body.data,
    errors: body.errors,
    extensions: body.extensions,
    httpStatus: response.status,
    raw,
  };
}

export async function mondayGraphqlOrThrow<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const result = await mondayGraphql<T>(query, variables);
  if (!result.httpStatus || result.httpStatus >= 400) {
    throw new MondayApiError(
      `Monday API HTTP ${result.httpStatus}`,
      result.raw,
      result.httpStatus,
    );
  }
  if (result.errors?.length) {
    throw new MondayApiError(
      result.errors.map((e) => e.message).join('; '),
      result.raw,
      result.httpStatus,
    );
  }
  if (!result.data) {
    throw new MondayApiError('Monday API returned empty data.', result.raw, result.httpStatus);
  }
  return result.data;
}

export function formatMondayErrorBody(error: unknown): string {
  if (error instanceof MondayApiError) {
    return JSON.stringify(error.responseBody, null, 2);
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
