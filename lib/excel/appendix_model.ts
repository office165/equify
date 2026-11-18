/**
 * Round 7 (EXCEL_APPENDIX): the Excel appendix of the report, as a model of sheets and cells.
 * Built from the same ValuationData as the PDF, so the numbers are the report's numbers.
 *
 * Five sheets: הנחות (assumptions), היסטוריה (history), תחזית ו DCF, מכפילים (multiples and the
 * blend), רגישות (sensitivity). Every number lives on the assumptions sheet; the other sheets hold
 * labels and formulas only. Styles: client input in blue, calculation in black, system estimate in
 * yellow with the label "הערכה".
 *
 * Where a formula cannot reproduce the engine exactly (for example the methodology 2 terminal value,
 * or an engine floor), the cell becomes a yellow estimate on the assumptions sheet instead, so the
 * file always matches the report. `fallbacks` lists them; for the methodology 1 golden cases it is
 * empty (tests/suites/round7.ts).
 */
import type { ValuationData } from '../pdf-template/types';
import { FormulaEvaluator, type FormulaSheetSource } from './formula_eval';

export type CellKind = 'title' | 'header' | 'label' | 'note' | 'input' | 'calc' | 'estimate';
export type CellFormat = 'money' | 'pct' | 'mult' | 'factor' | 'num' | 'text';

export interface XCell {
  value?: number | string;
  formula?: string;
  kind: CellKind;
  format?: CellFormat;
}

export interface XSheet {
  name: string;
  cells: Map<string, XCell>;
  widths: number[];
}

export interface AppendixModel {
  sheets: XSheet[];
  currency: string;
  /** Keys of the cells that are estimates because the formula did not match the engine. */
  fallbacks: string[];
  /** Assumption key -> absolute reference (for what-if runs, lib/narrative). */
  assumptionRefs: Map<string, string>;
  /** Addresses of the key numbers, for the tests and for the email check. */
  keys: {
    equity: string;
    ev: string;
    wacc: string;
    dcfEv: string;
    terminalPv: string;
    fcff: string[];
    pv: string[];
    discountFactor: string[];
    netDebt: string;
  };
}

export const SHEET = {
  assumptions: 'הנחות',
  history: 'היסטוריה',
  dcf: 'תחזית ו DCF',
  multiples: 'מכפילים',
  sensitivity: 'רגישות',
} as const;

