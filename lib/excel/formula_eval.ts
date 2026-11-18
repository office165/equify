/**
 * Round 7: a small evaluator for the formulas the Excel appendix writes (lib/excel/appendix_model.ts).
 * It is used to put the computed value next to each formula in the file (so a viewer that does not
 * recalculate still shows numbers) and, in the tests, to check the file against the report.
 *
 * Supported: numbers, cell references (A1, $A$1, Sheet!A1, 'Sheet name'!A1), ranges inside functions,
 * + - * / ^, unary minus, parentheses, comparisons (> < >= <= = <>), and SUM, MIN, MAX, ROUND, IF, ABS.
 * Anything else throws, so a formula the evaluator cannot read fails the tests instead of passing.
 */

export type CellValue = number | string | null;

export interface FormulaSheetSource {
  /** Literal value or formula ("=..."), by sheet and address. */
  get(sheet: string, addr: string): CellValue | { formula: string } | undefined;
}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'ref'; sheet: string | null; addr: string }
  | { t: 'range'; sheet: string | null; from: string; to: string }
  | { t: 'fn'; name: string }
  | { t: 'op'; v: string }
  | { t: '(' }
  | { t: ')' }
  | { t: ',' };

const CELL = /^\$?([A-Z]{1,3})\$?(\d+)/;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === ' ') { i += 1; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(src.slice(i))!;
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    let sheet: string | null = null;
    let rest = src.slice(i);
    if (c === "'") {
      const end = src.indexOf("'!", i + 1);
      if (end < 0) throw new Error(`bad sheet name in ${src}`);
      sheet = src.slice(i + 1, end);
      i = end + 2;
      rest = src.slice(i);
    } else {
      const sm = /^([A-Za-z֐-׿_][A-Za-z0-9֐-׿_]*)!/.exec(rest);
      if (sm) {
        sheet = sm[1]!;
        i += sm[0].length;
        rest = src.slice(i);
      }
    }
    const cm = CELL.exec(rest);
    if (cm && !/^[A-Z]+\(/.test(rest)) {
      const a = `${cm[1]}${cm[2]}`;
      i += cm[0].length;
      const after = src.slice(i);
      const rm = /^:\$?([A-Z]{1,3})\$?(\d+)/.exec(after);
      if (rm) {
        out.push({ t: 'range', sheet, from: a, to: `${rm[1]}${rm[2]}` });
        i += rm[0].length;
      } else {
        out.push({ t: 'ref', sheet, addr: a });
      }
      continue;
    }
    if (sheet) throw new Error(`sheet without cell in ${src}`);
    const fm = /^([A-Z]+)\(/.exec(rest);
    if (fm) { out.push({ t: 'fn', name: fm[1]! }); out.push({ t: '(' }); i += fm[0].length; continue; }
    const two = src.slice(i, i + 2);
    if (two === '>=' || two === '<=' || two === '<>') { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/^<>='.includes(c)) { out.push({ t: 'op', v: c }); i += 1; continue; }
    if (c === '(') { out.push({ t: '(' }); i += 1; continue; }
    if (c === ')') { out.push({ t: ')' }); i += 1; continue; }
    if (c === ',') { out.push({ t: ',' }); i += 1; continue; }
    throw new Error(`unexpected "${c}" in ${src}`);
  }
  return out;
}

function colNum(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function colName(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function expandRange(from: string, to: string): string[] {
  const a = /^([A-Z]+)(\d+)$/.exec(from)!;
  const b = /^([A-Z]+)(\d+)$/.exec(to)!;
  const out: string[] = [];
  for (let r = Number(a[2]); r <= Number(b[2]); r += 1) {
    for (let c = colNum(a[1]!); c <= colNum(b[1]!); c += 1) out.push(`${colName(c)}${r}`);
  }
  return out;
}

type Val = number | number[];

export class FormulaEvaluator {
  private cache = new Map<string, number>();
  private stack = new Set<string>();

  constructor(private readonly src: FormulaSheetSource) {}

  value(sheet: string, addr: string): number {
    const key = `${sheet}!${addr}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    if (this.stack.has(key)) throw new Error(`circular reference at ${key}`);
    const cell = this.src.get(sheet, addr);
    let v: number;
    if (cell == null || cell === '') v = 0;
    else if (typeof cell === 'number') v = cell;
    else if (typeof cell === 'string') throw new Error(`${key} is text ("${cell}") but is used as a number`);
    else {
      this.stack.add(key);
      try {
        v = this.evaluate(cell.formula.replace(/^=/, ''), sheet);
      } finally {
        this.stack.delete(key);
      }
    }
    if (!Number.isFinite(v)) throw new Error(`${key} is not a finite number`);
    this.cache.set(key, v);
    return v;
  }

  evaluate(formula: string, sheet: string): number {
    const toks = tokenize(formula);
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const num = (v: Val): number => {
      if (Array.isArray(v)) throw new Error(`range used as a number in ${formula}`);
      return v;
    };

    const primary = (): Val => {
      const t = next();
      if (!t) throw new Error(`unexpected end of ${formula}`);
      if (t.t === 'num') return t.v;
      if (t.t === 'ref') return this.value(t.sheet ?? sheet, t.addr);
      if (t.t === 'range') return expandRange(t.from, t.to).map((a) => this.value(t.sheet ?? sheet, a));
      if (t.t === '(') {
        const v = comparison();
        if (next()?.t !== ')') throw new Error(`missing ) in ${formula}`);
        return v;
      }
      if (t.t === 'op' && t.v === '-') return -num(power());
      if (t.t === 'op' && t.v === '+') return num(power());
      if (t.t === 'fn') {
        if (next()?.t !== '(') throw new Error(`missing ( in ${formula}`);
        const args: Val[] = [];
        if (peek()?.t !== ')') {
          for (;;) {
            args.push(comparison());
            const sep = next();
            if (sep?.t === ')') break;
            if (sep?.t !== ',') throw new Error(`bad argument list in ${formula}`);
          }
        } else next();
        const flat = args.flatMap((a) => (Array.isArray(a) ? a : [a]));
        switch (t.name) {
          case 'SUM': return flat.reduce((s, x) => s + x, 0);
          case 'MIN': return Math.min(...flat);
          case 'MAX': return Math.max(...flat);
          case 'ABS': return Math.abs(num(args[0]!));
          case 'ROUND': {
            const x = num(args[0]!);
            const d = num(args[1] ?? 0);
            const f = 10 ** d;
            // Excel rounds half away from zero.
            return (Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9)) / f;
          }
          case 'IF': return num(args[0]!) !== 0 ? num(args[1]!) : num(args[2] ?? 0);
          default: throw new Error(`function ${t.name} is not supported`);
        }
      }
      throw new Error(`unexpected token in ${formula}`);
    };

    const power = (): Val => {
      let v = primary();
      while (peek()?.t === 'op' && (peek() as { v: string }).v === '^') {
        next();
        v = num(v) ** num(primary());
      }
      return v;
    };
    const term = (): Val => {
      let v = power();
      while (peek()?.t === 'op' && ['*', '/'].includes((peek() as { v: string }).v)) {
        const op = (next() as { v: string }).v;
        const r = num(power());
        v = op === '*' ? num(v) * r : num(v) / r;
      }
      return v;
    };
    const sum = (): Val => {
      let v = term();
      while (peek()?.t === 'op' && ['+', '-'].includes((peek() as { v: string }).v)) {
        const op = (next() as { v: string }).v;
        const r = num(term());
        v = op === '+' ? num(v) + r : num(v) - r;
      }
      return v;
    };
    const comparison = (): Val => {
      const v = sum();
      const t = peek();
      if (t?.t === 'op' && ['>', '<', '>=', '<=', '=', '<>'].includes(t.v)) {
        next();
        const a = num(v);
        const b = num(sum());
        switch (t.v) {
          case '>': return a > b ? 1 : 0;
          case '<': return a < b ? 1 : 0;
          case '>=': return a >= b ? 1 : 0;
          case '<=': return a <= b ? 1 : 0;
          case '=': return a === b ? 1 : 0;
          default: return a !== b ? 1 : 0;
        }
      }
      return v;
    };

    const out = num(comparison());
    if (p !== toks.length) throw new Error(`trailing tokens in ${formula}`);
    return out;
  }
}

/** Numeric literals in a formula (for the "no hard numbers outside the assumptions sheet" check). */
export function formulaLiterals(formula: string): number[] {
  return tokenize(formula.replace(/^=/, ''))
    .filter((t): t is { t: 'num'; v: number } => t.t === 'num')
    .map((t) => t.v);
}
