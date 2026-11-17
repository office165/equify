/**
 * Writes reports/methodology-map.md from the code (via tests/lib/methodology.ts).
 * Usage: npx tsx tests/methodology-doc.ts   (also run by snapshot:update)
 */
import fs from 'fs';
import path from 'path';
import { buildMethodologyMap, REF_MARGIN, REF_REVENUE_K, type MethodologyRow } from './lib/methodology';
import { METHODOLOGY_ANOMALIES } from './methodology-anomalies';

const pct = (n: number) => `${Math.round(n * 100)}`;
const w = (x: { dcf: number; ebitda: number; rev: number }) => `${pct(x.dcf)}/${pct(x.ebitda)}/${pct(x.rev)}`;

export function renderMethodologyDoc(rows: MethodologyRow[]): string {
  const lines: string[] = [];
  lines.push('# מפת מתודולוגיה לפי תת ענף');
  lines.push('');
  lines.push('המסמך נוצר אוטומטית מהקוד (tests/methodology-doc.ts) ונעול בבדיקה (tests/snapshots/methodology-map.json).');
  lines.push('כל שינוי במתודולוגיה של ענף יופיע ב npm test כשינוי מפורש, ויחייב npm run snapshot:update עם סיבה.');
  lines.push('');
  lines.push(`משקלות "אחרי כל השכבות" נמדדו על חברת ייחוס: הכנסות ${REF_REVENUE_K / 1000}M ₪, מרווח EBITDA ${REF_MARGIN * 100}%, משטר רווחי.`);
  lines.push('המשקלות זזים גם עם גודל ההכנסות (scale_modifier_pipeline) ועם משטר הפסד (profitability_regime), כך שבתיק אמיתי הם יכולים להיות שונים.');
  lines.push('');
  lines.push('מקרא עמודות: משקלות בפורמט DCF/EBITDA/הכנסות באחוזים. גבולות: גבולות המכפיל אחרי נרמול (normalize_multiple.ts), שחלים גם על מכפיל ההכנסות.');
  lines.push('DLOM: מקדם סחירות (0.8 פירושו הנחה של 20%). בשל: הערך בשלב בשלות בחברת הייחוס. סקייל: מקדם גודל בחברת הייחוס.');
  lines.push('');
  lines.push('## טבלה 1: אסטרטגיה ומשקלות');
  lines.push('');
  lines.push('| ענף | תת ענף | פרופיל | אסטרטגיה | seed | early | growth | mature |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.sector} | ${r.subSector} | ${r.methodologyProfile} | ${r.strategy} | ${w(r.weights.seed)} | ${w(r.weights.early)} | ${w(r.weights.growth)} | ${w(r.weights.mature)} |`);
  }
  lines.push('');
  lines.push('## טבלה 2: מכפילים');
  lines.push('');
  lines.push('| תת ענף | מקור המכפיל | סוג | ברירת מחדל | טווח קונפיג | גבולות נרמול | מכפיל אפקטיבי (ייחוס) | מכפיל הכנסות גולמי | מכפיל הכנסות אחרי נרמול | DLOM | DLOM בשל | סקייל |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.subSector} | ${r.multipleSource} | ${r.multipleType} | ${r.defaultMultiple} | ${r.configMinMultiple} עד ${r.configMaxMultiple} | ${r.boundsMin} עד ${r.boundsMax} | ${r.effectiveMultipleRef} | ${r.revenueMultipleRaw} | ${r.revenueMultipleEffective} | ${r.dlomGrowth} | ${r.dlomMatureRef} | ${r.scaleFactorRef} |`);
  }
  lines.push('');
  lines.push('## טבלה 3: DCF, סיכון ונרמול');
  lines.push('');
  lines.push('| תת ענף | תקרת מרווח % | תקרת צמיחה % | בטא לא ממונפת | פחת % מהכנסות | בסיס CAPEX | טבלת מכפילים | נרמול מחזורי | משטר הפסד | צבר | waccBasePct מוגדר |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.subSector} | ${r.maxHistoricalMarginPct} | ${r.growthCapPct} | ${r.unleveredBeta} | ${r.depreciationPctOfRevenue} | ${r.capexBase} | ${r.multiplesIndustry} | ${r.cyclicalNormalization ? 'כן' : 'לא'} | ${r.lossRegime ? 'כן' : 'לא'} | ${r.backlogInflection ? 'כן' : 'לא'} | ${r.waccBasePctConfigured ?? ''} |`);
  }
  lines.push('');
  lines.push('## חריגות מול ענפים דומים (רק רישום, בלי שינוי)');
  lines.push('');
  METHODOLOGY_ANOMALIES.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  lines.push('');
  return lines.join('\n');
}

export function writeMethodologyDoc(rows = buildMethodologyMap()): void {
  const out = path.join(__dirname, '..', 'reports', 'methodology-map.md');
  fs.writeFileSync(out, renderMethodologyDoc(rows), 'utf8');
}

if (require.main === module) {
  writeMethodologyDoc();
  console.log('reports/methodology-map.md written');
}
