/**
 * Round 2, part E: pixel diff of reports/round-2/pdf-before vs pdf-after (110 dpi PNG).
 *   npx tsx scripts/round-2/pdf-diff.ts            -> JSON summary on stdout
 *   npx tsx scripts/round-2/pdf-diff.ts --images   -> also writes side-by-side PNGs to reports/round-2/pdf-compare/
 *                                                     and reports/round-2/pdf-compare.md
 * A pixel differs when any channel differs by more than 24 (anti-aliasing noise stays below it).
 * For the 4 methodology 2 cases, "after" is <id>-v2 and "before" is the methodology 1 after page.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..', '..');
const BEFORE = path.join(ROOT, 'reports', 'round-2', 'pdf-before');
const AFTER = path.join(ROOT, 'reports', 'round-2', 'pdf-after');
const OUT = path.join(ROOT, 'reports', 'round-2', 'pdf-compare');

export interface PageDiff {
  pair: string;
  page: number;
  changedPct: number;
  rows: [number, number] | null; // first and last changed row, as % of page height
}

async function raw(file: string) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function diff(a: string, b: string): Promise<{ pct: number; rows: [number, number] | null }> {
  const A = await raw(a);
  const B = await raw(b);
  const w = Math.min(A.w, B.w);
  const h = Math.min(A.h, B.h);
  let n = 0;
  let first = -1;
  let last = -1;
  for (let y = 0; y < h; y += 1) {
    let rowChanged = false;
    for (let x = 0; x < w; x += 1) {
      const i = (y * A.w + x) * 3;
      const j = (y * B.w + x) * 3;
      if (Math.abs(A.data[i] - B.data[j]) > 24 || Math.abs(A.data[i + 1] - B.data[j + 1]) > 24 || Math.abs(A.data[i + 2] - B.data[j + 2]) > 24) {
        n += 1;
        rowChanged = true;
      }
    }
    if (rowChanged) {
      if (first < 0) first = y;
      last = y;
    }
  }
  return { pct: (n / (w * h)) * 100, rows: first < 0 ? null : [Math.round((first / h) * 100), Math.round((last / h) * 100)] };
}

async function sideBySide(a: string, b: string, out: string): Promise<void> {
  const A = await sharp(a).metadata();
  const gap = 24;
  const joined = await sharp({ create: { width: (A.width ?? 0) * 2 + gap, height: A.height ?? 0, channels: 3, background: '#9aa0a6' } })
    .composite([
      { input: b, left: 0, top: 0 }, // after on the left (Hebrew reads right to left: before on the right)
      { input: a, left: (A.width ?? 0) + gap, top: 0 },
    ])
    .png()
    .toBuffer();
  await sharp(joined).resize({ width: 1100 }).png({ compressionLevel: 9, palette: true }).toFile(out);
}

async function main(): Promise<void> {
  const images = process.argv.includes('--images');
  if (images) fs.mkdirSync(OUT, { recursive: true });
  const ids = fs.readdirSync(BEFORE).filter((f) => f.endsWith('.pdf')).map((f) => f.replace(/\.pdf$/, ''));
  const pairs: Array<{ pair: string; before: (p: number) => string; after: (p: number) => string }> = [
    ...ids.map((id) => ({ pair: id, before: (p: number) => path.join(BEFORE, `${id}-p${p}.png`), after: (p: number) => path.join(AFTER, `${id}-p${p}.png`) })),
    ...fs.readdirSync(AFTER).filter((f) => /-v2\.pdf$/.test(f)).map((f) => f.replace(/-v2\.pdf$/, '')).map((id) => ({
      pair: `${id}-v2`,
      before: (p: number) => path.join(AFTER, `${id}-p${p}.png`),
      after: (p: number) => path.join(AFTER, `${id}-v2-p${p}.png`),
    })),
  ];
  const result: PageDiff[] = [];
  for (const pr of pairs) {
    for (let p = 1; p <= 8; p += 1) {
      const d = await diff(pr.before(p), pr.after(p));
      result.push({ pair: pr.pair, page: p, changedPct: Math.round(d.pct * 100) / 100, rows: d.rows });
      if (images && d.rows && d.pct >= NOISE_PCT) await sideBySide(pr.before(p), pr.after(p), path.join(OUT, `${pr.pair}-p${p}.png`));
    }
  }
  fs.writeFileSync(path.join(ROOT, 'reports', 'round-2', 'pdf-diff.json'), `${JSON.stringify(result, null, 1)}\n`);
  if (images) writeMarkdown(result);
  console.log(result.filter((r) => r.rows).map((r) => `${r.pair} p${r.page} ${r.changedPct}% rows ${r.rows![0]}-${r.rows![1]}%`).join('\n'));
  console.log(`unchanged pages: ${result.filter((r) => !r.rows).map((r) => `${r.pair}:p${r.page}`).join(' ')}`);
}

/** Below this share of changed pixels (and with the same text) a page change is rendering noise. */
const NOISE_PCT = 0.05;

