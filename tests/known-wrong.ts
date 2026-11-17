/**
 * KNOWN_WRONG markers: checks that fail today because of a documented finding.
 * npm test reports them separately and does not fail on them. When a finding is fixed,
 * the check starts passing and npm test fails until the marker below is removed.
 *
 * cases: '*' for every case, or an explicit list of case ids.
 * Finding numbers refer to reports/round-1.md (1 to 14 from 16.11, 15+ found in round 1).
 */
export interface KnownWrongEntry {
  suite: string;
  check: string;
  cases: '*' | string[];
  finding: number;
  note: string;
}

export const KNOWN_WRONG: KnownWrongEntry[] = [
  // Finding 19: displayed weights are rounded to whole percent (22.5% shows as 23%).
  { suite: 'correctness', check: 'display-contribution-equals-ev-times-shown-weight', cases: ['golden-boutique-hotel', 'golden-consulting', 'golden-manufacturing', 'golden-payments', 'golden-enterprise-cyber', 'golden-defense'], finding: 19, note: 'rounded weight on screen' },
  // Finding 2: WACC chart adds CRP 1.6 and omits Kd and weights.
  { suite: 'correctness', check: 'wacc-chart-equals-effective', cases: '*', finding: 2, note: 'chart sum vs effective WACC' },
  { suite: 'correctness', check: 'html-wacc-single-value', cases: '*', finding: 2, note: 'donut shows a second WACC' },
  // Finding 3: terminal value capped at 0.42 of explicit PV.
  { suite: 'correctness', check: 'terminal-gordon', cases: '*', finding: 3, note: 'Gordon vs capped TV' },
  // Finding 6: sensitivity table is a linear approximation with fixed rows.
  { suite: 'correctness', check: 'sensitivity-growth-rows-unique', cases: ['golden-restaurant', 'golden-medtech', 'golden-income-re', 'golden-other'], finding: 6, note: 'base growth row duplicated' },
  { suite: 'correctness', check: 'sensitivity-growth-rows-sorted', cases: ['golden-restaurant', 'golden-boutique-hotel', 'golden-manufacturing', 'golden-retail', 'golden-b2b-saas', 'golden-payments', 'golden-enterprise-cyber', 'golden-medtech', 'golden-income-re', 'golden-other', 'golden-large-industrial'], finding: 6, note: 'rows not sorted' },
  { suite: 'correctness', check: 'sensitivity-growth-steps-uniform', cases: ['golden-restaurant', 'golden-boutique-hotel', 'golden-consulting', 'golden-manufacturing', 'golden-retail', 'golden-b2b-saas', 'golden-payments', 'golden-enterprise-cyber', 'golden-medtech', 'golden-solar', 'golden-income-re', 'golden-other', 'golden-large-industrial'], finding: 6, note: 'growth steps 15/12/base/6/3' },
  { suite: 'correctness', check: 'sensitivity-wacc-steps-uniform', cases: '*', finding: 6, note: 'WACC steps -1.7/-1/0/+1/+1.8' },
  // Finding 15: the report declares two EBITDA bases (30/50/20 for DCF, 30/30/40 for the multiple).
  { suite: 'correctness', check: 'ebitda-single-declared-base', cases: '*', finding: 15, note: 'two EBITDA bases' },
  // Finding 16: DCF EV is changed after the table by enforceCapexMonotonicity, table does not sum to it.
  { suite: 'correctness', check: 'dcf-table-sums-to-dcf-ev', cases: ['golden-boutique-hotel', 'golden-consulting', 'golden-manufacturing', 'golden-b2b-saas', 'golden-payments', 'golden-enterprise-cyber', 'golden-income-re', 'golden-large-industrial'], finding: 16, note: 'table sum vs DCF EV' },
  // Finding 17: margin winsorization applies to some EBITDA fields and not to others.
  { suite: 'correctness', check: 'ebitda-projected-equals-growth', cases: ['golden-solar', 'golden-income-re'], finding: 17, note: 'projected uses raw current year' },
  { suite: 'correctness', check: 'ebitda-normalized-30-30-40-is-multiple-base', cases: ['golden-solar', 'golden-income-re'], finding: 17, note: 'multiple base winsorized, page 2 note raw' },
  // Finding 18: WACC weights come from a pre-valuation equity proxy, not from the report equity.
  { suite: 'correctness', check: 'wacc-equals-weights-from-report-equity', cases: ['golden-restaurant', 'golden-boutique-hotel', 'golden-manufacturing', 'golden-retail', 'golden-payments', 'golden-medtech', 'golden-solar', 'golden-income-re', 'golden-large-industrial'], finding: 18, note: 'proxy E/V' },
  // Finding 21: hard size steps in normalize_multiple.resolveScaleFactor (5M, 20M, 120M revenue).
  { suite: 'scale-ladder', check: 'no-boundary-jump', cases: '*', finding: 21, note: 'step 0.88/0.92/0.96/1.0' },
];

export function isKnownWrong(suite: string, check: string, caseId: string): KnownWrongEntry | null {
  for (const e of KNOWN_WRONG) {
    if (e.suite !== suite || e.check !== check) continue;
    if (e.cases === '*' || e.cases.includes(caseId)) return e;
  }
  return null;
}
