import type { ValuationLocale } from '../../api_client';
import type { EquifySectorKey } from '../valuation';
import type { Industry } from '../valuation/multiples';
import {
  multiplesMethodologyCopy,
  multiplesMethodologyCopyEn,
} from '../i18n/equify_report_copy';

export type SubSectorPrimaryMultiple =
  | 'ev_ebitda'
  | 'ev_revenue'
  | 'pbv'
  | 'nav';

export type SubSectorEngineMultipleType = 'EBITDA' | 'Revenue';

/** Institutional model blend weights (percentages, sum = 100). */
export interface SubSectorModelWeights {
  dcf: number;
  multiplier: number;
}

/**
 * Application metadata profile — conservative multiples, WACC baselines, and model weights.
 * Consumed by future engine normalization; config-only until wired.
 */
export interface SubSectorInstitutionalConfig {
  id: string;
  name: string;
  multipleType: SubSectorEngineMultipleType;
  defaultMultiple: number;
  waccBaseline: number;
  weights: SubSectorModelWeights;
  /** When true, triggers cyclical EBITDA normalization in the valuation pipeline. */
  isCyclicalNormalized: boolean;
}

export interface SectorApplicationMetadata {
  id: string;
  name: string;
  subSectors: SubSectorInstitutionalConfig[];
}

/** Canonical real-estate sector metadata (institutional-grade conservative baselines). */
export const REAL_ESTATE_SECTOR_METADATA: SectorApplicationMetadata = {
  id: 'real-estate',
  name: 'נדל"ן, בינוי ותשתיות',
  subSectors: [
    {
      id: 're-development',
      name: 'יזמות נדל"ן (מגורים ומסחרי)',
      multipleType: 'EBITDA',
      defaultMultiple: 6.5,
      waccBaseline: 12.0,
      weights: { dcf: 75, multiplier: 25 },
      isCyclicalNormalized: true,
    },
    {
      id: 're-contracting',
      name: 'קבלנות ביצוע ותשתיות',
      multipleType: 'EBITDA',
      defaultMultiple: 5.5,
      waccBaseline: 9.5,
      weights: { dcf: 50, multiplier: 50 },
      isCyclicalNormalized: true,
    },
    {
      id: 're-proptech',
      name: 'PropTech וניהול נכסים',
      multipleType: 'EBITDA',
      defaultMultiple: 12.0,
      waccBaseline: 8.5,
      weights: { dcf: 40, multiplier: 60 },
      isCyclicalNormalized: false,
    },
  ],
} as const;

/** SMB niches — conservative multiples, elevated WACC, multiplier-heavy blends. */
export const SMB_SECTOR_METADATA: SectorApplicationMetadata = {
  id: 'smb-retail-fb',
  name: 'עסקים קטנים ובינוניים — מזון וקמעונאות',
  subSectors: [
    {
      id: 'restaurants-fb',
      name: 'מסעדנות, קייטרинг ושירותי מזון',
      multipleType: 'EBITDA',
      defaultMultiple: 2.5,
      waccBaseline: 19.0,
      weights: { dcf: 30, multiplier: 70 },
      isCyclicalNormalized: false,
    },
    {
      id: 'retail-supermarkets',
      name: 'סופרמרקטים ומכולות',
      multipleType: 'EBITDA',
      defaultMultiple: 4.5,
      waccBaseline: 11.0,
      weights: { dcf: 40, multiplier: 60 },
      isCyclicalNormalized: false,
    },
    {
      id: 'retail-fashion',
      name: 'חנויות אופנה ופופ-אפ',
      multipleType: 'EBITDA',
      defaultMultiple: 3.5,
      waccBaseline: 14.5,
      weights: { dcf: 35, multiplier: 65 },
      isCyclicalNormalized: false,
    },
  ],
} as const;

const SMB_INSTITUTIONAL_BY_ID: Record<string, SubSectorInstitutionalConfig> =
  Object.fromEntries(SMB_SECTOR_METADATA.subSectors.map((s) => [s.id, s]));

/** Wizard Step 1 sub-sector ids → SMB institutional metadata ids. */
export const SMB_WIZARD_TO_INSTITUTIONAL_ID: Record<string, string> = {
  'restaurants-fb': 'restaurants-fb',
  'retail-supermarkets': 'retail-supermarkets',
  'retail-fashion': 'retail-fashion',
};

