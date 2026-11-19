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
import { run as runValueLock } from './suites/value_lock';
import { run as runRound2 } from './suites/round2_fixes';
import { run as runDamodaran } from './suites/damodaran';
import { run as runV2Sanity } from './suites/v2_sanity';
import { run as runRound3 } from './suites/round3';
import { run as runCreditCapacity } from './credit_capacity.test';
import { run as runRound4 } from './suites/round4';
import { run as runRound5 } from './suites/round5';
import { run as runRound6 } from './suites/round6';
import { run as runRound7Excel } from './suites/round7_excel';
import { run as runRound7Narrative } from './suites/round7_narrative';
import { run as runRound8 } from './suites/round8';
import { run as runRound9 } from './suites/round9';
import { run as runRound10 } from './suites/round10';
import { run as runRound11 } from './suites/round11';
import { run as runRound12 } from './suites/round12';
import type { MethodVersion } from '../lib/valuation/method_v2';

const ROOT = path.join(__dirname, '..');

// Tests never send real alerts or emails.
process.env.OFFICE_ALERTS_DISABLED = 'true';

/** Legacy scripts that are part of npm test as they are. knownFailing applies to methodology 1 only unless knownFailingV2 says otherwise. */
const LEGACY_SCRIPTS: Array<{ name: string; knownFailing?: string; knownFailingMethods?: MethodVersion[] }> = [
  { name: 'test-valuation-engine' },
  { name: 'test-canonical-reconciliation' },
  { name: 'test-report-financial-coherence' },
  {
    name: 'test-scale-modifier-pipeline',
    knownFailing:
      'מתודולוגיה 1: "enterprise targets DCF-heavy blend" נכשלת, כי blendTargets מחושב רק בין השורות seed/early ל growth (0.3 עד 0.5) והשורה mature (0.65) לא נכנסת (ממצא 20). מתודולוגיה 2: הבדיקה הזאת עוברת, והסקריפט נעצר בבדיקה הבאה, "SMB lowers DCF weight vs default", שנכשלת בשתי המתודולוגיות: היא מעבירה ל applyScaleAdjustedBlendWeights את DEFAULT_VALUATION_BLEND_WEIGHTS בצורה {dcf, multiple} במקום {dcf, ebitda, rev}, ומקבלת NaN. תקלה ישנה בסקריפט שהייתה מוסתרת (ממצא 27).',
    knownFailingMethods: ['v1', 'v2'],
  },
  { name: 'test-currency-normalize' },
  { name: 'test-verdict-sanity' },
  { name: 'test-customer-report-email' },
  { name: 'test-paypal-payment-path' },
  { name: 'test-promo-validate-mint' },
  { name: 'test-legal-close-nav' },
];

