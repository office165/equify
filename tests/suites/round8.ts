/**
 * Round 8: /api/pulse.
 *   no-token / wrong-token / token-unset: the answer is exactly {"ok":true}.
 *   with-token: version, time, db, monday and every flag as on/off; no values of any variable.
 *   db: not configured, connected, not connected, and a probe that hangs (timeout) or throws.
 */
import { GET } from '../../app/api/pulse/route';
import { FEATURE_FLAGS } from '../../lib/flags/registry';
import { buildPulseDetails, pulseTokenMatches } from '../../lib/pulse/pulse';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';

const TOKEN = 'test-pulse-token-not-a-secret';

async function call(headers: Record<string, string>, env: Record<string, string | undefined>): Promise<{ status: number; body: Record<string, unknown> }> {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    const res = await withQuietConsole(() => GET(new Request('http://localhost/api/pulse', { headers })));
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round8');
  const noDb = { DATABASE_URL: undefined, POSTGRES_URL: undefined, PULSE_TOKEN: TOKEN };

  const none = await call({}, noDb);
  s.check('pulse', 'no-token', none.status === 200 && JSON.stringify(none.body) === '{"ok":true}', JSON.stringify(none.body));
  const wrong = await call({ authorization: 'Bearer nope' }, noDb);
  s.check('pulse', 'wrong-token', JSON.stringify(wrong.body) === '{"ok":true}');
  const unset = await call({ authorization: `Bearer ${TOKEN}` }, { ...noDb, PULSE_TOKEN: undefined });
  s.check('pulse', 'token-unset', JSON.stringify(unset.body) === '{"ok":true}');

  const env = { ...noDb, VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890', MONDAY_API_KEY: 'monday-secret-value', METHOD_V2: 'on', EXCEL_APPENDIX: undefined };
  const ok = await call({ authorization: `Bearer ${TOKEN}` }, env);
  const b = ok.body as { version?: string; time?: string; db?: string; monday?: string; flags?: Record<string, string> };
  s.check('pulse', 'with-token', ok.status === 200 && b.version === 'abcdef123456' && !!b.time && !Number.isNaN(Date.parse(b.time)) && b.db === 'not_configured' && b.monday === 'configured', JSON.stringify(b));
  s.check('pulse', 'x-pulse-token-header', JSON.stringify((await call({ 'x-pulse-token': TOKEN }, env)).body).includes('"flags"'));
  s.check('pulse', 'all-flags', FEATURE_FLAGS.every((f) => b.flags?.[f] === 'on' || b.flags?.[f] === 'off') && b.flags?.METHOD_V2 === 'on' && b.flags?.EXCEL_APPENDIX === 'off');
  const text = JSON.stringify(ok.body);
  s.check('pulse', 'no-secrets', !text.includes('monday-secret-value') && !text.includes(TOKEN) && !/postgres|supabase\.co|@/i.test(text), text);
  s.check('pulse', 'small', text.length < 1000, String(text.length));

  // DB states.
  const d1 = await buildPulseDetails({ dbConfigured: true, probeDb: async () => true, env: {} as NodeJS.ProcessEnv });
  const d2 = await buildPulseDetails({ dbConfigured: true, probeDb: async () => false, env: {} as NodeJS.ProcessEnv });
  const d3 = await buildPulseDetails({ dbConfigured: true, probeDb: () => new Promise<boolean>(() => {}), env: {} as NodeJS.ProcessEnv, timeoutMs: 50 });
  const d4 = await buildPulseDetails({ dbConfigured: true, probeDb: async () => { throw new Error('ssl'); }, env: {} as NodeJS.ProcessEnv });
  s.check('db', 'states', d1.db === 'connected' && d2.db === 'not_connected' && d3.db === 'not_connected' && d4.db === 'not_connected' && d1.version === 'local');
  s.check('token', 'compare', pulseTokenMatches('a', 'a') && !pulseTokenMatches('a', 'ab') && !pulseTokenMatches('', '') && !pulseTokenMatches(undefined, 'a'));
  return s.result;
}
