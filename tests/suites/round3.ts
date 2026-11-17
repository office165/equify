/**
 * Round 3: private company layer in methodology 2.
 *
 * Methodology 1: no marketability discount on the DCF and no private layer lines in the report.
 * Methodology 2:
 *   dcf-marketability: DCF leg = DCF before the discount x factor, factor 0.8 to 0.9, in every case.
 *   private-layer-lines: page 4 carries one line for the DCF discount (with its source) and one for
 *     the size premium.
 *   r1-option-b: where the revenue multiple is the main method (current_run_rate_revenue), R1 is not
 *     used: the revenue leg equals the one with R1 off.
 *   margin-monotonic-fine: EBITDA-strategy sub-sectors, margins 0.5% to 8% in fine steps (the thin
 *     band where the R1 floor fades), equity never falls as the margin rises.
 *   sources: the size premium as a function of size is not verified, so it is not part of V2_ALL;
 *     the marketability policy is inside the verified evidence range.
 */
import { computeValuation } from '../../lib/valuation';
import { V2_ALL } from '../../lib/valuation/method_v2';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import {
  DLOM_EVIDENCE,
  DLOM_POLICY,
  PRIVATE_LAYER_SOURCES,
  SIZE_PREMIUM_STATUS,
} from '../../lib/valuation/private_company_layer';
import { resolveSectorMethodologyConfig } from '../../lib/valuation/sector_methodology_resolver';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../../lib/wizard/financial_history';
import { buildAllCases, buildSubsectorCases } from '../lib/cases';
import { buildWizardState, type CaseSpec } from '../lib/fixtures';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { runCase, TEST_FX } from '../lib/run_case';
import { marginCase } from './v2_sanity';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { resultsMarkdown, runCalibration } from '../../scripts/calibration/run';

export const FINE_MARGINS_PCT = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8];

function isRevenueStrategy(spec: CaseSpec): boolean {
  return resolveSectorMethodologyConfig(spec.sector, spec.subSector).strategy === 'current_run_rate_revenue';
}

