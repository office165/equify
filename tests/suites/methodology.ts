/**
 * Locks the per-sub-sector methodology table (reports/methodology-map.md). Any change in
 * strategy, weights, multiple source, bounds, DLOM, margin cap, beta, D&A or CAPEX basis
 * shows up here as an explicit diff.
 */
import fs from 'fs';
import path from 'path';
import { Suite, type SuiteResult } from '../lib/harness';
import { buildMethodologyMap, type MethodologyRow } from '../lib/methodology';
import { SNAPSHOT_DIR } from '../lib/snapshot_store';

const LOCK = path.join(SNAPSHOT_DIR, 'methodology-map.json');

export function readMethodologyLock(): MethodologyRow[] | null {
  if (!fs.existsSync(LOCK)) return null;
  return JSON.parse(fs.readFileSync(LOCK, 'utf8')) as MethodologyRow[];
}

export function writeMethodologyLock(rows: MethodologyRow[]): void {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  fs.writeFileSync(LOCK, `${JSON.stringify(rows, null, 1)}\n`, 'utf8');
}

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
    }
  } else {
    out[prefix] = JSON.stringify(obj);
  }
  return out;
}

export function run(): SuiteResult {
  const suite = new Suite('methodology-map');
  const current = buildMethodologyMap();
  const lock = readMethodologyLock();
  if (!lock) {
    suite.check('lock-exists', 'methodology-map.json', false, 'missing lock, run snapshot:update');
    return suite.result;
  }
  const byKey = new Map(lock.map((r) => [`${r.sector}/${r.subSector}`, r]));
  for (const row of current) {
    const key = `${row.sector}/${row.subSector}`;
    const before = byKey.get(key);
    if (!before) {
      suite.check('row-exists', key, false, 'sub-sector not in lock');
      continue;
    }
    const a = flatten(before);
    const b = flatten(row);
    const changed = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);
    suite.check(
      'methodology-unchanged',
      key,
      changed.length === 0,
      changed.map((k) => `${k}: ${a[k]} -> ${b[k]}`).join('; '),
    );
  }
  suite.check('row-count', 'all', lock.length === current.length, `${lock.length} vs ${current.length}`);
  return suite.result;
}
