/**
 * Round 9 (GREEN_INVOICE, off by default): a tax invoice / receipt (document type 320) in Green
 * Invoice (morning) after a payment was verified, for upay or PayPal. From the official OpenAPI
 * document (developers.morning.co/docs/openapi.bundled.json, "morning API Documentation 2.0.0"):
 *   token:     POST https://api.morning.co/idp/v1/oauth/token (sandbox https://api.sandbox.morning.dev)
 *              body { grant_type: "client_credentials", client_id, client_secret } -> { accessToken, expiresAt }
 *   document:  POST https://api.greeninvoice.co.il/api/v1/documents (sandbox https://sandbox.d.greeninvoice.co.il/api/v1)
 *              { type: 320, lang, currency, vatType, client: { name, emails }, income: [...], payment: [...] } -> 201 { id, number, url }
 * Payment type codes: 3 credit card, 5 PayPal. GREEN_INVOICE_API_ID / GREEN_INVOICE_API_SECRET are
 * the API key's client id and secret. GREEN_INVOICE_LIVE=1 uses production; anything else, the sandbox.
 * One invoice per order: the order key is claimed in invoice_documents before the call.
 */
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../db/supabase';

export function isGreenInvoiceEnabled(value = process.env.GREEN_INVOICE): boolean {
  return value?.trim().toLowerCase() === 'on';
}

export interface GreenInvoiceConfig {
  clientId: string;
  clientSecret: string;
  live: boolean;
}

export function readGreenInvoiceConfig(env: NodeJS.ProcessEnv = process.env): GreenInvoiceConfig | null {
  const clientId = env.GREEN_INVOICE_API_ID?.trim();
  const clientSecret = env.GREEN_INVOICE_API_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, live: env.GREEN_INVOICE_LIVE?.trim() === '1' };
}

export function greenInvoiceUrls(cfg: GreenInvoiceConfig): { token: string; documents: string } {
  return cfg.live
    ? { token: 'https://api.morning.co/idp/v1/oauth/token', documents: 'https://api.greeninvoice.co.il/api/v1/documents' }
    : { token: 'https://api.sandbox.morning.dev/idp/v1/oauth/token', documents: 'https://sandbox.d.greeninvoice.co.il/api/v1/documents' };
}

export interface InvoiceRequest {
  /** Unique per payment, e.g. "upay:<order id>" or "paypal:<capture id>". */
  orderKey: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: 'ILS' | 'USD';
  method: 'credit_card' | 'paypal';
  transactionId: string;
  /** YYYY-MM-DD */
  date: string;
  cardLast4?: string;
}

/** The 999 price on the site includes VAT, so income rows use vatType 1 (included). To confirm with the accountant. */
export function buildInvoiceBody(r: InvoiceRequest): Record<string, unknown> {
  return {
    type: 320,
    lang: 'he',
    currency: r.currency,
    vatType: 0,
    description: 'דוח הערכת שווי',
    remarks: `equify ${r.orderKey}`,
    client: { name: r.customerName || r.customerEmail, emails: [r.customerEmail] },
    income: [{ description: 'דוח הערכת שווי equify', quantity: 1, price: r.amount, currency: r.currency, vatType: 1 }],
    payment: [
      {
        date: r.date,
        type: r.method === 'paypal' ? 5 : 3,
        price: r.amount,
        currency: r.currency,
        ...(r.method === 'paypal' ? { transactionId: r.transactionId } : {}),
        ...(r.method === 'credit_card' && r.cardLast4 ? { cardNum: r.cardLast4 } : {}),
      },
    ],
  };
}

export type JsonFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface InvoiceStore {
  /** True for exactly one caller per order key. */
  claim(orderKey: string): Promise<boolean>;
  done(orderKey: string, doc: { id: string; number: number | null }): Promise<void>;
  failed(orderKey: string, reason: string): Promise<void>;
}

export function memoryInvoiceStore(): InvoiceStore & { rows: Map<string, unknown> } {
  const rows = new Map<string, unknown>();
  return {
    rows,
    async claim(k) {
      if (rows.has(k)) return false;
      rows.set(k, { status: 'pending' });
      return true;
    },
    async done(k, doc) {
      rows.set(k, { status: 'issued', ...doc });
    },
    async failed(k, reason) {
      rows.set(k, { status: 'failed', reason });
    },
  };
}

export function supabaseInvoiceStore(): InvoiceStore {
  const db = () => getSupabaseAdminClient();
  return {
    async claim(k) {
      const { error } = await db().from('invoice_documents').insert({ order_key: k, status: 'pending' });
      if (!error) return true;
      if (error.code === '23505') return false;
      throw new Error(error.message);
    },
    async done(k, doc) {
      await db().from('invoice_documents').update({ status: 'issued', provider_document_id: doc.id, document_number: doc.number }).eq('order_key', k);
    },
    async failed(k, reason) {
      await db().from('invoice_documents').update({ status: 'failed', error: reason.slice(0, 500) }).eq('order_key', k);
    },
  };
}

export type IssueOutcome = 'off' | 'not_configured' | 'duplicate' | 'issued' | 'failed';

export async function issueInvoiceOnce(
  r: InvoiceRequest,
  deps: { store?: InvoiceStore; fetchImpl?: JsonFetch; config?: GreenInvoiceConfig | null } = {},
): Promise<{ outcome: IssueOutcome; documentId?: string; reason?: string }> {
  if (!isGreenInvoiceEnabled()) return { outcome: 'off' };
  const cfg = deps.config === undefined ? readGreenInvoiceConfig() : deps.config;
  if (!cfg) return { outcome: 'not_configured' };
  const store = deps.store ?? (isSupabaseAdminConfigured() ? supabaseInvoiceStore() : null);
  if (!store) return { outcome: 'not_configured', reason: 'no invoice store' };
  if (!(await store.claim(r.orderKey))) return { outcome: 'duplicate' };
  const f = deps.fetchImpl ?? (fetch as unknown as JsonFetch);
  const urls = greenInvoiceUrls(cfg);
  try {
    const t = await f(urls.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: cfg.clientId, client_secret: cfg.clientSecret }),
    });
    const tj = (await t.json()) as { accessToken?: string };
    if (!t.ok || !tj.accessToken) throw new Error(`token_http_${t.status}`);
    const d = await f(urls.documents, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tj.accessToken}` },
      body: JSON.stringify(buildInvoiceBody(r)),
    });
    const dj = (await d.json()) as { id?: string; number?: number };
    if (!d.ok || !dj.id) throw new Error(`document_http_${d.status}`);
    await store.done(r.orderKey, { id: dj.id, number: dj.number ?? null });
    return { outcome: 'issued', documentId: dj.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await store.failed(r.orderKey, reason);
    console.error('[green-invoice] failed', { orderKey: r.orderKey, reason });
    return { outcome: 'failed', reason };
  }
}