export function run(): SuiteResult {
  const suite = new Suite('round3');
  const v2 = resolveMethodVersion() === 'v2';

  for (const spec of buildAllCases()) {
    const d = runCase(spec);
    if (!v2) {
      suite.check('v1-no-private-layer', spec.id, d.dcfMarketableEv == null && !d.privateLayerLines?.length, `dcfMarketableEv ${d.dcfMarketableEv}`);
      continue;
    }
    const f = d.dcfMarketabilityFactor;
    const okFactor = f != null && f >= DLOM_POLICY.baseFactor - 1e-9 && f <= DLOM_POLICY.maxFactor + 1e-9;
    const okLeg = f != null && d.dcfMarketableEv != null && Math.abs(d.dcfMarketableEv * f - d.dcfEv) <= Math.max(1, Math.abs(d.dcfEv) * 1e-6);
    suite.check('dcf-marketability', spec.id, okFactor && okLeg, `factor ${f}, before ${d.dcfMarketableEv}, leg ${d.dcfEv}`);
    const lines = d.privateLayerLines ?? [];
    suite.check(
      'private-layer-lines',
      spec.id,
      lines.length === 3 && lines[0].includes('הנחת סחירות') && lines[0].includes('Damodaran') && lines[1].includes('ציבוריות') && lines[2].includes('פרמיית גודל'),
      lines.join(' | '),
    );
  }

  if (v2) {
    // R1 option B.
    for (const spec of buildSubsectorCases().filter(isRevenueStrategy)) {
      const inputs = withQuietConsole(() => {
        const st = buildWizardState(spec);
        return buildValuationInputsFromEquifyState({ ...st, financials: syncFinancialsDerived(st.financials) }, TEST_FX);
      });
      const on = withQuietConsole(() => computeValuation(inputs, { v2Components: { ...V2_ALL }, silent: true }));
      const off = withQuietConsole(() => computeValuation(inputs, { v2Components: { ...V2_ALL, r1: false }, silent: true }));
      suite.check('r1-option-b', spec.id, on.revMult === off.revMult && on.v2?.revenueMultiple == null, `rev leg ${on.revMult} vs ${off.revMult}`);
    }

    // Fine margin grid in the thin band, EBITDA-strategy sub-sectors.
    for (const base of buildSubsectorCases().filter((s) => !isRevenueStrategy(s))) {
      for (const revK of [10_000, 200_000]) {
        let prev: { m: number; eq: number } | null = null;
        for (const m of FINE_MARGINS_PCT) {
          const eq = runCase(marginCase(base, revK, m)).equity;
          if (prev) {
            suite.check('margin-monotonic-fine', `${base.id}@${revK / 1000}M:${prev.m}->${m}`, eq >= prev.eq * (1 - 1e-9), `equity ${Math.round(prev.eq)} -> ${Math.round(eq)}`);
          }
          prev = { m, eq };
        }
      }
    }
  }

  // Calibration script (part B): runs on an empty or missing folder and on a sample case without
  // failing; a broken file is reported, not thrown. Once, in methodology 1 (it runs both itself).
  if (!v2) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'equify-cal-'));
    try {
      const empty = runCalibration(tmp);
      suite.check('calibration-empty-folder', 'empty', empty.results.length === 0 && empty.errors.length === 0 && resultsMarkdown(empty).includes('אין תיקים'), '');
      const missing = runCalibration(path.join(tmp, 'missing'));
      suite.check('calibration-missing-folder', 'missing', missing.results.length === 0 && missing.errors.length === 0, '');
      const sample = {
        caseCode: 'CAL-TEST',
        wizard: {
          sector: 'services', subSector: 'consulting', lifecycle: 'growth', currency: 'ILS',
          years: { '2024': { revenue: 9e6, ebitda: 1.2e6 }, '2025': { revenue: 10e6, ebitda: 1.4e6 }, '2026': { revenue: 11e6, ebitda: 1.6e6 } },
          growthPct: 8, grossDebt: 1e6, cash: 5e5, ownerSalaryNormalization: 0, capexLevelPct: 2, backlogSigned: 0,
          recurringPct: 40, topCustomerPct: 15, founderDependency: true, strongCompetition: false, ipProtection: false, longTermContracts: false,
        },
        nonOperatingAssets: { value: 5e5, low: 3e5, high: 7e5, note: 'בדיקה' },
        target: { value: 8e6, low: 7e6, high: 9e6, by: 'TEST', method: 'בדיקה', source: 'TEST', date: null },
      };
      fs.writeFileSync(path.join(tmp, 'CAL-TEST.json'), JSON.stringify(sample));
      fs.writeFileSync(path.join(tmp, 'broken.json'), '{bad');
      fs.writeFileSync(path.join(tmp, 'TEMPLATE.json'), '{}');
      const r = runCalibration(tmp);
      const row = r.results[0];
      suite.check(
        'calibration-sample',
        'CAL-TEST',
        r.results.length === 1 &&
          r.errors.length === 1 &&
          r.errors[0].file === 'broken.json' &&
          row.v1Engine > 0 &&
          row.v2Engine > 0 &&
          // Non-operating assets are added to the engine value before the comparison.
          row.nonOperating === 5e5 &&
          Math.abs(row.v2 - (row.v2Engine + 5e5)) < 1e-6 &&
          Math.abs(row.v1 - (row.v1Engine + 5e5)) < 1e-6 &&
          Math.abs(row.v2DevPct - ((row.v2 - 8e6) / 8e6) * 100) < 1e-9 &&
          row.v2InRange === (row.v2 >= 7e6 && row.v2 <= 9e6) &&
          resultsMarkdown(r).includes('רגישות לנכסים מחוץ לפעילות'),
        JSON.stringify(row ?? r.errors).slice(0, 160),
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  // Sources: nothing unverified enters methodology 2.
  suite.check('size-premium-not-in-v2', 'V2_ALL', SIZE_PREMIUM_STATUS.gradientVerified || V2_ALL.sizePremiumDecile === false, 'size gradient not verified');
  suite.check('dlom-policy-in-evidence', 'policy', 1 - DLOM_POLICY.baseFactor >= DLOM_POLICY.evidenceRange[0] - 1e-9 && DLOM_EVIDENCE.length >= 5, `${1 - DLOM_POLICY.baseFactor}`);
  suite.check(
    'verified-sources-on-damodaran',
    'sources',
    Object.values(PRIVATE_LAYER_SOURCES).every((s) => !s.verified || s.url.startsWith('https://pages.stern.nyu.edu/')),
    'verified sources are pages.stern.nyu.edu',
  );

  return suite.result;
}
