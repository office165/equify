import { getSupabaseAdminClient } from '../db/supabase';

export const PAYMENT_ORDERS_TABLE = 'payment_orders';

export type PaymentOrderRecord = {
  reference_id: string;
  order_id: string | null;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  capture_id: string | null;
  payer_email: string | null;
};

/**
 * Returns the payment order row for a reference id, or null if it doesn't exist.
 * This is a plain read — it never mutates the row. Only the PayPal webhook
 * handler (pages/api/payments/paypal-webhook.ts) is allowed to mark an order
 * as COMPLETED.
 */
export async function getPaymentOrder(referenceId: string): Promise<PaymentOrderRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PAYMENT_ORDERS_TABLE)
    .select('reference_id, order_id, provider, status, amount, currency, capture_id, payer_email')
    .eq('reference_id', referenceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load payment order: ${error.message}`);
  }

  return (data as PaymentOrderRecord | null) ?? null;
}

/** True only if the referenced PayPal order has been verified as captured by the webhook. */
export function isPaymentOrderCompleted(
  order: PaymentOrderRecord | null,
): order is PaymentOrderRecord {
  return !!order && order.status === 'COMPLETED';
}
