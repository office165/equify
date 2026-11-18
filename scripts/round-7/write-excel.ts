/** Round 7: writes the Excel appendix of the 5 golden cases (V1) to reports/round-7/excel/. Fictional cases. */
import fs from 'fs';
import path from 'path';
import { buildExcelAppendix } from '../../lib/excel/build_excel_appendix';
import { buildAllCases } from '../../tests/lib/cases';
import { runCase } from '../../tests/lib/run_case';
import { GOLDEN5 } from '../round-5/golden5';

async function main(): Promise<void> {
  process.env.METHOD_V2 = 'off';
  const out = path.join(__dirname, '..', '..', 'reports', 'round-7', 'excel');
  fs.mkdirSync(out, { recursive: true });
  for (const id of GOLDEN5) {
    const d = runCase(buildAllCases().find((c) => c.id === id)!);
    const xl = await buildExcelAppendix(d);
    if (!xl) throw new Error(`no appendix for ${id}`);
    fs.writeFileSync(path.join(out, `${id}.xlsx`), xl.buffer);
    console.log(id, xl.buffer.length, 'bytes, adjustments:', xl.model.fallbacks.length);
  }
}
void main();
