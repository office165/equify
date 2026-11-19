/**
 * Round 10 (COPY_V2): the writing rules of the site, as one function. No middle dot, no long dash, no Hebrew maqaf and no hyphen
 * attached to a Hebrew word ("ל DCF", not with a hyphen). A range of numbers reads "עד" in Hebrew and "to" in English.
 * Applied only when COPY_V2 is on; with the flag off every string is shown as it was.
 */
const HEB = 'א-ת';
const DASHES = '–—'; // en dash, em dash

export function cleanMarks(input: string, locale: 'he' | 'en' = 'he'): string {
  const to = locale === 'he' ? ' עד ' : ' to ';
  let s = input;
  // A range between numbers (with an optional unit such as x or %): 2023–2026, 2.5x – 4x.
  s = s.replace(new RegExp(`([0-9][0-9.,]*[xMKk%׳]?)\\s*[${DASHES}]\\s*(?=[0-9₪$])`, 'g'), `$1${to}`);
  // A spaced dash between words is a pause: a comma.
  s = s.replace(new RegExp(`\\s+[${DASHES}]\\s+`, 'g'), ', ');
  // Middle dot between items: a comma. At the end of a label: a colon.
  s = s.replace(/\s*·\s*$/g, ':');
  s = s.replace(/\s+·\s+/g, ', ');
  s = s.replace(/\s*·\s*/g, ', ');
  // Any other long dash.
  s = s.replace(new RegExp(`[${DASHES}]`, 'g'), ', ');
  // Hebrew maqaf, and a hyphen attached to a Hebrew word.
  s = s.replace(/־/g, ' ');
  s = s.replace(new RegExp(`([${HEB}])-(?=\\S)`, 'g'), '$1 ');
  s = s.replace(new RegExp(`(\\S)-(?=[${HEB}])`, 'g'), '$1 ');
  return s.replace(/,\s*,/g, ',').replace(/ {2,}/g, ' ');
}

/** The same rules over every string of an object (copy tables). Functions and numbers are left as they are. */
export function cleanMarksDeep<T>(value: T, locale: 'he' | 'en' = 'he'): T {
  if (typeof value === 'string') return cleanMarks(value, locale) as T;
  if (Array.isArray(value)) return value.map((v) => cleanMarksDeep(v, locale)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = cleanMarksDeep(v, locale);
    return out as T;
  }
  return value;
}

/** The marks the rules forbid, for tests and audits. */
export const FORBIDDEN_MARKS = new RegExp(`[·${DASHES}־]|[${HEB}]-\\S|\\S-[${HEB}]`);
