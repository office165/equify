/**
 * Round 4, part E: what findings 29 and 30 change in methodology 2, on the 385 fictional cases.
 *   npx tsx scripts/round-4/findings-29-30.ts > /tmp/out.md
 * Before = V2_ALL without backlogNoOffset and concentrationMultiple (round 3); after = V2_ALL.
 * Each finding alone is shown too. Prints markdown: a table by sector (median change), and the
 * cases that moved the most.
 */
import { computeValuation } from '../../lib/valuation';
import { V2_ALL, type V2Components } from '../../lib/valuation/method_v2';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { buildAllCases } from '../../tests/lib/cases';
import { buildWizardState } from '../../tests/lib/fixtures';
import { withQuietConsole } from '../../tests/lib/quiet';
import { TEST_FX } from '../../tests/lib/run_case';

const BEFORE: V2Components = { ...V2_ALL, backlogNoOffset: false, concentrationMultiple: false };
const ONLY29: V2Components = { ...BEFORE, backlogNoOffset: true };
const ONLY30: V2Components = { ...BEFORE, concentrationMultiple: true };

function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

const pct = (a: number, b: number) => (b !== 0 ? ((a - b) / Math.abs(b)) * 100 : 0);
const f1 = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;

export function computeFindingsTable(): { rows: Array<{ id: string; sector: string; d: number; d29: number; d30: number; top: number; founder: boolean; backlog: boolean }>; markdown: string } {
  const rows: Array<{ id: string; sector: string; d: number; d29: number; d30: number; top: number; founder: boolean; backlog: boolean }> = [];
  for (const spec of buildAllCases()) {
    const inputs = buildValuationInputsFromEquifyState(buildWizardState(spec), TEST_FX);
    const eq = (c: V2Components) => withQuietConsole(() => computeValuation(inputs, { v2Components: c, silent: true }).equity);
    const before = eq(BEFORE);
    if (before <= 0) continue;
    rows.push({
      id: spec.id,
      sector: spec.sector,
      d: pct(eq(V2_ALL), before),
      d29: pct(eq(ONLY29), before),
      d30: pct(eq(ONLY30), before),
      top: spec.top,
      founder: spec.founderDep,
      backlog: spec.backlog > 0,
    });
  }
  const bySector = new Map<string, typeof rows>();
  for (const r of rows) bySector.set(r.sector, [...(bySector.get(r.sector) ?? []), r]);
  const lines: string[] = [];
  lines.push('| ענף | תיקים | חציון השינוי | חציון ממצא 29 לבד | חציון ממצא 30 לבד | תיקים שזזו |');
  lines.push('|---|---|---|---|---|---|');
  for (const [sector, rs] of [...bySector.entries()].sort()) {
    lines.push(`| ${sector} | ${rs.length} | ${f1(median(rs.map((r) => r.d)))} | ${f1(median(rs.map((r) => r.d29)))} | ${f1(median(rs.map((r) => r.d30)))} | ${rs.filter((r) => Math.abs(r.d) > 0.05).length} |`);
  }
  lines.push(`| **הכל** | ${rows.length} | ${f1(median(rows.map((r) => r.d)))} | ${f1(median(rows.map((r) => r.d29)))} | ${f1(median(rows.map((r) => r.d30)))} | ${rows.filter((r) => Math.abs(r.d) > 0.05).length} |`);
  lines.push('');
  lines.push('התיקים שזזו הכי הרבה:');
  lines.push('');
  lines.push('| תיק | ענף | לקוח גדול | תלות במייסד | צבר | שינוי | ממצא 29 | ממצא 30 |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of [...rows].sort((a, b) => a.d - b.d).slice(0, 10)) {
    lines.push(`| ${r.id} | ${r.sector} | ${r.top}% | ${r.founder ? 'כן' : 'לא'} | ${r.backlog ? 'כן' : 'לא'} | ${f1(r.d)} | ${f1(r.d29)} | ${f1(r.d30)} |`);
  }
  return { rows, markdown: lines.join('\n') };
}

if (require.main === module) {
  console.log(computeFindingsTable().markdown);
}
