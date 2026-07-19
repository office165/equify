/**
 * Server-side proof that PayPal webhook minted an unused, unexpired payment token
 * for the given email (stripe_customer_id or purchaser users.email).
 */

import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

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
    .eq('gateway_provider', 'paypal')
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
    .eq('purchaser_user_id', user.id)
    .gt('expires_at', nowIso)
    .limit(1)
    .maybeSingle();

  return Boolean(byUser?.id);
}
