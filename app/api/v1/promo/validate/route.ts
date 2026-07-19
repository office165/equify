import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../../../../../lib/db/supabase';
import {
  clearPromoValidateFailures,
  isPromoValidateRateLimited,
  recordPromoValidateFailure,
} from '../../../../../lib/payments/promo_validate_rate_limit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  code: z.string().min(1).max(64),
  email: z.string().email(),
});

function invalidResponse() {
  return NextResponse.json({ valid: false }, { status: 200 });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return invalidResponse();
  }

  const email = parsed.data.email.trim().toLowerCase();
  const code = parsed.data.code.trim().toUpperCase();

  if (isPromoValidateRateLimited(email)) {
    return NextResponse.json(
      { valid: false, rateLimited: true },
      { status: 429 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    recordPromoValidateFailure(email);
    return invalidResponse();
  }

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('id, max_uses, times_used, expires_at, is_active')
    .eq('code', code)
    .maybeSingle();

  const exhausted =
    promo?.max_uses != null &&
    typeof promo.times_used === 'number' &&
    promo.times_used >= promo.max_uses;

  const expired =
    promo?.expires_at != null &&
    String(promo.expires_at) <= nowIso;

  if (!promo?.id || !promo.is_active || exhausted || expired) {
    recordPromoValidateFailure(email);
    return invalidResponse();
  }

  const { error: redeemError } = await supabase.from('promo_redemptions').insert({
    promo_code_id: promo.id,
    user_email: email,
    payment_matched: false,
  });

  if (redeemError) {
    console.error('[promo/validate] redemption insert failed', redeemError);
    recordPromoValidateFailure(email);
    return invalidResponse();
  }

  const { error: bumpError } = await supabase
    .from('promo_codes')
    .update({ times_used: (promo.times_used ?? 0) + 1 })
    .eq('id', promo.id);

  if (bumpError) {
    console.error('[promo/validate] times_used bump failed', bumpError);
  }

  clearPromoValidateFailures(email);
  return NextResponse.json({ valid: true }, { status: 200 });
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
