/**
 * Round 9 (UPAY, off by default): upay API client, from "Upay Gateway Integration API Document"
 * version 7.0.6 (APIsignupUpayversion707.pdf). Only names that appear in that document are used.
 *
 *   POST https://app.upay.co.il/API6/clientsecure/json.php, form field `msgs` = JSON array (several
 *   requests in one call, document "Advanced implementations 1"). Header: refername "UPAY",
 *   livesystem 0 (test) or 1 (live), language "HE".
 *   1. CONNECTION / LOGIN with email and key (the key from GETKEY, used instead of passwordmd5).
 *   2. CASHIER / REDIRECTDEPOSITCREDITCARDTRANSFER with transfers[{ email, amount, numberpayments,
 *      comment, returnurl, currency }] and cardreader "0". The result has transactions[{ cashierid,
 *      totalamount, url }]. The card number is typed only on upay's page at `url`.
 *   Success: errorcode with errorcode % 100 === 0 (the document's PHP example), e.g. 20001000 and
 *   30001400.
 *
 * Not in the document, and therefore not in the code (see reports/round-9.md, "לאימות מול upay"):
 * the IPN format and how to verify it, a transaction status query, test cards, invoice fields, and
 * whether `ipnurl` (documented only for REDIRECTSETMYCREDITCARDDETAILS) works here.
 * The card number never passes through our server: DEPOSITCREDITCARDTRANSFER is not used.
 */

import { ON_DEMAND_AMOUNT_ILS } from '../paypal_claim_mint';

export const UPAY_LIVE_URL = 'https://app.upay.co.il/API6/clientsecure/json.php';
/** The document names https://demo.upay.co.il/ as the test server; the path is assumed to be the same (to verify). */
export const UPAY_TEST_URL = 'https://demo.upay.co.il/API6/clientsecure/json.php';

export interface UpayConfig {
  email: string;
  key: string;
  live: boolean;
  /** Round 14: UPAY_ENV=demo (demo.upay.co.il, livesystem 0). */
  demo?: boolean;
}

export type UpayEnvMode = 'demo' | 'live' | 'legacy';

/** Round 14: UPAY_ENV=demo or live. Unset keeps round 9's UPAY_LIVE ("1" live, anything else test). */
export function upayEnvMode(env: NodeJS.ProcessEnv = process.env): UpayEnvMode {
  const m = env.UPAY_ENV?.trim().toLowerCase();
  return m === 'demo' || m === 'live' ? m : 'legacy';
}

export function isUpayEnabled(value = process.env.UPAY): boolean {
  return value?.trim().toLowerCase() === 'on';
}

/** Credentials from UPAY_EMAIL, UPAY_API_KEY and UPAY_LIVE ("1" is live, anything else is test). */
export function readUpayConfig(env: NodeJS.ProcessEnv = process.env): UpayConfig | null {
  const email = env.UPAY_EMAIL?.trim();
  const key = env.UPAY_API_KEY?.trim();
  if (!email || !key) return null;
  const mode = upayEnvMode(env);
  const live = mode === 'live' ? true : mode === 'demo' ? false : env.UPAY_LIVE?.trim() === '1';
  return { email, key, live, demo: mode === 'demo' };
}

/** Round 14: the dollar price of the English site (lib/i18n/site/en.ts). */
export const UPAY_USD_AMOUNT = 349;
export const UPAY_ILS_AMOUNT = ON_DEMAND_AMOUNT_ILS;

/** The price of one report in this currency, or null when the currency is not sold (USD only with EN_SITE=on). */
export function upayPrice(currency: 'ILS' | 'USD', env: NodeJS.ProcessEnv = process.env): { amount: number; currency: 'ILS' | 'USD' } | null {
  if (currency === 'ILS') return { amount: UPAY_ILS_AMOUNT, currency };
  return env.EN_SITE?.trim().toLowerCase() === 'on' ? { amount: UPAY_USD_AMOUNT, currency } : null;
}

export function upayUrl(cfg: UpayConfig): string {
  return cfg.live ? UPAY_LIVE_URL : UPAY_TEST_URL;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: 'ILS' | 'USD';
  returnUrl: string;
}

export function buildCreatePaymentMsgs(cfg: UpayConfig, p: CreatePaymentInput): unknown[] {
  const header = { refername: 'UPAY', livesystem: cfg.live ? 1 : 0, language: 'HE' };
  const transfer: Record<string, string> = {
    email: cfg.email,
    amount: p.amount.toFixed(2),
    numberpayments: '1',
    comment: `equify order ${p.orderId}`,
    returnurl: p.returnUrl,
  };
  if (p.currency === 'USD') transfer.currency = 'USD';
  return [
    { header, request: { mainaction: 'CONNECTION', minoraction: 'LOGIN', encoding: 'json', parameters: { email: cfg.email, key: cfg.key } } },
    {
      header,
      request: {
        mainaction: 'CASHIER',
        minoraction: 'REDIRECTDEPOSITCREDITCARDTRANSFER',
        encoding: 'json',
        numbertemplate: 1,
        parameters: { transfers: [transfer], key: cfg.key, cardreader: '0' },
      },
    },
  ];
}

export function upayCodeOk(code: unknown): boolean {
  const n = Number(code);
  return Number.isFinite(n) && n > 0 && n % 100 === 0;
}

export type CreatePaymentResult =
  | { ok: true; cashierId: string; totalAmount: number; url: string }
  | { ok: false; reason: string; errorcode?: string };

interface UpayPart {
  header?: { errorcode?: string | number; errormessage?: string };
  result?: { transactions?: Array<{ cashierid?: string | number; totalamount?: string | number; url?: string }> };
}

/** Reads the answer to the two requests: either an array of parts or { result: [parts] }. */
export function parseCreatePaymentResponse(json: unknown): CreatePaymentResult {
  const parts: UpayPart[] = Array.isArray(json)
    ? (json as UpayPart[])
    : Array.isArray((json as { result?: unknown })?.result)
      ? ((json as { result: UpayPart[] }).result)
      : [json as UpayPart];
  for (const p of parts) {
    if (!upayCodeOk(p?.header?.errorcode)) {
      return { ok: false, reason: p?.header?.errormessage ?? 'upay_error', errorcode: String(p?.header?.errorcode ?? '') };
    }
  }
  const tx = parts.at(-1)?.result?.transactions?.[0];
  if (!tx?.url || tx.cashierid == null) return { ok: false, reason: 'no_transaction_url' };
  let host = '';
  try {
    host = new URL(tx.url).hostname;
  } catch {
    return { ok: false, reason: 'bad_url' };
  }
  if (!/(^|\.)upay\.co\.il$/.test(host)) return { ok: false, reason: 'url_not_upay' };
  return { ok: true, cashierId: String(tx.cashierid), totalAmount: Number(tx.totalamount), url: tx.url };
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export async function createUpayPayment(cfg: UpayConfig, p: CreatePaymentInput, fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<CreatePaymentResult> {
  const body = new URLSearchParams({ msgs: JSON.stringify(buildCreatePaymentMsgs(cfg, p)) }).toString();
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(upayUrl(cfg), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  } catch (err) {
    return { ok: false, reason: `network: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  try {
    return parseCreatePaymentResponse(await res.json());
  } catch {
    return { ok: false, reason: 'not_json' };
  }
}
