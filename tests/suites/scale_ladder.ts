/**
 * Size ladder: same company profile (margin 15%, growth 6%) at 300K to 5B revenue, for
 * services, industry and software. Equity must rise monotonically with size, and crossing
 * a scale tier boundary (5M, 20M, 120M revenue) must not move value much more than revenue.
 */
import { LADDER_BOUNDARY_REVENUES_K, LADDER_PROFILES, LADDER_REVENUES_K, ladderCase } from '../lib/cases';
import { Suite, type SuiteResult } from '../lib/harness';
import { runCase } from '../lib/run_case';

/** Allowed excess move at a boundary: equity ratio over revenue ratio, minus 1. */
export const MAX_BOUNDARY_EXCESS = 0.02;

export function run(): SuiteResult {
  const suite = new Suite('scale-ladder');
  for (const p of LADDER_PROFILES) {
    const revs = [...LADDER_REVENUES_K, ...LADDER_BOUNDARY_REVENUES_K].sort((a, b) => a - b);
    const eq = revs.map((r) => runCase(ladderCase(p.key, r)).equity);
    const ev = revs.map((r) => runCase(ladderCase(p.key, r)).enterpriseValue);
    for (let i = 1; i < revs.length; i += 1) {
      suite.check('equity-monotonic', `${p.key}:${revs[i - 1]}->${revs[i]}`, eq[i] > eq[i - 1], `${eq[i - 1]} -> ${eq[i]}`);
    }
    const lines = [`${p.key}: ` + revs.map((r, i) => `${r / 1000}M:${(ev[i] / (r * 1000)).toFixed(3)}xRev`).join(' ')];
    for (let j = 0; j < LADDER_BOUNDARY_REVENUES_K.length; j += 2) {
      const lo = LADDER_BOUNDARY_REVENUES_K[j];
      const hi = LADDER_BOUNDARY_REVENUES_K[j + 1];
      const eLo = runCase(ladderCase(p.key, lo)).enterpriseValue;
      const eHi = runCase(ladderCase(p.key, hi)).enterpriseValue;
      const excess = eHi / eLo / (hi / lo) - 1;
      lines.push(`  boundary ${lo / 1000}M->${hi / 1000}M: EV ${(((eHi / eLo) - 1) * 100).toFixed(2)}% for revenue ${(((hi / lo) - 1) * 100).toFixed(2)}%, excess ${(excess * 100).toFixed(2)}%`);
      suite.check('no-boundary-jump', `${p.key}:${lo}->${hi}`, Math.abs(excess) <= MAX_BOUNDARY_EXCESS, `excess ${(excess * 100).toFixed(2)}%`);
    }
    suite.note(lines.join('\n'));
  }
  return suite.result;
}
