/**
 * KNOWN_WRONG markers: checks that fail today because of a documented finding.
 * npm test reports them separately and does not fail on them. When a finding is fixed,
 * the check starts passing and npm test fails until the marker below is removed.
 *
 * cases: '*' for every case, or an explicit list of case ids.
 * Finding numbers refer to reports/round-1.md (1 to 14 from 16.11, 15+ found in round 1).
 * Round 2 removed the markers of findings 2, 6, 15, 16 and 19 (fixed in the report, values unchanged).
 * Finding 15: the round 2 decision is two named bases; ebitda-single-declared-base was replaced by
 * checks that each base is named and that its stated weights rebuild the engine base.
 */
import { resolveMethodVersion, type MethodVersion } from '../lib/valuation/method_v2';

export interface KnownWrongEntry {
  suite: string;
  check: string;
  cases: '*' | string[];
  finding: number;
  note: string;
  /** Methodologies the marker applies to (default both). npm test runs with METHOD_V2 off and on. */
  methods?: MethodVersion[];
}

export const KNOWN_WRONG: KnownWrongEntry[] = [
  // Finding 3: terminal value capped at 0.42 of explicit PV.
  { suite: 'correctness', check: 'terminal-gordon', cases: '*', finding: 3, note: 'Gordon vs capped TV', methods: ['v1'] },
  // Finding 17: margin winsorization applies to some EBITDA fields and not to others.
  { suite: 'correctness', check: 'ebitda-projected-equals-growth', cases: ['golden-solar', 'golden-income-re'], finding: 17, note: 'projected uses raw current year' },
  { suite: 'correctness', check: 'ebitda-normalized-30-30-40-is-multiple-base', cases: ['golden-solar', 'golden-income-re'], finding: 17, note: 'multiple base winsorized, page 2 note raw' },
  // Finding 18: WACC weights come from a pre-valuation equity proxy, not from the report equity.
  { suite: 'correctness', check: 'wacc-equals-weights-from-report-equity', cases: ['golden-restaurant', 'golden-boutique-hotel', 'golden-manufacturing', 'golden-retail', 'golden-payments', 'golden-medtech', 'golden-solar', 'golden-income-re', 'golden-large-industrial'], finding: 18, note: 'proxy E/V', methods: ['v1'] },
  // Finding 26 (round 2): equity falls when the margin rises in the thin-margin zone (2% to 6%).
  // The check runs in methodology 2 only (methodology 1 breaks it widely, finding 5). The R1 floor (a quarter of the industry multiple, decision
  // of 17.11.2026) keeps the revenue leg flat while the thin-margin regime moves weight from it to the
  // EBITDA leg. Needs a decision, see reports/round-2-method-v2.md.
  { suite: 'v2-sanity', check: 'margin-monotonic', finding: 26, note: 'R1 floor vs thin-margin weights', methods: ['v2'], cases: [
    'sub-defense_aerospace-aviation_space@10M:2->4',
    'sub-defense_aerospace-aviation_space@200M:2->4',
    'sub-defense_aerospace-defense_manufacturing@10M:2->4',
    'sub-defense_aerospace-defense_manufacturing@200M:2->4',
    'sub-defense_aerospace-defense_tech@10M:2->4',
    'sub-defense_aerospace-defense_tech@200M:2->4',
    'sub-energy-solar@10M:2->4',
    'sub-energy-solar@200M:2->4',
    'sub-energy-storage@10M:2->4',
    'sub-energy-storage@200M:2->4',
    'sub-energy-wind@10M:2->4',
    'sub-energy-wind@200M:2->4',
    'sub-food_service-cafe@10M:2->4',
    'sub-food_service-cafe@200M:2->4',
    'sub-food_service-catering@10M:2->4',
    'sub-food_service-catering@200M:2->4',
    'sub-food_service-delivery@10M:2->4',
    'sub-food_service-delivery@200M:2->4',
    'sub-food_service-franchise@10M:2->4',
    'sub-food_service-franchise@200M:2->4',
    'sub-food_service-restaurant@10M:2->4',
    'sub-food_service-restaurant@200M:2->4',
    'sub-health-biotech@10M:2->4',
    'sub-health-biotech@200M:2->4',
    'sub-health-digital_health@10M:2->4',
    'sub-health-digital_health@200M:2->4',
    'sub-hospitality-airbnb_mgmt@10M:2->4',
    'sub-hospitality-airbnb_mgmt@200M:2->4',
    'sub-hospitality-boutique_hotel@10M:2->4',
    'sub-hospitality-boutique_hotel@200M:2->4',
    'sub-hospitality-hotel_chain@10M:2->4',
    'sub-hospitality-hotel_chain@200M:2->4',
    'sub-hospitality-vacation@10M:2->4',
    'sub-hospitality-vacation@200M:2->4',
    'sub-industry-manufacturing@10M:2->4',
    'sub-industry-manufacturing@200M:2->4',
    'sub-industry-traditional@10M:2->4',
    'sub-industry-traditional@200M:2->4',
    'sub-real_estate-re_development@10M:2->4',
    'sub-real_estate-re_development@200M:2->4',
    'sub-real_estate-re_income@10M:2->4',
    'sub-real_estate-re_income@10M:4->6',
    'sub-real_estate-re_income@200M:2->4',
    'sub-real_estate-re_income@200M:4->6',
  ] },

  // Finding 21: hard size steps in normalize_multiple.resolveScaleFactor (5M, 20M, 120M revenue).
  { suite: 'scale-ladder', check: 'no-boundary-jump', cases: '*', finding: 21, note: 'step 0.88/0.92/0.96/1.0', methods: ['v1'] },
];

export function isKnownWrong(suite: string, check: string, caseId: string): KnownWrongEntry | null {
  const method = resolveMethodVersion();
  for (const e of KNOWN_WRONG) {
    if (e.suite !== suite || e.check !== check) continue;
    if (e.methods && !e.methods.includes(method)) continue;
    if (e.cases === '*' || e.cases.includes(caseId)) return e;
  }
  return null;
}