function ref(sheet: string, addr: string): string {
  return /^[֐-׿A-Za-z_]+$/.test(sheet) ? `${sheet}!${addr}` : `'${sheet}'!${addr}`;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

class SheetBuilder {
  readonly sheet: XSheet;
  row = 1;
  constructor(name: string, widths: number[]) {
    this.sheet = { name, cells: new Map(), widths };
  }
  set(addr: string, cell: XCell): string {
    this.sheet.cells.set(addr, cell);
    return addr;
  }
  title(text: string): void {
    this.set(`A${this.row}`, { value: text, kind: 'title' });
    this.row += 2;
  }
  header(...cols: string[]): void {
    cols.forEach((c, i) => this.set(`${COLS[i]}${this.row}`, { value: c, kind: 'header' }));
    this.row += 1;
  }
  note(text: string): void {
    this.set(`A${this.row}`, { value: text, kind: 'note' });
    this.row += 1;
  }
  gap(): void {
    this.row += 1;
  }
}

interface AssumptionRow {
  key: string;
  label: string;
  value: number;
  kind: 'input' | 'estimate';
  format: CellFormat;
  note?: string;
}

/** The assumptions sheet: label | value | unit or note | type. Returns a map key -> absolute reference. */
class Assumptions {
  readonly b = new SheetBuilder(SHEET.assumptions, [44, 18, 52, 10]);
  readonly refs = new Map<string, string>();
  constructor() {
    this.b.title('הנחות: כל המספרים של הקובץ נמצאים בגיליון הזה');
    this.b.note('כחול: נתון שהוזן באשף. צהוב עם התווית "הערכה": הערכה של המערכת. שחור: חישוב (בגיליונות האחרים).');
    this.b.gap();
  }
  section(title: string): void {
    this.b.set(`A${this.b.row}`, { value: title, kind: 'header' });
    this.b.set(`B${this.b.row}`, { value: 'ערך', kind: 'header' });
    this.b.set(`C${this.b.row}`, { value: 'הסבר', kind: 'header' });
    this.b.set(`D${this.b.row}`, { value: 'סוג', kind: 'header' });
    this.b.row += 1;
  }
  add(r: AssumptionRow): string {
    const row = this.b.row;
    this.b.set(`A${row}`, { value: r.label, kind: 'label' });
    this.b.set(`B${row}`, { value: r.value, kind: r.kind, format: r.format });
    if (r.note) this.b.set(`C${row}`, { value: r.note, kind: 'note' });
    this.b.set(`D${row}`, { value: r.kind === 'input' ? 'קלט' : 'הערכה', kind: r.kind === 'input' ? 'input' : 'estimate', format: 'text' });
    this.b.row += 1;
    const a = ref(SHEET.assumptions, `B${row}`);
    this.refs.set(r.key, a);
    return a;
  }
  get(key: string): string {
    const r = this.refs.get(key);
    if (!r) throw new Error(`assumption ${key} missing`);
    return r;
  }
}

function waccRow(data: ValuationData, re: RegExp): number | undefined {
  return data.waccTable?.find((r) => re.test(r.label))?.pct;
}

/** Engine values the file must reproduce (absolute report currency; WACC as a fraction). */
export function reportTargets(data: ValuationData) {
  return {
    equity: data.equity,
    ev: data.enterpriseValue,
    wacc: data.waccPct / 100,
    dcfEv: data.dcfEv,
    dcfBeforeMarketability: data.dcfMarketableEv ?? data.dcfEv,
    terminalPv: data.terminalPvM * 1e6,
    fcff: data.dcfRows.map((r) => r.fcffM * 1e6),
    pv: data.dcfRows.map((r) => r.pvM * 1e6),
    discountFactor: data.dcfRows.map((r) => r.discountFactor),
    netDebt: data.netDebt,
    ebitdaEv: data.financialCore?.ebitdaMultipleEvAbs ?? data.ebitdaEv,
    revenueEv: data.financialCore?.revenueMultipleEvAbs ?? data.revenueEv ?? 0,
  };
}

export function buildAppendixModel(data: ValuationData): AppendixModel | null {
  const fc = data.financialCore;
  const xi = data.excelInputs;
  if (!fc || !xi || data.dcfRows.length === 0 || !data.waccTable?.length) return null;
  const t = reportTargets(data);
  const A = new Assumptions();
  const fallbacks: string[] = [];

  // Client inputs.
  const history = data.trajectory.filter((p) => !p.forecast);
  A.section('נתוני העסק');
  history.forEach((p, i) => {
    A.add({ key: `rev${i}`, label: `הכנסות ${p.label}`, value: p.revenueM * 1e6, kind: 'input', format: 'money' });
    A.add({ key: `ebitda${i}`, label: `EBITDA ${p.label}`, value: p.ebitdaM * 1e6, kind: 'input', format: 'money' });
  });
  A.add({ key: 'grossDebt', label: 'חוב ברוטו', value: xi.grossDebt, kind: 'input', format: 'money' });
  A.add({ key: 'cash', label: 'מזומן', value: xi.cash, kind: 'input', format: 'money' });
  A.add({ key: 'capex', label: 'רמת השקעות (CAPEX) באחוזים', value: xi.capexPct, kind: 'input', format: 'num', note: 'כמו באשף (4 פירושו 4%)' });
  A.b.gap();

  // WACC estimates (from the page 4 table).
  A.section('עלות ההון (WACC)');
  const rf = waccRow(data, /Rf/) ?? 0;
  const betaRow = data.waccTable.find((r) => /ERP/.test(r.label));
  const bm = betaRow ? /([\d.]+) כפול ERP של ([\d.]+)%/.exec(betaRow.label) : null;
  A.add({ key: 'rf', label: 'ריבית חסרת סיכון (Rf)', value: rf / 100, kind: 'estimate', format: 'pct' });
  let betaErpExpr: string;
  if (bm && betaRow && Math.abs(Number(bm[1]) * Number(bm[2]) - betaRow.pct) < 1e-9) {
    const beta = A.add({ key: 'beta', label: 'בטא ממונפת של הענף', value: Number(bm[1]), kind: 'estimate', format: 'factor' });
    const erp = A.add({ key: 'erp', label: 'פרמיית סיכון שוק (ERP)', value: Number(bm[2]) / 100, kind: 'estimate', format: 'pct' });
    betaErpExpr = `${beta}*${erp}`;
  } else {
    betaErpExpr = A.add({ key: 'betaErp', label: 'בטא כפול פרמיית סיכון שוק', value: (betaRow?.pct ?? 0) / 100, kind: 'estimate', format: 'pct' });
  }
  const size = A.add({ key: 'size', label: 'פרמיית גודל', value: (waccRow(data, /גודל/) ?? 0) / 100, kind: 'estimate', format: 'pct' });
  // Specific premium: its sub rows, and any other component row after them (for example a loss premium).
  const rows = data.waccTable;
  const iSpec = rows.findIndex((r) => /^פרמיה ספציפית/.test(r.label));
  const iKe = rows.findIndex((r) => /Ke/.test(r.label));
  const subRefs: string[] = [];
  const otherRefs: string[] = [];
  rows.slice(iSpec + 1, iKe).forEach((r, i) => {
    if (r.kind === 'sub') subRefs.push(A.add({ key: `spec${i}`, label: `פרמיה ספציפית: ${r.label}`, value: r.pct / 100, kind: 'estimate', format: 'pct' }));
    else otherRefs.push(A.add({ key: `other${i}`, label: r.label, value: r.pct / 100, kind: 'estimate', format: 'pct' }));
  });
  const specificTotal = (rows[iSpec]?.pct ?? 0) / 100;
  const subSum = subRefs.length ? null : A.add({ key: 'specific', label: 'פרמיה ספציפית', value: specificTotal, kind: 'estimate', format: 'pct' });
  const kd = (waccRow(data, /לפני מס/) ?? 0) / 100;
  const taxMatch = rows.find((r) => /אחרי מס/.test(r.label))?.label.match(/\((\d+(?:\.\d+)?)%\)/);
  const tax = taxMatch ? Number(taxMatch[1]) / 100 : 0.23;
  const kdSpread = A.add({ key: 'kdSpread', label: 'מרווח עלות החוב מעל Rf', value: kd - rf / 100, kind: 'estimate', format: 'pct' });
  const taxRef = A.add({ key: 'tax', label: 'שיעור מס חברות', value: tax, kind: 'estimate', format: 'pct' });
  const evWeight = A.add({ key: 'ev', label: 'משקל הון עצמי (E/V)', value: (waccRow(data, /E\/V/) ?? 100) / 100, kind: 'estimate', format: 'pct' });
  A.b.gap();

  // DCF estimates.
  A.section('תחזית ו DCF');
  const fcffRefs = data.dcfRows.map((r, i) =>
    A.add({ key: `fcff${i}`, label: `תזרים חופשי (FCFF) ${r.label}`, value: r.fcffM * 1e6, kind: 'estimate', format: 'money', note: i === 0 ? 'תחזית המערכת, אחרי התאמה לרמת ה CAPEX' : undefined }),
  );
  const midYear = A.add({ key: 'midYear', label: 'מעריך ההיוון בשנה הראשונה', value: 0.5, kind: 'estimate', format: 'num', note: 'היוון לאמצע שנה: 0.5, 1.5, 2.5 וכן הלאה' });
  const g = A.add({ key: 'g', label: 'צמיחה טרמינלית', value: (data.terminalGrowthPct ?? 2.5) / 100, kind: 'estimate', format: 'pct' });
  const minSpread = A.add({ key: 'minSpread', label: 'מרווח מינימלי בין שיעור ההיוון לצמיחה בערך הטרמינלי', value: 0.075, kind: 'estimate', format: 'pct' });
  const dampRate = A.add({ key: 'dampRate', label: 'הפחתת ערך טרמינלי לכל 1% CAPEX', value: 0.03, kind: 'estimate', format: 'pct' });
  const dampFloor = A.add({ key: 'dampFloor', label: 'רצפת מקדם ההפחתה', value: 0.7, kind: 'estimate', format: 'factor' });
  const tvCap = A.add({ key: 'tvCap', label: 'תקרת ערך טרמינלי (חלק מערך התקופה המפורשת)', value: 0.42, kind: 'estimate', format: 'pct' });
  const tvShareCap = A.add({ key: 'tvShareCap', label: 'תקרת חלק הערך הטרמינלי בשווי ה DCF', value: 0.36, kind: 'estimate', format: 'pct' });
  const mkt =
    data.dcfMarketableEv != null && data.dcfMarketableEv > 0
      ? A.add({ key: 'mkt', label: 'מקדם הנחת סחירות על ה DCF', value: data.dcfEv / data.dcfMarketableEv, kind: 'estimate', format: 'factor' })
      : null;
  A.b.gap();

  // Multiples and blend estimates.
  A.section('מכפילים ושקלול');
  const ebitdaBase = A.add({ key: 'ebitdaBase', label: 'EBITDA מנורמל למכפיל', value: fc.multipleLegEbitdaBaseAbs, kind: 'estimate', format: 'money' });
  const ebitdaMult = A.add({ key: 'ebitdaMult', label: 'מכפיל EBITDA של החברה', value: data.effectiveMult, kind: 'estimate', format: 'mult' });
  const revMult = A.add({ key: 'revMult', label: 'מכפיל הכנסות של החברה', value: data.revenueMultiple ?? 0, kind: 'estimate', format: 'mult' });
  const wD = A.add({ key: 'wD', label: 'משקל DCF', value: fc.blendWeights.dcf, kind: 'estimate', format: 'pct' });
  const wE = A.add({ key: 'wE', label: 'משקל מכפיל EBITDA', value: fc.blendWeights.ebitda, kind: 'estimate', format: 'pct' });
  const wR = A.add({ key: 'wR', label: 'משקל מכפיל הכנסות', value: fc.blendWeights.rev, kind: 'estimate', format: 'pct' });
  const backlog = A.add({ key: 'backlog', label: 'תוספת צבר הזמנות לשווי הפעילות', value: fc.backlogEvAdjustmentAbs ?? 0, kind: 'estimate', format: 'money' });
  const nonOp = A.add({ key: 'nonOp', label: 'נכסים שלא בפעילות', value: data.nonOperatingAssets?.value ?? 0, kind: 'estimate', format: 'money' });
  A.b.gap();

  A.section('רגישות');
  const sWacc = A.add({ key: 'sWacc', label: 'צעד WACC בטבלת הרגישות', value: 0.01, kind: 'estimate', format: 'pct' });
  const sG = A.add({ key: 'sG', label: 'צעד צמיחה טרמינלית בטבלת הרגישות', value: 0.005, kind: 'estimate', format: 'pct' });
  const sEbitda = A.add({ key: 'sEbitda', label: 'צעד EBITDA בטבלת הרגישות', value: 0.1, kind: 'estimate', format: 'pct' });
  const sMult = A.add({ key: 'sMult', label: 'צעד מכפיל בטבלת הרגישות', value: 0.5, kind: 'estimate', format: 'mult' });
  A.b.gap();
  A.section('התאמות (רק כשנוסחה לא משחזרת את המנוע)');
  const fallbackStart = A.b.row;

  // History sheet.
  const H = new SheetBuilder(SHEET.history, [16, 18, 18, 14, 14]);
  H.title('היסטוריה');
  H.header('שנה', 'הכנסות', 'EBITDA', 'שיעור EBITDA', 'צמיחה בהכנסות');
  history.forEach((p, i) => {
    const r = H.row;
    H.set(`A${r}`, { value: p.label, kind: 'label' });
    H.set(`B${r}`, { formula: A.get(`rev${i}`), kind: 'calc', format: 'money' });
    H.set(`C${r}`, { formula: A.get(`ebitda${i}`), kind: 'calc', format: 'money' });
    H.set(`D${r}`, { formula: `IF(B${r}=0,0,C${r}/B${r})`, kind: 'calc', format: 'pct' });
    if (i > 0) H.set(`E${r}`, { formula: `IF(B${r - 1}=0,0,B${r}/B${r - 1}-1)`, kind: 'calc', format: 'pct' });
    H.row += 1;
  });
  H.gap();
  const ndRow = H.row;
  H.set(`A${ndRow}`, { value: 'חוב נטו (חוב ברוטו פחות מזומן)', kind: 'label' });
  H.set(`B${ndRow}`, { formula: `${A.get('grossDebt')}-${A.get('cash')}`, kind: 'calc', format: 'money' });
  const netDebtRef = ref(SHEET.history, `B${ndRow}`);

  // DCF sheet.
  const D = new SheetBuilder(SHEET.dcf, [36, 16, 16, 16, 16, 16, 16]);
  D.title('עלות ההון ו DCF');
  D.header('רכיב', 'שיעור');
  const line = (label: string, formula: string, format: CellFormat = 'pct'): string => {
    const r = D.row;
    D.set(`A${r}`, { value: label, kind: 'label' });
    D.set(`B${r}`, { formula, kind: 'calc', format });
    D.row += 1;
    return `B${r}`;
  };
  const cRf = line('ריבית חסרת סיכון (Rf)', A.get('rf'));
  const cBe = line('בטא כפול ERP', betaErpExpr);
  const cSize = line('פרמיית גודל', size);
  const cSpec = line('פרמיה ספציפית', subRefs.length ? `SUM(${subRefs.join(',')})` : subSum!);
  const cOthers = otherRefs.map((o, i) => line(rows.slice(iSpec + 1, iKe).filter((r) => r.kind !== 'sub')[i]!.label, o));
  const cKe = line('עלות הון עצמי (Ke)', [cRf, cBe, cSize, cSpec, ...cOthers].join('+'));
  const cKd = line('עלות חוב לפני מס (Kd)', `${A.get('rf')}+${kdSpread}`);
  const cKdAt = line('עלות חוב אחרי מס', `${cKd}*(1-${taxRef})`);
  const cEv = line('משקל הון עצמי (E/V)', evWeight);
  const cDv = line('משקל חוב (D/V)', `1-${cEv}`);
  let waccFormula = `${cKe}*${cEv}+${cKdAt}*${cDv}`;
  const cWacc = `B${D.row}`;
  D.set(`A${D.row}`, { value: 'WACC', kind: 'label' });
  D.set(cWacc, { formula: waccFormula, kind: 'calc', format: 'pct' });
  D.row += 2;
  const W = ref(SHEET.dcf, cWacc).replace(/^.*!/, '');

  D.header('תזרים', ...data.dcfRows.map((r) => r.label), 'טרמינלי');
  const yearCols = data.dcfRows.map((_, i) => COLS[i + 1]!);
  const last = yearCols.at(-1)!;
  const tCol = COLS[yearCols.length + 1]!;
  const rFcff = D.row++;
  const rExp = D.row++;
  const rDf = D.row++;
  const rPv = D.row++;
  D.set(`A${rFcff}`, { value: 'FCFF', kind: 'label' });
  D.set(`A${rExp}`, { value: 'מעריך היוון (אמצע שנה)', kind: 'label' });
  D.set(`A${rDf}`, { value: 'פקטור היוון', kind: 'label' });
  D.set(`A${rPv}`, { value: 'שווי נוכחי', kind: 'label' });
  yearCols.forEach((c, i) => {
    D.set(`${c}${rFcff}`, { formula: fcffRefs[i]!, kind: 'calc', format: 'money' });
    D.set(`${c}${rExp}`, { formula: i === 0 ? midYear : `${yearCols[i - 1]}${rExp}+1`, kind: 'calc', format: 'num' });
    D.set(`${c}${rDf}`, { formula: `1/(1+${W})^${c}${rExp}`, kind: 'calc', format: 'factor' });
    D.set(`${c}${rPv}`, { formula: `${c}${rFcff}*${c}${rDf}`, kind: 'calc', format: 'money' });
  });
  D.row += 1;
  const dl = (label: string, formula: string, format: CellFormat = 'money'): string => {
    const r = D.row;
    D.set(`A${r}`, { value: label, kind: 'label' });
    D.set(`B${r}`, { formula, kind: 'calc', format });
    D.row += 1;
    return `B${r}`;
  };
  const cSumPv = dl('סך השווי הנוכחי של התקופה המפורשת', `SUM(${yearCols[0]}${rPv}:${last}${rPv})`);
  const gRef = A.get('g');
  const cGordon = dl('ערך טרמינלי לפי Gordon (סוף שנה 5)', `${last}${rFcff}*(1+${gRef})/(MAX(${W},${gRef}+${minSpread})-${gRef})*MAX(${dampFloor},1-${A.get('capex')}*${dampRate})`);
  const cGordonPv = dl('ערך טרמינלי מהוון', `${cGordon}/(1+${W})^${last}${rExp}`);
  const cCap = dl('תקרה: חלק מערך התקופה המפורשת', `${tvCap}*${cSumPv}`);
  const cTvc = dl('ערך טרמינלי אחרי תקרה', `MIN(${cGordonPv},${cCap})`);
  let tvFormula = `IF(${cTvc}/(${cSumPv}+${cTvc})>${tvShareCap},${tvShareCap}*(${cSumPv}+${cTvc}),${cTvc})`;
  const cTv = dl('ערך טרמינלי בשווי (אחרי תקרת חלק)', tvFormula);
  D.set(`${tCol}${rPv}`, { formula: cTv, kind: 'calc', format: 'money' });
  D.set(`${tCol}${rFcff}`, { formula: `${last}${rFcff}`, kind: 'calc', format: 'money' });
  const cDcfPre = dl(mkt ? 'שווי DCF לפני הנחת סחירות' : 'שווי פעילות לפי DCF', `${cSumPv}+${cTv}`);
  const cDcf = mkt ? dl('שווי פעילות לפי DCF (אחרי הנחת סחירות)', `${cDcfPre}*${mkt}`) : cDcfPre;
  const cShare = dl('חלק הערך הטרמינלי בשווי ה DCF', `IF(${cDcfPre}=0,0,${cTv}/${cDcfPre})`, 'pct');
  void cShare;

  // Multiples sheet.
  const M = new SheetBuilder(SHEET.multiples, [36, 18, 14, 18]);
  M.title('מכפילים ושווי משולב');
  const ml = (label: string, formula: string, format: CellFormat = 'money', col = 'B'): string => {
    const r = M.row;
    M.set(`A${r}`, { value: label, kind: 'label' });
    M.set(`${col}${r}`, { formula, kind: 'calc', format });
    M.row += 1;
    return `${col}${r}`;
  };
  const mBase = ml('EBITDA מנורמל למכפיל', ebitdaBase);
  const mMult = ml('מכפיל EBITDA', ebitdaMult, 'mult');
  const mEbitdaEv = ml('שווי לפי מכפיל EBITDA', `ROUND(MAX(0,${mBase}*${mMult}),-1)`);
  const lastRev = A.get(`rev${history.length - 1}`);
  const mRev = ml(`הכנסות ${history.at(-1)?.label ?? ''}`, lastRev);
  const mRevMult = ml('מכפיל הכנסות', revMult, 'mult');
  const mRevEv = ml('שווי לפי מכפיל הכנסות', `${mRev}*${mRevMult}`);
  M.gap();
  M.header('שיטה', 'שווי פעילות', 'משקל', 'תרומה');
  const dcfRef = ref(SHEET.dcf, cDcf);
  const blendRow = (label: string, evExpr: string, wRef: string): string => {
    const r = M.row;
    M.set(`A${r}`, { value: label, kind: 'label' });
    M.set(`B${r}`, { formula: evExpr, kind: 'calc', format: 'money' });
    M.set(`C${r}`, { formula: wRef, kind: 'calc', format: 'pct' });
    M.set(`D${r}`, { formula: `B${r}*C${r}`, kind: 'calc', format: 'money' });
    M.row += 1;
    return `D${r}`;
  };
  const c1 = blendRow('DCF', dcfRef, wD);
  const c2 = blendRow('מכפיל EBITDA', mEbitdaEv, wE);
  const c3 = blendRow('מכפיל הכנסות', mRevEv, wR);
  const mBacklog = ml('תוספת צבר הזמנות', backlog, 'money', 'D');
  let evFormula = `ROUND(${c1}+${c2}+${c3}+${mBacklog},-1)`;
  const mEv = ml('שווי פעילות משולב (EV)', evFormula, 'money', 'D');
  const mNd = ml('חוב נטו', netDebtRef, 'money', 'D');
  const mNonOp = ml('נכסים שלא בפעילות', nonOp, 'money', 'D');
  let eqFormula = `MAX(0,${mEv}-${mNd}+${mNonOp})`;
  const mEq = ml('שווי לבעלים', eqFormula, 'money', 'D');

  // Sensitivity sheet (formula version: only the named inputs move; see the note).
  const S = new SheetBuilder(SHEET.sensitivity, [26, 15, 15, 15, 15, 15]);
  S.title('רגישות: שווי לבעלים');
  S.note('בגיליון הזה כל תא מחשב מחדש בנוסחה רק את מה שבכותרות (DCF בטבלה הראשונה, מכפיל EBITDA בשנייה), ושאר השיטות קבועות.');
  S.note('בדוח כל תא הוא הרצה מלאה של המנוע, ולכן ייתכנו הבדלים קטנים בין הטבלאות.');
  S.gap();
  const Wabs = ref(SHEET.dcf, cWacc);
  const fc0 = (i: number) => ref(SHEET.dcf, `${yearCols[i]}${rFcff}`);
  const ex0 = (i: number) => ref(SHEET.dcf, `${yearCols[i]}${rExp}`);
  const dcfAt = (w: string, gg: string): string => {
    const pvs = yearCols.map((_, i) => `${fc0(i)}/(1+${w})^${ex0(i)}`).join('+');
    const sumPv = `(${pvs})`;
    const gordon = `${fc0(yearCols.length - 1)}*(1+${gg})/(MAX(${w},${gg}+${minSpread})-${gg})*MAX(${dampFloor},1-${A.get('capex')}*${dampRate})/(1+${w})^${ex0(yearCols.length - 1)}`;
    const tvc = `MIN(${gordon},${tvCap}*${sumPv})`;
    const tv = `IF(${tvc}/(${sumPv}+${tvc})>${tvShareCap},${tvShareCap}*(${sumPv}+${tvc}),${tvc})`;
    return `(${sumPv}+${tv})${mkt ? `*${mkt}` : ''}`;
  };
  const rest = (ebitdaEvExpr: string) => `${ebitdaEvExpr}*${wE}+${ref(SHEET.multiples, mRevEv)}*${wR}+${backlog}`;
  const equityFrom = (dcfExpr: string, ebitdaEvExpr: string) =>
    `MAX(0,ROUND(${dcfExpr}*${wD}+${rest(ebitdaEvExpr)},-1)-${netDebtRef}+${nonOp})`;

  // Table 1: WACC (columns) x terminal growth (rows).
  const h1 = S.row;
  S.set(`A${h1}`, { value: 'צמיחה טרמינלית \\ WACC', kind: 'header' });
  S.set(`D${h1}`, { formula: Wabs, kind: 'calc', format: 'pct' });
  S.set(`C${h1}`, { formula: `D${h1}-${sWacc}`, kind: 'calc', format: 'pct' });
  S.set(`B${h1}`, { formula: `C${h1}-${sWacc}`, kind: 'calc', format: 'pct' });
  S.set(`E${h1}`, { formula: `D${h1}+${sWacc}`, kind: 'calc', format: 'pct' });
  S.set(`F${h1}`, { formula: `E${h1}+${sWacc}`, kind: 'calc', format: 'pct' });
  const gRows = [h1 + 1, h1 + 2, h1 + 3, h1 + 4, h1 + 5];
  S.set(`A${gRows[2]}`, { formula: gRef, kind: 'calc', format: 'pct' });
  S.set(`A${gRows[1]}`, { formula: `A${gRows[2]}+${sG}`, kind: 'calc', format: 'pct' });
  S.set(`A${gRows[0]}`, { formula: `A${gRows[1]}+${sG}`, kind: 'calc', format: 'pct' });
  S.set(`A${gRows[3]}`, { formula: `A${gRows[2]}-${sG}`, kind: 'calc', format: 'pct' });
  S.set(`A${gRows[4]}`, { formula: `A${gRows[3]}-${sG}`, kind: 'calc', format: 'pct' });
  for (const r of gRows) {
    for (const c of ['B', 'C', 'D', 'E', 'F']) {
      S.set(`${c}${r}`, { formula: equityFrom(dcfAt(`${c}$${h1}`, `$A${r}`), ref(SHEET.multiples, mEbitdaEv)), kind: 'calc', format: 'money' });
    }
  }
  S.row = h1 + 7;

  // Table 2: EBITDA (rows) x EBITDA multiple (columns).
  const h2 = S.row;
  S.set(`A${h2}`, { value: 'EBITDA \\ מכפיל', kind: 'header' });
  S.set(`D${h2}`, { formula: ebitdaMult, kind: 'calc', format: 'mult' });
  S.set(`C${h2}`, { formula: `D${h2}-${sMult}`, kind: 'calc', format: 'mult' });
  S.set(`B${h2}`, { formula: `C${h2}-${sMult}`, kind: 'calc', format: 'mult' });
  S.set(`E${h2}`, { formula: `D${h2}+${sMult}`, kind: 'calc', format: 'mult' });
  S.set(`F${h2}`, { formula: `E${h2}+${sMult}`, kind: 'calc', format: 'mult' });
  const eRows = [h2 + 1, h2 + 2, h2 + 3, h2 + 4, h2 + 5];
  S.set(`A${eRows[2]}`, { formula: ebitdaBase, kind: 'calc', format: 'money' });
  S.set(`A${eRows[1]}`, { formula: `A${eRows[2]}*(1-${sEbitda})`, kind: 'calc', format: 'money' });
  S.set(`A${eRows[0]}`, { formula: `A${eRows[2]}*(1-${sEbitda}-${sEbitda})`, kind: 'calc', format: 'money' });
  S.set(`A${eRows[3]}`, { formula: `A${eRows[2]}*(1+${sEbitda})`, kind: 'calc', format: 'money' });
  S.set(`A${eRows[4]}`, { formula: `A${eRows[2]}*(1+${sEbitda}+${sEbitda})`, kind: 'calc', format: 'money' });
  for (const r of eRows) {
    for (const c of ['B', 'C', 'D', 'E', 'F']) {
      S.set(`${c}${r}`, { formula: equityFrom(dcfRef, `ROUND(MAX(0,$A${r}*${c}$${h2}),-1)`), kind: 'calc', format: 'money' });
    }
  }

  const sheets = [A.b.sheet, H.sheet, D.sheet, M.sheet, S.sheet];
  const model: AppendixModel = {
    sheets,
    currency: data.currency ?? 'ILS',
    fallbacks,
    assumptionRefs: A.refs,
    keys: {
      equity: ref(SHEET.multiples, mEq),
      ev: ref(SHEET.multiples, mEv),
      wacc: ref(SHEET.dcf, cWacc),
      dcfEv: ref(SHEET.dcf, cDcf),
      terminalPv: ref(SHEET.dcf, cTv),
      fcff: yearCols.map((c) => ref(SHEET.dcf, `${c}${rFcff}`)),
      pv: yearCols.map((c) => ref(SHEET.dcf, `${c}${rPv}`)),
      discountFactor: yearCols.map((c) => ref(SHEET.dcf, `${c}${rDf}`)),
      netDebt: netDebtRef,
    },
  };

  // Fallbacks: where the formula does not reproduce the engine, add a yellow adjustment on the
  // assumptions sheet and include it in the formula, so the file still matches the report.
  A.b.row = fallbackStart;
  const adjust = (key: string, label: string, cellSheet: XSheet, addr: string, target: number, tol: number, makeFormula: (adj: string) => string) => {
    const v = evaluateModel(model).value(cellSheet.name, addr);
    if (Math.abs(v - target) <= tol) return;
    const adj = A.add({ key, label, value: target - v, kind: 'estimate', format: key === 'waccAdj' ? 'pct' : 'money', note: 'הפרש בין הנוסחה לבין המנוע' });
    cellSheet.cells.set(addr, { ...cellSheet.cells.get(addr)!, formula: makeFormula(adj) });
    fallbacks.push(key);
  };
  adjust('waccAdj', 'התאמת WACC', D.sheet, cWacc, t.wacc, 1e-12, (adj) => (waccFormula = `${waccFormula}+${adj}`));
  if (data.methodVersion === 'v2') {
    // Methodology 2 (T1) uses a normalized terminal year without caps: the terminal value is an estimate.
    const tvV2 = A.add({ key: 'tvV2', label: 'ערך טרמינלי מהוון (מתודולוגיה 2)', value: t.terminalPv, kind: 'estimate', format: 'money', note: 'Gordon על שנה טרמינלית מנורמלת, בלי תקרה' });
    D.sheet.cells.set(cTv, { ...D.sheet.cells.get(cTv)!, formula: tvV2 });
    fallbacks.push('tvV2');
  }
  adjust('tvAdj', 'התאמת ערך טרמינלי', D.sheet, cTv, t.terminalPv, 0.5, (adj) => (tvFormula = `${tvFormula}+${adj}`));
  adjust('evAdj', 'התאמת שווי פעילות', M.sheet, mEv, t.ev, 0.5, (adj) => (evFormula = `${evFormula}+${adj}`));
  adjust('eqAdj', 'התאמת שווי לבעלים', M.sheet, mEq, t.equity, 0.5, (adj) => (eqFormula = `${eqFormula}+${adj}`));
  if (fallbacks.length === 0) A.b.set(`A${fallbackStart}`, { value: 'אין התאמות: כל הנוסחאות משחזרות את המנוע', kind: 'note' });
  return model;
}

export function modelSource(model: AppendixModel): FormulaSheetSource {
  const byName = new Map(model.sheets.map((s) => [s.name, s]));
  return {
    get(sheet, addr) {
      const c = byName.get(sheet)?.cells.get(addr);
      if (!c) return undefined;
      if (c.formula) return { formula: c.formula };
      return c.value ?? null;
    },
  };
}

export function evaluateModel(model: AppendixModel, overrides?: Map<string, number>): FormulaEvaluator {
  const base = modelSource(model);
  if (!overrides?.size) return new FormulaEvaluator(base);
  return new FormulaEvaluator({
    get(sheet, addr) {
      const o = overrides.get(`${sheet}!${addr}`);
      return o !== undefined ? o : base.get(sheet, addr);
    },
  });
}

/** Splits "Sheet!A1" or "'Sheet name'!A1". */
export function splitRef(r: string): { sheet: string; addr: string } {
  const m = /^'?(.+?)'?!(\$?[A-Z]+\$?\d+)$/.exec(r);
  if (!m) throw new Error(`bad reference ${r}`);
  return { sheet: m[1]!, addr: m[2]!.replace(/\$/g, '') };
}
