/**
 * Build check: buildPdfHtml must succeed for every case (anchors, sub-sectors, edge cases,
 * size ladder, lifecycle matrix, goals, golden). Cases that throw are listed with the message.
 */
import fs from 'fs';
import path from 'path';
import { buildPdfHtml } from '../../lib/pdf-template';
import { collectValuationDataIssues } from '../../lib/pdf-template/validate-valuation-data';
import { buildAllCases } from '../lib/cases';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { runCase } from '../lib/run_case';

export const BUILD_TABLE_PATH = path.join(__dirname, '..', 'snapshots', 'build-results.md');

export function run(): SuiteResult {
  const suite = new Suite('build');
  const cases = buildAllCases();
  const rows: string[] = [];
  let ok = 0;
  for (const c of cases) {
    let message = '';
    try {
      const data = runCase(c);
      withQuietConsole(() => buildPdfHtml(data));
      ok += 1;
      // Round 2: display rounding must never raise a coherence warning (it would alert office).
      const warnings = collectValuationDataIssues(data).warnings;
      suite.check('no-coherence-warnings', c.id, warnings.length === 0, warnings.join('; ').slice(0, 200));
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
      rows.push(`| ${c.id} | ${c.group} | ${message.replace(/\|/g, '/').slice(0, 220)} |`);
    }
    suite.check('pdf-html-builds', c.id, message === '', message.slice(0, 200));
  }
  const table = [
    `# טבלת בנייה (buildPdfHtml)`,
    '',
    `נבנו בהצלחה: ${ok} מתוך ${cases.length}. נכשלו: ${cases.length - ok}.`,
    '',
    '| תיק | קבוצה | הודעה |',
    '|---|---|---|',
    ...rows,
    '',
  ].join('\n');
  suite.note(`build: ${ok}/${cases.length} built`);
  if (process.env.WRITE_BUILD_TABLE === '1') fs.writeFileSync(BUILD_TABLE_PATH, table, 'utf8');
  return suite.result;
}
