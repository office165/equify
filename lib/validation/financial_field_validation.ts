import { z } from 'zod';
import { FINANCIAL_MAX_ABSOLUTE_NIS } from '../utils/financial_input_parser';

/** Monetary wizard field keys validated on blur in CurrencyInput. */
export type FinancialMonetaryFieldKey =
  | 'revenue_2024'
  | 'ebitda_2024'
  | 'revenue_2025'
  | 'ebitda_2025'
  | 'revenue_2026'
  | 'ebitda_2026'
  | 'backlog_signed'
  | 'gross_debt'
  | 'cash'
  | 'normalized_owner_salary';

const finiteNumber = z.number({ message: 'יש להזין מספר תקין' }).finite({
  message: 'יש להזין מספר תקין',
});

const nonNegativeFinite = finiteNumber
  .min(0, {
    message: 'יש להזין ערך חיובי או אפס',
  })
  .max(FINANCIAL_MAX_ABSOLUTE_NIS, {
    message: 'הערך גבוה מדי',
  });

const EBITDA_FIELDS = new Set<FinancialMonetaryFieldKey>([
  'ebitda_2024',
  'ebitda_2025',
  'ebitda_2026',
]);

function schemaForField(field: FinancialMonetaryFieldKey) {
  if (EBITDA_FIELDS.has(field)) {
    return finiteNumber.max(FINANCIAL_MAX_ABSOLUTE_NIS, {
      message: 'הערך גבוה מדי',
    });
  }
  return nonNegativeFinite;
}

/** Returns a Hebrew error message, or null when valid. */
export function validateFinancialMonetaryField(
  field: FinancialMonetaryFieldKey,
  value: number,
): string | null {
  const result = schemaForField(field).safeParse(value);
  if (result.success) {
    return null;
  }
  return result.error.issues[0]?.message ?? 'ערך לא תקין';
}
