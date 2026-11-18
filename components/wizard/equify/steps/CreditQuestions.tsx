'use client';

/**
 * Round 4 (CREDIT_CHAPTER): four short optional questions in the debt part of step 2.
 * Rendered by Step2Financials only when the flag is on. None of them is required.
 */
import React from 'react';
import { DEFAULT_EQUIFY_WIZARD_CREDIT } from '../../../../lib/wizard/map_equify_wizard';
import { SmartInput } from '../../ui/SmartInput';
import { useReportingCurrency, useWizardValuation } from '../WizardValuationContext';

const COPY = {
  he: {
    title: 'אשראי והחזקות (לא חובה)',
    monthly: 'כמה העסק משלם היום בחודש על הלוואות',
    monthlyTip: 'סך ההחזר החודשי על כל ההלוואות של העסק (קרן וריבית).',
    ownerLoans: 'הלוואות בעלים או חברות קשורות',
    ownerLoansAmount: 'סכום הלוואות הבעלים (מתוך החוב הברוטו)',
    liens: 'שעבודים קיימים',
    lienHolder: 'לטובת',
    lienType: 'סוג השעבוד',
    holder: { bank: 'בנק', non_bank: 'גוף חוץ בנקאי', other: 'אחר' },
    type: { floating: 'שוטף', specific: 'ספציפי', all_assets: 'על כל הרכוש' },
    nonOp: 'החזקות בחברות אחרות או נכסים שלא בפעילות',
    holdingPct: 'אחוז ההחזקה',
    preTaxProfit: 'רווח לפני מס של החברה המוחזקת (שנתי)',
    estimatedValue: 'או: שווי משוער של החברה המוחזקת',
    nonOpTip: 'מספיק אחד מהשניים. אם יש שווי משוער, הוא קודם.',
    no: 'אין',
    yes: 'יש',
    choose: 'בחירה',
  },
  en: {
    title: 'Credit and holdings (optional)',
    monthly: 'Monthly loan payments today',
    monthlyTip: 'Total monthly payment on all business loans (principal and interest).',
    ownerLoans: 'Owner or related company loans',
    ownerLoansAmount: 'Owner loans amount (part of gross debt)',
    liens: 'Existing liens',
    lienHolder: 'In favor of',
    lienType: 'Lien type',
    holder: { bank: 'Bank', non_bank: 'Non-bank lender', other: 'Other' },
    type: { floating: 'Floating', specific: 'Specific', all_assets: 'All assets' },
    nonOp: 'Holdings in other companies or non-operating assets',
    holdingPct: 'Holding share',
    preTaxProfit: 'Held company pre-tax profit (annual)',
    estimatedValue: 'Or: estimated value of the held company',
    nonOpTip: 'One of the two is enough. An estimated value takes precedence.',
    no: 'No',
    yes: 'Yes',
    choose: 'Choose',
  },
} as const;

function YesNo({
  label,
  value,
  onChange,
  copy,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  copy: (typeof COPY)['he'] | (typeof COPY)['en'];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="sel" value={value ? 'yes' : 'no'} onChange={(e) => onChange(e.target.value === 'yes')} aria-label={label}>
        <option value="no">{copy.no}</option>
        <option value="yes">{copy.yes}</option>
      </select>
    </div>
  );
}

export function CreditQuestions({ locale }: { locale: 'he' | 'en' }) {
  const copy = COPY[locale];
  const { state, updateCredit } = useWizardValuation();
  const { reportingCurrency } = useReportingCurrency();
  const credit = state.credit ?? DEFAULT_EQUIFY_WIZARD_CREDIT;

  return (
    <div className="credit-questions rv" data-testid="credit-questions">
      <div className="pane-eyebrow" style={{ marginTop: 12 }}>{copy.title}</div>

      <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
        <SmartInput
          label={copy.monthly}
          tooltip={copy.monthlyTip}
          value={credit.monthlyDebtServiceK}
          variant="currency"
          currencyCode={reportingCurrency}
          density="compact"
          ariaLabel={copy.monthly}
          onChange={(v) => updateCredit({ monthlyDebtServiceK: v })}
        />
        <YesNo
          label={copy.ownerLoans}
          value={credit.ownerLoans.has}
          copy={copy}
          onChange={(has) => updateCredit({ ownerLoans: { ...credit.ownerLoans, has } })}
        />
        {credit.ownerLoans.has ? (
          <SmartInput
            label={copy.ownerLoansAmount}
            value={credit.ownerLoans.amountK}
            variant="currency"
            currencyCode={reportingCurrency}
            density="compact"
            ariaLabel={copy.ownerLoansAmount}
            onChange={(amountK) => updateCredit({ ownerLoans: { ...credit.ownerLoans, amountK } })}
          />
        ) : null}
      </div>

      <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
        <YesNo
          label={copy.liens}
          value={credit.liens.has}
          copy={copy}
          onChange={(has) => updateCredit({ liens: { ...credit.liens, has } })}
        />
        {credit.liens.has ? (
          <>
            <div className="field">
              <label>{copy.lienHolder}</label>
              <select
                className="sel"
                aria-label={copy.lienHolder}
                value={credit.liens.holder}
                onChange={(e) => updateCredit({ liens: { ...credit.liens, holder: e.target.value as typeof credit.liens.holder } })}
              >
                <option value="">{copy.choose}</option>
                <option value="bank">{copy.holder.bank}</option>
                <option value="non_bank">{copy.holder.non_bank}</option>
                <option value="other">{copy.holder.other}</option>
              </select>
            </div>
            <div className="field">
              <label>{copy.lienType}</label>
              <select
                className="sel"
                aria-label={copy.lienType}
                value={credit.liens.type}
                onChange={(e) => updateCredit({ liens: { ...credit.liens, type: e.target.value as typeof credit.liens.type } })}
              >
                <option value="">{copy.choose}</option>
                <option value="floating">{copy.type.floating}</option>
                <option value="specific">{copy.type.specific}</option>
                <option value="all_assets">{copy.type.all_assets}</option>
              </select>
            </div>
          </>
        ) : null}
      </div>

      <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
        <YesNo
          label={copy.nonOp}
          value={credit.nonOperating.has}
          copy={copy}
          onChange={(has) => updateCredit({ nonOperating: { ...credit.nonOperating, has } })}
        />
        {credit.nonOperating.has ? (
          <>
            <SmartInput
              label={copy.holdingPct}
              value={credit.nonOperating.holdingPct}
              variant="percent"
              density="compact"
              ariaLabel={copy.holdingPct}
              onChange={(holdingPct) =>
                updateCredit({ nonOperating: { ...credit.nonOperating, holdingPct: Math.min(100, Math.max(0, holdingPct)) } })
              }
            />
            <SmartInput
              label={copy.preTaxProfit}
              tooltip={copy.nonOpTip}
              value={credit.nonOperating.preTaxProfitK}
              variant="currency"
              currencyCode={reportingCurrency}
              density="compact"
              ariaLabel={copy.preTaxProfit}
              onChange={(preTaxProfitK) => updateCredit({ nonOperating: { ...credit.nonOperating, preTaxProfitK } })}
            />
            <SmartInput
              label={copy.estimatedValue}
              tooltip={copy.nonOpTip}
              value={credit.nonOperating.estimatedValueK}
              variant="currency"
              currencyCode={reportingCurrency}
              density="compact"
              ariaLabel={copy.estimatedValue}
              onChange={(estimatedValueK) => updateCredit({ nonOperating: { ...credit.nonOperating, estimatedValueK } })}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
