/**
 * Round 14, stage 2: the credit chapter ready for Orly's three answers.
 *   table:        data/credit/sectors.json has value, source and "pendingOrly" for every value; a pending
 *                 value is marked "*" with "הערכת SBC" on the page, an approved one is not.
 *   cfads:        CREDIT_CFADS picks the definition; default = round 4 (EBITDA - tax - CAPEX).
 *   discounting:  CREDIT_DISCOUNTING picks annual (default, 7,393,000 in Orly's example) or monthly (7,477,000).
 *   combos:       in the four combinations every case's chapter adds up; the default combination is
 *                 exactly round 4's chapter; the value of the business never moves (the chapter does not feed it).
 */
import SECTORS from '../../data/credit/sectors.json';
import { computeCreditCapacity, presentValueAnnual, presentValueMonthly, type CreditCapacityInput } from '../../lib/credit/credit_capacity';
import { checkCreditChapterConsistency } from '../../lib/credit/credit_chapter';
import { creditCfadsDefinition, creditDiscounting } from '../../lib/credit/flag';
import { SBC_ESTIMATE_SOURCE, SBC_STANDARD_SOURCE, SECTOR_CREDIT_TABLE, pendingOrlyFields, resolveSectorCreditTerms } from '../../lib/credit/sector_credit_table';
import { primeRatePct } from '../../lib/market-data/boi_policy_rate';
import { buildEquifyPdfPages } from '../../lib/pdf-template/equify-pdf-pages';
import { scanText, visibleText } from '../../lib/report/report_text_rules';
import { buildAllCases } from '../lib/cases';
import { buildWizardState } from '../lib/fixtures';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { caseCredit } from '../pdf/pdf_harness';
import { reportData, withCreditFlag } from './round4';

const within = (a: number, b: number, rel = 0.001) => Math.abs(a - b) <= Math.abs(b) * rel;

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function chapterBody(html: string): string {
  const start = html.indexOf('<div class="body credit-chapter">');
  if (start < 0) return '';
  const end = html.indexOf('<div class="foot">', start);
  return html.slice(start, end < 0 ? undefined : end);
}

export const COMBOS = [
  { cfads: 'tax_and_capex', disc: 'annual' },
  { cfads: 'tax_and_capex', disc: 'monthly' },
  { cfads: 'capex_only', disc: 'annual' },
  { cfads: 'capex_only', disc: 'monthly' },
] as const;

