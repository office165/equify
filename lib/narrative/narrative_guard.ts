/**
 * Round 7 (OPUS_NARRATIVE): checks a narrative before it goes into a report.
 * A narrative is rejected (and the report keeps its template text) when:
 *   - a number in it is not one of the numbers given to the model, written the same way;
 *   - it promises a result, or uses "תיווך";
 *   - it breaks the writing rules (middle dot, long dash, attached hyphen, emoji);
 *   - its shape is wrong (4 conclusions, 3 drivers in the given order, lengths).
 */
import { scanText } from '../report/report_text_rules';
import { allowedNumberStrings, type NarrativeFacts } from './narrative_facts';

export interface ReportNarrative {
  executiveSummary: string;
  conclusions: string[];
  drivers: Array<{ key: string; title: string; text: string }>;
}

export const PROMISE_RE = /מובטח|מבטיח|מבטיחה|מבטיחים|הבטח|בוודאות|ודאות|בטוח ש|ללא סיכון|בלי סיכון|תשואה מובטחת|guarantee|תיווך|מתווך/i;

const NUM_RE = /(×\s?)?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s?([MKB])?(\s?×)?(\s?%)?/g;

/** Normalized core of every number in a text: "8.1M", "13.4%", "x2.7", "48". */
export function numberTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const mult = Boolean(m[1] || m[5]);
    const core = `${m[2]!.replace(/,/g, '')}${m[3] ?? ''}${m[4] ?? ''}`;
    out.push(`${mult ? 'x' : ''}${core}${m[6] ? '%' : ''}`);
  }
  return out;
}

export function validateNarrative(n: unknown, facts: NarrativeFacts): { ok: true; narrative: ReportNarrative } | { ok: false; reason: string } {
  if (!n || typeof n !== 'object') return { ok: false, reason: 'not an object' };
  const r = n as Partial<ReportNarrative>;
  if (typeof r.executiveSummary !== 'string' || r.executiveSummary.length < 80 || r.executiveSummary.length > 900) return { ok: false, reason: 'summary length' };
  if (!Array.isArray(r.conclusions) || r.conclusions.length !== 4 || r.conclusions.some((c) => typeof c !== 'string' || c.length < 10 || c.length > 240)) return { ok: false, reason: 'conclusions shape' };
  if (!Array.isArray(r.drivers) || r.drivers.length !== facts.drivers.length || r.drivers.length !== 3) return { ok: false, reason: 'drivers shape' };
  for (let i = 0; i < r.drivers.length; i += 1) {
    const d = r.drivers[i]!;
    if (d?.key !== facts.drivers[i]!.key || typeof d.title !== 'string' || typeof d.text !== 'string' || d.text.length > 320 || d.title.length > 60) {
      return { ok: false, reason: `driver ${i + 1} shape` };
    }
  }
  const texts = [r.executiveSummary, ...r.conclusions, ...r.drivers.flatMap((d) => [d.title, d.text])];
  const all = texts.join('\n');
  const rules = scanText(all);
  if (rules.length) return { ok: false, reason: `writing rule ${rules[0]!.rule}: ${rules[0]!.context}` };
  if (PROMISE_RE.test(all)) return { ok: false, reason: `promise or forbidden word: ${PROMISE_RE.exec(all)![0]}` };
  const allowed = new Set(allowedNumberStrings(facts).flatMap((s) => numberTokens(s)));
  for (const t of numberTokens(all)) {
    if (allowed.has(t)) continue;
    // Small counts without a unit ("3 הנחות", "4 שורות") are not values.
    if (/^[1-5]$/.test(t)) continue;
    return { ok: false, reason: `number not in the engine output: ${t}` };
  }
  return { ok: true, narrative: r as ReportNarrative };
}
