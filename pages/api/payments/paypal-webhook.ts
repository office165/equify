import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '../../../lib/db/supabase';
import { verifyPayPalWebhookSignature, capturePayPalOrder } from '../../../lib/payments/paypal_gateway';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PAYMENT_ORDERS_TABLE = 'payment_orders';

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    custom_id?: string;
  };
};

/**
 * POST /api/payments/paypal-webhook
 *
 * Verifies the PayPal webhook signature before trusting any event — this is
 * the ONLY place in the app allowed to mark a payment_orders row as COMPLETED.
 * Do not trust client-supplied payment status anywhere else.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawBody = await readRawBody(req);

  let verified = false;
  try {
    verified = await verifyPayPalWebhookSignature(
      req.headers as Record<string, string | undefined>,
      rawBody,
    );
  } catch (err) {
    console.error('paypal-webhook signature verification error:', err);
  }

  if (!verified) {
    console.error('paypal-webhook: signature verification failed — rejecting event.');
    res.status(400).json({ error: 'invalid_signature' });
    return;
  }

  const event = JSON.parse(rawBody) as PayPalWebhookEvent;
  const eventType = event.event_type;
  const orderId =
    event.resource?.supplementary_data?.related_ids?.order_id ??
    (eventType === 'CHECKOUT.ORDER.APPROVED' ? event.resource?.id : undefined);

  if (!orderId) {
    res.status(200).json({ received: true, ignored: true, reason: 'no_order_id' });
    return;
  }

  const supabase = getSupabaseAdminClient();

  try {
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      const capture = await capturePayPalOrder(orderId);
      await supabase
        .from(PAYMENT_ORDERS_TABLE)
        .update({
          status: capture.status === 'COMPLETED' ? 'COMPLETED' : 'CAPTURE_PENDING',
          capture_id: capture.captureId,
          payer_email: capture.payerEmail,
          captured_at: capture.status === 'COMPLETED' ? new Date().toISOString() : null,
        })
        .eq('order_id', orderId);
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      await supabase
        .from(PAYMENT_ORDERS_TABLE)
        .update({
          status: 'COMPLETED',
          captured_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('paypal-webhook processing error:', err);
    res.status(500).json({ error: 'processing_failed' });
  }
}
