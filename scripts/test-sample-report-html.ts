/**
 * Generate Hebrew + English sample report HTML previews (no Puppeteer).
 * Usage: jiti scripts/test-sample-report-html.ts
 */

import fs from 'fs';
import path from 'path';
import { buildPdfHtml } from '../lib/pdf-template';
import { mapApiPayloadToValuationData } from '../lib/pdf-template/map-from-api';
import {
  SAMPLE_REPORT_PAYLOAD,
  SAMPLE_REPORT_PAYLOAD_EN,
} from '../lib/pdf-template/sample-report-fixture';

function writePreview(
  label: string,
  filename: string,
  payload: typeof SAMPLE_REPORT_PAYLOAD,
) {
  const data = mapApiPayloadToValuationData(payload);
  const html = buildPdfHtml(data);
  const outDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, filename);
  fs.writeFileSync(out, html, 'utf8');
  const dir = html.match(/dir="(rtl|ltr)"/)?.[1] ?? '?';
  const sheets = (html.match(/class="sheet/g) ?? []).length;
  const nums = (html.match(/span dir="ltr" class="num"/g) ?? []).length;
  console.log(`${label}: ${out}`);
  console.log(`  company=${data.companyName}`);
  console.log(`  dir=${dir} sheets=${sheets} num-spans=${nums}`);
  return { html, data };
}

const he = writePreview('Hebrew', 'sample-report-preview.html', SAMPLE_REPORT_PAYLOAD);
const en = writePreview('English', 'sample-report-preview-en.html', SAMPLE_REPORT_PAYLOAD_EN);

function extractPage(html: string, eyebrow: string): string {
  const idx = html.indexOf(eyebrow);
  if (idx < 0) return '';
  const slice = html.slice(idx, idx + 4000);
  const end = slice.indexOf('class="foot"');
  return end > 0 ? slice.slice(0, end) : slice;
}

const p6 = extractPage(he.html, '06 · תרחישים');
const p6en = extractPage(en.html, '06 · Scenarios');

console.log('\n--- Dynamic company name in Hebrew HTML ---');
console.log(he.html.includes(he.data.companyName) ? 'PASS' : 'FAIL');
console.log('\n--- No legacy Orion references in output ---');
const legacy = /orion|אוריון/i.test(he.html + en.html);
console.log(legacy ? 'FAIL: Orion string found' : 'PASS');

console.log('\n--- Page 6 EN intro (first 120 chars) ---');
console.log(
  (p6en.match(/<p class="sub">([^<]+)/)?.[1] ?? 'MISSING').slice(0, 120),
);

console.log('\n--- EBITDA 2.0M row has data cells ---');
const ebitdaRow = he.html.match(/2\.0M<\/span> ₪<\/td>(.*?)<\/tr>/)?.[1] ?? '';
console.log(ebitdaRow.includes('num') ? 'PASS' : `FAIL: ${ebitdaRow.slice(0, 80)}`);

console.log('\n--- Industry medians derived from comps ---');
console.log(
  `  EBITDA median=${he.data.industryEbitdaMedian} (expected 7.1 from comps)`,
);
console.log(
  `  Revenue median=${he.data.industryRevenueMedian} (expected 1.8 from comps)`,
);
