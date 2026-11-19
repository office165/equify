/**
 * Round 10 (CONSENT_BANNER): cookie consent, in the structure of the SBC site's banner (lib/consent.ts there).
 * Three categories: necessary (always on), measurement (a) and marketing (m). The choice is kept in this browser
 * (localStorage `equify-consent`) for one year; after that, or with a different version, the banner asks again.
 * Measurement today is Vercel Analytics and Speed Insights (components/analytics). Marketing has no tool on the site today.
 */
export const CONSENT_KEY = 'equify-consent';
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
export const CONSENT_EVENT = 'equify-consent';

export type Consent = { v: number; a: boolean; m: boolean; t: string };

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const storage = (): StorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** The stored choice, or null when there is none, it is from another version, or it is older than a year. */
export function parseConsent(raw: string | null, now: number = Date.now()): Consent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<Consent> | null;
    if (!c || c.v !== CONSENT_VERSION || typeof c.a !== 'boolean' || typeof c.m !== 'boolean' || typeof c.t !== 'string') return null;
    const at = Date.parse(c.t);
    if (!Number.isFinite(at) || now - at > CONSENT_MAX_AGE_MS || at - now > 60_000) return null;
    return c as Consent;
  } catch {
    return null;
  }
}

export function readConsent(store: StorageLike | null = storage(), now: number = Date.now()): Consent | null {
  try {
    return parseConsent(store?.getItem(CONSENT_KEY) ?? null, now);
  } catch {
    return null;
  }
}

export function saveConsent(a: boolean, m: boolean, store: StorageLike | null = storage(), now: number = Date.now()): Consent {
  const c: Consent = { v: CONSENT_VERSION, a, m, t: new Date(now).toISOString() };
  try {
    store?.setItem(CONSENT_KEY, JSON.stringify(c));
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
  return c;
}
