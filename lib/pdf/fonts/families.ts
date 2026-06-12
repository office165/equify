/** Font family names for PDF output (no Node/browser deps). */
export function pdfFontFamily(locale: 'en' | 'he'): string {
  return locale === 'he' ? 'Heebo' : 'Inter';
}