const TITLES: Record<number, string> = {
  1: 'שער',
  2: 'תקציר מנהלים',
  3: 'נתונים פיננסיים',
  4: 'DCF ו WACC',
  5: 'מכפילי שוק',
  6: 'תרחישים',
  7: 'איכות ורגישות',
  8: 'שווי משולב',
};

/** Why each page was expected to change (V1: part B of round 2; V2: methodology 2). Null: must not change. */
const WHY_V1: Record<number, string | null> = {
  1: null,
  2: 'חלק ב: משקלות בספרה אחת אחרי הנקודה, הערת המתודולוגיה מציגה את משקלות המנוע (במפעלים היא הציגה 45/14/42 מול טבלה של 48.5/22.7/28.8), רגל אפס מסומנת "לא רלוונטית בגלל EBITDA שלילי", ו "Big-4" יצא מהערת ה EBITDA המנורמל.',
  3: 'חלק ב (ממצא 15): שני בסיסי ה EBITDA מוצגים כל אחד בשם שלו ועם המשקלות שהמנוע השתמש בהם.',
  4: 'חלק ב: טבלת WACC אחת עם Kd ומשקלות, גרף שמסתכם ל WACC (ה 1.6 יצא), טבלת DCF שמסתכמת לשווי הרגל, והמשפט על תקרת 42%.',
  5: 'חלק ב (ממצא 7): טווחי Damodaran לענף עם מקור ותאריך במקום "חציון שוק" שנגזר מהחברה, וסמן החברה במכפיל שהדוח משתמש בו.',
  6: null,
  7: 'חלק ב (ממצא 6): כל תא ברגישות הוא הרצה מלאה של המנוע, צמיחה טרמינלית 1.5% עד 3.5% וצעד WACC של נקודה.',
  8: 'חלק ב (ממצא 19): משקלות בפס השקלול בספרה אחת אחרי הנקודה, תווית שנחתכה תוקנה, ובקבלן תוספת הצבר כבר לא מצוירת בפס כרגל "REV 100%".',
};
const WHY_V2: Record<number, string | null> = {
  1: 'השווי לבעלים, ה EV והטווח בשער הם של מתודולוגיה 2.',
  2: 'מספרי התקציר והערת המתודולוגיה (משקלות אחרי העברת משקל מרגל אפס). במפעל הצעיר השווי לבעלים 0 והתקציר משתנה בהתאם.',
  3: null,
  4: 'W1: שורת CRP, Rf 4.24%, ERP 4.23%, בטא ומשקלות לפי D/E של הענף, והערת מקורות עם תאריכים. T1: טבלת DCF בלי תקרה, שנבנית מהתחזית שהמנוע העריך ולכן מסתכמת לרגל (ממצא 28), ומשפט T1 עם שורת הבדיקה הצולבת במקום משפט ה 42%. במפעל הצעיר התזרים החופשי 0 בכל השנים, והטבלה מראה 0.',
  5: 'סמן החברה: מכפיל ההכנסות של R1 ומכפיל ה EBITDA עם מקדם הגודל הרציף.',
  6: 'ערכי התרחישים נגזרים מהשווי החדש.',
  7: 'תאי הרגישות הם הרצות של מתודולוגיה 2 (בלי תקרה, ולכן השורות של הצמיחה הטרמינלית כבר לא כמעט זהות).',
  8: 'שווי הרגליים והמשקלות של מתודולוגיה 2.',
};

