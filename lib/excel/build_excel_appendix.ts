/**
 * Round 7 (EXCEL_APPENDIX): writes the appendix model (lib/excel/appendix_model.ts) to an .xlsx file.
 * Each formula cell also carries its computed value, so a viewer that does not recalculate (a mail
 * preview, a phone) shows the same numbers, and Excel recalculates everything on open.
 */
import ExcelJS from 'exceljs';
import type { ValuationData } from '../pdf-template/types';
import { buildAppendixModel, evaluateModel, type AppendixModel, type CellFormat, type XCell } from './appendix_model';

/** EXCEL_APPENDIX=on attaches the file to the report email. Off by default. */
export function isExcelAppendixEnabled(value = process.env.EXCEL_APPENDIX): boolean {
  return value?.trim().toLowerCase() === 'on';
}

const BLUE = 'FF0000FF';
const BLACK = 'FF000000';
const YELLOW = 'FFFFF2CC';
const HEADER = 'FFE8F4F2';

function numFmt(format: CellFormat | undefined, currency: string): string | undefined {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
  switch (format) {
    case 'money': return `#,##0 "${sym}";-#,##0 "${sym}"`;
    case 'pct': return '0.00%';
    case 'mult': return '0.00"×"';
    case 'factor': return '0.0000';
    case 'num': return '0.0';
    default: return undefined;
  }
}

function styleCell(cell: ExcelJS.Cell, x: XCell, currency: string): void {
  const fmt = numFmt(x.format, currency);
  if (fmt) cell.numFmt = fmt;
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl', wrapText: x.kind === 'note' };
  if (x.kind === 'title') cell.font = { bold: true, size: 14, color: { argb: BLACK } };
  else if (x.kind === 'header') {
    cell.font = { bold: true, color: { argb: BLACK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER } };
  } else if (x.kind === 'input') cell.font = { color: { argb: BLUE } };
  else if (x.kind === 'estimate') {
    cell.font = { color: { argb: BLACK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } };
  } else if (x.kind === 'note') cell.font = { italic: true, size: 9, color: { argb: 'FF555555' } };
  else cell.font = { color: { argb: BLACK } };
}

export async function writeAppendixXlsx(model: AppendixModel): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'equify BY SBC';
  wb.created = new Date(0);
  wb.calcProperties.fullCalcOnLoad = true;
  const ev = evaluateModel(model);
  for (const s of model.sheets) {
    const ws = wb.addWorksheet(s.name, { views: [{ rightToLeft: true }] });
    s.widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });
    for (const [addr, x] of s.cells) {
      const cell = ws.getCell(addr);
      if (x.formula) cell.value = { formula: x.formula, result: ev.value(s.name, addr) } as ExcelJS.CellFormulaValue;
      else cell.value = x.value ?? null;
      styleCell(cell, x, model.currency);
    }
  }
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/** The appendix for one report, or null when the report data has no DCF table or inputs. */
export async function buildExcelAppendix(data: ValuationData): Promise<{ buffer: Buffer; model: AppendixModel } | null> {
  const model = buildAppendixModel(data);
  if (!model) return null;
  return { buffer: await writeAppendixXlsx(model), model };
}

export const EXCEL_APPENDIX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** File name next to the PDF: same base name, .xlsx. */
export function appendixFilename(pdfFilename: string): string {
  return pdfFilename.replace(/\.pdf$/i, '') + ' נספח.xlsx';
}
