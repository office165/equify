/**
 * Atomic promo redeem + dispatch-token mint (server-only).
 * DB work runs in redeem_promo_and_mint RPC — one transaction.
 */

import * as crypto from 'node:crypto';
import { PaymentDispatchTokenService } from '../auth/payment_dispatch_token_service';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

export const PROMO_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;

export type PromoMintDenyReason =
  | 'supabase_not_configured'
  | 'code_not_found'
  | 'inactive'
  | 'expired'
  | 'max_uses_reached'
  | 'invalid_input'
  | 'invalid_mint_params'
  | 'constraint_violation'
  | 'unique_violation'
  | 'db_error'
  | 'mint_tx_failed';

export interface PromoRedeemMintSuccess {
  ok: true;
  dispatchToken: string;
  transactionId: string;
  redemptionId: string;
}

export interface PromoRedeemMintFailure {
  ok: false;
  reason: PromoMintDenyReason;
  dbCode?: string;
  dbMessage?: string;
}

export type PromoRedeemMintResult =
  | PromoRedeemMintSuccess
  | PromoRedeemMintFailure;

export interface PromoRedeemMintDeps {
  isConfigured: () => boolean;
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message?: string; details?: string } | null }>;
  signDispatch: (payload: {
    sub: string;
    valuationId: string;
    email: string;
    jti: string;
  }) => { token: string; jti: string };
}

function defaultDeps(): PromoRedeemMintDeps {
  return {
    isConfigured: isSupabaseAdminConfigured,
    rpc: async (fn, args) => {
      const supabase = getSupabaseAdminClient();
      return supabase.rpc(fn, args);
    },
    signDispatch: (payload) =>
      new PaymentDispatchTokenService().signDispatch(payload),
  };
}

/** @internal exported for regression tests */
export function mapPromoRpcError(err: {
  code?: string;
  message?: string;
  details?: string;
}): PromoRedeemMintFailure {
  const raw = `${err.message ?? ''} ${err.details ?? ''}`.trim();
  const lower = raw.toLowerCase();

  const known: PromoMintDenyReason[] = [
    'code_not_found',
    'inactive',
    'expired',
    'max_uses_reached',
    'invalid_input',
    'invalid_mint_params',
    'constraint_violation',
    'unique_violation',
  ];
  for (const reason of known) {
    if (lower.includes(reason)) {
      return {
        ok: false,
        reason,
        dbCode: err.code,
        dbMessage: raw || undefined,
      };
    }
  }

  if (err.code === '23514' || lower.includes('check constraint')) {
    return {
      ok: false,
      reason: 'constraint_violation',
      dbCode: err.code,
      dbMessage: raw || undefined,
    };
  }
  if (err.code === '23505') {
    return {
      ok: false,
      reason: 'unique_violation',
      dbCode: err.code,
      dbMessage: raw || undefined,
    };
  }

  return {
    ok: false,
    reason: 'db_error',
    dbCode: err.code,
    dbMessage: raw || undefined,
  };
}

/** Unique gateway id for promo_free rows (NOT NULL + UNIQUE on stripe_payment_intent_id). */
export function buildPromoPaymentIntentId(transactionId: string): string {
  return `promo-free-${transactionId}`;
}

export async function redeemPromoAndMint(
  input: {
    code: string;
    email: string;
    purchaserUserId?: string | null;
    valuationId?: string | null;
  },
  deps: PromoRedeemMintDeps = defaultDeps(),
): Promise<PromoRedeemMintResult> {
  if (!deps.isConfigured()) {
    return { ok: false, reason: 'supabase_not_configured' };
  }

  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();
  const transactionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const valuationId = input.valuationId?.trim() || crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + PROMO_TOKEN_TTL_SECONDS * 1000,
  ).toISOString();
  const stripePaymentIntentId = buildPromoPaymentIntentId(transactionId);

  const { token: dispatchToken } = deps.signDispatch({
    sub: transactionId,
    valuationId,
    email,
    jti,
  });

  const { data, error } = await deps.rpc('redeem_promo_and_mint', {
    p_code: code,
    p_email: email,
    p_transaction_id: transactionId,
    p_token_jti: jti,
    p_token_jwt: dispatchToken,
    p_expires_at: expiresAt,
    p_stripe_payment_intent_id: stripePaymentIntentId,
    p_purchaser_user_id: input.purchaserUserId ?? null,
    p_valuation_id: input.valuationId?.trim() || null,
    p_metadata: {
      dispatch_token_used_at: null,
      synthetic_valuation_id: input.valuationId?.trim() ? null : valuationId,
    },
  });

  if (error) {
    return mapPromoRpcError(error);
  }

  const payload = data as
    | { ok?: boolean; redemption_id?: string; transaction_id?: string }
    | null;

  if (!payload?.ok || !payload.redemption_id || !payload.transaction_id) {
    return {
      ok: false,
      reason: 'mint_tx_failed',
      dbMessage: 'rpc returned empty payload',
    };
  }

  return {
    ok: true,
    dispatchToken,
    transactionId: payload.transaction_id,
    redemptionId: payload.redemption_id,
  };
}
