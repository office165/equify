import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../lib/api/http';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../../../../lib/db/supabase';
import {
  clientIpFromRequest,
  isFeedbackRateLimited,
  recordFeedbackHit,
} from '../../../../lib/landing/feedback_rate_limit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  message: z.string().trim().min(5).max(1000),
  email: z.preprocess((value) => {
    if (value == null) return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.string().email().max(320).optional()),
});

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  if (isFeedbackRateLimited(ip)) {
    return jsonError('Too many requests.', 429, 'RATE_LIMITED');
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError('Validation failed.', 400, 'VALIDATION_ERROR');
  }

  if (!isSupabaseAdminConfigured()) {
    console.warn('[feedback] supabase not configured');
    return jsonError('Service unavailable.', 503, 'SERVICE_UNAVAILABLE');
  }

  const userAgent = request.headers.get('user-agent')?.trim().slice(0, 512) || null;

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('feature_requests').insert({
      message: parsed.data.message,
      contact_email: parsed.data.email ?? null,
      user_agent: userAgent,
    });

    if (error) {
      console.warn('[feedback] insert failed', error.message);
      return jsonError('Request failed.', 500, 'INSERT_FAILED');
    }
  } catch (err) {
    console.warn(
      '[feedback] insert error',
      err instanceof Error ? err.message : err,
    );
    return jsonError('Request failed.', 500, 'INSERT_FAILED');
  }

  recordFeedbackHit(ip);
  return NextResponse.json({ ok: true });
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
