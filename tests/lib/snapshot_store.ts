import fs from 'fs';
import path from 'path';
import { buildAllCases, type CaseSpec } from './cases';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import { extractSnapshot, runCase, type CaseSnapshot } from './run_case';

/** Methodology 1 snapshots, the value lock and the methodology map. */
export const SNAPSHOT_DIR = path.join(__dirname, '..', 'snapshots');
/** Methodology 2 snapshots (METHOD_V2=on). */
export const SNAPSHOT_DIR_V2 = path.join(SNAPSHOT_DIR, 'v2');

/** Snapshot folder of the active methodology (METHOD_V2 from the environment). */
export function activeSnapshotDir(): string {
  return resolveMethodVersion() === 'v2' ? SNAPSHOT_DIR_V2 : SNAPSHOT_DIR;
}

export type SnapshotFile = Record<string, CaseSnapshot | { error: string }>;

export function snapshotPath(group: string): string {
  return path.join(activeSnapshotDir(), `${group}.json`);
}

/** Computes the current snapshot for every case, grouped by case group. */
export function computeSnapshots(cases: CaseSpec[] = buildAllCases()): Record<string, SnapshotFile> {
  const out: Record<string, SnapshotFile> = {};
  for (const c of cases) {
    out[c.group] ??= {};
    try {
      out[c.group][c.id] = extractSnapshot(runCase(c));
    } catch (err) {
      out[c.group][c.id] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return out;
}

export function readSnapshot(group: string): SnapshotFile | null {
  const p = snapshotPath(group);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as SnapshotFile;
}

export function writeSnapshot(group: string, data: SnapshotFile): void {
  fs.mkdirSync(activeSnapshotDir(), { recursive: true });
  const sorted: SnapshotFile = {};
  for (const k of Object.keys(data).sort()) sorted[k] = data[k];
  fs.writeFileSync(snapshotPath(group), `${JSON.stringify(sorted, null, 1)}\n`, 'utf8');
}

export interface SnapshotDiffRow {
  caseId: string;
  field: string;
  before: string;
  after: string;
  diffPct: string;
}

function fmt(v: unknown): string {
  if (v == null) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 60 ? `${v.slice(0, 57)}...` : v;
  return JSON.stringify(v);
}

function pct(a: unknown, b: unknown): string {
  if (typeof a === 'number' && typeof b === 'number') {
    if (a === 0) return b === 0 ? '0' : 'inf';
    return `${(((b - a) / Math.abs(a)) * 100).toFixed(2)}%`;
  }
  return 'text';
}

export function diffSnapshots(caseId: string, before: unknown, after: unknown): SnapshotDiffRow[] {
  const rows: SnapshotDiffRow[] = [];
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const k of keys) {
    const bv = b[k];
    const av = a[k];
    if (Array.isArray(bv) || Array.isArray(av)) {
      const bl = (bv as unknown[]) ?? [];
      const al = (av as unknown[]) ?? [];
      const n = Math.max(bl.length, al.length);
      for (let i = 0; i < n; i += 1) {
        if (bl[i] !== al[i]) {
          rows.push({ caseId, field: `${k}[${i}]`, before: fmt(bl[i]), after: fmt(al[i]), diffPct: pct(bl[i], al[i]) });
        }
      }
      continue;
    }
    if (bv !== av) {
      rows.push({ caseId, field: k, before: fmt(bv), after: fmt(av), diffPct: pct(bv, av) });
    }
  }
  return rows;
}

export function formatDiffTable(rows: SnapshotDiffRow[], limit = 60): string {
  const head = ['case', 'field', 'before', 'after', 'diff'];
  const body = rows.slice(0, limit).map((r) => [r.caseId, r.field, r.before, r.after, r.diffPct]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(' | ');
  const out = [line(head), widths.map((w) => '-'.repeat(w)).join('-|-'), ...body.map(line)];
  if (rows.length > limit) out.push(`... and ${rows.length - limit} more rows`);
  return out.join('\n');
}