/** Wizard Step 1 sub-sector ids → institutional metadata ids. */
export const REAL_ESTATE_WIZARD_TO_INSTITUTIONAL_ID: Record<string, string> = {
  re_development: 're-development',
  construction_contracting: 're-contracting',
  proptech: 're-proptech',
};

/** Injected math-engine defaults — consumed by sector methodology resolver (no formula edits). */
export interface SubSectorEngineDefaults {
  defaultMultipleType: SubSectorEngineMultipleType;
  defaultMultipleValue: number;
  /** Decimal blend weights, e.g. 0.5 = 50%. */
  weightDcf: number;
  weightEbitda: number;
  weightRev?: number;
  /** Sector WACC baseline (%), e.g. 9.5 = 9.5%. */
  waccBasePct: number;
  isCyclicalNormalized?: boolean;
}

export interface SubSectorValuationProfile {
  /** Primary market multiple shown on the Step 1 insight card and used by the engine. */
  primaryMultiple: SubSectorPrimaryMultiple;
  /** Institutional display range (×), e.g. P/B 1.0–2.0 or EV/EBITDA 5–7. */
  multipleRange?: [number, number];
  /** NAV blend weight for development / income-producing profiles (0–1). */
  navWeight?: number;
  /** Override multiples table when sub-sector mechanics differ from the parent sector. */
  multiplesIndustry?: Industry;
  disclaimerHe?: string;
  disclaimerEn?: string;
}

export interface SubSectorOption {
  id: string;
  labelHe: string;
  labelEn: string;
  /** Multiplier adjustment vs sector baseline */
  multAdj: number;
  valuation?: SubSectorValuationProfile;
  engine?: SubSectorEngineDefaults;
  /** Link to {@link REAL_ESTATE_SECTOR_METADATA} sub-sector id (when applicable). */
  institutionalId?: string;
  /** Denormalized institutional profile — mirrors application metadata payload. */
  institutional?: SubSectorInstitutionalConfig;
}

/** SMB physical retail + F&B sub-sectors — shared across dedicated main-sector entries. */
const SMB_SUB_RETAIL_SUPERMARKETS: SubSectorOption = {
  id: 'retail-supermarkets',
  institutionalId: 'retail-supermarkets',
  labelHe: 'סופרמרקטים ומכולות',
  labelEn: 'Supermarkets / Grocery',
  multAdj: 0.92,
  institutional: SMB_INSTITUTIONAL_BY_ID['retail-supermarkets'],
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [4.0, 5.0],
    multiplesIndustry: 'retail_unified',
    disclaimerHe:
      'סופרים שכונתיים, רשתות מזון וחנויות נוחות — פרופיל סיכון נמוך יותר; מכפיל EBITDA יציב (4.0×–5.0×).',
    disclaimerEn:
      'Neighborhood grocers, food chains and convenience stores — lower-risk, recession-resilient EBITDA multiples (4.0×–5.0×).',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 4.5,
    weightDcf: 0.4,
    weightEbitda: 0.6,
    waccBasePct: 11.0,
    isCyclicalNormalized: false,
  },
};

const SMB_SUB_RETAIL_FASHION: SubSectorOption = {
  id: 'retail-fashion',
  institutionalId: 'retail-fashion',
  labelHe: 'חנויות אופנה ופופ-אפ',
  labelEn: 'Fashion Retail',
  multAdj: 0.85,
  institutional: SMB_INSTITUTIONAL_BY_ID['retail-fashion'],
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [3.0, 4.0],
    multiplesIndustry: 'retail_unified',
    disclaimerHe:
      'חנויות בגדים, הנעלה ואקססוריז — מכפיל מושפע ממלאי מת, עונתיות וצריכה דיסcretionary (3.0×–4.0×).',
    disclaimerEn:
      'Apparel, footwear and accessories — multiples reflect dead-stock, seasonality and discretionary spend (3.0×–4.0×).',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 3.5,
    weightDcf: 0.35,
    weightEbitda: 0.65,
    waccBasePct: 14.5,
    isCyclicalNormalized: false,
  },
};

const SMB_SUB_RESTAURANT_QSR: SubSectorOption = {
  id: 'restaurant_qsr',
  institutionalId: 'restaurants-fb',
  labelHe: 'מסעדות, קייטרинг ושירותי מזון',
  labelEn: 'Restaurants, Catering & Food Service',
  multAdj: 0.82,
  institutional: SMB_INSTITUTIONAL_BY_ID['restaurants-fb'],
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [2.5, 4.0],
    multiplesIndustry: 'food_service',
    disclaimerHe:
      'מסעדנות, קייטרинг ושירותי מזון — מכפיל EBITDA שמרני (2.0×–3.0×) ו-WACC גבוה (19%) בשל תנודתיות תפעולית.',
    disclaimerEn:
      'Restaurants, catering and food service — conservative EBITDA multiples (2.0×–3.0×) and elevated WACC (19%) reflecting operational volatility.',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 3.5,
    weightDcf: 0.4,
    weightEbitda: 0.6,
    waccBasePct: 15.5,
    isCyclicalNormalized: false,
  },
};

