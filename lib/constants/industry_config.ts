import type { ValuationLocale } from '../../api_client';
import type { EquifySectorKey } from '../valuation';
import {
  multiplesMethodologyCopy,
  multiplesMethodologyCopyEn,
} from '../i18n/equify_report_copy';

export interface SubSectorOption {
  id: string;
  labelHe: string;
  labelEn: string;
  /** Multiplier adjustment vs sector baseline */
  multAdj: number;
}

export interface IndustryConfigEntry {
  sectorKey: EquifySectorKey;
  chipLabelHe: string;
  chipLabelEn: string;
  /** Industry code for valuation API / CRM */
  industryCode: string;
  maDealCount: number;
  multiplesSectorPhraseHe: string;
  multiplesSectorPhraseEn: string;
  subSectors: SubSectorOption[];
}

export const INDUSTRY_CONFIG: Record<EquifySectorKey, IndustryConfigEntry> = {
  hospitality: {
    sectorKey: 'hospitality',
    chipLabelHe: 'מלונאות / אירוח',
    chipLabelEn: 'Hospitality & Services',
    industryCode: 'Hospitality',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי האירוח והשירותים',
    multiplesSectorPhraseEn: 'in hospitality & services',
    subSectors: [
      { id: 'boutique_hotel', labelHe: 'מלון בוטיק', labelEn: 'Boutique hotel', multAdj: 1.05 },
      { id: 'hotel_chain', labelHe: 'רשת מלונות', labelEn: 'Hotel chain', multAdj: 1.12 },
      { id: 'restaurant', labelHe: 'מסעדות / קייטרינג', labelEn: 'Restaurants', multAdj: 0.92 },
      { id: 'events', labelHe: 'אירועים / נופש', labelEn: 'Events & leisure', multAdj: 0.98 },
    ],
  },
  saas: {
    sectorKey: 'saas',
    chipLabelHe: 'הייטק / SaaS',
    chipLabelEn: 'Tech / SaaS',
    industryCode: 'Software/SaaS',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הטכנולוגיה וה-SaaS',
    multiplesSectorPhraseEn: 'in technology & SaaS',
    subSectors: [
      { id: 'b2b_saas', labelHe: 'B2B SaaS', labelEn: 'B2B SaaS', multAdj: 1.15 },
      { id: 'b2c_saas', labelHe: 'B2C / Consumer', labelEn: 'B2C SaaS', multAdj: 1.0 },
      { id: 'devtools', labelHe: 'DevTools / Infra', labelEn: 'DevTools', multAdj: 1.2 },
      { id: 'marketplace', labelHe: 'Marketplace', labelEn: 'Marketplace', multAdj: 0.95 },
    ],
  },
  fintech: {
    sectorKey: 'fintech',
    chipLabelHe: 'פינטק',
    chipLabelEn: 'FinTech',
    industryCode: 'FinTech',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הפינטק והשירותים הפיננסיים',
    multiplesSectorPhraseEn: 'in FinTech & financial services',
    subSectors: [
      { id: 'payments', labelHe: 'תשלומים', labelEn: 'Payments', multAdj: 1.1 },
      { id: 'lending', labelHe: 'הלוואות / אשראי', labelEn: 'Lending', multAdj: 0.95 },
      { id: 'insurtech', labelHe: 'InsurTech', labelEn: 'InsurTech', multAdj: 1.0 },
      { id: 'wealth', labelHe: 'ניהול הון', labelEn: 'Wealth mgmt', multAdj: 1.05 },
    ],
  },
  cyber: {
    sectorKey: 'cyber',
    chipLabelHe: 'סייבר',
    chipLabelEn: 'Cybersecurity',
    industryCode: 'Cybersecurity',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הסייבר והטכנולוגיה',
    multiplesSectorPhraseEn: 'in cybersecurity & technology',
    subSectors: [
      { id: 'enterprise', labelHe: 'Enterprise Security', labelEn: 'Enterprise', multAdj: 1.12 },
      { id: 'cloud', labelHe: 'Cloud / Zero Trust', labelEn: 'Cloud security', multAdj: 1.15 },
      { id: 'ot', labelHe: 'OT / ICS', labelEn: 'OT security', multAdj: 1.0 },
      { id: 'services_cyber', labelHe: 'שירותי סייבר', labelEn: 'Cyber services', multAdj: 0.9 },
    ],
  },
  health: {
    sectorKey: 'health',
    chipLabelHe: 'רפואה / Biotech',
    chipLabelEn: 'HealthTech',
    industryCode: 'HealthTech',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הבריאות והביוטק',
    multiplesSectorPhraseEn: 'in health & biotech',
    subSectors: [
      { id: 'medtech', labelHe: 'MedTech', labelEn: 'MedTech', multAdj: 1.08 },
      { id: 'biotech', labelHe: 'Biotech / פארמה', labelEn: 'Biotech', multAdj: 1.15 },
      { id: 'digital_health', labelHe: 'Digital Health', labelEn: 'Digital health', multAdj: 1.1 },
      { id: 'services_health', labelHe: 'שירותי בריאות', labelEn: 'Health services', multAdj: 0.88 },
    ],
  },
  services: {
    sectorKey: 'services',
    chipLabelHe: 'שירותים מקצועיים',
    chipLabelEn: 'Professional Services',
    industryCode: 'Professional Services',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי השירותים המקצועיים',
    multiplesSectorPhraseEn: 'in professional services',
    subSectors: [
      { id: 'consulting', labelHe: 'ייעוץ', labelEn: 'Consulting', multAdj: 1.0 },
      { id: 'legal', labelHe: 'משפטים', labelEn: 'Legal', multAdj: 0.95 },
      { id: 'accounting', labelHe: 'ראיית חשבון', labelEn: 'Accounting', multAdj: 0.92 },
      { id: 'marketing', labelHe: 'שיווק / מדיה', labelEn: 'Marketing', multAdj: 0.98 },
    ],
  },
  industry: {
    sectorKey: 'industry',
    chipLabelHe: 'תעשייה',
    chipLabelEn: 'Industrial',
    industryCode: 'Industrial',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי התעשייה והייצור',
    multiplesSectorPhraseEn: 'in industrial & manufacturing',
    subSectors: [
      { id: 'manufacturing', labelHe: 'ייצור', labelEn: 'Manufacturing', multAdj: 0.95 },
      { id: 'distribution', labelHe: 'הפצה / לוגיסטיקה', labelEn: 'Distribution', multAdj: 0.9 },
      { id: 'food_bev', labelHe: 'מזון ומשקאות', labelEn: 'Food & beverage', multAdj: 0.92 },
      { id: 'traditional', labelHe: 'תעשייה מסורתית', labelEn: 'Traditional mfg', multAdj: 0.85 },
    ],
  },
  ecom: {
    sectorKey: 'ecom',
    chipLabelHe: 'קמעונאות / איקומרס',
    chipLabelEn: 'E-Commerce',
    industryCode: 'E-Commerce',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי המסחר והאיקומרס',
    multiplesSectorPhraseEn: 'in retail & e-commerce',
    subSectors: [
      { id: 'd2c', labelHe: 'D2C / מותג ישיר', labelEn: 'D2C brand', multAdj: 1.05 },
      { id: 'marketplace_ecom', labelHe: 'Marketplace', labelEn: 'Marketplace', multAdj: 0.95 },
      { id: 'retail', labelHe: 'קמעונאות פיזית', labelEn: 'Retail', multAdj: 0.88 },
      { id: 'subscription', labelHe: 'מנויים / Box', labelEn: 'Subscription', multAdj: 1.02 },
    ],
  },
  energy: {
    sectorKey: 'energy',
    chipLabelHe: 'אנרגיה',
    chipLabelEn: 'Energy',
    industryCode: 'renewable_energy',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי האנרגיה והתשתיות',
    multiplesSectorPhraseEn: 'in energy & infrastructure',
    subSectors: [
      { id: 'solar', labelHe: 'סולארי', labelEn: 'Solar', multAdj: 1.1 },
      { id: 'storage', labelHe: 'אגירת אנרגיה', labelEn: 'Storage', multAdj: 1.15 },
      { id: 'wind', labelHe: 'רוח', labelEn: 'Wind', multAdj: 1.08 },
      { id: 'services_energy', labelHe: 'שירותי אנרגיה', labelEn: 'Energy services', multAdj: 0.95 },
    ],
  },
  defense_aerospace: {
    sectorKey: 'defense_aerospace',
    chipLabelHe: 'ביטחון ותעופה',
    chipLabelEn: 'Defense & Aerospace',
    industryCode: 'Defense & Aerospace',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הביטחון, התעופה והחלל',
    multiplesSectorPhraseEn: 'in defense, aviation & aerospace',
    subSectors: [
      {
        id: 'defense_manufacturing',
        labelHe: 'ייצור ביטחוני וחומרה',
        labelEn: 'Defense Manufacturing & Hardware',
        multAdj: 0.98,
      },
      {
        id: 'aviation_space',
        labelHe: 'תעופה וחלל',
        labelEn: 'Aviation & Space',
        multAdj: 1.1,
      },
      {
        id: 'defense_tech',
        labelHe: 'טכנולוגיות ומערכות ביטחוניות',
        labelEn: 'Defense Tech & Systems',
        multAdj: 1.14,
      },
    ],
  },
  other: {
    sectorKey: 'other',
    chipLabelHe: 'אחר',
    chipLabelEn: 'Other',
    industryCode: 'Other',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הפעילות הרלוונטיים',
    multiplesSectorPhraseEn: 'in the relevant sector',
    subSectors: [
      { id: 'general', labelHe: 'כללי', labelEn: 'General', multAdj: 1.0 },
    ],
  },
};

