/**
 * npm test entry point. Runs the in-process suites and the legacy scripts in scripts/.
 * Exit code 0 only when there are no failures and no stale KNOWN_WRONG markers.
 * KNOWN_WRONG checks and known-failing legacy scripts are reported separately.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import type { SuiteResult } from './lib/harness';
import { run as runSnapshot } from './suites/snapshot';
import { run as runMethodology } from './suites/methodology';
import { run as runCorrectness } from './suites/correctness';
import { run as runBuild } from './suites/build';
import { run as runLadder } from './suites/scale_ladder';
import { run as runRound1 } from './suites/round1_fixes';

const ROOT = path.join(__dirname, '..');

/** Legacy scripts that are part of npm test as they are. */
const LEGACY_SCRIPTS: Array<{ name: string; knownFailing?: string }> = [
  { name: 'test-valuation-engine' },
  { name: 'test-canonical-reconciliation' },
  { name: 'test-report-financial-coherence' },
  {
    name: 'test-scale-modifier-pipeline',
    knownFailing:
      'ידוע כנכשל: "enterprise targets DCF-heavy blend". blendTargets מחושב רק בין השורות seed/early ל growth (0.3 עד 0.5), והשורה mature (0.65) לא נכנסת. ראו reports/round-1.md, ממצא 20.',
  },
  { name: 'test-currency-normalize' },
  { name: 'test-verdict-sanity' },
  { name: 'test-customer-report-email' },
  { name: 'test-paypal-payment-path' },
  { name: 'test-promo-validate-mint' },
  { name: 'test-legal-close-nav' },
];

function runLegacy(name: string): { ok: boolean; tail: string; ms: number } {
  const t0 = Date.now();
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const res = spawnSync(process.execPath, [tsxCli, path.join('scripts', `${name}.ts`)], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    timeout: 120_000,
  });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim().split('\n');
  return { ok: res.status === 0, tail: out.slice(-3).join('\n'), ms: Date.now() - t0 };
}

function main(): void {
  const t0 = Date.now();
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const verbose = process.argv.includes('--verbose');
  const suites: Array<[string, () => SuiteResult]> = [
    ['snapshot', runSnapshot],
    ['methodology-map', runMethodology],
    ['correctness', runCorrectness],
    ['build', runBuild],
    ['scale-ladder', runLadder],
    ['round1-fixes', runRound1],
  ];

  let failed = 0;
  let stale = 0;
  const knownWrongLines: string[] = [];
  const knownFailingScripts: string[] = [];

  for (const [name, fn] of suites) {
    if (only && only !== name && only !== 'suites') continue;
    const s0 = Date.now();
    const r = fn();
    const status = r.failures.length || r.staleMarkers.length ? 'FAIL' : 'PASS';
    console.log(`[${status}] ${name}: ${r.passed} passed, ${r.failures.length} failed, ${r.knownWrong.length} known-wrong (${Date.now() - s0}ms)`);
    for (const f of r.failures.slice(0, 40)) console.log(`    FAIL ${f}`);
    if (r.failures.length > 40) console.log(`    ... ${r.failures.length - 40} more`);
    for (const m of r.staleMarkers) console.log(`    STALE ${m}`);
    if (r.failures.length || verbose) for (const n of r.notes) console.log(n.split('\n').map((l) => `    ${l}`).join('\n'));
    failed += r.failures.length;
    stale += r.staleMarkers.length;
    const grouped = new Map<string, { finding: number; cases: string[]; detail: string }>();
    for (const k of r.knownWrong) {
      const key = `${name}/${k.check}#${k.finding}`;
      const g = grouped.get(key) ?? { finding: k.finding, cases: [], detail: k.detail };
      g.cases.push(k.caseId);
      grouped.set(key, g);
    }
    for (const [key, g] of grouped) {
      knownWrongLines.push(`  ${key.split('#')[0]} (finding ${g.finding}): ${g.cases.length} case(s), e.g. ${g.cases[0]}: ${g.detail}`);
    }
  }

  if (!only || only === 'legacy') {
    for (const s of LEGACY_SCRIPTS) {
      const r = runLegacy(s.name);
      if (s.knownFailing) {
        if (r.ok) {
          console.log(`[FAIL] scripts/${s.name}: passes now, remove its knownFailing mark`);
          stale += 1;
        } else {
          console.log(`[KNOWN] scripts/${s.name} (${r.ms}ms)`);
          knownFailingScripts.push(`  scripts/${s.name}: ${s.knownFailing}`);
        }
        continue;
      }
      console.log(`[${r.ok ? 'PASS' : 'FAIL'}] scripts/${s.name} (${r.ms}ms)`);
      if (!r.ok) {
        failed += 1;
        console.log(r.tail.split('\n').map((l) => `    ${l}`).join('\n'));
      }
    }
  }

  console.log('');
  console.log(`KNOWN_WRONG (reported, not failing): ${knownWrongLines.length} check group(s)`);
  for (const l of knownWrongLines) console.log(l);
  if (knownFailingScripts.length) {
    console.log('Known failing legacy scripts:');
    for (const l of knownFailingScripts) console.log(l);
  }
  console.log('');
  console.log(`Total: ${failed} failure(s), ${stale} stale marker(s), ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failed > 0 || stale > 0 ? 1 : 0);
}

main();
