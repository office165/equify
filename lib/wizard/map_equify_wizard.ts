/**
 * מיפוי מצב אשף equify לטופס ValuationWizard הקיים (CRM / API)
 */
import type { ValuationWizardFormValues } from '../../ValuationWizard';
import type {
  EquifyGoalKey,
  EquifyLifecycleKey,
  EquifySectorKey,
} from '../valuation';

export interface EquifyWizardProfile {
  fullName: string;
  userEmail: string;
  userMobilePhone: string;
  companyName: string;
  userNationalId: string;
  userCorporateTaxId: string;
  foundedYear: string;
  sector: EquifySectorKey;
  subSector: string;
  lifecycle: EquifyLifecycleKey;
  customLogoDataUrl: string;
  qualitativeDescription: string;
  currency: 'ILS' | 'USD' | 'EUR';
  fiscalYear: string;
}

export interface EquifyWizardFinancials {
  rev: number;
  margin: number;
  growth: number;
  /** חוב ברוטו (₪K) */
  grossDebtK: number;
  /** מזומן ושווי מזומנים (₪K) */
  cashK: number;
  /** שכר בעלים מנורמל (₪K) */
  normalizedOwnerSalaryK: number;
  /** רמת השקעות CAPEX (% מהכנסות) */
  capexLevelPct: number;
  /** @deprecated use grossDebtK − cashK */
  debt: number;
}

export interface EquifyWizardRisk {
  recurring: number;
  topCustomer: number;
  founderDep: boolean;
  competition: boolean;
  ip: boolean;
  contracts: boolean;
}

export interface EquifyWizardState {
  profile: EquifyWizardProfile;
  financials: EquifyWizardFinancials;
  risk: EquifyWizardRisk;
  goal: EquifyGoalKey;
  agreedToTerms: boolean;
}

import { getIndustryConfig, getSubSectorLabel } from '../constants/industry_config';

/** חוב נטו מ-₪K */
export function computeNetDebtK(financials: EquifyWizardFinancials): number {
  return Math.max(0, financials.grossDebtK - financials.cashK);
}

const GOAL_TO_PURPOSE: Record<
  Exclude<EquifyGoalKey, ''>,
  ValuationWizardFormValues['valuationPurpose']
> = {
  negotiation: 'M&A_SALE',
  fundraise: 'CAPITAL_RAISE',
  partner: 'INTERNAL_REPORT',
  bank: 'INTERNAL_REPORT',
  internal: 'INTERNAL_REPORT',
  legal: 'TAX',
};

/** ₪K → מחרוזת שקלים מוחלטים */
function kToAbsoluteString(k: number): string {
  return String(Math.round(k * 1000));
}

export function mapEquifyToWizardFormValues(
  state: EquifyWizardState,
): ValuationWizardFormValues {
  const { profile, financials, risk, goal } = state;
  const netDebtK = computeNetDebtK(financials);
  const ebitdaK =
    financials.rev * (financials.margin / 100) + financials.normalizedOwnerSalaryK;

  return {
    userMobilePhone: profile.userMobilePhone,
    userNationalId: profile.userNationalId,
    userCorporateTaxId: profile.userCorporateTaxId,
    userEmail: profile.userEmail,
    companyName: profile.companyName,
    fullName: profile.fullName,
    industry: getIndustryConfig(profile.sector).industryCode,
    lifecycleStage: profile.lifecycle,
    currency: profile.currency,
    incorporationCountry: 'IL',
    foundedYear: profile.foundedYear,
    annualRevenue: kToAbsoluteString(financials.rev),
    annualChurnRate: '',
    ebitda: kToAbsoluteString(ebitdaK),
    freeCashFlow: kToAbsoluteString(
      ebitdaK * Math.max(0.55, 0.85 - financials.capexLevelPct / 100),
    ),
    rdExpensesY1: '0',
    rdExpensesY2: '0',
    rdExpensesY3: '0',
    rdExpensesY4: '0',
    rdExpensesY5: '0',
    interestExpense: '0',
    totalDebt: kToAbsoluteString(financials.grossDebtK),
    cashAndEquivalents: kToAbsoluteString(financials.cashK),
    qualitativeDescription: [
      profile.qualitativeDescription,
      profile.subSector
        ? `תת-ענף: ${getSubSectorLabel(profile.sector, profile.subSector, 'he') ?? profile.subSector}`
        : '',
      financials.normalizedOwnerSalaryK > 0
        ? `שכר בעלים מנורמל: ₪${financials.normalizedOwnerSalaryK}K`
        : '',
      financials.capexLevelPct > 0
        ? `CAPEX: ${financials.capexLevelPct}% מהכנסות`
        : '',
    ]
      .filter(Boolean)
      .join(' · '),
    customLogoDataUrl: profile.customLogoDataUrl,
    netDebt: kToAbsoluteString(netDebtK),
    recurringRevenuePct: risk.recurring,
    customerConcentrationPct: risk.topCustomer,
    customerConcentrationOver20: risk.topCustomer > 20,
    competitionLevel: risk.competition ? 4 : 2,
    ipProtection: risk.ip,
    founderDependency: risk.founderDep,
    valuationPurpose: goal ? GOAL_TO_PURPOSE[goal] : '',
  };
}

export const DEFAULT_EQUIFY_WIZARD_STATE: EquifyWizardState = {
  profile: {
    fullName: '',
    userEmail: '',
    userMobilePhone: '',
    companyName: '',
    userNationalId: '',
    userCorporateTaxId: '',
    foundedYear: '',
    sector: 'hospitality',
    subSector: 'boutique_hotel',
    lifecycle: 'growth',
    customLogoDataUrl: '',
    qualitativeDescription: '',
    currency: 'ILS',
    fiscalYear: String(new Date().getFullYear()),
  },
  financials: {
    rev: 12000,
    margin: 22.6,
    growth: 9,
    grossDebtK: 5200,
    cashK: 800,
    normalizedOwnerSalaryK: 420,
    capexLevelPct: 6,
    debt: 4400,
  },
  risk: {
    recurring: 60,
    topCustomer: 20,
    founderDep: false,
    competition: false,
    ip: true,
    contracts: true,
  },
  goal: '',
  agreedToTerms: false,
};
