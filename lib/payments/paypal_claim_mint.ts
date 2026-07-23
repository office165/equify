/**
 * Atomic PayPal capture claim + dispatch-token mint (server-only).
 */

import * as crypto from 'node:crypto';
import { PaymentDispatchTokenService } from '../auth/payment_dispatch_token_service';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

export const PAYPAL_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;
export const ON_DEMAND_AMOUNT_ILS = 999;

export type PaypalClaimResult =
  | {
      ok: true;
      duplicate: boolean;
      transactionId: string;
      valuationId: string | null;
      userId?: string;
      dispatchToken?: string;
    }
  | {
      ok: false;
      reason:
        | 'supabase_not_configured'
        | 'user_not_found'
        | 'invalid_mint_params'
        | 'constraint_violation'
        | 'unique_violation'
        | 'db_error';
      dbCode?: string;
      dbMessage?: string;
    };

export interface PaypalClaimDeps {
  isConfigured: () => boolean;
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { code?: string; message?: string; details?: string } | null;
  }>;
  signDispatch: (payload: {
    sub: string;
    valuationId: string;
    email: string;
    jti: string;
  }) => { token: string; jti: string };
}

function defaultDeps(): PaypalClaimDeps {
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

export function mapPaypalClaimRpcError(err: {
  code?: string;
  message?: string;
  details?: string;
}): Extract<PaypalClaimResult, { ok: false }> {
  const raw = `${err.message ?? ''} ${err.details ?? ''}`.trim();
  const lower = raw.toLowerCase();
  if (lower.includes('user_not_found')) {
    return { ok: false, reason: 'user_not_found', dbCode: err.code, dbMessage: raw };
  }
  if (lower.includes('invalid_mint_params') || lower.includes('invalid_input')) {
    return {
      ok: false,
      reason: 'invalid_mint_params',
      dbCode: err.code,
      dbMessage: raw,
    };
  }
  if (lower.includes('constraint_violation') || err.code === '23514') {
    return {
      ok: false,
      reason: 'constraint_violation',
      dbCode: err.code,
      dbMessage: raw,
    };
  }
  if (lower.includes('unique_violation') || err.code === '23505') {
    return {
      ok: false,
      reason: 'unique_violation',
      dbCode: err.code,
      dbMessage: raw,
    };
  }
  return { ok: false, reason: 'db_error', dbCode: err.code, dbMessage: raw || undefined };
}

export async function claimPaypalCaptureAndMint(
  input: {
    captureId: string;
    saleId?: string | null;
    payerEmail: string;
    gatewayAmountIls?: number | null;
    gatewayStatus?: string | null;
    paypalEventId?: string | null;
  },
  deps: PaypalClaimDeps = defaultDeps(),
): Promise<PaypalClaimResult> {
  if (!deps.isConfigured()) {
    return { ok: false, reason: 'supabase_not_configured' };
  }

  const email = input.payerEmail.trim().toLowerCase();
  const captureId = input.captureId.trim();
  if (!email || !captureId) {
    return { ok: false, reason: 'invalid_mint_params' };
  }

  const transactionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  // Synthetic valuation id when no draft — JWT still well-formed for verify paths.
  const valuationIdForToken = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + PAYPAL_TOKEN_TTL_SECONDS * 1000,
  ).toISOString();

  const { token: dispatchToken } = deps.signDispatch({
    sub: transactionId,
    valuationId: valuationIdForToken,
    email,
    jti,
  });

  const { data, error } = await deps.rpc('claim_paypal_capture_and_mint', {
    p_transaction_id: transactionId,
    p_capture_id: captureId,
    p_sale_id: input.saleId?.trim() || null,
    p_payer_email: email,
    p_token_jti: jti,
    p_token_jwt: dispatchToken,
    p_expires_at: expiresAt,
    p_amount: ON_DEMAND_AMOUNT_ILS,
    p_metadata: {
      gateway_amount: input.gatewayAmountIls ?? null,
      gateway_status: input.gatewayStatus ?? null,
      paypal_event_id: input.paypalEventId ?? null,
      dispatch_token_used_at: null,
      synthetic_valuation_id: valuationIdForToken,
    },
  });

  if (error) {
    return mapPaypalClaimRpcError(error);
  }

  const row = data as {
    ok?: boolean;
    reason?: string;
    duplicate?: boolean;
    transaction_id?: string;
    valuation_id?: string | null;
    user_id?: string;
  } | null;

  if (row && row.ok === false && row.reason === 'user_not_found') {
    return { ok: false, reason: 'user_not_found' };
  }

  if (!row?.ok || !row.transaction_id) {
    return { ok: false, reason: 'db_error', dbMessage: 'claim_paypal_empty' };
  }

  return {
    ok: true,
    duplicate: Boolean(row.duplicate),
    transactionId: String(row.transaction_id),
    valuationId: row.valuation_id ? String(row.valuation_id) : null,
    userId: row.user_id ? String(row.user_id) : undefined,
    dispatchToken: row.duplicate ? undefined : dispatchToken,
  };
}
