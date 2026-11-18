/**
 * Round 7, Opus narrative (OPUS_NARRATIVE). No real API calls: recorded answers in tests/fixtures/opus/.
 *   flag-off: the report data is the same object, and no call is made.
 *   good: a recorded answer whose numbers all come from the engine is accepted, stored, and the
 *     second render (the email after the download) gets the stored text without a second call.
 *   wrong-number / promise / long-dash / refusal / error / not-json: rejected, template kept.
 *   facts: no company name, contact details or report id reach the model.
 *   html: the narrative is in the report, the report still passes the writing rules and has 8 pages.
 *   drivers: every golden case gets three drivers with a described move.
 */
import fs from 'fs';
import path from 'path';
import { buildPdfHtml, reportPageCount } from '../../lib/pdf-template';
import { buildNarrativeFacts, VALUE_DROP } from '../../lib/narrative/narrative_facts';
import { numberTokens } from '../../lib/narrative/narrative_guard';
import { memoryNarrativeStore } from '../../lib/narrative/narrative_store';
import { resolveNarrative, withReportNarrative, type NarrativeCallResult } from '../../lib/narrative/opus_narrative';
import { scanReportHtml } from '../../lib/report/report_text_rules';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import { buildAllCases } from '../lib/cases';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { runCase } from '../lib/run_case';

const FIX = path.join(__dirname, '..', 'fixtures', 'opus');
const rec = (name: string): NarrativeCallResult => JSON.parse(fs.readFileSync(path.join(FIX, `${name}.json`), 'utf8')) as NarrativeCallResult;

async function withFlag<T>(on: boolean, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.OPUS_NARRATIVE;
  process.env.OPUS_NARRATIVE = on ? 'on' : 'off';
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.OPUS_NARRATIVE;
    else process.env.OPUS_NARRATIVE = prev;
  }
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round7-narrative');
  const spec = buildAllCases().find((c) => c.id === 'golden-restaurant')!;
  const data = runCase(spec);
  let calls = 0;
  const caller = (r: NarrativeCallResult) => async () => {
    calls += 1;
    return r;
  };

  // Flag off: nothing changes, no call.
  const off = await withFlag(false, () => withReportNarrative(data, { caller: caller(rec('golden-restaurant.good')), store: memoryNarrativeStore() }));
  s.check('flag-off', 'same-object', off === data && calls === 0);

  // Facts: engine output only.
  const facts = buildNarrativeFacts(data)!;
  const factsJson = JSON.stringify(facts);
  for (const [k, v] of [['company', data.companyName], ['email', data.email], ['phone', data.phone], ['name', data.fullName], ['report id', data.reportId]] as Array<[string, string | undefined]>) {
    s.check('facts-no-identifiers', k, !v || !factsJson.includes(v));
  }
  s.check('facts-drivers', 'three', facts.drivers.length === 3);

  if (resolveMethodVersion() === 'v1') {
    // A good recorded answer: accepted, stored once, same text on the second render.
    const store = memoryNarrativeStore();
    calls = 0;
    const first = await withFlag(true, () => resolveNarrative(data, { caller: caller(rec('golden-restaurant.good')), store }));
    s.check('good', 'accepted', first.status === 'generated', JSON.stringify(first).slice(0, 200));
    const second = await withFlag(true, () => resolveNarrative(data, { caller: caller(rec('golden-restaurant.wrong-number')), store }));
    s.check('stored-once', 'second-render-uses-stored-text', second.status === 'stored' && calls === 1 && JSON.stringify(second.narrative) === JSON.stringify((first as { narrative: unknown }).narrative));

    // Rejections keep the template.
    for (const [name, why] of [['golden-restaurant.wrong-number', 'number'], ['golden-restaurant.promise', 'promise'], ['golden-restaurant.long-dash', 'writing rule'], ['refusal', 'refusal']] as const) {
      const out = await withFlag(true, () => resolveNarrative(data, { caller: caller(rec(name)), store: memoryNarrativeStore() }));
      s.check('rejected', name, out.status === 'rejected' && 'reason' in out && out.reason.includes(why), JSON.stringify(out).slice(0, 160));
      const d2 = await withFlag(true, () => withQuietConsole(() => withReportNarrative(data, { caller: caller(rec(name)), store: memoryNarrativeStore() })));
      s.check('template-kept', name, d2 === data && !d2.opusNarrative);
    }
    const thrown = await withFlag(true, () => resolveNarrative(data, { caller: async () => { throw new Error('network down'); }, store: memoryNarrativeStore() }));
    s.check('rejected', 'api-error', thrown.status === 'error');
    const notJson = await withFlag(true, () => resolveNarrative(data, { caller: async () => ({ text: 'שלום', stopReason: 'end_turn' }), store: memoryNarrativeStore() }));
    s.check('rejected', 'not-json', notJson.status === 'rejected');
    const noKey = await withFlag(true, async () => {
      const prev = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      try {
        return await resolveNarrative(data, { store: memoryNarrativeStore() });
      } finally {
        if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
      }
    });
    s.check('no-key', 'template', noKey.status === 'no_key');

    // In the report.
    const withN = await withFlag(true, () => withReportNarrative(data, { caller: caller(rec('golden-restaurant.good')), store: memoryNarrativeStore() }));
    const html = withQuietConsole(() => buildPdfHtml(withN));
    s.check('html', 'has-summary', !!withN.opusNarrative && html.includes('על מה השווי נשען') && html.includes('8.1M ₪, ושווי הפעילות'));
    const hits = scanReportHtml(html);
    s.check('html', 'writing-rules', hits.length === 0, hits.map((h) => h.context).join('; '));
    s.check('html', 'eight-pages', reportPageCount(withN) === 8 && (html.match(/<div class="page[ "]/g) ?? []).length === 8);
  }

  // Guard: number tokens.
  s.check('tokens', 'units', JSON.stringify(numberTokens('8.1M ₪ ו 13.4% ו ×2.7 ו 1,200 ו 2.7×')) === JSON.stringify(['8.1M', '13.4%', 'x2.7', '1200', 'x2.7']));

  // Drivers: every golden case gets three drivers.
  for (const g of buildAllCases().filter((c) => c.id.startsWith('golden-'))) {
    const f = buildNarrativeFacts(runCase(g));
    s.check('drivers', g.id, !!f && f.drivers.length === 3 && f.drivers.every((d) => d.move.length > 10) && VALUE_DROP === 0.3);
  }
  return s.result;
}
