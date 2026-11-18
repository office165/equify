/**
 * Round 5: writing rules in the customer report (lib/report/report_text_rules.ts).
 *   report-text-rules: the visible text of the report HTML of every one of the 385 cases has no
 *     middle dot, no long dash, no hyphen glued to a Hebrew letter, no emoji and no "תיווך".
 *     With CREDIT_CHAPTER=on every case is built with credit answers, so the chapter is scanned too.
 *   scanner-catches / scanner-allows: the scanner finds each rule, and lets through what the report
 *     uses on purpose (the minus sign in "B−", ISO dates, Latin ids with hyphens, ©).
 */
import { buildPdfHtml } from '../../lib/pdf-template';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import { scanReportHtml, scanText } from '../../lib/report/report_text_rules';
import { buildAllCases } from '../lib/cases';
import { buildWizardState } from '../lib/fixtures';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { TEST_FX } from '../lib/run_case';
import { caseCredit, creditMode } from '../pdf/pdf_harness';

export function reportHtmlForCase(spec: Parameters<typeof buildWizardState>[0]): string {
  const state = buildWizardState(spec);
  if (creditMode()) state.credit = caseCredit(spec);
  return withQuietConsole(() => buildPdfHtml(mapWizardToValuationData(state, `TEST-${spec.id}`, 'he', TEST_FX)));
}

export function run(): SuiteResult {
  const s = new Suite('round5');

  const bad: Array<[string, string]> = [
    ['middle-dot', 'שווי לבעלים · בסיס'],
    ['long-dash', '6.4M ₪ – 9.8M ₪'],
    ['long-dash', 'שווי — בסיס'],
    ['attached-hyphen', 'נכון ל-2026'],
    ['attached-hyphen', 'חד-פעמיות'],
    ['attached-hyphen', 'SBC ו-equify'],
    ['emoji', '🐻 Bear'],
    ['word', 'שירותי תיווך'],
  ];
  for (const [rule, text] of bad) {
    const hits = scanText(text);
    s.check('scanner-catches', `${rule}: ${text}`, hits.some((h) => h.rule === rule), JSON.stringify(hits));
  }
  const good = ['48 / B−', '−2.8M ₪', 'נכון ליום 29.06.2026', '2026-06-29', '#TEST-golden-restaurant', '© 2026 equify BY SBC | CONFIDENTIAL', 'מכפיל EBITDA ×2.7', 'ב Vercel', 'EV/Sales'];
  for (const text of good) {
    const hits = scanText(text);
    s.check('scanner-allows', text, hits.length === 0, JSON.stringify(hits));
  }
  // Text inside <style> or attributes is not customer text.
  s.check('scanner-allows', 'style-and-attributes', scanReportHtml('<style>.a::before{content:"—"}</style><div title="a·b">ok</div>').length === 0);

  for (const spec of buildAllCases()) {
    const hits = scanReportHtml(reportHtmlForCase(spec));
    s.check('report-text-rules', spec.id, hits.length === 0, hits.slice(0, 3).map((h) => `${h.rule}: "${h.context}"`).join('; '));
  }
  return s.result;
}