export function run(): SuiteResult {
  const s = new Suite('round14-credit');

  // ---------- table ----------
  type Cell = { value: unknown; source: string; pendingOrly: boolean };
  const file = SECTORS as unknown as { sectors: Record<string, Record<string, Cell | string>>; subSectors: Record<string, Record<string, Cell | string>> };
  for (const [key, row] of [...Object.entries(file.sectors), ...Object.entries(file.subSectors)]) {
    const cells = Object.entries(row).filter(([, v]) => typeof v === 'object') as Array<[string, Cell]>;
    const ok = cells.length >= 4 && cells.every(([, c]) => 'value' in c && typeof c.source === 'string' && typeof c.pendingOrly === 'boolean' && (c.pendingOrly ? c.source === SBC_ESTIMATE_SOURCE : true) && (c.source === SBC_ESTIMATE_SOURCE ? c.pendingOrly : true));
    s.check('table', `columns-${key}`, ok);
  }
  s.check('table', 'every-sector', Object.keys(SECTOR_CREDIT_TABLE).length === 13 && Object.keys(file.sectors).length === 13);
  const solar = resolveSectorCreditTerms('energy', 'solar');
  s.check('table', 'solar-standard-not-pending', !pendingOrlyFields(solar).includes('termYears') && !pendingOrlyFields(solar).includes('ceilingPctOfCapacity') && solar.sources.termYears === SBC_STANDARD_SOURCE);
  s.check('table', 'industry-all-pending', pendingOrlyFields(resolveSectorCreditTerms('industry')).length === 4);

  // ---------- cfads and discounting (pure function) ----------
  const base = (over: Partial<CreditCapacityInput> = {}): CreditCapacityInput => ({
    today: { ebitda: 2_000_000, maintenanceCapex: 300_000 },
    taxRate: 0.23,
    existingMonthlyDebtService: 10_000,
    ownerLoans: 0,
    grossDebt: 1_000_000,
    cash: 200_000,
    liens: { has: false },
    terms: resolveSectorCreditTerms('industry'),
    primeRatePct: primeRatePct(),
    ...over,
  });
  const def = computeCreditCapacity(base());
  s.check('cfads', 'default-is-tax-and-capex', JSON.stringify(def) === JSON.stringify(computeCreditCapacity(base({ cfadsDefinition: 'tax_and_capex', discounting: 'annual' }))));
  s.check('cfads', 'tax-and-capex', within(def.today.cfads, 2_000_000 - 0.23 * (2_000_000 - 300_000) - 300_000, 1e-9));
  const capOnly = computeCreditCapacity(base({ cfadsDefinition: 'capex_only' }));
  s.check('cfads', 'capex-only', capOnly.today.tax === 0 && capOnly.today.cfads === 1_700_000 && capOnly.capacity > def.capacity && capOnly.firstStage >= def.firstStage);
  // Orly's example: 510,000 a year, 24 years, 4.5%.
  s.check('discounting', 'annual-7393000', within(presentValueAnnual(510_000, 4.5, 24), 7_393_000));
  s.check('discounting', 'monthly-7477000', within(presentValueMonthly(510_000, 4.5, 24), 7_477_000));
  s.check('discounting', 'zero-rate-equal', presentValueMonthly(120_000, 0, 10) === presentValueAnnual(120_000, 0, 10));
  const mon = computeCreditCapacity(base({ discounting: 'monthly' }));
  s.check('discounting', 'monthly-higher', mon.capacity > def.capacity && mon.today.cfads === def.today.cfads);
  // The first stage is limited by coverage on monthly payments in both, so only the ceiling can move.
  s.check('discounting', 'first-stage-not-lower', mon.firstStage >= def.firstStage);

  // ---------- env ----------
  withEnv({ CREDIT_CFADS: undefined, CREDIT_DISCOUNTING: undefined }, () => s.check('env', 'defaults', creditCfadsDefinition() === 'tax_and_capex' && creditDiscounting() === 'annual'));
  withEnv({ CREDIT_CFADS: 'capex_only', CREDIT_DISCOUNTING: 'monthly' }, () => s.check('env', 'set', creditCfadsDefinition() === 'capex_only' && creditDiscounting() === 'monthly'));
  withEnv({ CREDIT_CFADS: 'bogus', CREDIT_DISCOUNTING: 'weekly' }, () => s.check('env', 'unknown-is-default', creditCfadsDefinition() === 'tax_and_capex' && creditDiscounting() === 'annual'));

  // ---------- the four combinations over every case ----------
  const cases = buildAllCases();
  const equityByCase = new Map<string, number>(); // equity, bear and bull together
  const defaultChapter = new Map<string, string>();
  for (const combo of COMBOS) {
    let bad = 0;
    let checked = 0;
    let firstBad = '';
    withEnv({ CREDIT_CFADS: combo.cfads, CREDIT_DISCOUNTING: combo.disc }, () => {
      for (const spec of cases) {
        const d = withCreditFlag(true, () => reportData({ ...buildWizardState(spec), credit: caseCredit(spec) }, spec.id));
        const c = d.creditChapter;
        if (!c) continue;
        checked += 1;
        const v = checkCreditChapterConsistency(c);
        if (v.length) {
          bad += 1;
          firstBad ||= `${spec.id}: ${v[0]}`;
        }
        const eq = d.equity * 1e6 + d.bearEquity * 1e3 + d.bullEquity;
        if (!equityByCase.has(spec.id)) equityByCase.set(spec.id, eq);
        else if (equityByCase.get(spec.id) !== eq) s.check('combos', `value-unchanged-${spec.id}`, false, `${combo.cfads}/${combo.disc}`);
        if (combo.cfads === 'tax_and_capex' && combo.disc === 'annual') {
          const { cfadsDefinition: _a, discounting: _b, pendingOrly: _c, ...rest } = c;
          defaultChapter.set(spec.id, JSON.stringify(rest));
        }
      }
    });
    s.check('combos', `consistent-${combo.cfads}-${combo.disc}`, bad === 0 && checked === cases.length, `${bad} bad of ${checked}; ${firstBad}`);
  }
  s.check('combos', 'value-unchanged-all', equityByCase.size === cases.length);
  // Unset variables are the default combination, field for field.
  const sample = cases.filter((_, i) => i % 25 === 0);
  let sameDefault = 0;
  withEnv({ CREDIT_CFADS: undefined, CREDIT_DISCOUNTING: undefined }, () => {
    for (const spec of sample) {
      const c = withCreditFlag(true, () => reportData({ ...buildWizardState(spec), credit: caseCredit(spec) }, spec.id)).creditChapter!;
      const { cfadsDefinition: _a, discounting: _b, pendingOrly: _c, ...rest } = c;
      if (JSON.stringify(rest) === defaultChapter.get(spec.id)) sameDefault += 1;
    }
  });
  s.check('combos', 'unset-equals-default', sameDefault === sample.length, `${sameDefault}/${sample.length}`);

  // ---------- the page ----------
  const factory = cases.find((c) => c.id === 'golden-manufacturing') ?? cases[0]!;
  const page = (cfads: string, disc: string) =>
    withEnv({ CREDIT_CFADS: cfads, CREDIT_DISCOUNTING: disc }, () => {
      const d = withCreditFlag(true, () => reportData({ ...buildWizardState(factory), credit: caseCredit(factory) }, factory.id));
      return chapterBody(withQuietConsole(() => buildEquifyPdfPages(d)));
    });
  const pDef = page('tax_and_capex', 'annual');
  const pMon = page('tax_and_capex', 'monthly');
  const pCap = page('capex_only', 'annual');
  s.check('page', 'default-has-tax-row', pDef.includes('<td>מס</td>') && !pDef.includes('היוון חודשי'));
  s.check('page', 'monthly-label', pMon.includes('היוון חודשי'));
  s.check('page', 'capex-only-no-tax-row', !pCap.includes('<td>מס</td>') && pCap.includes('תזרים לשירות חוב (CFADS)'));
  s.check('page', 'pending-marked', pDef.includes('* הערכת SBC, ממתינה לאישור.') && /\d שנה\*/.test(pDef) && pDef.includes('</span>*'));
  for (const [name, html] of [['default', pDef], ['monthly', pMon], ['capex-only', pCap]] as const) {
    const text = visibleText(html.replace(/<span class="eyebrow"[^>]*>[^<]*<\/span>/, ''));
    const v = scanText(text);
    s.check('page', `text-rules-${name}`, v.length === 0, JSON.stringify(v.slice(0, 2)));
  }
  return s.result;
}
