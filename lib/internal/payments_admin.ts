/**
 * Round 14: the internal payments page (/internal/payments). Read only.
 *
 * Access: PULSE_TOKEN (round 8). The page answers 404 unless PULSE_TOKEN is set and UPAY or
 * GREEN_INVOICE is on. A visitor types the token once in a form; the server sets an httpOnly cookie
 * that holds an HMAC of the token (never the token), for 8 hours, path /internal. The token is
 * never in a URL. curl can send "Authorization: Bearer <token>" instead.
 *
 * Shows: orders, IPN calls that arrived, invoices (last 50 of each, emails masked), and the status
 * of the payment settings (which verifier is active and why, demo or live, what is configured).
 * Never shows a key, a secret or a full email.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { pulseTokenMatches } from '../pulse/pulse';
import { readGreenInvoiceConfig, isGreenInvoiceEnabled } from '../invoices/green_invoice';
import { isUpayEnabled, readUpayConfig, upayEnvMode } from '../payments/upay/upay_client';
import { describeVerifier } from '../payments/upay/upay_verifiers';

export const INTERNAL_COOKIE = 'eq_internal';
export const INTERNAL_COOKIE_MAX_AGE = 8 * 60 * 60;

export function internalPagesAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.PULSE_TOKEN?.trim()) && (isUpayEnabled(env.UPAY) || isGreenInvoiceEnabled(env.GREEN_INVOICE));
}

export function internalCookieValue(token = process.env.PULSE_TOKEN ?? ''): string {
  return createHmac('sha256', `equify-internal-v1|${token.trim()}`).update('internal').digest('hex');
}

export function internalAccessOk(input: { cookie?: string | null; bearer?: string | null }, env: NodeJS.ProcessEnv = process.env): boolean {
  const token = env.PULSE_TOKEN?.trim();
  if (!token) return false;
  if (input.bearer && pulseTokenMatches(input.bearer, token)) return true;
  if (!input.cookie) return false;
  const a = Buffer.from(input.cookie);
  const b = Buffer.from(internalCookieValue(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${(user ?? '').slice(0, 2)}***@${domain}`;
}

export interface PaymentsStatus {
  upay: 'on' | 'off';
  upayConfigured: boolean;
  upayEnv: string;
  verifier: { name: string; active: string; reason: string };
  ipList: number;
  ipnSecret: boolean;
  verifyUrl: boolean;
  greenInvoice: 'on' | 'off';
  greenInvoiceConfigured: boolean;
  greenInvoiceTarget: 'live' | 'sandbox' | 'not_configured';
}

export function paymentsStatus(env: NodeJS.ProcessEnv = process.env): PaymentsStatus {
  const upay = readUpayConfig(env);
  const gi = readGreenInvoiceConfig(env);
  const mode = upayEnvMode(env);
  return {
    upay: isUpayEnabled(env.UPAY) ? 'on' : 'off',
    upayConfigured: Boolean(upay),
    upayEnv: mode === 'legacy' ? (upay?.live ? 'live (UPAY_LIVE=1)' : 'test (UPAY_LIVE)') : mode,
    verifier: describeVerifier(env),
    ipList: (env.UPAY_IPN_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean).length,
    ipnSecret: Boolean(env.UPAY_IPN_SECRET?.trim()),
    verifyUrl: Boolean(env.UPAY_IPN_VERIFY_URL?.trim()),
    greenInvoice: isGreenInvoiceEnabled(env.GREEN_INVOICE) ? 'on' : 'off',
    greenInvoiceConfigured: Boolean(gi),
    greenInvoiceTarget: gi ? (gi.live ? 'live' : 'sandbox') : 'not_configured',
  };
}

export interface OrderRow { id: string; email: string; amount: number; currency: string; status: string; cashierId: string | null; released: boolean; tokenMinted: boolean; createdAt: string }
export interface IpnRow { id: number; orderId: string | null; ip: string | null; outcome: string; createdAt: string }
export interface InvoiceRow { orderKey: string; status: string; documentNumber: number | null; error: string | null; createdAt: string }

export interface PaymentsOverview {
  status: PaymentsStatus;
  db: 'ok' | 'not_configured' | 'error';
  error?: string;
  orders: OrderRow[];
  ipn: IpnRow[];
  invoices: InvoiceRow[];
}

/** The minimal read API we use (Supabase's builder fits it). */
export interface ReadDb {
  from(table: string): { select(cols: string): { order(col: string, o: { ascending: boolean }): { limit(n: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> } } };
}

export async function loadPaymentsOverview(db: ReadDb | null, env: NodeJS.ProcessEnv = process.env, limit = 50): Promise<PaymentsOverview> {
  const status = paymentsStatus(env);
  if (!db) return { status, db: 'not_configured', orders: [], ipn: [], invoices: [] };
  const read = async (table: string, cols: string) => {
    const r = await db.from(table).select(cols).order('created_at', { ascending: false }).limit(limit);
    if (r.error) throw new Error(`${table}: ${r.error.message}`);
    return (r.data ?? []) as Array<Record<string, unknown>>;
  };
  try {
    const [o, i, v] = await Promise.all([
      read('upay_orders', 'id,email,amount,currency,status,cashier_id,released_at,dispatch_token,created_at'),
      read('upay_ipn_log', 'id,order_id,ip,outcome,created_at'),
      read('invoice_documents', 'order_key,status,document_number,error,created_at'),
    ]);
    return {
      status,
      db: 'ok',
      orders: o.map((r) => ({
        id: String(r.id),
        email: maskEmail(r.email as string),
        amount: Number(r.amount),
        currency: String(r.currency),
        status: String(r.status),
        cashierId: (r.cashier_id as string | null) ?? null,
        released: Boolean(r.released_at),
        tokenMinted: Boolean(r.dispatch_token),
        createdAt: String(r.created_at),
      })),
      ipn: i.map((r) => ({ id: Number(r.id), orderId: (r.order_id as string | null) ?? null, ip: (r.ip as string | null) ?? null, outcome: String(r.outcome), createdAt: String(r.created_at) })),
      invoices: v.map((r) => ({ orderKey: String(r.order_key), status: String(r.status), documentNumber: r.document_number == null ? null : Number(r.document_number), error: (r.error as string | null) ?? null, createdAt: String(r.created_at) })),
    };
  } catch (err) {
    return { status, db: 'error', error: err instanceof Error ? err.message : String(err), orders: [], ipn: [], invoices: [] };
  }
}
