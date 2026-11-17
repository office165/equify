/**
 * Golden rule of round 2: with METHOD_V2 off no value moves in any of the 385 cases.
 * Compares the live engine to tests/snapshots/value-lock.json (round 1 values).
 */
import { Suite, type SuiteResult } from '../lib/harness';
import { computeSnapshots } from '../lib/snapshot_store';
import type { CaseSnapshot } from '../lib/run_case';
import { LOCKED_FIELDS, readValueLock } from '../lib/value_lock';

export function run(): SuiteResult {
  const suite = new Suite('value-lock');
  const lock = readValueLock();
  const seen = new Set<string>();
  for (const cases of Object.values(computeSnapshots())) {
    for (const [id, snap] of Object.entries(cases)) {
      seen.add(id);
      const locked = lock[id];
      if (!locked) {
        suite.check('value-locked', id, false, 'case missing from value-lock.json');
        continue;
      }
      if ('error' in snap) {
        suite.check('value-locked', id, false, `case errors: ${snap.error}`);
        continue;
      }
      const s = snap as CaseSnapshot;
      const moved = LOCKED_FIELDS.filter((f) => s[f] !== locked[f]).map((f) => `${f} ${locked[f]} -> ${s[f]}`);
      suite.check('value-locked', id, moved.length === 0, moved.join('; '));
    }
  }
  for (const id of Object.keys(lock)) {
    if (!seen.has(id)) suite.check('value-lock-case-exists', id, false, 'locked case no longer exists');
  }
  return suite.result;
}
