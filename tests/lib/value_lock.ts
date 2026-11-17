/**
 * Value lock (round 2 golden rule): equity, EV, bear, bull, the three legs and the WACC of every
 * case must not move while METHOD_V2 is off. tests/snapshots/value-lock.json was taken from the
 * round 1 snapshot and is NOT rewritten by npm run snapshot:update. Changing it is a deliberate,
 * reviewed edit (methodology decision), never a side effect of a display change.
 */
import fs from 'fs';
import path from 'path';
import type { CaseSnapshot } from './run_case';

export const LOCKED_FIELDS = [
  'equity',
  'enterpriseValue',
  'bearEquity',
  'bullEquity',
  'dcfEv',
  'ebitdaEv',
  'revenueEv',
  'waccPct',
] as const satisfies ReadonlyArray<keyof CaseSnapshot>;

export type LockedValues = Record<(typeof LOCKED_FIELDS)[number], number | null>;

export const VALUE_LOCK_PATH = path.join(__dirname, '..', 'snapshots', 'value-lock.json');

export function readValueLock(): Record<string, LockedValues> {
  return JSON.parse(fs.readFileSync(VALUE_LOCK_PATH, 'utf8')) as Record<string, LockedValues>;
}

export function pickLocked(s: CaseSnapshot): LockedValues {
  const out = {} as LockedValues;
  for (const f of LOCKED_FIELDS) out[f] = s[f];
  return out;
}
