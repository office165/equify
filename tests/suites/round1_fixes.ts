/**
 * Round 1, part C: unit checks for the urgent fixes (no network, no real DB, no email).
 */
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import { resetFxCacheForTests } from '../../lib/utils/fxService';
import { ANCHOR_CASES } from '../lib/fixtures';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { runCase } from '../lib/run_case';
import {
  isSupabasePostgresHost,
  resolvePostgresSslConfig,
  stripSslQueryParams,
} from '../../lib/database/postgres_ssl';
import { SUPABASE_ROOT_2021_CA_PEM } from '../../lib/database/supabase_root_ca';
import {
  ValuationReportCoherenceError,
  assertValuationDataCoherence,
  collectValuationDataIssues,
} from '../../lib/pdf-template/validate-valuation-data';
import { setOfficeAlertSinkForTests, type OfficeAlert } from '../../lib/alerts/office_alert';
import { FX_FALLBACK_AS_OF, refreshFxRates } from '../../lib/utils/fxService';
import { equityTriCurrencyCoverHtml } from '../../lib/pdf/print/print_formatters';
import { extraRound1Checks } from './round1_fixes_extra';

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prior: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prior[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(prior)) {
      if (prior[k] === undefined) delete process.env[k];
      else process.env[k] = prior[k];
    }
  }
}

async function withEnvAsync<T>(vars: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prior: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prior[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(prior)) {
      if (prior[k] === undefined) delete process.env[k];
      else process.env[k] = prior[k];
    }
  }
}

function sslChecks(suite: Suite): void {
  const pooler = 'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&application_name=x';
  suite.check('ssl-strip-params', 'c1', stripSslQueryParams(pooler) === 'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?application_name=x', stripSslQueryParams(pooler));
  suite.check('ssl-strip-only-param', 'c1', stripSslQueryParams('postgres://h/db?sslmode=require') === 'postgres://h/db');
  suite.check('ssl-supabase-host', 'c1', isSupabasePostgresHost(pooler) && isSupabasePostgresHost('postgres://u:p@db.abc.supabase.co:5432/postgres'));
  const cfg = withEnv({ PG_SSL_ALLOW_UNVERIFIED: undefined }, () => resolvePostgresSslConfig(pooler)) as { ca?: string; rejectUnauthorized?: boolean };
  suite.check('ssl-supabase-verify-full', 'c1', cfg?.rejectUnauthorized === true && cfg?.ca === SUPABASE_ROOT_2021_CA_PEM);
  suite.check('ssl-ca-is-pem', 'c1', /BEGIN CERTIFICATE[\s\S]+END CERTIFICATE/.test(SUPABASE_ROOT_2021_CA_PEM));
  const escape = withEnv({ PG_SSL_ALLOW_UNVERIFIED: 'true' }, () => withQuietConsole(() => resolvePostgresSslConfig(pooler))) as { rejectUnauthorized?: boolean };
  suite.check('ssl-escape-hatch', 'c1', escape?.rejectUnauthorized === false);
  const local = withEnv({ PG_SSL: undefined, PG_SSL_ALLOW_UNVERIFIED: undefined }, () => resolvePostgresSslConfig('postgres://u:p@localhost:5432/db'));
  suite.check('ssl-local-no-tls', 'c1', local === undefined);
}

function coherenceChecks(suite: Suite): void {
  const alerts: OfficeAlert[] = [];
  setOfficeAlertSinkForTests((a) => alerts.push(a));
  try {
    for (const c of ANCHOR_CASES.filter((x) => /young-factory|loss-factory|thin-factory/.test(x.id))) {
      const data = runCase(c);
      const issues = collectValuationDataIssues(data);
      suite.check('loss-report-coherent', c.id, issues.violations.length === 0 && issues.warnings.length === 0, JSON.stringify(issues));
      // Methodology 1 values. Methodology 2 moves these cases on purpose (R1); its values are in tests/snapshots/v2.
      if (resolveMethodVersion() === 'v1') {
        suite.check('loss-report-equity-unchanged', c.id, Math.round(data.equity) === c.expectedEquity, `${data.equity}`);
      }
    }
    // Small gap (0.3%): report builds, warning logged, office alerted.
    const base = runCase(ANCHOR_CASES[0]);
    const small = { ...base, modelBlend: base.modelBlend.map((r, i) => (i === 0 ? { ...r, contribution: r.contribution + base.enterpriseValue * 0.003 } : r)) };
    let threw = false;
    withQuietConsole(() => {
      try {
        assertValuationDataCoherence(small);
      } catch {
        threw = true;
      }
    });
    suite.check('coherence-small-gap-warns', 'c3', !threw && alerts.some((a) => a.kind === 'report_coherence_warning'), `threw=${threw} alerts=${alerts.length}`);
    // Large gap (0.7%): blocked with a typed error.
    const large = { ...base, modelBlend: base.modelBlend.map((r, i) => (i === 0 ? { ...r, contribution: r.contribution + base.enterpriseValue * 0.007 } : r)) };
    let blocked: unknown = null;
    withQuietConsole(() => {
      try {
        assertValuationDataCoherence(large);
      } catch (err) {
        blocked = err;
      }
    });
    suite.check('coherence-large-gap-blocks', 'c3', blocked instanceof ValuationReportCoherenceError);
  } finally {
    setOfficeAlertSinkForTests(null);
  }
}

