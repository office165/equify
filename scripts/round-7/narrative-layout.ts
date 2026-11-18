/**
 * Round 7: renders the restaurant report with the recorded Opus narrative (no API call) to
 * reports/round-7/narrative/, and runs the Chrome layout check. METHOD_V2 off.
 */
import fs from 'fs';
import path from 'path';
import { buildPdfHtml } from '../../lib/pdf-template';
import { memoryNarrativeStore } from '../../lib/narrative/narrative_store';
import { withReportNarrative, type NarrativeCallResult } from '../../lib/narrative/opus_narrative';
import { renderHtmlToPdfBuffer } from '../../lib/pdf/render_html_pdf';
import { checkLayout, launch, ROOT } from '../../tests/pdf/pdf_harness';
import { buildAllCases } from '../../tests/lib/cases';
import { runCase } from '../../tests/lib/run_case';

async function main(): Promise<void> {
  process.env.METHOD_V2 = 'off';
  process.env.OPUS_NARRATIVE = 'on';
  const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/opus/golden-restaurant.good.json'), 'utf8')) as NarrativeCallResult;
  const data = await withReportNarrative(runCase(buildAllCases().find((c) => c.id === 'golden-restaurant')!), { caller: async () => rec, store: memoryNarrativeStore() });
  if (!data.opusNarrative) throw new Error('narrative rejected');
  const html = buildPdfHtml(data);
  const browser = await launch();
  try {
    const layout = await checkLayout(browser, html);
    console.log('layout issues:', layout.issues.length ? layout.issues : 'none', 'pages', layout.htmlPages);
    const out = path.join(ROOT, 'reports', 'round-7', 'narrative');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'golden-restaurant-with-narrative.pdf'), await renderHtmlToPdfBuffer(html, browser));
  } finally {
    await browser.close();
  }
}
void main();
