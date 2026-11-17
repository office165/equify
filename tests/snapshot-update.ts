/**
 * Rewrites tests/snapshots/*.json and the methodology lock. A reason is mandatory and is
 * appended to tests/snapshots/CHANGELOG.md together with the list of changed fields.
 *
 * Usage: npm run snapshot:update -- --reason "why the numbers changed"
 * Methodology 2: METHOD_V2=on npm run snapshot:update -- --reason "..." writes tests/snapshots/v2/
 * (and its own CHANGELOG.md). The methodology map and the value lock are methodology 1 only.
 */
import fs from 'fs';
import path from 'path';
import { resolveMethodVersion } from '../lib/valuation/method_v2';
import {
  activeSnapshotDir,
  computeSnapshots,
  diffSnapshots,
  formatDiffTable,
  readSnapshot,
  writeSnapshot,
  type SnapshotDiffRow,
} from './lib/snapshot_store';
import { writeMethodologyLock, readMethodologyLock } from './suites/methodology';
import { buildMethodologyMap } from './lib/methodology';
import { writeMethodologyDoc } from './methodology-doc';

function parseReason(argv: string[]): string | null {
  const i = argv.indexOf('--reason');
  if (i >= 0 && argv[i + 1]?.trim()) return argv[i + 1].trim();
  const eq = argv.find((a) => a.startsWith('--reason='));
  if (eq) return eq.slice('--reason='.length).trim() || null;
  return null;
}

const reason = parseReason(process.argv.slice(2));
if (!reason) {
  console.error('snapshot:update requires --reason "<why>". Nothing written.');
  process.exit(2);
}

const current = computeSnapshots();
const rows: SnapshotDiffRow[] = [];
let newCases = 0;
for (const [group, cases] of Object.entries(current)) {
  const stored = readSnapshot(group) ?? {};
  for (const [id, snap] of Object.entries(cases)) {
    if (!(id in stored)) newCases += 1;
    else rows.push(...diffSnapshots(id, stored[id], snap));
  }
  writeSnapshot(group, cases);
}

const isV2 = resolveMethodVersion() === 'v2';
let methodologyChanged = false;
if (!isV2) {
  const map = buildMethodologyMap();
  const lockBefore = readMethodologyLock();
  methodologyChanged = JSON.stringify(lockBefore) !== JSON.stringify(map);
  writeMethodologyLock(map);
  writeMethodologyDoc(map);
}

const date = new Date().toISOString().slice(0, 10);
const entry = [
  `## ${date}`,
  '',
  `סיבה: ${reason}`,
  '',
  `תיקים חדשים: ${newCases}. שדות שהשתנו: ${rows.length}. מפת מתודולוגיה השתנתה: ${methodologyChanged ? 'כן' : 'לא'}.`,
  '',
  ...(rows.length ? ['```', formatDiffTable(rows, 200), '```', ''] : []),
].join('\n');
const changelog = path.join(activeSnapshotDir(), 'CHANGELOG.md');
const prior = fs.existsSync(changelog)
  ? fs.readFileSync(changelog, 'utf8')
  : isV2
    ? '# שינויים ב snapshot של מתודולוגיה 2\n\nכל עדכון של tests/snapshots/v2 נרשם כאן עם סיבה. נוצר עם METHOD_V2=on.\n\n'
    : '# שינויים ב snapshot\n\nכל עדכון של tests/snapshots נרשם כאן עם סיבה.\n\n';
fs.writeFileSync(changelog, `${prior}${entry}\n`, 'utf8');
console.log(`snapshot updated: ${rows.length} changed field(s), ${newCases} new case(s).`);
