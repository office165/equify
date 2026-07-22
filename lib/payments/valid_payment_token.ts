/**
 * Server-side proof that a payment/promo webhook minted an unused, unexpired
 * token for the given email (stripe_customer_id or purchaser users.email).
 */

import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

const ENTITLEMENT_GATEWAYS = ['paypal', 'promo_free'] as const;

export async function hasValidUnusedPaymentTokenForEmail(
  email: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: byCustomer } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('is_used', false)
    .in('gateway_provider', [...ENTITLEMENT_GATEWAYS])
    .eq('stripe_customer_id', normalized)
    .gt('expires_at', nowIso)
    .limit(1)
    .maybeSingle();

  if (byCustomer?.id) return true;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalized)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user?.id) return false;

  const { data: byUser } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('is_used', false)
    .in('gateway_provider', [...ENTITLEMENT_GATEWAYS])
    .eq('purchaser_user_id', user.id)
    .gt('expires_at', nowIso)
    .limit(1)
    .maybeSingle();

  return Boolean(byUser?.id);
}

/**
 * Atomically mark one unused entitlement token as used (single-report guarantee).
 * Single DB round-trip: UPDATE … WHERE is_used = false RETURNING id (via RPC).
 */
export async function consumeUnusedPaymentTokenForEmail(
  email: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc('consume_unused_payment_token', {
    p_email: normalized,
  });

  if (error) {
    console.error('[valid_payment_token] consume failed', error);
    return false;
  }

  // RPC returns claimed uuid or null — equivalent to RETURNING + rowCount check.
  return typeof data === 'string' && data.length > 0;
}