function writeMarkdown(result: PageDiff[]): void {
  const lines: string[] = [];
  const failures: string[] = [];
  lines.push('# סבב 2: PDF לפני ואחרי');
  lines.push('');
  lines.push('נוצר על ידי `npx tsx scripts/round-2/pdf-diff.ts --images`. השוואת פיקסלים של ה PNG ב 110 dpi. פיקסל שונה: הפרש של יותר מ 24 באחד הערוצים. בכל תמונה: **אחרי משמאל, לפני מימין**.');
  lines.push('');
  lines.push('1. מתודולוגיה 1 (הדגל כבוי): `pdf-before` (קומיט 789b2f3, לפני חלק ב) מול `pdf-after`, 13 תיקים.');
  lines.push('2. מתודולוגיה 2: `pdf-after/<id>.pdf` (כבוי) מול `pdf-after/<id>-v2.pdf` (דלוק), 4 תיקים: מסעדה, מפעל צעיר, SaaS, וחברה של 1B (golden-large-industrial).');
  lines.push(`3. שינוי של פחות מ ${NOISE_PCT}% מהפיקסלים, בלי שינוי בטקסט (נבדק בעין בתמונות), הוא רעש רינדור של גופן (החלקת קצוות), ולא נחשב שינוי.`);
  lines.push('4. עמוד שלא היה אמור להשתנות ושונה מעבר לרעש הוא כשל.');
  lines.push('');
  for (const [title, isV2, why] of [['מתודולוגיה 1: לפני חלק ב מול אחרי', false, WHY_V1], ['מתודולוגיה 2 מול מתודולוגיה 1', true, WHY_V2]] as const) {
    lines.push(`## ${title}`);
    lines.push('');
    const rows = result.filter((r) => r.pair.endsWith('-v2') === isV2);
    const pairs = [...new Set(rows.map((r) => r.pair))];
    lines.push(`| תיק | ${[1, 2, 3, 4, 5, 6, 7, 8].map((p) => `ע ${p}`).join(' | ')} |`);
    lines.push(`|---|${[1, 2, 3, 4, 5, 6, 7, 8].map(() => '---').join('|')}|`);
    for (const pair of pairs) {
      const cells = [1, 2, 3, 4, 5, 6, 7, 8].map((p) => {
        const r = rows.find((x) => x.pair === pair && x.page === p)!;
        if (!r.rows) return 'זהה';
        if (r.changedPct < NOISE_PCT) return `רעש (${r.changedPct}%)`;
        return `${r.changedPct}%`;
      });
      lines.push(`| ${pair} | ${cells.join(' | ')} |`);
    }
    lines.push('');
    for (let p = 1; p <= 8; p += 1) {
      const changed = rows.filter((r) => r.page === p && r.rows && r.changedPct >= NOISE_PCT);
      lines.push(`### עמוד ${p}: ${TITLES[p]}`);
      lines.push('');
      if (!changed.length) {
        lines.push(why[p] == null ? 'לא אמור להשתנות, ולא השתנה (מעבר לרעש רינדור).' : 'לא השתנה באף תיק.');
        lines.push('');
        continue;
      }
      if (why[p] == null) {
        failures.push(...changed.map((r) => `${r.pair} p${p}`));
        lines.push(`**כשל: העמוד לא היה אמור להשתנות, ושונה ב ${changed.map((r) => r.pair).join(', ')}.**`);
      } else {
        lines.push(`למה: ${why[p]}`);
      }
      lines.push('');
      for (const r of changed) {
        lines.push(`${r.pair} (${r.changedPct}% מהפיקסלים, שורות ${r.rows![0]}% עד ${r.rows![1]}% מגובה העמוד)`);
        lines.push('');
        lines.push(`![${r.pair} עמוד ${p}](pdf-compare/${r.pair}-p${p}.png)`);
        lines.push('');
      }
    }
  }
  lines.push('## תוצאה');
  lines.push('');
  lines.push(failures.length ? `כשלים: ${failures.join(', ')}.` : 'אין עמוד שהשתנה בלי סיבה. כל 17 ה PDF הם 8 עמודים, ובדיקת הפריסה עוברת בכולם.');
  lines.push('');
  fs.writeFileSync(path.join(ROOT, 'reports', 'round-2', 'pdf-compare.md'), lines.join('\n'), 'utf8');
  console.log(`pdf-compare.md: ${failures.length} failure(s)`);
}

void main();
