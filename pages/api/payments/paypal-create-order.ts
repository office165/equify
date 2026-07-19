import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getSupabaseAdminClient } from '../../../lib/db/supabase';
import { createPayPalOrder } from '../../../lib/payments/paypal_gateway';
import { sendPagesJsonError } from '../../../lib/api/http';

const PAYMENT_ORDERS_TABLE = 'payment_orders';
const DEFAULT_CURRENCY = 'ILS';
const DEFAULT_REPORT_PRICE = 499;

type CreateOrderRequestBody = {
  wizard?: unknown;
  locale?: string;
  email?: string;
  phone?: string;
  amount?: number;
  currency?: string;
};

function resolveBaseUrl(req: NextApiRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

/**
 * POST /api/payments/paypal-create-order
 * Persists a pending payment order (status=CREATED) and creates the matching
 * PayPal order, returning the buyer approval URL the wizard should redirect to.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendPagesJsonError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    return;
  }

  const body = (req.body || {}) as CreateOrderRequestBody;

  if (!body.wizard || typeof body.wizard !== 'object') {
    sendPagesJsonError(res, 400, 'wizard payload is required', 'VALIDATION_ERROR');
    return;
  }

  const amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : DEFAULT_REPORT_PRICE;
  const currency = body.currency || DEFAULT_CURRENCY;
  const referenceId = randomUUID();
  const baseUrl = resolveBaseUrl(req);

  try {
    const supabase = getSupabaseAdminClient();

    const { error: insertError } = await supabase.from(PAYMENT_ORDERS_TABLE).insert({
      reference_id: referenceId,
      provider: 'paypal',
      status: 'CREATED',
      amount,
      currency,
      wizard_payload: body.wizard,
      locale: body.locale ?? null,
      contact_email: body.email ?? null,
      contact_phone: body.phone ?? null,
    });

    if (insertError) {
      throw new Error(`Failed to persist pending payment order: ${insertError.message}`);
    }

    const order = await createPayPalOrder({
      amount,
      currency,
      referenceId,
      returnUrl: `${baseUrl}/wizard?paypalReturn=1&ref=${referenceId}`,
      cancelUrl: `${baseUrl}/wizard?paypalCancelled=1&ref=${referenceId}`,
    });

    const { error: updateError } = await supabase
      .from(PAYMENT_ORDERS_TABLE)
      .update({ order_id: order.orderId, status: 'PENDING_APPROVAL' })
      .eq('reference_id', referenceId);

    if (updateError) {
      throw new Error(`Failed to attach PayPal order id: ${updateError.message}`);
    }

    res.status(200).json({
      referenceId,
      orderId: order.orderId,
      approveUrl: order.approveUrl,
    });
  } catch (err) {
    console.error('paypal-create-order failed:', err);
    sendPagesJsonError(
      res,
      502,
      err instanceof Error ? err.message : 'Failed to create PayPal order.',
      'PAYPAL_CREATE_ORDER_FAILED',
    );
  }
}
