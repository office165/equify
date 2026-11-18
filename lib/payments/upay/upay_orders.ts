/**
 * Round 9 (UPAY): orders and the IPN log.
 * An order is created by our server before the customer goes to upay. Its id goes into the return
 * URL and the IPN URL together with an HMAC, so a request that does not carry our signature is
 * rejected before anything else. Supabase tables in supabase/migrations/20261118_upay_orders.sql
 * (applied by hand); tests use the memory store.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../db/supabase';

export type UpayOrderStatus = 'created' | 'redirected' | 'paid' | 'failed' | 'cancelled';

export interface UpayOrder {
  id: string;
  email: string;
  amount: number;
  currency: 'ILS' | 'USD';
  status: UpayOrderStatus;
  cashierId?: string | null;
  /** Set once, by the call that released the report. */
  releasedAt?: string | null;
  dispatchToken?: string | null;
  createdAt: string;
}

export interface UpayOrderStore {
  create(o: UpayOrder): Promise<void>;
  get(id: string): Promise<UpayOrder | null>;
  /** Sets fields only if the current status is one of `from`. Returns the updated order, or null. */
  transition(id: string, from: UpayOrderStatus[], patch: Partial<UpayOrder>): Promise<UpayOrder | null>;
  /** Claims the release: true for exactly one caller per order. */
  claimRelease(id: string): Promise<boolean>;
  setToken(id: string, token: string): Promise<void>;
  logIpn(entry: { orderId: string | null; ip: string | null; query: Record<string, string>; body: string; outcome: string }): Promise<void>;
}

export function newOrderId(): string {
  return randomUUID();
}

/** Signature of an order id for our URLs (HMAC-SHA256 with UPAY_API_KEY, first 32 hex chars). */
export function signOrderId(orderId: string, secret = process.env.UPAY_API_KEY ?? ''): string {
  if (!secret) throw new Error('UPAY_API_KEY is not set');
  return createHmac('sha256', `equify-upay-order|${secret}`).update(orderId).digest('hex').slice(0, 32);
}

export function orderSignatureOk(orderId: string, sig: string | null | undefined, secret = process.env.UPAY_API_KEY ?? ''): boolean {
  if (!secret || !sig || !orderId) return false;
  const a = Buffer.from(signOrderId(orderId, secret));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function memoryUpayOrderStore(): UpayOrderStore & { ipnLog: unknown[]; orders: Map<string, UpayOrder> } {
  const orders = new Map<string, UpayOrder>();
  const released = new Set<string>();
  const ipnLog: unknown[] = [];
  return {
    orders,
    ipnLog,
    async create(o) {
      orders.set(o.id, { ...o });
    },
    async get(id) {
      const o = orders.get(id);
      return o ? { ...o } : null;
    },
    async transition(id, from, patch) {
      const o = orders.get(id);
      if (!o || !from.includes(o.status)) return null;
      const next = { ...o, ...patch };
      orders.set(id, next);
      return { ...next };
    },
    async claimRelease(id) {
      if (released.has(id)) return false;
      released.add(id);
      const o = orders.get(id);
      if (o) orders.set(id, { ...o, releasedAt: new Date().toISOString() });
      return true;
    },
    async setToken(id, token) {
      const o = orders.get(id);
      if (o) orders.set(id, { ...o, dispatchToken: token });
    },
    async logIpn(entry) {
      ipnLog.push(entry);
    },
  };
}

type Row = { id: string; email: string; amount: number; currency: 'ILS' | 'USD'; status: UpayOrderStatus; cashier_id: string | null; released_at: string | null; dispatch_token: string | null; created_at: string };
const fromRow = (r: Row): UpayOrder => ({ id: r.id, email: r.email, amount: Number(r.amount), currency: r.currency, status: r.status, cashierId: r.cashier_id, releasedAt: r.released_at, dispatchToken: r.dispatch_token, createdAt: r.created_at });
const toRow = (p: Partial<UpayOrder>): Partial<Row> => ({
  ...(p.status ? { status: p.status } : {}),
  ...(p.cashierId !== undefined ? { cashier_id: p.cashierId } : {}),
});

export function supabaseUpayOrderStore(): UpayOrderStore {
  const db = () => getSupabaseAdminClient();
  return {
    async create(o) {
      const { error } = await db().from('upay_orders').insert({ id: o.id, email: o.email, amount: o.amount, currency: o.currency, status: o.status, cashier_id: o.cashierId ?? null, created_at: o.createdAt });
      if (error) throw new Error(error.message);
    },
    async get(id) {
      const { data, error } = await db().from('upay_orders').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? fromRow(data as Row) : null;
    },
    async transition(id, from, patch) {
      const { data, error } = await db().from('upay_orders').update(toRow(patch)).eq('id', id).in('status', from).select('*').maybeSingle();
      if (error) throw new Error(error.message);
      return data ? fromRow(data as Row) : null;
    },
    async claimRelease(id) {
      // Atomic: only the update that finds released_at empty wins.
      const { data, error } = await db().from('upay_orders').update({ released_at: new Date().toISOString() }).eq('id', id).is('released_at', null).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
    async setToken(id, token) {
      const { error } = await db().from('upay_orders').update({ dispatch_token: token }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    async logIpn(entry) {
      const { error } = await db().from('upay_ipn_log').insert({ order_id: entry.orderId, ip: entry.ip, query: entry.query, body: entry.body.slice(0, 10_000), outcome: entry.outcome });
      if (error) console.error('[upay-ipn] log insert failed', error.message);
    },
  };
}

export function defaultUpayOrderStore(): UpayOrderStore {
  if (!isSupabaseAdminConfigured()) throw new Error('supabase_not_configured');
  return supabaseUpayOrderStore();
}
