/**
 * Round 5: writing rules for customer text (CLAUDE.md rule 9, night rounds rule 6).
 * Scans the visible text of a report HTML (no <style>, <script>, tags or attributes) and returns
 * every place that breaks a rule:
 *   middle-dot   U+00B7 and its look-alikes (U+2027, U+2219, U+22C5)
 *   long-dash    U+2012 to U+2015 (figure dash, en dash, em dash, horizontal bar)
 *   attached-hyphen  a hyphen glued to a Hebrew letter ("ב-2026", "חד-פעמי"); write "ב 2026"
 *   emoji        pictographs (© ® ™ are allowed)
 *   word         "תיווך"
 * The minus sign U+2212 ("B−", "−2.8M") is a math sign, not a dash, and is allowed.
 */

export type ReportTextRule = 'middle-dot' | 'long-dash' | 'attached-hyphen' | 'emoji' | 'word';

export interface ReportTextViolation {
  rule: ReportTextRule;
  /** About 30 characters around the hit. */
  context: string;
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', mdash: '—', ndash: '–', hyphen: '-', minus: '−',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Visible text of an HTML document, with tags replaced by a space. */
export function visibleText(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(stripped).replace(/[⁦-⁩‎‏]/g, '').replace(/\s+/g, ' ');
}

const HEB = '\\u05D0-\\u05EA';
const HYPHENS = '\\-\\u05BE\\u2010\\u2011';
const PATTERNS: Array<[ReportTextRule, RegExp]> = [
  ['middle-dot', /[·‧∙⋅]/g],
  ['long-dash', /[‒-―]/g],
  ['attached-hyphen', new RegExp(`[${HEB}]["'׳״]?[${HYPHENS}](?=\\S)|(?<=\\S)[${HYPHENS}][${HEB}]`, 'g')],
  ['emoji', /(?![©®™])\p{Extended_Pictographic}/gu],
  ['word', /תיווך/g],
];

export function scanText(text: string): ReportTextViolation[] {
  const out: ReportTextViolation[] = [];
  for (const [rule, re] of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const i = m.index ?? 0;
      out.push({ rule, context: text.slice(Math.max(0, i - 15), i + 15).trim() });
    }
  }
  return out;
}

export function scanReportHtml(html: string): ReportTextViolation[] {
  return scanText(visibleText(html));
}
