/** Round 5: writes the V1 report HTML of the 5 golden cases to a folder (default: tmp/round-5-html). */
import fs from 'fs';
import path from 'path';
import { caseHtml, pdfCases, ROOT } from '../../tests/pdf/pdf_harness';

import { GOLDEN5 } from './golden5';

const out = process.argv[2] ?? path.join(ROOT, 'tmp', 'round-5-html');
fs.mkdirSync(out, { recursive: true });
for (const spec of pdfCases().filter((c) => GOLDEN5.includes(c.id))) {
  fs.writeFileSync(path.join(out, `${spec.id}.html`), caseHtml(spec));
  console.log(spec.id);
}
