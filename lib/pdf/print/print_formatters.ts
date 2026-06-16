/** Print-safe formatting — thousands separators, consistent ₪, no raw zeros */

export type PdfLocale = 'he' | 'en';

export function resolvePdfLocale(locale?: string): PdfLocale {
  return locale === 'en' ? 'en' : 'he';
}

export function pdfDocumentDir(locale?: string): 'rtl' | 'ltr' {
  return resolvePdfLocale(locale) === 'en' ? 'ltr' : 'rtl';
}

export function escHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Decode pre-escaped hints so we only escape once at render */
export function normalizeHintText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

export function isMeaningfulNumber(
  value: number | null | undefined,
  opts: { allowZero?: boolean } = {},
): value is number {
  if (value == null || !Number.isFinite(value)) return false;
  if (!opts.allowZero && Math.abs(value) < 1e-9) return false;
  return true;
}

export function fmtMoneyILS(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value, { allowZero: true })) return '—';
  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
  return formatted.replace(/\u00a0/g, ' ');
}

/** Compact ₪ for blend breakdown lines (e.g. ₪328.1M). */
export function fmtMoneyCompact(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value, { allowZero: true })) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `₪${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `₪${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `₪${(value / 1_000).toFixed(0)}K`;
  }
  return fmtMoneyILS(value);
}

/** LTR-isolated numeric span for mixed RTL/LTR PDF copy */
export function numHtml(raw: string | number): string {
  const text = typeof raw === 'number' ? String(raw) : raw;
  return `<span dir="ltr" class="num">${escHtml(text)}</span>`;
}

export function pctHtml(value: number, decimals = 1): string {
  return numHtml(`${value.toFixed(decimals)}%`);
}

export function multHtml(value: number, decimals = 1): string {
  return numHtml(`×${value.toFixed(decimals)}`);
}

function compactMoneyParts(value: number): { amount: string; suffix: string } | null {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return { amount: (value / 1_000_000_000).toFixed(2), suffix: 'B' };
  }
  if (abs >= 1_000_000) {
    return { amount: (value / 1_000_000).toFixed(1), suffix: 'M' };
  }
  if (abs >= 1_000) {
    return { amount: (value / 1_000).toFixed(0), suffix: 'K' };
  }
  return null;
}

/** Currency in PDF: RTL → amount then ₪; LTR → ₪ then amount */
export function fmtMoneyCompactHtml(
  value: number | null | undefined,
  locale?: string,
): string {
  if (!isMeaningfulNumber(value, { allowZero: true })) return numHtml('—');
  const parts = compactMoneyParts(value!);
  const rtl = pdfDocumentDir(locale) === 'rtl';
  if (!parts) {
    const stripped = fmtMoneyILS(value).replace(/[₪\s\u00a0]/g, '').trim();
    return rtl ? `${numHtml(stripped)} ₪` : numHtml(`₪${stripped}`);
  }
  const amount = `${parts.amount}${parts.suffix}`;
  return rtl ? `${numHtml(amount)} ₪` : numHtml(`₪${amount}`);
}

export function fmtMoneyCompactSignedHtml(
  value: number,
  locale?: string,
): string {
  if (value < 0) return `−${fmtMoneyCompactHtml(Math.abs(value), locale)}`;
  return fmtMoneyCompactHtml(value, locale);
}

/** Cover hero equity — RTL: 12.3M ₪ · LTR: ₪12.3M */
export function equityCoverValHtml(equity: number, locale?: string): string {
  const core = `${(equity / 1_000_000).toFixed(1)}<em>M</em>`;
  const rtl = pdfDocumentDir(locale) === 'rtl';
  return rtl
    ? `<span dir="ltr" class="num c-val">${core}</span> ₪`
    : `<span dir="ltr" class="num c-val">₪${core}</span>`;
}

export function fmtMultipleHtml(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value)) return numHtml('—');
  return numHtml(`${value.toFixed(1)}x`);
}

export function fmtPercentHtml(
  value: number | null | undefined,
  opts: { decimals?: number; isRatio?: boolean } = {},
): string {
  const raw = fmtPercent(value, opts);
  return raw ? numHtml(raw) : numHtml('—');
}

export function fmtPercent(
  value: number | null | undefined,
  opts: { decimals?: number; isRatio?: boolean } = {},
): string | null {
  if (!isMeaningfulNumber(value)) return null;
  const { decimals = 1, isRatio = false } = opts;
  const pct = isRatio ? value * 100 : value;
  if (Math.abs(pct) < 0.05) return null;
  return `${pct.toFixed(decimals)}%`;
}

export function fmtRatio(value: number | null | undefined, suffix = 'x'): string | null {
  if (!isMeaningfulNumber(value)) return null;
  return `${value.toFixed(2)}${suffix}`;
}

export function fmtMultiple(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value)) return '—';
  return `${value.toFixed(1)}x`;
}

const HEBREW_MONTH_NAMES =
  /בינואר|בפברואר|במרץ|באפריל|במאי|ביוני|ביולי|באוגוסט|בספטמבר|באוקטובר|בנובמבר|בדצמבר/;

function isHebrewLongDate(value: string): boolean {
  return /[\u0590-\u05FF]/.test(value) && HEBREW_MONTH_NAMES.test(value);
}

function isHebrewShortDate(value: string): boolean {
  return /^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(value.trim());
}

/** Parse report dates from ISO, dd.mm.yyyy, or fall back to now (never throws). */
export function parseReportDate(value?: string | Date | null): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  if (value == null) return new Date();

  const trimmed = String(value).trim();
  if (!trimmed) return new Date();

  if (isHebrewLongDate(trimmed)) {
    const months = [
      'בינואר',
      'בפברואר',
      'במרץ',
      'באפריל',
      'במאי',
      'ביוני',
      'ביולי',
      'באוגוסט',
      'בספטמבר',
      'באוקטובר',
      'בנובמבר',
      'בדצמבר',
    ];
    let month = new Date().getMonth();
    for (let i = 0; i < months.length; i += 1) {
      if (trimmed.includes(months[i]!)) {
        month = i;
        break;
      }
    }
    const dayMatch = /^(\d{1,2})\s/.exec(trimmed);
    const yearMatch = /(20\d{2})/.exec(trimmed);
    const day = dayMatch ? Number(dayMatch[1]) : 1;
    const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const isoAttempt = new Date(trimmed);
  if (!Number.isNaN(isoAttempt.getTime())) {
    return isoAttempt;
  }

  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (dmy) {
    const parsed = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (ymd) {
    const parsed = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function formatHebrewLongDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export function reportDateShortHe(value?: string | Date | null): string {
  if (typeof value === 'string' && isHebrewShortDate(value)) {
    return value.trim();
  }
  return formatHebrewShortDate(parseReportDate(value));
}

function formatHebrewShortDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return new Date().toLocaleDateString('he-IL');
  }
}

/** Long Hebrew date for PDF cover — accepts ISO, dd.mm.yyyy, or pre-formatted Hebrew. */
export function reportDateHe(value?: string | Date | null): string {
  if (typeof value === 'string' && isHebrewLongDate(value.trim())) {
    return value.trim();
  }
  return formatHebrewLongDate(parseReportDate(value));
}