export function getIndustryConfig(sector: EquifySectorKey): IndustryConfigEntry {
  return INDUSTRY_CONFIG[sector] ?? INDUSTRY_CONFIG.other;
}

export function getSectorChipLabel(
  sector: EquifySectorKey,
  locale: ValuationLocale = 'he',
): string {
  const entry = getIndustryConfig(sector);
  return locale === 'he' ? entry.chipLabelHe : entry.chipLabelEn;
}

/** Page 5 multiples intro */
export function getMultiplesIntroText(
  sector: EquifySectorKey,
  locale: ValuationLocale = 'he',
): string {
  const entry = getIndustryConfig(sector);
  const sectorPhrase =
    locale === 'he' ? entry.multiplesSectorPhraseHe : entry.multiplesSectorPhraseEn;

  return locale === 'he'
    ? multiplesMethodologyCopy(sectorPhrase)
    : multiplesMethodologyCopyEn(sectorPhrase);
}

export function getSubSectorMultAdj(
  sector: EquifySectorKey,
  subSectorId: string,
): number {
  const entry = getIndustryConfig(sector);
  const sub = entry.subSectors.find((s) => s.id === subSectorId);
  return sub?.multAdj ?? 1;
}

export function getSubSectorsForSector(sector: EquifySectorKey): SubSectorOption[] {
  return getIndustryConfig(sector).subSectors;
}

export function getSubSectorLabel(
  sector: EquifySectorKey,
  subSectorId: string,
  locale: ValuationLocale = 'he',
): string | undefined {
  const sub = getIndustryConfig(sector).subSectors.find((s) => s.id === subSectorId);
  if (!sub) return undefined;
  return locale === 'he' ? sub.labelHe : sub.labelEn;
}

/** Main sector + optional sub-sector label for reports and CRM */
export function getSectorDisplayLabel(
  sector: EquifySectorKey,
  subSectorId: string | undefined,
  locale: ValuationLocale = 'he',
): string {
  const main = getSectorChipLabel(sector, locale);
  if (!subSectorId) return main;
  const sub = getSubSectorLabel(sector, subSectorId, locale);
  return sub ? `${main} · ${sub}` : main;
}

export const SECTOR_SELECT_OPTIONS = (
  Object.keys(INDUSTRY_CONFIG) as EquifySectorKey[]
).map((key) => ({
  key,
  labelHe: INDUSTRY_CONFIG[key].chipLabelHe,
  labelEn: INDUSTRY_CONFIG[key].chipLabelEn,
}));
