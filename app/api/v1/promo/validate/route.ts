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
import { redeemPromoAndMint } from '../../../../../lib/payments/promo_redeem_mint';
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
    console.log('[promo/validate] deny', {
      reason: 'rate_limited',
      code,
      email,
    });
    return NextResponse.json(
      { valid: false, rateLimited: true },
      { status: 429 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    console.log('[promo/validate] deny', {
      reason: 'supabase_not_configured',
      code,
      email,
    });
    recordPromoValidateFailure(email);
    return invalidResponse();
  }

  const supabase = getSupabaseAdminClient();

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

  const minted = await redeemPromoAndMint({
    code,
    email,
    purchaserUserId: user?.id ?? null,
    valuationId: draft?.id ?? null,
  });

  if (!minted.ok) {
    console.log('[promo/validate] deny', {
      reason: minted.reason,
      code,
      email,
      db_code: minted.dbCode ?? null,
      db_error: minted.dbMessage ?? null,
    });
    recordPromoValidateFailure(email);
    return invalidResponse();
  }

  clearPromoValidateFailures(email);
  console.log('[promo/validate] ok', {
    code,
    email,
    transactionId: minted.transactionId,
    redemptionId: minted.redemptionId,
  });
  return NextResponse.json(
    { valid: true, dispatchToken: minted.dispatchToken },
    { status: 200 },
  );
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
