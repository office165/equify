import * as crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';
import { PaymentDispatchTokenService } from '../../../../../lib/auth/payment_dispatch_token_service';
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

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;

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
    payment_matched: true,
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

  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle();

  const { data: draft } = user?.id
    ? await supabase
        .from('valuations')
        .select('id')
        .eq('status', 'draft')
        .eq('created_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const valuationId = draft?.id ?? crypto.randomUUID();
  const transactionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  const captureId = `promo-free-${transactionId}`;

  const { token: dispatchToken } = new PaymentDispatchTokenService().signDispatch({
    sub: transactionId,
    valuationId,
    email,
    jti,
  });

  const { data: insertedTx, error: txError } = await supabase
    .from('stripe_transactions')
    .insert({
      id: transactionId,
      stripe_payment_intent_id: captureId,
      stripe_checkout_session_id: null,
      stripe_customer_id: email,
      purchaser_user_id: user?.id ?? null,
      amount: 0,
      currency: 'ILS',
      is_used: false,
      token_jwt: dispatchToken,
      token_jti: jti,
      expires_at: expiresAt,
      gateway_provider: 'promo_free',
      valuation_id: draft?.id ?? null,
      metadata: {
        provider: 'promo_free',
        gateway_provider: 'promo_free',
        promo_code: code,
        dispatch_token_used_at: null,
        synthetic_valuation_id: draft?.id ? null : valuationId,
      },
    })
    .select('id')
    .single();

  if (txError || !insertedTx?.id) {
    console.error('[promo/validate] insert stripe_transactions failed', txError);
    recordPromoValidateFailure(email);
    return invalidResponse();
  }

  clearPromoValidateFailures(email);
  return NextResponse.json(
    { valid: true, dispatchToken },
    { status: 200 },
  );
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
