/**
 * Methodology 2 sanity (round 2, part C).
 *
 * margin-monotonic: for a profitable company, equity is never lower than the equity of an
 * identical company with a lower EBITDA margin (same revenue, growth, debt and risk answers).
 * Runs for one case per sub-sector, at 10M and 200M revenue, margins 2% to 35% (methodology 2 only).
 *
 * manual-review: in methodology 2 every case with zero equity, equity below 5% of revenue
 * (revenue above 2M) or net debt above EV carries a manual review flag, and no other case does.
 * The hold notice and the office alert carry no value and no customer contact details.
 */
import { setOfficeAlertSinkForTests, type OfficeAlert } from '../../lib/alerts/office_alert';
import { alertOfficeManualReview, buildManualReviewNotice } from '../../lib/reports/manual_review_hold';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import { ANCHOR_CASES, buildSubsectorCases } from '../lib/cases';
import type { CaseSpec } from '../lib/fixtures';
import { Suite, type SuiteResult } from '../lib/harness';
import { runCase } from '../lib/run_case';

export const MARGINS_PCT = [2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35];
export const REVENUES_K = [10_000, 200_000];

export function marginCase(base: CaseSpec, revK: number, marginPct: number): CaseSpec {
  const e = (revK * marginPct) / 100;
  const r24 = revK / 1.1;
  const r25 = revK / 1.05;
  return {
    ...base,
    id: `${base.id}@${revK}K-m${marginPct}`,
    y: [
      [r24, (r24 * marginPct) / 100],
      [r25, (r25 * marginPct) / 100],
      [revK, e],
    ],
    growth: 5,
    grossDebt: 0,
    cash: 0,
    backlog: 0,
    capex: 2,
  };
}

export function run(): SuiteResult {
  const suite = new Suite('v2-sanity');
  for (const base of buildSubsectorCases()) {
    for (const revK of REVENUES_K) {
      let prev: { m: number; eq: number } | null = null;
      for (const m of MARGINS_PCT) {
        const eq = runCase(marginCase(base, revK, m)).equity;
        if (prev) {
          suite.check(
            'margin-monotonic',
            `${base.id}@${revK / 1000}M:${prev.m}->${m}`,
            eq >= prev.eq * (1 - 1e-9),
            `margin ${prev.m}% -> ${m}%: equity ${Math.round(prev.eq)} -> ${Math.round(eq)}`,
          );
        }
        prev = { m, eq };
      }
    }
  }

  if (resolveMethodVersion() === 'v2') {
    for (const spec of [...ANCHOR_CASES, ...buildSubsectorCases()]) {
      const d = runCase(spec);
      const rev = spec.y[2][0] * 1000;
      const expected =
        d.equity <= 0 ||
        d.enterpriseValue - d.netDebt < 0 ||
        (rev > 2_000_000 && d.equity < rev * 0.05);
      suite.check('manual-review-flag', spec.id, Boolean(d.manualReview) === expected, `flag ${Boolean(d.manualReview)}, expected ${expected} (equity ${Math.round(d.equity)}, EV ${Math.round(d.enterpriseValue)}, net debt ${Math.round(d.netDebt)})`);
    }
    const alerts: OfficeAlert[] = [];
    setOfficeAlertSinkForTests((a) => alerts.push(a));
    try {
      alertOfficeManualReview({ reportId: 'TEST-1', review: { reasons: ['equity-zero'], detail: 'METHOD_V2 manual review: equity-zero' } });
    } finally {
      setOfficeAlertSinkForTests(null);
    }
    suite.check('manual-review-office-alert', 'alert', alerts.length === 1 && alerts[0].kind === 'method_v2_manual_review' && alerts[0].lines.some((l) => l.includes('השווי לבעלים יצא 0')), JSON.stringify(alerts[0] ?? null).slice(0, 120));
    const notice = buildManualReviewNotice({ locale: 'he', recipientName: 'ישראל', companyName: 'חברת בדיקה' });
    suite.check('manual-review-notice-no-value', 'notice', !/₪|\d/.test(notice.text) && notice.subject.includes('בבדיקה'), notice.subject);
    suite.check('manual-review-notice-style', 'notice', !/[—·]|\w-\w/.test(notice.text), 'no long dash, middle dot or attached hyphen');
  }
  return suite.result;
}
