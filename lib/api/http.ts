import { NextResponse } from 'next/server';
import type { NextApiResponse } from 'next';

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: string;
}

export function jsonError(
  message: string,
  status: number,
  code?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status },
  );
}

export function appRouteMethodNotAllowed(
  allowed: string[],
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: 'Method Not Allowed',
      code: 'METHOD_NOT_ALLOWED',
      details: `Allowed: ${allowed.join(', ')}`,
    },
    {
      status: 405,
      headers: { Allow: allowed.join(', ') },
    },
  );
}

export function sendPagesJsonError(
  res: NextApiResponse,
  status: number,
  message: string,
  code?: string,
): void {
  res.status(status).json({
    error: message,
    ...(code ? { code } : {}),
  });
}

export function sendPagesMethodNotAllowed(
  res: NextApiResponse,
  allowed: string[],
): void {
  res.setHeader('Allow', allowed.join(', '));
  sendPagesJsonError(res, 405, 'Method Not Allowed', 'METHOD_NOT_ALLOWED');
}

export function mapThrownError(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const statusCode = (err as { statusCode: number }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
      return {
        status: statusCode,
        message: err instanceof Error ? err.message : 'Request failed',
      };
    }
  }
  if (err instanceof Error) {
    const pgCode =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    if (pgCode === 'ENOTFOUND' || pgCode === 'ECONNREFUSED') {
      return {
        status: 503,
        message: 'Database is temporarily unavailable. Please try again shortly.',
      };
    }
    const errMessage = err.message || '';
    if (
      errMessage.includes('tenant') ||
      errMessage.includes('not found') ||
      pgCode === 'XX000'
    ) {
      return {
        status: 503,
        message:
          'Database pooler configuration is invalid. Set SUPABASE_POOLER_REGION to your Supabase region (Connection Pooling URI, port 6543).',
      };
    }
    return { status: 500, message: err.message || 'Internal server error' };
  }
  return { status: 500, message: 'Internal server error' };
}

export async function runAppRoute<T>(
  fn: () => Promise<NextResponse<T | ApiErrorBody>>,
): Promise<NextResponse<T | ApiErrorBody>> {
  try {
    return await fn();
  } catch (err) {
    console.error('[api]', err);
    const { status, message } = mapThrownError(err);
    return jsonError(message, status, 'INTERNAL_ERROR');
  }
}

export async function runPagesApi(
  req: { method?: string },
  res: NextApiResponse,
  allowed: string[],
  fn: () => Promise<void>,
): Promise<void> {
  if (!req.method || !allowed.includes(req.method)) {
    sendPagesMethodNotAllowed(res, allowed);
    return;
  }
  try {
    await fn();
  } catch (err) {
    console.error('[pages/api]', err);
    const { status, message } = mapThrownError(err);
    sendPagesJsonError(res, status, message, 'INTERNAL_ERROR');
  }
}
