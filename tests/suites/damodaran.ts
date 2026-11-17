/**
 * Round 2 part A: Damodaran data with source. Every wizard sub-sector is mapped, every value is
 * in a sane range and carries a source with a file, URL and date.
 */
import {
  DAMODARAN_INDUSTRIES,
  DAMODARAN_ISRAEL,
  DAMODARAN_SOURCES,
  DAMODARAN_SUBSECTOR_MAP,
  ISRAEL_RISK_FREE,
  damodaranMappingFor,
  type Sourced,
} from '../../lib/market-data/damodaran_2026';
import { Suite, type SuiteResult } from '../lib/harness';
import { SUBSECTORS } from '../lib/cases';

function hasSource(v: Sourced | null | undefined): boolean {
  if (!v) return false;
  const s = DAMODARAN_SOURCES[v.source];
  return !!s && /^https?:\/\//.test(s.url) && /^\d{4}-\d{2}-\d{2}$/.test(s.dataDate) && !!s.file && !!s.region;
}

export function run(): SuiteResult {
  const suite = new Suite('damodaran');

  suite.check('subsector-count-50', 'map', SUBSECTORS.length === 50, `${SUBSECTORS.length}`);
  for (const { sector, subSector } of SUBSECTORS) {
    const id = `${sector}:${subSector}`;
    const m = damodaranMappingFor(sector, subSector);
    suite.check('subsector-mapped', id, !!m, 'no mapping');
    if (!m) continue;
    suite.check('mapping-has-reason', id, m.reason.trim().length >= 5, m.reason);
    suite.check('mapping-industry-exists', id, !!DAMODARAN_INDUSTRIES[m.industry], m.industry);
  }
  suite.check('map-has-no-extra-rows', 'map', DAMODARAN_SUBSECTOR_MAP.length === SUBSECTORS.length, `${DAMODARAN_SUBSECTOR_MAP.length}`);

  for (const [name, regions] of Object.entries(DAMODARAN_INDUSTRIES)) {
    for (const v of [regions.global, regions.emerging]) {
      const id = `${name}/${v.region}`;
      suite.check('industry-name-matches', id, v.industry === name);
      suite.check('beta-range', id, v.beta.value >= 0.3 && v.beta.value <= 2.5, `${v.beta.value}`);
      suite.check('unlevered-beta-positive', id, v.unleveredBetaCash.value > 0 && v.unleveredBetaCash.value <= 2.5, `${v.unleveredBetaCash.value}`);
      suite.check('de-range', id, v.deRatio.value >= 0 && v.deRatio.value <= 5, `${v.deRatio.value}`);
      suite.check('ev-sales-range', id, v.evSales.value >= 0.1 && v.evSales.value <= 20, `${v.evSales.value}`);
      suite.check('ev-ebitda-positive', id, v.evEbitda.value > 0 && v.evEbitda.value < 100, `${v.evEbitda.value}`);
      for (const [k, s] of Object.entries({ beta: v.beta, deRatio: v.deRatio, unleveredBeta: v.unleveredBeta, unleveredBetaCash: v.unleveredBetaCash, evEbitda: v.evEbitda, evSales: v.evSales, effectiveTax: v.effectiveTax })) {
        suite.check('value-has-source-and-date', `${id}/${k}`, hasSource(s));
      }
      if (v.evEbitdaAll) suite.check('value-has-source-and-date', `${id}/evEbitdaAll`, hasSource(v.evEbitdaAll));
    }
  }

  const crpPct = DAMODARAN_ISRAEL.crp.value * 100;
  suite.check('crp-range-0-5', 'israel', crpPct > 0 && crpPct <= 5, `${crpPct}`);
  suite.check('crp-has-source', 'israel', hasSource(DAMODARAN_ISRAEL.crp));
  const erpPct = DAMODARAN_ISRAEL.impliedErp.value * 100;
  suite.check('erp-range', 'israel', erpPct >= 3 && erpPct <= 8, `${erpPct}`);
  suite.check('erp-has-source', 'israel', hasSource(DAMODARAN_ISRAEL.impliedErp));
  const rfPct = ISRAEL_RISK_FREE.value * 100;
  suite.check('rf-range', 'israel', rfPct >= 1 && rfPct <= 8, `${rfPct}`);
  suite.check('rf-has-source', 'israel', hasSource({ value: ISRAEL_RISK_FREE.value, source: ISRAEL_RISK_FREE.source }));
  return suite.result;
}
