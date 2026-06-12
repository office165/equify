import type { ValuationLocale } from '../../api_client';
import { resolveMondayNationalId } from '../crm/monday_lead_wire';
import { normalizePhoneE164 } from '../phone/normalize_e164';
import type { UnifiedBackupRelayInput } from '../pdf/backup_mirror';
import type { ValuationWizardFormValues } from '../../ValuationWizard';
import type { WizardStep1LeadPayload } from './step1_lead_sync';

/** Five Monday identity fields captured from the wizard validation step (latest trim state). */
export interface WizardLeadIdentifierBundle {
  fullName: string;
  companyName: string;
  nationalId: string;
  corporateTaxId: string;
  userPhone: string;
  userEmail: string;
}

/** Five CRM identity fields — locked strings before any layout swap. */
export interface SecuredLeadFiveFieldPayload {
  fullName: string;
  companyName: string;
  userPhone: string;
  nationalId: string;
  userEmail: string;
}

export function lockWizardLeadFiveFields(
  values: ValuationWizardFormValues,
): SecuredLeadFiveFieldPayload {
  return captureWizardLeadIdentifiers(values);
}

export function lockLeadPayload(
  values: ValuationWizardFormValues,
  locale: ValuationLocale,
): WizardStep1LeadPayload {
  const five = lockWizardLeadFiveFields(values);
  return {
    ...five,
    corporateTaxId: String(values.userCorporateTaxId ?? '').trim(),
    industryCode: String(values.industry ?? '').trim(),
    locale,
  };
}

export function captureWizardLeadIdentifiers(
  values: ValuationWizardFormValues,
): WizardLeadIdentifierBundle {
  const nationalId = values.userNationalId.trim();
  const corporateTaxId = values.userCorporateTaxId?.trim() ?? '';
  return {
    fullName: values.fullName.trim(),
    companyName: values.companyName.trim(),
    nationalId: resolveMondayNationalId(nationalId, corporateTaxId),
    corporateTaxId,
    userPhone: normalizePhoneE164(values.userMobilePhone.trim()),
    userEmail: values.userEmail.trim().toLowerCase(),
  };
}

export function buildWizardLeadRelayInput(
  values: ValuationWizardFormValues,
  options?: {
    valuationMidpoint?: number;
    locale?: 'he' | 'en';
    industry?: string;
    sectorLabel?: string;
    pdfBase64?: string;
  },
): UnifiedBackupRelayInput {
  const ids = captureWizardLeadIdentifiers(values);
  return {
    ...ids,
    valuationMidpoint: options?.valuationMidpoint ?? 0,
    industry: options?.industry ?? values.industry.trim(),
    sectorLabel: options?.sectorLabel,
    locale: options?.locale ?? 'he',
    pdfBase64: options?.pdfBase64 ?? '',
  };
}
