/**
 * Round 8: the pulse for SBC's control room (GET /api/pulse).
 * Without the right key the answer is only {"ok":true}. With it (PULSE_TOKEN, sent as
 * "Authorization: Bearer <key>" or "x-pulse-token: <key>"), a short status: version (commit sha),
 * time, database connected or not, Monday configured or not, and every flag as on/off.
 * No secrets, no values of variables, no customer data. If PULSE_TOKEN is not set, nobody gets details.
 */
import { timingSafeEqual } from 'crypto';
import { allFlagStates } from '../flags/registry';

export interface PulseDetails {
  ok: true;
  version: string;
  time: string;
  db: 'connected' | 'not_connected' | 'not_configured';
  monday: 'configured' | 'not_configured';
  flags: Record<string, 'on' | 'off'>;
}

export function pulseTokenMatches(given: string | null | undefined, expected = process.env.PULSE_TOKEN): boolean {
  const e = expected?.trim();
  const g = given?.trim();
  if (!e || !g) return false;
  const a = Buffer.from(g);
  const b = Buffer.from(e);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function readPulseToken(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7);
  return headers.get('x-pulse-token');
}

export function versionString(env: NodeJS.ProcessEnv = process.env): string {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim();
  return sha ? sha.slice(0, 12) : 'local';
}

export async function buildPulseDetails(deps: {
  dbConfigured: boolean;
  probeDb: () => Promise<boolean>;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}): Promise<PulseDetails> {
  const env = deps.env ?? process.env;
  let db: PulseDetails['db'] = 'not_configured';
  if (deps.dbConfigured) {
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), deps.timeoutMs ?? 3000));
    const reachable = await Promise.race([deps.probeDb().catch(() => false), timeout]);
    db = reachable ? 'connected' : 'not_connected';
  }
  return {
    ok: true,
    version: versionString(env),
    time: (deps.now ?? (() => new Date()))().toISOString(),
    db,
    monday: env.MONDAY_API_KEY?.trim() ? 'configured' : 'not_configured',
    flags: allFlagStates(env),
  };
}
