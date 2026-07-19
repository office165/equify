/**
 * PayPal adapter — same CreateHostedSaleInput / PaymentCallbackPayload surface
 * as israeli_payment_gateway.ts (Grow/PayMe).
 * Selected via PAYMENT_GATEWAY_PROVIDER=paypal.
 */

import type {
  CreateHostedSaleInput,
  HostedSaleResult,
  PaymentCallbackPayload,
} from '../../israeli_payment_gateway';

const DEFAULT_LIVE_BASE = 'https://api-m.paypal.com';
const DEFAULT_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

type TokenCache = { accessToken: string; expiresAtMs: number };

let tokenCache: TokenCache | null = null;

export function resolvePayPalApiBase(): string {
  const explicit = process.env.PAYPAL_API_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const mode = (process.env.PAYPAL_MODE ?? 'live').trim().toLowerCase();
  return mode === 'sandbox' ? DEFAULT_SANDBOX_BASE : DEFAULT_LIVE_BASE;
}

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${resolvePayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await res.text();
  let json: { access_token?: string; expires_in?: number; error?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`PayPal token non-JSON response (${res.status})`);
  }

  if (!res.ok || !json.access_token) {
    throw new Error(
      `PayPal OAuth failed (${res.status}): ${json.error ?? text.slice(0, 300)}`,
    );
  }

  const expiresInSec = Number(json.expires_in ?? 32_000);
  tokenCache = {
    accessToken: json.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return json.access_token;
}

function headerValue(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string,
): string {
  if (headers instanceof Headers) {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? '';
  }
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0] ?? '';
  if (typeof direct === 'string') return direct;
  // Node often lowercases incoming headers
  const lowerKey = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  const viaKey = lowerKey ? headers[lowerKey] : undefined;
  return Array.isArray(viaKey) ? (viaKey[0] ?? '') : (viaKey ?? '');
}

export async function verifyPayPalWebhookSignature(
  headers: Headers | Record<string, string | string[] | undefined>,
  rawBody: string | Buffer,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    console.error('[paypal] PAYPAL_WEBHOOK_ID missing');
    return false;
  }

  const transmissionId = headerValue(headers, 'paypal-transmission-id');
  const transmissionTime = headerValue(headers, 'paypal-transmission-time');
  const certUrl = headerValue(headers, 'paypal-cert-url');
  const authAlgo = headerValue(headers, 'paypal-auth-algo');
  const transmissionSig = headerValue(headers, 'paypal-transmission-sig');

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false;
  }

  let webhookEvent: Record<string, unknown>;
  const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  try {
    webhookEvent = JSON.parse(bodyStr) as Record<string, unknown>;
  } catch {
    return false;
  }

  const accessToken = await getPayPalAccessToken();
  const res = await fetch(
    `${resolvePayPalApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    },
  );

  const json = (await res.json().catch(() => null)) as {
    verification_status?: string;
  } | null;

  return Boolean(res.ok && json?.verification_status === 'SUCCESS');
}

function extractPayerEmail(resource: Record<string, unknown>): string | undefined {
  const payer = resource.payer as Record<string, unknown> | undefined;
  if (payer?.email_address) return String(payer.email_address);

  const paymentSource = resource.payment_source as Record<string, unknown> | undefined;
  const paypalSrc = paymentSource?.paypal as Record<string, unknown> | undefined;
  if (paypalSrc?.email_address) return String(paypalSrc.email_address);

  return undefined;
}

export class PayPalGateway {
  async createHostedSale(input: CreateHostedSaleInput): Promise<HostedSaleResult> {
    if (input.currency !== 'ILS') {
      throw new Error('Only ILS is supported for PayPal hosted sales.');
    }

    const accessToken = await getPayPalAccessToken();
    const res = await fetch(`${resolvePayPalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'ILS',
              value: input.amountIls.toFixed(2),
            },
            description: input.description.slice(0, 127),
            custom_id: JSON.stringify(input.metadata).slice(0, 127),
          },
        ],
        application_context: {
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl ?? input.returnUrl,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
        ...(input.customerEmail
          ? { payer: { email_address: input.customerEmail } }
          : {}),
      }),
    });

    const raw = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      console.error('[paypal] create order failed', raw);
      throw new Error('PayPal failed to initialize hosted sale.');
    }

    const links =
      (raw.links as Array<{ rel?: string; href?: string }> | undefined) ?? [];
    const approve = links.find((l) => l.rel === 'approve');
    const saleId = String(raw.id ?? '');
    if (!saleId || !approve?.href) {
      throw new Error('PayPal order missing id or approve link.');
    }

    return { saleId, redirectUrl: approve.href, raw };
  }

  parseCaptureWebhook(event: Record<string, unknown>): PaymentCallbackPayload {
    const resource = (event.resource ?? {}) as Record<string, unknown>;
    const amountObj = (resource.amount ?? {}) as Record<string, unknown>;
    const supplementary =
      (resource.supplementary_data as Record<string, unknown> | undefined) ?? {};
    const relatedIds =
      (supplementary.related_ids as Record<string, unknown> | undefined) ?? {};

    let metadata: Record<string, string> = {};
    const custom =
      (resource.custom_id as string | undefined) ??
      (resource.custom as string | undefined);
    if (custom?.trim()) {
      try {
        metadata = JSON.parse(custom) as Record<string, string>;
      } catch {
        metadata = { custom };
      }
    }

    return {
      saleId: String(relatedIds.order_id ?? resource.invoice_id ?? resource.id ?? ''),
      transactionId: String(resource.id ?? ''),
      status: String(resource.status ?? event.event_type ?? ''),
      amountIls: Number(amountObj.value ?? 0),
      currency: String(amountObj.currency_code ?? 'ILS').toUpperCase(),
      payerEmail: extractPayerEmail(resource),
      metadata,
      raw: event,
    };
  }
}
