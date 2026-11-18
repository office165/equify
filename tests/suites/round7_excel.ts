/**
 * Round 7, Excel appendix (EXCEL_APPENDIX).
 *   golden-*: for the 5 golden cases (methodology 1) the formulas, computed with
 *     lib/excel/formula_eval.ts, give the report's equity, EV, WACC, DCF EV, terminal value, net debt,
 *     and every DCF row (FCFF, discount factor, present value), to the shekel (WACC to 1e-9).
 *     No adjustment rows are needed: every key number is a live formula.
 *   all-cases: every one of the 385 cases builds and matches the report (adjustment rows allowed).
 *   no-hard-numbers: outside the assumptions sheet every cell is text or a formula, and the only
 *     numbers inside formulas are 0 and 1 (structure, like 1+WACC or ROUND(x,-1)).
 *   xlsx: the written file opens again, has the 5 sheets, the key formulas, the cached values, blue
 *     inputs and yellow estimates labelled "הערכה".
 *   email: with the flag off the email has the PDF only; with it on, the PDF and the .xlsx.
 */
import ExcelJS from 'exceljs';
import { buildAppendixModel, evaluateModel, reportTargets, SHEET, splitRef } from '../../lib/excel/appendix_model';
import { buildExcelAppendix } from '../../lib/excel/build_excel_appendix';
import { formulaLiterals } from '../../lib/excel/formula_eval';
import { buildCustomerReportAttachments } from '../../lib/reports/send_customer_report';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import { buildAllCases } from '../lib/cases';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { runCase } from '../lib/run_case';

export const GOLDEN5 = ['golden-restaurant', 'golden-boutique-hotel', 'golden-b2b-saas', 'golden-manufacturing', 'golden-large-industrial'];

