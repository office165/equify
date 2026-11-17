/**
 * Round 2 checks that are not per-number correctness: JWT secret, unsourced claims,
 * terminalValuePct removal. See reports/round-2.md.
 */
import fs from 'fs';
import path from 'path';
import { buildPdfHtml } from '../../lib/pdf-template';
import { MissingJwtSecretError, getJwtSecret } from '../../lib/config/deployment_env';
import { verifyReportAccessToken } from '../../lib/auth/report_access_token';
import { Suite, type SuiteResult } from '../lib/harness';
import { ANCHOR_CASES } from '../lib/fixtures';
import { GOLDEN_CASES } from '../lib/golden';
import { withQuietConsole } from '../lib/quiet';
import { runCase } from '../lib/run_case';

const ROOT = path.join(__dirname, '..', '..');

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const env = process.env as Record<string, string | undefined>;
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prev[k] = env[k];
    if (vars[k] === undefined) delete env[k];
    else env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete env[k];
      else env[k] = prev[k];
    }
  }
}

/** Phrases that must not appear in the customer report (finding 7). */
export const UNSOURCED_PHRASES = [/12 עסקאות/, /12 Israeli M&A/, /Big.?4/i, /חציון השוק/, /עסקאות M&A ישראליות/];

export function run(): SuiteResult {
  const suite = new Suite('round2-fixes');

  // Finding 24: no default JWT secret in production.
  const prodMissing = withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined }, () => {
    try {
      getJwtSecret();
      return 'no-throw';
    } catch (e) {
      return e instanceof MissingJwtSecretError ? 'throws' : 'other';
    }
  });
  suite.check('jwt-production-missing-throws', 'jwt', prodMissing === 'throws', prodMissing);
  const prodEmpty = withEnv({ NODE_ENV: 'production', JWT_SECRET: '  ' }, () => {
    try {
      getJwtSecret();
      return 'no-throw';
    } catch {
      return 'throws';
    }
  });
  suite.check('jwt-production-empty-throws', 'jwt', prodEmpty === 'throws', prodEmpty);
  const verifyThrows = withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined }, () => {
    try {
      verifyReportAccessToken('x.y.z');
      return 'returned';
    } catch (e) {
      return e instanceof MissingJwtSecretError ? 'throws' : 'other';
    }
  });
  suite.check('jwt-verify-surfaces-missing-secret', 'jwt', verifyThrows === 'throws', verifyThrows);
  const prodSet = withEnv({ NODE_ENV: 'production', JWT_SECRET: 'abc' }, () => getJwtSecret());
  suite.check('jwt-production-uses-env', 'jwt', prodSet === 'abc');
  const devDefault = withEnv({ NODE_ENV: 'development', JWT_SECRET: undefined }, () => getJwtSecret());
  suite.check('jwt-dev-default', 'jwt', devDefault.length > 0);

  // Finding 7: no unsourced claims in the customer report.
  for (const spec of [...ANCHOR_CASES, ...GOLDEN_CASES]) {
    const html = withQuietConsole(() => buildPdfHtml(runCase(spec)));
    const hits = UNSOURCED_PHRASES.filter((re) => re.test(html)).map(String);
    suite.check('report-no-unsourced-claims', spec.id, hits.length === 0, hits.join(', '));
  }

  // Finding 22 (display): a zero-value leg with weight is labelled, in the data and in the HTML.
  for (const spec of [...ANCHOR_CASES, ...GOLDEN_CASES]) {
    const data = runCase(spec);
    const zeroLegs = data.modelBlend.filter((r) => r.weightPct > 0 && r.ev === 0 && !/צבר|backlog/i.test(r.name));
    if (!zeroLegs.length) continue;
    const html = withQuietConsole(() => buildPdfHtml(data));
    const expectedLabel = (name: string) =>
      data.methodVersion === 'v2' && name.startsWith('DCF') ? 'אפס: אין תזרים חופשי בתחזית' : 'לא רלוונטית בגלל EBITDA שלילי';
    suite.check('zero-leg-labelled', spec.id, zeroLegs.every((r) => r.detail === expectedLabel(r.name) && html.includes(expectedLabel(r.name))), zeroLegs.map((r) => `${r.name}: ${r.detail ?? 'no label'}`).join(', '));
  }

  // Finding 15: the anomalous-year weights (35/40/25) are stated as used.
  const anomalous = {
    ...GOLDEN_CASES.find((c) => c.id === 'golden-consulting')!,
    id: 'r2-anomalous-year',
    y: [[20000, 3200], [22000, 3600], [24000, 600]] as [[number, number], [number, number], [number, number]],
  };
  const an = runCase(anomalous);
  suite.check('anomalous-year-detected', anomalous.id, an.multipleEbitdaWeights?.anomalous === true, JSON.stringify(an.multipleEbitdaWeights));
  const anShown = [...(an.normalizedEbitdaNote ?? '').matchAll(/\((\d+)%\)/g)].map((m) => Number(m[1])).join('/');
  suite.check('anomalous-year-weights-35-40-25', anomalous.id, anShown === '35/40/25', anShown);
  suite.check('anomalous-year-note-explains', anomalous.id, /חריגה/.test(an.normalizedEbitdaNote ?? ''), an.normalizedEbitdaNote ?? '');

  // Item 8: terminalValuePct (always 57) is gone from the code.
  const offenders: string[] = [];
  for (const dir of ['app', 'components', 'lib']) {
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('terminalValuePct')) offenders.push(path.relative(ROOT, p));
      }
    };
    walk(path.join(ROOT, dir));
  }
  suite.check('terminal-value-pct-removed', 'code', offenders.length === 0, offenders.join(', '));

  return suite.result;
}