const SMB_SUB_CAFE: SubSectorOption = {
  id: 'cafe',
  labelHe: 'בתי קפה ומשקאות',
  labelEn: 'Cafes & Beverages',
  multAdj: 0.88,
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [3.0, 5.0],
    multiplesIndustry: 'food_service',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 4.0,
    weightDcf: 0.4,
    weightEbitda: 0.6,
    waccBasePct: 15.0,
  },
};

const SMB_SUB_CATERING: SubSectorOption = {
  id: 'catering',
  labelHe: 'קייטרינג ואירועים',
  labelEn: 'Catering & Events',
  multAdj: 0.9,
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [3.5, 5.5],
    multiplesIndustry: 'food_service',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 4.5,
    weightDcf: 0.4,
    weightEbitda: 0.6,
    waccBasePct: 14.5,
  },
};

const SMB_SUB_FRANCHISE: SubSectorOption = {
  id: 'franchise',
  labelHe: 'רשתות מזון וזכיינות',
  labelEn: 'Food Chains & Franchise',
  multAdj: 1.05,
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [5.0, 8.0],
    multiplesIndustry: 'food_service',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 6.5,
    weightDcf: 0.4,
    weightEbitda: 0.6,
    waccBasePct: 14.0,
  },
};

const SMB_SUB_DELIVERY: SubSectorOption = {
  id: 'delivery',
  labelHe: 'מזון מוכן ודלוורי',
  labelEn: 'Ready Food & Delivery',
  multAdj: 0.95,
  valuation: {
    primaryMultiple: 'ev_ebitda',
    multipleRange: [3.0, 5.5],
    multiplesIndustry: 'food_service',
  },
  engine: {
    defaultMultipleType: 'EBITDA',
    defaultMultipleValue: 4.2,
    weightDcf: 0.4,
    weightEbitda: 0.6,
    waccBasePct: 15.5,
  },
};

export interface IndustryConfigEntry {
  sectorKey: EquifySectorKey;
  chipLabelHe: string;
  chipLabelEn: string;
  /** Industry code for valuation API / CRM */
  industryCode: string;
  maDealCount: number;
  multiplesSectorPhraseHe: string;
  multiplesSectorPhraseEn: string;
  /** Application metadata id (e.g. real-estate) when sector has institutional profile. */
  applicationMetadataId?: string;
  subSectors: SubSectorOption[];
}

