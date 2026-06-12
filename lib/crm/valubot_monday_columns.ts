/** Live board schema — introspected 2026-06-10 (scripts/monday-introspect.ts). */
export const VALUBOT_MONDAY_COLUMNS = {
  itemName: 'name',
  customerName: 'text_mkz5s6tm',
  leadStatus: 'color_mkz4s295',
  phone: 'phone_mkz4zdcb',
  email: 'email_mkz4g6gm',
  nationalId: 'text_mkz5hrdn',
  needPurpose: 'color_mkz5d1mk',
  leadSource: 'dropdown_mkz4myng',
  category: 'dropdown_mkz4hn5x',
  industrySector: 'dropdown_mkz5dt7w',
  companyName: 'text_mm46hq9d',
  sector: 'dropdown_mm46ndr1',
  processStage: 'color_mm468x53',
  package: 'color_mm46xm0f',
  valuationMidpoint: 'numeric_mm46k68a',
  qualityScore: 'numeric_mm46w9eq',
  source: 'dropdown_mm46q64c',
  createdAt: 'date_mkz4gfpq',
  aiNotes: 'long_text_mm463q00',
  files: 'files',
} as const;

export type ValubotMondayColumnKey = keyof typeof VALUBOT_MONDAY_COLUMNS;
