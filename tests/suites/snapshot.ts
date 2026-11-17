/**
 * Snapshot suite: every number the customer report shows, for every case, must match
 * tests/snapshots/*.json exactly (2 decimals). Update only via npm run snapshot:update.
 */
import { Suite, type SuiteResult } from '../lib/harness';
import path from 'path';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import {
  activeSnapshotDir,
  computeSnapshots,
  diffSnapshots,
  formatDiffTable,
  readSnapshot,
  type SnapshotDiffRow,
} from '../lib/snapshot_store';
import { ANCHOR_CASES } from '../lib/cases';

export function run(): SuiteResult {
  const suite = new Suite('snapshot');
  const current = computeSnapshots();
  const allRows: SnapshotDiffRow[] = [];

  // Anchor guard: the harness must reproduce the customer path exactly (methodology 1 values).
  for (const c of resolveMethodVersion() === 'v1' ? ANCHOR_CASES : []) {
    const snap = current.anchor?.[c.id] as { equity?: number } | undefined;
    suite.check(
      'anchor-equity-exact',
      c.id,
      snap?.equity === c.expectedEquity,
      `expected ${c.expectedEquity}, got ${snap?.equity}`,
    );
  }

  for (const [group, cases] of Object.entries(current)) {
    const stored = readSnapshot(group);
    if (!stored) {
      suite.check('snapshot-file-exists', group, false, `${path.relative(process.cwd(), activeSnapshotDir())}/${group}.json missing`);
      continue;
    }
    for (const [id, snap] of Object.entries(cases)) {
      if (!(id in stored)) {
        suite.check('snapshot-case-exists', id, false, 'no stored snapshot for this case');
        continue;
      }
      const rows = diffSnapshots(id, stored[id], snap);
      allRows.push(...rows);
      suite.check('snapshot-equal', id, rows.length === 0, `${rows.length} field(s) changed`);
    }
    for (const id of Object.keys(stored)) {
      if (!(id in cases)) suite.check('snapshot-case-removed', id, false, 'stored snapshot has no case');
    }
  }

  if (allRows.length > 0) {
    suite.note(`Snapshot differences:\n${formatDiffTable(allRows)}`);
    suite.note(
      resolveMethodVersion() === 'v2'
        ? 'If the change is intended: METHOD_V2=on npm run snapshot:update -- --reason "<why>"'
        : 'If the change is intended: npm run snapshot:update -- --reason "<why>"',
    );
  }
  return suite.result;
}
