/**
 * Server-side PayPal REST integration for Equify.
 *
 * Reads credentials from environment variables only — never hardcode secrets here.
 * Required env vars (must be set in the Vercel project environment, in addition to
 * the Supabase Edge Function secrets of the same name):
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_WEBHOOK_ID
 *   PAYPAL_API_BASE (optional; defaults to live https://api-m.paypal.com)
 */

export type PayPalOrderResult = {
  orderId: string;
  approveUrl: string;
  status: string;
};

export type PayPalCaptureResult = {
  orderId: string;
  status: string;
  captureId: string | null;
  payerEmail: string | null;
};

function resolveApiBase(): string {
  return (process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com').replace(/\/$/, '');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not configured. Set it in the deployment environment.`);
  }
  return value.trim();
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Fetches (and caches) an OAuth2 access token using the PayPal client credentials grant. */
export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = requireEnv('PAYPAL_CLIENT_ID');
  const clientSecret = requireEnv('PAYPAL_CLIENT_SECRET');
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${resolveApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PayPal OAuth token request failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

export type CreateOrderInput = {
  amount: number;
  currency: string;
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
};

/** Creates a PayPal order (intent=CAPTURE) and returns the buyer approval URL. */
export async function createPayPalOrder(input: CreateOrderInput): Promise<PayPalOrderResult> {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${resolveApiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.referenceId,
          custom_id: input.referenceId,
          amount: {
            currency_code: input.currency,
            value: input.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PayPal create-order failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    id: string;
    status: string;
    links: Array<{ rel: string; href: string }>;
  };

  const approveLink = json.links.find((link) => link.rel === 'approve' || link.rel === 'payer-action');
  if (!approveLink) {
    throw new Error('PayPal order response did not include an approval link.');
  }

  return { orderId: json.id, approveUrl: approveLink.href, status: json.status };
}

/** Captures funds for a buyer-approved PayPal order. */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  const token = await getPayPalAccessToken();

  const res = await fetch(
    `${resolveApiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`PayPal capture failed (${res.status}): ${JSON.stringify(json)}`);
  }

  const capture = json?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

  return {
    orderId,
    status: json?.status ?? 'UNKNOWN',
    captureId: capture?.id ?? null,
    payerEmail: json?.payer?.email_address ?? null,
  };
}

/**
 * Verifies an incoming webhook against PayPal's verify-webhook-signature endpoint.
 * `headers` must contain the paypal-transmission-id/time/sig and cert-url/auth-algo headers.
 */
export async function verifyPayPalWebhookSignature(
  headers: Record<string, string | undefined>,
  rawBody: string,
): Promise<boolean> {
  const webhookId = requireEnv('PAYPAL_WEBHOOK_ID');
  const token = await getPayPalAccessToken();

  const get = (name: string) =>
    headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];

  const payload = {
    auth_algo: get('paypal-auth-algo'),
    cert_url: get('paypal-cert-url'),
    transmission_id: get('paypal-transmission-id'),
    transmission_sig: get('paypal-transmission-sig'),
    transmission_time: get('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };

  const res = await fetch(`${resolveApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return false;
  }

  const json = (await res.json()) as { verification_status: string };
  return json.verification_status === 'SUCCESS';
}