function runLegacy(name: string, method: MethodVersion): { ok: boolean; tail: string; ms: number } {
  const t0 = Date.now();
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const res = spawnSync(process.execPath, [tsxCli, path.join('scripts', `${name}.ts`)], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', METHOD_V2: method === 'v2' ? 'on' : 'off' },
    timeout: 120_000,
  });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim().split('\n');
  return { ok: res.status === 0, tail: out.slice(-3).join('\n'), ms: Date.now() - t0 };
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const verbose = process.argv.includes('--verbose');
  // npm test runs every suite twice: methodology 1 (METHOD_V2 off) and methodology 2 (on).
  // value-lock is methodology 1 only: with the flag off nothing may move.
  const suites: Array<[string, () => SuiteResult | Promise<SuiteResult>, MethodVersion[]]> = [
    ['value-lock', runValueLock, ['v1']],
    ['snapshot', runSnapshot, ['v1', 'v2']],
    ['methodology-map', runMethodology, ['v1', 'v2']],
    ['correctness', runCorrectness, ['v1', 'v2']],
    ['build', runBuild, ['v1', 'v2']],
    ['scale-ladder', runLadder, ['v1', 'v2']],
    ['round1-fixes', runRound1, ['v1', 'v2']],
    ['round2-fixes', runRound2, ['v1', 'v2']],
    ['damodaran', runDamodaran, ['v1', 'v2']],
    ['v2-sanity', runV2Sanity, ['v2']],
    ['round3', runRound3, ['v1', 'v2']],
    ['credit-capacity', runCreditCapacity, ['v1', 'v2']],
    ['round4', runRound4, ['v1', 'v2']],
    ['round5', runRound5, ['v1', 'v2']],
    ['round6', runRound6, ['v1']],
    ['round7-excel', runRound7Excel, ['v1', 'v2']],
    ['round7-narrative', runRound7Narrative, ['v1', 'v2']],
    ['round8', runRound8, ['v1']],
    ['round9', runRound9, ['v1']],
    ['round10', runRound10, ['v1']],
    ['round11', runRound11, ['v1']],
    ['round12', runRound12, ['v1']],
  ];
  const methodArg = process.argv.includes('--method') ? process.argv[process.argv.indexOf('--method') + 1] : null;
  const methods: MethodVersion[] = methodArg === 'v1' || methodArg === 'v2' ? [methodArg] : ['v1', 'v2'];
  const originalFlag = process.env.METHOD_V2;

  let failed = 0;
  let stale = 0;
  const knownWrongLines: string[] = [];
  const knownFailingScripts: string[] = [];

  for (const method of methods) {
    process.env.METHOD_V2 = method === 'v2' ? 'on' : 'off';
    console.log(`--- ${method === 'v2' ? 'methodology 2 (METHOD_V2=on)' : 'methodology 1 (METHOD_V2 off)'} ---`);
    for (const [name, fn, runIn] of suites) {
      if (only && only !== name && only !== 'suites') continue;
      if (!runIn.includes(method)) continue;
      const s0 = Date.now();
      const r = await fn();
      const status = r.failures.length || r.staleMarkers.length ? 'FAIL' : 'PASS';
      console.log(`[${status}] ${method}/${name}: ${r.passed} passed, ${r.failures.length} failed, ${r.knownWrong.length} known-wrong (${Date.now() - s0}ms)`);
      for (const f of r.failures.slice(0, 40)) console.log(`    FAIL ${f}`);
      if (r.failures.length > 40) console.log(`    ... ${r.failures.length - 40} more`);
      for (const m of r.staleMarkers) console.log(`    STALE ${m}`);
      if (r.failures.length || verbose) for (const n of r.notes) console.log(n.split('\n').map((l) => `    ${l}`).join('\n'));
      failed += r.failures.length;
      stale += r.staleMarkers.length;
      const grouped = new Map<string, { finding: number; cases: string[]; detail: string }>();
      for (const k of r.knownWrong) {
        const key = `${method}/${name}/${k.check}#${k.finding}`;
        const g = grouped.get(key) ?? { finding: k.finding, cases: [], detail: k.detail };
        g.cases.push(k.caseId);
        grouped.set(key, g);
      }
      for (const [key, g] of grouped) {
        knownWrongLines.push(`  ${key.split('#')[0]} (finding ${g.finding}): ${g.cases.length} case(s), e.g. ${g.cases[0]}: ${g.detail}`);
      }
    }

    if (!only || only === 'legacy') {
      for (const sc of LEGACY_SCRIPTS) {
        const r = runLegacy(sc.name, method);
        const knownHere = sc.knownFailing && (!sc.knownFailingMethods || sc.knownFailingMethods.includes(method));
        if (knownHere) {
          if (r.ok) {
            console.log(`[FAIL] ${method}/scripts/${sc.name}: passes now, remove its knownFailing mark`);
            stale += 1;
          } else {
            console.log(`[KNOWN] ${method}/scripts/${sc.name} (${r.ms}ms)`);
            knownFailingScripts.push(`  ${method}/scripts/${sc.name}: ${sc.knownFailing}`);
          }
          continue;
        }
        console.log(`[${r.ok ? 'PASS' : 'FAIL'}] ${method}/scripts/${sc.name} (${r.ms}ms)`);
        if (!r.ok) {
          failed += 1;
          console.log(r.tail.split('\n').map((l) => `    ${l}`).join('\n'));
        }
      }
    }
  }
  if (originalFlag === undefined) delete process.env.METHOD_V2;
  else process.env.METHOD_V2 = originalFlag;

  // Round 2: real Chrome layout check of the customer PDF (13 cases, about 40s).
  // Needs Chrome and Google Fonts. PDF_LAYOUT_SKIP=1 skips it explicitly and says so.
  if (!only || only === 'pdf-layout') {
    if (process.env.PDF_LAYOUT_SKIP === '1') {
      console.log('[SKIP] pdf-layout (PDF_LAYOUT_SKIP=1). Run npm run test:pdf-layout before pushing.');
    } else {
      // Both methodologies: methodology 2 adds text on pages 4 and 6 (WACC sources, T1 note).
      const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
      for (const method of methods) {
        const t1 = Date.now();
        const res = spawnSync(process.execPath, [tsxCli, path.join('tests', 'pdf', 'layout.ts')], {
          cwd: ROOT,
          encoding: 'utf8',
          env: { ...process.env, FORCE_COLOR: '0', METHOD_V2: method === 'v2' ? 'on' : 'off' },
          timeout: 180_000,
        });
        const ok = res.status === 0;
        const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim().split('\n');
        const mode = out.find((l) => l.startsWith('pdf-layout: ') && !/failure/.test(l))?.replace('pdf-layout: ', '') ?? '';
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${method}/pdf-layout (${Date.now() - t1}ms${mode ? `, ${mode}` : ''})`);
        if (!ok) {
          failed += 1;
          console.log(out.filter((l) => /FAIL|page|Error|No Chrome/.test(l)).slice(0, 30).map((l) => `    ${l}`).join('\n'));
        }
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

void main();