async function fxChecks(suite: Suite): Promise<void> {
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  resetFxCacheForTests();
  try {
    globalThis.fetch = (async (url: string | URL) => {
      calls.push(String(url));
      throw new Error('offline');
    }) as typeof fetch;
    const fb = await withQuietConsole(() => refreshFxRates(true));
    suite.check('fx-server-no-localhost', 'c2', calls.length > 0 && calls.every((u) => !u.includes('localhost') && !u.startsWith('/')), calls.join(','));
    suite.check('fx-fallback-date', 'c2', fb.source === 'fallback' && fb.asOf === FX_FALLBACK_AS_OF, `${fb.source} ${fb.asOf}`);

    globalThis.fetch = (async (url: string | URL) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ result: 'success', time_last_update_utc: 'Mon, 16 Nov 2026 00:02:31 +0000', rates: { USD: 0.27, EUR: 0.25, GBP: 0.21 } }), { status: 200 });
    }) as typeof fetch;
    const live = await refreshFxRates(true);
    suite.check('fx-live-real-date', 'c2', live.source === 'live' && live.asOf === '2026-11-16', `${live.source} ${live.asOf}`);
    suite.check('fx-live-rate', 'c2', Math.abs(live.fromIls.USD - 0.27) < 1e-9, String(live.fromIls.USD));
  } finally {
    globalThis.fetch = realFetch;
    await withQuietConsole(async () => {
      globalThis.fetch = (async () => {
        throw new Error('offline');
      }) as typeof fetch;
      await refreshFxRates(true);
      globalThis.fetch = realFetch;
    });
  }
  const fbHtml = equityTriCurrencyCoverHtml({ equity: 1_000_000, equityIls: 1_000_000, equityUsd: 300_000, fxUsdRate: 3, fxAsOf: FX_FALLBACK_AS_OF, fxSource: 'fallback' });
  suite.check('fx-footnote-fallback', 'c2', fbHtml.includes('שער גיבוי') && fbHtml.includes(FX_FALLBACK_AS_OF), fbHtml.slice(-200));
  const liveHtml = equityTriCurrencyCoverHtml({ equity: 1_000_000, equityIls: 1_000_000, equityUsd: 270_000, fxUsdRate: 3.7, fxAsOf: '2026-11-16', fxSource: 'live' });
  suite.check('fx-footnote-live', 'c2', !liveHtml.includes('שער גיבוי') && liveHtml.includes('2026-11-16'), liveHtml.slice(-200));
}

async function healthChecks(suite: Suite): Promise<void> {
  await withEnvAsync(
    { POSTGRES_URL: undefined, DATABASE_URL: undefined, SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined },
    async () => {
      const { GET } = await import('../../app/api/leads/health/route');
      const res = await withQuietConsole(() => GET());
      const body = (await res.json()) as { ok: boolean; dbOk: boolean };
      suite.check('health-503-without-db', 'c1', res.status === 503 && body.ok === false && body.dbOk === false, `${res.status} ${JSON.stringify(body).slice(0, 120)}`);
    },
  );
}

export async function run(): Promise<SuiteResult> {
  const suite = new Suite('round1-fixes');
  sslChecks(suite);
  coherenceChecks(suite);
  await fxChecks(suite);
  await healthChecks(suite);
  await extraRound1Checks(suite);
  return suite.result;
}