export const INDUSTRY_CONFIG: Record<EquifySectorKey, IndustryConfigEntry> = {
  hospitality: {
    sectorKey: 'hospitality',
    chipLabelHe: 'מלונאות ואירוח',
    chipLabelEn: 'Hotels & Hospitality',
    industryCode: 'מלונאות ואירוח',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי המלונאות והאירוח',
    multiplesSectorPhraseEn: 'in hotels & hospitality',
    subSectors: [
      {
        id: 'boutique_hotel',
        labelHe: 'מלון בוטיק',
        labelEn: 'Boutique Hotel',
        multAdj: 1.05,
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [8.0, 11.0],
          multiplesIndustry: 'hospitality',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 9.5,
          weightDcf: 0.55,
          weightEbitda: 0.45,
          waccBasePct: 13.8,
        },
      },
      {
        id: 'hotel_chain',
        labelHe: 'רשת מלונות',
        labelEn: 'Hotel Chain',
        multAdj: 1.12,
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [9.0, 12.0],
          multiplesIndustry: 'hospitality',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 10.5,
          weightDcf: 0.55,
          weightEbitda: 0.45,
          waccBasePct: 13.5,
        },
      },
      {
        id: 'vacation',
        labelHe: 'אירועים ונופש',
        labelEn: 'Events & Vacation',
        multAdj: 0.98,
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [7.5, 10.5],
          multiplesIndustry: 'hospitality',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 9.0,
          weightDcf: 0.55,
          weightEbitda: 0.45,
          waccBasePct: 13.8,
        },
      },
      {
        id: 'airbnb_mgmt',
        labelHe: 'ניהול נכסי אירוח',
        labelEn: 'Short-term Rental Mgmt',
        multAdj: 1.0,
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [7.0, 10.0],
          multiplesIndustry: 'hospitality',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 8.5,
          weightDcf: 0.5,
          weightEbitda: 0.5,
          waccBasePct: 14.0,
        },
      },
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
      { id: 'marketplace', labelHe: 'Marketplace טכנולוגי (תוכנה)', labelEn: 'Marketplace', multAdj: 0.95 },
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
      { id: 'biotech', labelHe: 'פארמה / Biotech', labelEn: 'Biotech', multAdj: 1.15 },
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
  retail_unified: {
    sectorKey: 'retail_unified',
    chipLabelHe: 'קמעונאות ומסחר',
    chipLabelEn: 'Retail & Commerce',
    industryCode: 'קמעונאות ומסחר',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הקמעונאות והמסחר',
    multiplesSectorPhraseEn: 'in retail & commerce',
    subSectors: [
      SMB_SUB_RETAIL_SUPERMARKETS,
      {
        id: 'd2c',
        labelHe: 'D2C ומותגי ישיר',
        labelEn: 'D2C & Direct Brands',
        multAdj: 1.05,
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [5.0, 7.5],
          multiplesIndustry: 'retail_unified',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 6.0,
          weightDcf: 0.35,
          weightEbitda: 0.65,
          waccBasePct: 14.0,
        },
      },
      SMB_SUB_RETAIL_FASHION,
      {
        id: 'marketplace',
        labelHe: 'Marketplace מסחרי',
        labelEn: 'Commercial Marketplace',
        multAdj: 0.95,
        valuation: {
          primaryMultiple: 'ev_revenue',
          multipleRange: [0.4, 0.8],
          multiplesIndustry: 'retail_unified',
        },
        engine: {
          defaultMultipleType: 'Revenue',
          defaultMultipleValue: 0.6,
          weightDcf: 0.3,
          weightEbitda: 0,
          weightRev: 0.7,
          waccBasePct: 14.5,
        },
      },
      {
        id: 'specialty',
        labelHe: 'חנויות מתמחות',
        labelEn: 'Specialty Retail',
        multAdj: 0.9,
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [4.0, 6.5],
          multiplesIndustry: 'retail_unified',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 5.2,
          weightDcf: 0.35,
          weightEbitda: 0.65,
          waccBasePct: 14.8,
        },
      },
    ],
  },
  food_service: {
    sectorKey: 'food_service',
    chipLabelHe: 'מזון ומסעדנות',
    chipLabelEn: 'Food & Restaurant',
    industryCode: 'מזון ומסעדנות',
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי המסעדנות והמזון',
    multiplesSectorPhraseEn: 'in food & restaurants',
    subSectors: [
      SMB_SUB_RESTAURANT_QSR,
      SMB_SUB_CAFE,
      SMB_SUB_CATERING,
      SMB_SUB_FRANCHISE,
      SMB_SUB_DELIVERY,
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
  real_estate: {
    sectorKey: 'real_estate',
    chipLabelHe: 'נדל"ן, בינוי ותשתיות',
    chipLabelEn: 'Real Estate, Construction & Infrastructure',
    industryCode: 'Real Estate & Construction',
    applicationMetadataId: REAL_ESTATE_SECTOR_METADATA.id,
    maDealCount: 12,
    multiplesSectorPhraseHe: 'בענפי הנדל"ן, הבינוי והתשתיות',
    multiplesSectorPhraseEn: 'in real estate, construction & infrastructure',
    subSectors: [
      {
        id: 're_development',
        institutionalId: 're-development',
        labelHe: 'יזמות נדל"ן (מגורים ומסחרי)',
        labelEn: 'Real Estate Development (Residential & Commercial)',
        multAdj: 1.05,
        institutional: REAL_ESTATE_SECTOR_METADATA.subSectors[0],
        valuation: {
          primaryMultiple: 'pbv',
          multipleRange: [1.0, 2.0],
          navWeight: 0.4,
          multiplesIndustry: 'realestate',
          disclaimerHe:
            'חברות יזמות נדל"ן מוערכות לרוב על בסיס ההון העצמי שלהן (NAV) ולא לפי מכפילי רווח מסורתיים, בשל תנודתיות בהכרה בהכנסות ובאופי המימון הפרויקטלי.',
          disclaimerEn:
            'Development companies are typically valued on book equity (NAV) rather than earnings multiples, due to lumpy revenue recognition and project-level leverage.',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 6.5,
          weightDcf: 0.75,
          weightEbitda: 0.25,
          waccBasePct: 12.0,
          isCyclicalNormalized: true,
        },
      },
      {
        id: 're_income',
        labelHe: 'נדל"ן מניב',
        labelEn: 'Income-producing Real Estate',
        multAdj: 0.98,
        valuation: {
          primaryMultiple: 'nav',
          multipleRange: [0.9, 1.2],
          navWeight: 1.0,
          multiplesIndustry: 'realestate',
          disclaimerHe:
            'נדל"ן מניב מוערך לרוב בשיטת NAV (שווי נכסים) ו/או Cap Rate על תזרימי NOI — לא במכפיל EBITDA תפעולי.',
          disclaimerEn:
            'Income-producing assets are typically valued via NAV and/or cap rates on NOI — not operating EBITDA multiples.',
        },
      },
      {
        id: 'construction_contracting',
        institutionalId: 're-contracting',
        labelHe: 'קבלנות ביצוע ותשתיות',
        labelEn: 'Construction Contracting',
        multAdj: 0.95,
        institutional: REAL_ESTATE_SECTOR_METADATA.subSectors[1],
        valuation: {
          primaryMultiple: 'ev_ebitda',
          multipleRange: [5, 7],
          multiplesIndustry: 'construction',
          disclaimerHe:
            'קבלני ביצוע מוערכים ב-DCF ומכפיל EV/EBITDA סטנדרטי — EBITDA מייצג תזרים תפעולי ללא מימון פרויקטלי של היזם.',
          disclaimerEn:
            'Contractors are valued with DCF and standard EV/EBITDA — EBITDA reflects operating cash conversion without developer-style project finance.',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 5.5,
          weightDcf: 0.5,
          weightEbitda: 0.5,
          waccBasePct: 9.5,
          isCyclicalNormalized: true,
        },
      },
      {
        id: 'proptech',
        institutionalId: 're-proptech',
        labelHe: 'PropTech וניהול נכסים',
        labelEn: 'PropTech & Property Management',
        multAdj: 1.08,
        institutional: REAL_ESTATE_SECTOR_METADATA.subSectors[2],
        valuation: {
          primaryMultiple: 'ev_revenue',
          multiplesIndustry: 'professional_services',
          disclaimerHe:
            'ניהול נכסים ו-PropTech קרובים לשירותים/טכנולוגיה — EV/Revenue או EV/EBITDA לפי שלב ורווחיות.',
          disclaimerEn:
            'Property management and PropTech sit closer to services/tech — EV/Revenue or EV/EBITDA depending on stage and margins.',
        },
        engine: {
          defaultMultipleType: 'EBITDA',
          defaultMultipleValue: 12.0,
          weightDcf: 0.4,
          weightEbitda: 0.6,
          waccBasePct: 8.5,
          isCyclicalNormalized: false,
        },
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

/** Sub-sector chip label for wizard Step 1 (distinct from main sector chip). */
export function getSubSectorChipLabel(
  _sector: EquifySectorKey,
  subSector: SubSectorOption,
  locale: ValuationLocale = 'he',
): string {
  return locale === 'he' ? subSector.labelHe : subSector.labelEn;
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

export function getSubSectorValuationProfile(
  sector: EquifySectorKey,
  subSectorId: string,
): SubSectorValuationProfile | undefined {
  const sub = getIndustryConfig(sector).subSectors.find((s) => s.id === subSectorId);
  return sub?.valuation;
}

export function getSubSectorEngineDefaults(
  sector: EquifySectorKey,
  subSectorId: string,
): SubSectorEngineDefaults | undefined {
  const sub = getIndustryConfig(sector).subSectors.find((s) => s.id === subSectorId);
  return sub?.engine;
}

export function getRealEstateSectorMetadata(): SectorApplicationMetadata {
  return REAL_ESTATE_SECTOR_METADATA;
}

/** Resolves wizard sub-sector id or institutional id → institutional profile. */
export function getInstitutionalSubSectorConfig(
  sector: EquifySectorKey,
  subSectorId: string,
): SubSectorInstitutionalConfig | undefined {
  const entry = getIndustryConfig(sector);
  const byWizardId = entry.subSectors.find((s) => s.id === subSectorId);
  if (byWizardId?.institutional) return byWizardId.institutional;

  const smbId = SMB_WIZARD_TO_INSTITUTIONAL_ID[subSectorId] ?? subSectorId;
  const smb = SMB_INSTITUTIONAL_BY_ID[smbId];
  if (smb) return smb;

  if (sector !== 'real_estate') return undefined;

  const institutionalId =
    REAL_ESTATE_WIZARD_TO_INSTITUTIONAL_ID[subSectorId] ?? subSectorId;
  return REAL_ESTATE_SECTOR_METADATA.subSectors.find((s) => s.id === institutionalId);
}

export function resolveInstitutionalSubSectorId(wizardSubSectorId: string): string | undefined {
  return (
    REAL_ESTATE_WIZARD_TO_INSTITUTIONAL_ID[wizardSubSectorId] ??
    REAL_ESTATE_SECTOR_METADATA.subSectors.find((s) => s.id === wizardSubSectorId)?.id
  );
}

/** Converts institutional weight percentages to decimal engine weights. */
export function institutionalWeightsToEngineDefaults(
  institutional: SubSectorInstitutionalConfig,
): Pick<SubSectorEngineDefaults, 'weightDcf' | 'weightEbitda'> {
  return {
    weightDcf: institutional.weights.dcf / 100,
    weightEbitda: institutional.weights.multiplier / 100,
  };
}

/** Maps a sub-sector to the institutional multiples table row (falls back to parent sector). */
export function resolveSubSectorMultiplesIndustry(
  sector: EquifySectorKey,
  subSectorId: string,
): Industry {
  const profile = getSubSectorValuationProfile(sector, subSectorId);
  if (profile?.multiplesIndustry) return profile.multiplesIndustry;

  const fallback: Partial<Record<EquifySectorKey, Industry>> = {
    real_estate: 'realestate',
    industry: 'manufacturing',
    services: 'professional_services',
    hospitality: 'hospitality',
    saas: 'saas',
    fintech: 'fintech',
    cyber: 'cyber',
    health: 'healthtech',
    retail_unified: 'retail_unified',
    food_service: 'food_service',
    energy: 'energy',
    defense_aerospace: 'defense',
    other: 'other',
  };
  return fallback[sector] ?? 'other';
}

export function getSubSectorsForSector(sector: EquifySectorKey): SubSectorOption[] {
  return getIndustryConfig(sector).subSectors;
}

/** Maps legacy wizard sub-sector ids to their dedicated main sector. */
const SMB_SUB_SECTOR_MAIN_SECTOR: Record<string, EquifySectorKey> = {
  'retail-supermarkets': 'retail_unified',
  'retail-fashion': 'retail_unified',
  'restaurants-fb': 'food_service',
  restaurant_qsr: 'food_service',
};

/**
 * Ensures sector/sub-sector selections stay in sync — migrates legacy placements and
 * resets invalid sub-sectors to the first option of the active main sector.
 */
export function coerceWizardSectorSelection(
  sector: EquifySectorKey,
  subSector?: string,
): { sector: EquifySectorKey; subSector: string } {
  let nextSector = sector;
  let nextSub = subSector ?? '';

  // Legacy EquifySectorKey migration
  if ((nextSector as string) === 'ecom' || (nextSector as string) === 'retail_trade') {
    nextSector = 'retail_unified';
  }

  // Legacy sub-sector id migration
  if (nextSub === 'restaurants-fb' || nextSub === 'restaurant') {
    nextSub = 'restaurant_qsr';
    if (nextSector === 'hospitality') {
      nextSector = 'food_service';
    }
  }
  if (nextSub === 'events') {
    nextSub = 'vacation';
  }
  if (nextSub === 'marketplace_ecom' || nextSub === 'marketplace_retail') {
    nextSub = 'marketplace';
    if ((nextSector as string) === 'ecom' || (nextSector as string) === 'retail_trade') {
      nextSector = 'retail_unified';
    }
  }
  if (nextSub === 'retail' && (nextSector as string) === 'ecom') {
    nextSector = 'retail_unified';
    nextSub = 'retail-supermarkets';
  }

  const dedicatedMain = nextSub ? SMB_SUB_SECTOR_MAIN_SECTOR[nextSub] : undefined;
  if (dedicatedMain && nextSector !== dedicatedMain) {
    nextSector = dedicatedMain;
  }

  const subs = getSubSectorsForSector(nextSector);
  if (subs.length > 0 && (!nextSub || !subs.some((s) => s.id === nextSub))) {
    nextSub = subs[0]!.id;
  }

  return { sector: nextSector, subSector: nextSub };
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