function withFlag<T>(on: boolean, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.EXCEL_APPENDIX;
  process.env.EXCEL_APPENDIX = on ? 'on' : 'off';
  return fn().finally(() => {
    if (prev === undefined) delete process.env.EXCEL_APPENDIX;
    else process.env.EXCEL_APPENDIX = prev;
  });
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round7-excel');
  const v1 = resolveMethodVersion() === 'v1';
  for (const spec of buildAllCases()) {
    const d = runCase(spec);
    const m = buildAppendixModel(d);
    if (!s.check('builds', spec.id, m != null)) continue;
    const ev = evaluateModel(m!);
    const t = reportTargets(d);
    const v = (r: string) => {
      const x = splitRef(r);
      return ev.value(x.sheet, x.addr);
    };
    const golden = v1 && GOLDEN5.includes(spec.id);
    const id = golden ? `golden ${spec.id}` : spec.id;
    const pairs: Array<[string, number, number, number]> = [
      ['equity', v(m!.keys.equity), t.equity, 0.5],
      ['ev', v(m!.keys.ev), t.ev, 0.5],
      ['wacc', v(m!.keys.wacc), t.wacc, 1e-9],
      ['dcf-ev', v(m!.keys.dcfEv), t.dcfEv, 0.5],
      ['terminal-pv', v(m!.keys.terminalPv), t.terminalPv, 0.5],
      ['net-debt', v(m!.keys.netDebt), t.netDebt, 0.5],
      ...m!.keys.fcff.map((r, i) => [`fcff ${i + 1}`, v(r), t.fcff[i]!, 0.5] as [string, number, number, number]),
      ...m!.keys.pv.map((r, i) => [`pv ${i + 1}`, v(r), t.pv[i]!, 0.5] as [string, number, number, number]),
      ...m!.keys.discountFactor.map((r, i) => [`df ${i + 1}`, v(r), t.discountFactor[i]!, 1e-12] as [string, number, number, number]),
    ];
    const bad = pairs.filter(([, got, want, tol]) => !(Math.abs(got - want) <= tol)).map(([k, got, want]) => `${k}: ${got} vs ${want}`);
    s.check(golden ? 'golden-matches-report' : 'matches-report', id, bad.length === 0, bad.join('; '));
    if (golden) s.check('golden-no-adjustments', id, m!.fallbacks.length === 0, m!.fallbacks.join(','));
    // Every formula evaluates (the sensitivity sheet too).
    let evalErr = '';
    for (const sh of m!.sheets) {
      for (const [a, c] of sh.cells) {
        if (!c.formula) continue;
        try { ev.value(sh.name, a); } catch (e) { evalErr = `${sh.name}!${a}: ${(e as Error).message}`; break; }
      }
      if (evalErr) break;
    }
    s.check('formulas-evaluate', id, !evalErr, evalErr);
    // No hard numbers outside the assumptions sheet.
    const hard: string[] = [];
    for (const sh of m!.sheets) {
      if (sh.name === SHEET.assumptions) continue;
      for (const [a, c] of sh.cells) {
        if (!c.formula && typeof c.value === 'number') hard.push(`${sh.name}!${a}=${c.value}`);
        if (c.formula) for (const n of formulaLiterals(c.formula)) if (n !== 0 && n !== 1) hard.push(`${sh.name}!${a} has ${n}`);
      }
    }
    s.check('no-hard-numbers', id, hard.length === 0, hard.slice(0, 3).join('; '));
  }

  // The written file, for the golden cases.
  for (const id of v1 ? GOLDEN5 : []) {
    const spec = buildAllCases().find((c) => c.id === id)!;
    const d = runCase(spec);
    const xl = await buildExcelAppendix(d);
    if (!s.check('xlsx-built', id, xl != null)) continue;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xl!.buffer as unknown as ArrayBuffer);
    const names = wb.worksheets.map((w) => w.name);
    s.check('xlsx-sheets', id, Object.values(SHEET).every((n) => names.includes(n)) && names.length === 5, names.join(','));
    const cellAt = (r: string) => {
      const x = splitRef(r);
      return wb.getWorksheet(x.sheet)!.getCell(x.addr);
    };
    const eq = cellAt(xl!.model.keys.equity).value as ExcelJS.CellFormulaValue;
    s.check('xlsx-equity-formula', id, typeof eq?.formula === 'string' && Math.abs(Number(eq.result) - d.equity) <= 0.5, JSON.stringify(eq));
    const w = cellAt(xl!.model.keys.wacc).value as ExcelJS.CellFormulaValue;
    s.check('xlsx-wacc-formula', id, typeof w?.formula === 'string' && Math.abs(Number(w.result) - d.waccPct / 100) < 1e-9);
    const as = wb.getWorksheet(SHEET.assumptions)!;
    let blue = 0;
    let yellow = 0;
    let labelled = 0;
    as.eachRow((row) => {
      const b = row.getCell(2);
      const kind = String(row.getCell(4).value ?? '');
      if (typeof b.value !== 'number') return;
      if (kind === 'קלט' && b.font?.color?.argb === 'FF0000FF') blue += 1;
      if (kind === 'הערכה') {
        labelled += 1;
        if ((b.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb === 'FFFFF2CC') yellow += 1;
      }
    });
    s.check('xlsx-colors', id, blue >= 5 && yellow === labelled && yellow > 10, `blue ${blue}, yellow ${yellow}/${labelled}`);
    s.check('xlsx-rtl', id, wb.worksheets.every((ws) => ws.views?.[0]?.rightToLeft === true));
  }

  // Email attachments.
  const d0 = runCase(buildAllCases().find((c) => c.id === 'golden-restaurant')!);
  const pdf = Buffer.from('%PDF-test');
  const off = await withFlag(false, () => buildCustomerReportAttachments(pdf, 'report.pdf', d0));
  s.check('email-flag-off', 'pdf-only', off.length === 1 && off[0]!.contentType === 'application/pdf' && off[0]!.content === pdf);
  const on = await withFlag(true, () => withQuietConsole(() => buildCustomerReportAttachments(pdf, 'report.pdf', d0)));
  s.check('email-flag-on', 'pdf-and-xlsx', on.length === 2 && on[1]!.filename.endsWith('.xlsx') && on[1]!.content.length > 5000, on.map((a) => a.filename).join(','));
  return s.result;
}
