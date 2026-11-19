/**
 * Round 14 (UPAY): three ready verifiers, one per likely shape of upay's answer, chosen by
 * UPAY_VERIFIER. The default, "none", keeps round 9's behaviour: nothing is verified, no report is
 * released. What each shape expects from upay is data in upay_answer_config.ts.
 *
 *   status_query  A. We ask upay's API about the cashier id (LOGIN, then the status action).
 *   signed_ipn    B. upay's IPN carries a signature made with a shared secret (UPAY_IPN_SECRET).
 *   ip_requery    C. upay's IPN comes from a known IP (UPAY_IPN_IPS, required), and we ask upay again:
 *                    post the IPN back (UPAY_IPN_VERIFY_URL) or run the status query.
 *
 * In every shape the answer is only "paid" when upay itself said so; the settle step then compares
 * amount, currency and cashier id with our order (upay_settle.ts). An unconfirmed config section
 * runs only with UPAY_ENV=demo.
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { UPAY_ANSWER_CONFIG, type UpayAnswerConfig, type UpayFieldMap } from './upay_answer_config';
import { readUpayConfig, upayCodeOk, upayEnvMode, upayUrl, type FetchLike, type UpayConfig } from './upay_client';
import type { UpayOrder } from './upay_orders';
import { UNDOCUMENTED_STATUS_VERIFIER, type UpayVerifier, type VerifierAnswer } from './upay_settle';

export const UPAY_VERIFIER_NAMES = ['none', 'status_query', 'signed_ipn', 'ip_requery'] as const;
export type UpayVerifierName = (typeof UPAY_VERIFIER_NAMES)[number];

/** Reads a field by any of its names (case ignored), from a flat record or one level of nesting. */
export function pickField(rec: Record<string, unknown> | null | undefined, names: string[]): string | null {
  if (!rec) return null;
  const lower = new Map<string, unknown>();
  const walk = (o: Record<string, unknown>, depth: number) => {
    for (const [k, v] of Object.entries(o)) {
      if (v != null && typeof v === 'object' && !Array.isArray(v) && depth < 2) walk(v as Record<string, unknown>, depth + 1);
      else if (v != null && typeof v !== 'object' && !lower.has(k.toLowerCase())) lower.set(k.toLowerCase(), v);
    }
  };
  walk(rec, 0);
  for (const n of names) {
    const v = lower.get(n.toLowerCase());
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

export function normalizeCurrency(v: string | null, fallback: 'ILS' | 'USD'): 'ILS' | 'USD' | null {
  if (v == null) return fallback;
  const t = v.trim().toUpperCase();
  if (['ILS', 'NIS', '₪', '1', 'SHEKEL'].includes(t)) return 'ILS';
  if (['USD', '$', '2', 'DOLLAR'].includes(t)) return 'USD';
  return null;
}

/** Turns a record of upay fields into an answer, with the field names of one config section. */
export function answerFromFields(rec: Record<string, unknown>, map: UpayFieldMap): VerifierAnswer {
  const status = pickField(rec, map.status)?.toLowerCase() ?? null;
  if (status == null) return { status: 'unknown', reason: 'no_status_field' };
  if (map.cancelledValues.includes(status)) return { status: 'cancelled' };
  if (map.failedValues.includes(status)) return { status: 'failed' };
  if (!map.paidValues.includes(status)) return { status: 'unknown', reason: `status_${status}` };
  const amount = Number(pickField(rec, map.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { status: 'unknown', reason: 'no_amount' };
  const currency = normalizeCurrency(pickField(rec, map.currency), map.currencyDefault);
  if (!currency) return { status: 'unknown', reason: 'unknown_currency' };
  const cashierId = pickField(rec, map.cashierId);
  if (!cashierId) return { status: 'unknown', reason: 'no_cashier_id' };
  const last4 = pickField(rec, map.cardLast4);
  return { status: 'paid', amount, currency, cashierId, ...(last4 && /^\d{4}$/.test(last4) ? { cardLast4: last4 } : {}) };
}

/** The paid answer must be about this order's transaction, when we know it. */
function sameTransaction(order: UpayOrder, a: VerifierAnswer): VerifierAnswer {
  if (a.status === 'paid' && order.cashierId && a.cashierId !== order.cashierId) return { status: 'unknown', reason: 'cashier_id_differs' };
  return a;
}

// ---------- A. status query ----------

export function buildStatusQueryMsgs(cfg: UpayConfig, cashierId: string, conf: UpayAnswerConfig['statusQuery'] = UPAY_ANSWER_CONFIG.statusQuery): unknown[] {
  const header = { refername: 'UPAY', livesystem: cfg.live ? 1 : 0, language: 'HE' };
  return [
    { header, request: { mainaction: 'CONNECTION', minoraction: 'LOGIN', encoding: 'json', parameters: { email: cfg.email, key: cfg.key } } },
    { header, request: { mainaction: conf.mainaction, minoraction: conf.minoraction, encoding: 'json', numbertemplate: 1, parameters: { [conf.idParam]: cashierId, key: cfg.key } } },
  ];
}

/** Reads the status answer: every part must have a success code; the fields are read from the last part's result. */
export function parseStatusQueryResponse(json: unknown, map: UpayFieldMap): VerifierAnswer {
  type Part = { header?: { errorcode?: unknown; errormessage?: string }; result?: unknown };
  const parts: Part[] = Array.isArray(json) ? (json as Part[]) : Array.isArray((json as { result?: unknown })?.result) ? (json as { result: Part[] }).result : [json as Part];
  for (const p of parts) {
    if (!upayCodeOk(p?.header?.errorcode)) return { status: 'unknown', reason: `upay_error_${String(p?.header?.errorcode ?? '')}` };
  }
  const result = parts.at(-1)?.result;
  const rec = (Array.isArray((result as { transactions?: unknown })?.transactions) ? (result as { transactions: unknown[] }).transactions[0] : result) as Record<string, unknown> | undefined;
  if (!rec || typeof rec !== 'object') return { status: 'unknown', reason: 'no_result' };
  return answerFromFields(rec, map);
}

export function statusQueryVerifier(deps: { config?: UpayConfig | null; fetchImpl?: FetchLike; conf?: UpayAnswerConfig['statusQuery'] } = {}): UpayVerifier {
  const conf = deps.conf ?? UPAY_ANSWER_CONFIG.statusQuery;
  return async (order) => {
    const cfg = deps.config === undefined ? readUpayConfig() : deps.config;
    if (!cfg) return { status: 'unknown', reason: 'upay_not_configured' };
    if (!order.cashierId) return { status: 'unknown', reason: 'order_has_no_cashier_id' };
    const f = deps.fetchImpl ?? (fetch as unknown as FetchLike);
    const body = new URLSearchParams({ msgs: JSON.stringify(buildStatusQueryMsgs(cfg, order.cashierId, conf)) }).toString();
    try {
      const res = await f(upayUrl(cfg), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!res.ok) return { status: 'unknown', reason: `http_${res.status}` };
      return sameTransaction(order, parseStatusQueryResponse(await res.json(), conf.fields));
    } catch (err) {
      return { status: 'unknown', reason: `network: ${err instanceof Error ? err.message : String(err)}` };
    }
  };
}

// ---------- B. signed IPN ----------

export function ipnSignature(fields: Record<string, string>, secret: string, conf: UpayAnswerConfig['signedIpn'] = UPAY_ANSWER_CONFIG.signedIpn): string {
  const sigKey = conf.signatureField.toLowerCase();
  const keys = conf.signedFields.length ? conf.signedFields.map((k) => k.toLowerCase()) : Object.keys(fields).filter((k) => k !== sigKey).sort();
  if (conf.algorithm === 'hmac-sha256-sorted') {
    const base = Object.keys(fields).filter((k) => k !== sigKey).sort().map((k) => `${k}=${fields[k]}`).join('&');
    return createHmac('sha256', secret).update(base, 'utf8').digest('hex');
  }
  const base = keys.map((k) => fields[k] ?? '').join('') + secret;
  return createHash(conf.algorithm === 'md5-concat' ? 'md5' : 'sha256').update(base, 'utf8').digest('hex');
}

export function signedIpnVerifier(deps: { secret?: string; conf?: UpayAnswerConfig['signedIpn'] } = {}): UpayVerifier {
  const conf = deps.conf ?? UPAY_ANSWER_CONFIG.signedIpn;
  return async (order, ctx) => {
    if (!ctx?.ipn) return { status: 'unknown', reason: 'waiting_for_signed_ipn' };
    const secret = deps.secret ?? process.env.UPAY_IPN_SECRET?.trim() ?? '';
    if (!secret) return { status: 'unknown', reason: 'no_ipn_secret' };
    const given = (ctx.ipn.fields[conf.signatureField.toLowerCase()] ?? '').trim().toLowerCase();
    const want = ipnSignature(ctx.ipn.fields, secret, conf);
    const a = Buffer.from(given);
    const b = Buffer.from(want);
    if (!given || a.length !== b.length || !timingSafeEqual(a, b)) return { status: 'unknown', reason: 'bad_ipn_signature' };
    return sameTransaction(order, answerFromFields(ctx.ipn.fields, conf.fields));
  };
}

// ---------- C. IPN from a known IP, then ask upay again ----------

export type TextFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export function ipRequeryVerifier(
  deps: { ips?: string; verifyUrl?: string; fetchText?: TextFetch; statusQuery?: UpayVerifier; conf?: UpayAnswerConfig['ipRequery'] } = {},
): UpayVerifier {
  const conf = deps.conf ?? UPAY_ANSWER_CONFIG.ipRequery;
  return async (order, ctx) => {
    if (!ctx?.ipn) return { status: 'unknown', reason: 'waiting_for_ipn' };
    const list = (deps.ips ?? process.env.UPAY_IPN_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return { status: 'unknown', reason: 'no_ip_list' };
    if (!ctx.ipn.ip || !list.includes(ctx.ipn.ip)) return { status: 'unknown', reason: 'ip_not_listed' };
    if (conf.mode === 'status_query') return (deps.statusQuery ?? statusQueryVerifier())(order, ctx);
    const url = deps.verifyUrl ?? process.env.UPAY_IPN_VERIFY_URL?.trim() ?? '';
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      return { status: 'unknown', reason: 'no_verify_url' };
    }
    if (!/(^|\.)upay\.co\.il$/.test(host) || !url.startsWith('https://')) return { status: 'unknown', reason: 'verify_url_not_upay' };
    const f = deps.fetchText ?? (fetch as unknown as TextFetch);
    try {
      const res = await f(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: ctx.ipn.body || new URLSearchParams(ctx.ipn.query).toString() });
      const text = (await res.text()).trim();
      if (!res.ok || text !== conf.okToken) return { status: 'unknown', reason: 'postback_not_verified' };
    } catch (err) {
      return { status: 'unknown', reason: `network: ${err instanceof Error ? err.message : String(err)}` };
    }
    return sameTransaction(order, answerFromFields(ctx.ipn.fields, conf.fields));
  };
}

// ---------- choice ----------

export function readVerifierName(env: NodeJS.ProcessEnv = process.env): UpayVerifierName {
  const v = env.UPAY_VERIFIER?.trim().toLowerCase();
  return (UPAY_VERIFIER_NAMES as readonly string[]).includes(v ?? '') ? (v as UpayVerifierName) : 'none';
}

const SECTION: Record<Exclude<UpayVerifierName, 'none'>, keyof UpayAnswerConfig> = {
  status_query: 'statusQuery',
  signed_ipn: 'signedIpn',
  ip_requery: 'ipRequery',
};

/** Which verifier runs, and why. An unconfirmed config section runs only with UPAY_ENV=demo. */
export function describeVerifier(env: NodeJS.ProcessEnv = process.env, config: UpayAnswerConfig = UPAY_ANSWER_CONFIG): { name: UpayVerifierName; active: UpayVerifierName; reason: string } {
  const name = readVerifierName(env);
  if (name === 'none') return { name, active: 'none', reason: 'UPAY_VERIFIER is none (default): no report is released' };
  const confirmed = config[SECTION[name]].confirmed;
  if (!confirmed && upayEnvMode(env) !== 'demo') return { name, active: 'none', reason: `${SECTION[name]} is not confirmed in upay_answer_config.ts; runs only with UPAY_ENV=demo` };
  return { name, active: name, reason: confirmed ? 'confirmed' : 'demo only (not confirmed)' };
}

export function selectUpayVerifier(env: NodeJS.ProcessEnv = process.env, config: UpayAnswerConfig = UPAY_ANSWER_CONFIG): UpayVerifier {
  const { active } = describeVerifier(env, config);
  if (active === 'status_query') return statusQueryVerifier({ conf: config.statusQuery });
  if (active === 'signed_ipn') return signedIpnVerifier({ conf: config.signedIpn });
  if (active === 'ip_requery') return ipRequeryVerifier({ conf: config.ipRequery, statusQuery: statusQueryVerifier({ conf: config.statusQuery }) });
  return UNDOCUMENTED_STATUS_VERIFIER;
}
