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
  const nowIso = new Date().toISOString();

  const { data: byCustomer } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('is_used', false)
    .in('gateway_provider', [...ENTITLEMENT_GATEWAYS])
    .eq('stripe_customer_id', normalized)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let tokenId = byCustomer?.id as string | undefined;

  if (!tokenId) {
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
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    tokenId = byUser?.id as string | undefined;
  }

  if (!tokenId) return false;

  const { data: claimed, error } = await supabase
    .from('stripe_transactions')
    .update({
      is_used: true,
      used_at: nowIso,
    })
    .eq('id', tokenId)
    .eq('is_used', false)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[valid_payment_token] consume failed', error);
    return false;
  }

  return Boolean(claimed?.id);
}
