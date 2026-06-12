/**
 * Lead identifier validation (wizard + API + Monday.com CRM).
 */

import { z } from 'zod';

/** Wizard form field shape (Step 1). */
export interface WizardIdentifierFields {
  userMobilePhone: string;
  userNationalId: string;
  userCorporateTaxId?: string;
  userEmail: string;
}

/** API / CRM payload shape (backup-relay + Monday sync). */
export interface LeadIdentifierFields {
  userPhone: string;
  userId: string;
  userEmail: string;
  userCorporateTaxId?: string;
}

/** @deprecated Use `WizardIdentifierFields` */
export type UserIdentifierFields = WizardIdentifierFields;

export type WizardIdentifierFieldKey = keyof WizardIdentifierFields;
/** @deprecated Use `WizardIdentifierFieldKey` */
export type UserIdentifierFieldKey = WizardIdentifierFieldKey;

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DIGITS_ONLY = /^\d+$/;

/** Israeli mobile: 05XXXXXXXX (10 digits) or +9725XXXXXXXX (12 digits). */
const IL_MOBILE_REGEX = /^(?:\+9725[0-9]\d{7}|05[0-9]\d{7})$/;

function emptyCorporateTaxIdToUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

export const leadIdentifierSchema = z.object({
  userPhone: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  userCorporateTaxId: z.preprocess(
    emptyCorporateTaxIdToUndefined,
    z.string().optional(),
  ),
});

export type LeadIdentifierInput = z.input<typeof leadIdentifierSchema>;
export type LeadIdentifierParsed = z.output<typeof leadIdentifierSchema>;

export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeIsraeliMobile(value: string): string {
  const digits = normalizeDigits(value);
  if (digits.startsWith('972') && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

/** Israeli national ID / company registration checksum (9 digits). */
export function isValidIsraeliNineDigitId(raw: string): boolean {
  const digits = normalizeDigits(raw);
  if (digits.length !== 9 || !DIGITS_ONLY.test(digits)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let step = Number(digits[i]) * ((i % 2) + 1);
    if (step > 9) step -= 9;
    sum += step;
  }
  return sum % 10 === 0;
}

export function isValidIsraeliMobilePhone(value: string): boolean {
  const compact = value.trim().replace(/[\s-]/g, '');
  if (!compact) return false;
  return IL_MOBILE_REGEX.test(compact);
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function normalizeCorporateTaxId(value?: string | null): string {
  return (value ?? '').trim();
}

export function wizardToLeadIdentifiers(
  fields: WizardIdentifierFields,
): LeadIdentifierFields {
  return {
    userPhone: fields.userMobilePhone.trim(),
    userId: fields.userNationalId.trim(),
    userEmail: fields.userEmail.trim(),
    userCorporateTaxId: normalizeCorporateTaxId(fields.userCorporateTaxId),
  };
}

export function validateLeadIdentifiers(
  fields: LeadIdentifierFields,
): Partial<Record<keyof LeadIdentifierFields, string>> {
  const errors: Partial<Record<keyof LeadIdentifierFields, string>> = {};

  if (!fields.userPhone.trim()) {
    errors.userPhone = 'required';
  } else if (!isValidIsraeliMobilePhone(fields.userPhone)) {
    errors.userPhone = 'invalid_phone';
  }

  const corporateTaxId = normalizeCorporateTaxId(fields.userCorporateTaxId);
  const resolvedNationalId = fields.userId.trim() || corporateTaxId;

  if (!resolvedNationalId) {
    errors.userId = 'required';
  } else if (!isValidIsraeliNineDigitId(resolvedNationalId)) {
    if (fields.userId.trim()) {
      errors.userId = 'invalid_id';
    } else {
      errors.userCorporateTaxId = 'invalid_corp';
    }
  } else if (corporateTaxId && fields.userId.trim() && !isValidIsraeliNineDigitId(corporateTaxId)) {
    errors.userCorporateTaxId = 'invalid_corp';
  }

  if (!fields.userEmail.trim()) {
    errors.userEmail = 'required';
  } else if (!isValidEmail(fields.userEmail)) {
    errors.userEmail = 'invalid_email';
  }

  return errors;
}

const wizardToLeadFieldKey: Record<
  keyof LeadIdentifierFields,
  WizardIdentifierFieldKey
> = {
  userPhone: 'userMobilePhone',
  userId: 'userNationalId',
  userCorporateTaxId: 'userCorporateTaxId',
  userEmail: 'userEmail',
};

export function validateWizardIdentifiers(
  fields: WizardIdentifierFields,
): Partial<Record<WizardIdentifierFieldKey, string>> {
  const leadErrors = validateLeadIdentifiers(wizardToLeadIdentifiers(fields));
  const errors: Partial<Record<WizardIdentifierFieldKey, string>> = {};

  (Object.keys(leadErrors) as (keyof LeadIdentifierFields)[]).forEach((key) => {
    const wizardKey = wizardToLeadFieldKey[key];
    const code = leadErrors[key];
    if (code) errors[wizardKey] = code;
  });

  return errors;
}

/** @deprecated Use `validateWizardIdentifiers` */
export function validateUserIdentifiers(
  fields: WizardIdentifierFields,
): Partial<Record<WizardIdentifierFieldKey, string>> {
  return validateWizardIdentifiers(fields);
}

export function areLeadIdentifiersValid(fields: LeadIdentifierFields): boolean {
  return Object.keys(validateLeadIdentifiers(fields)).length === 0;
}

export function areWizardIdentifiersValid(fields: WizardIdentifierFields): boolean {
  return areLeadIdentifiersValid(wizardToLeadIdentifiers(fields));
}

/** @deprecated Use `areWizardIdentifiersValid` */
export function areUserIdentifiersValid(fields: WizardIdentifierFields): boolean {
  return areWizardIdentifiersValid(fields);
}

export function parseLeadIdentifiers(input: unknown): LeadIdentifierFields | null {
  const parsed = leadIdentifierSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const fields: LeadIdentifierFields = {
    userPhone: parsed.data.userPhone.trim(),
    userId: parsed.data.userId.trim(),
    userEmail: parsed.data.userEmail.trim(),
    userCorporateTaxId: normalizeCorporateTaxId(parsed.data.userCorporateTaxId),
  };

  return areLeadIdentifiersValid(fields) ? fields : null;
}

export interface UserIdentifiersSnapshot {
  mobile_phone: string;
  national_id: string;
  corporate_tax_id: string;
  email: string;
  validated: boolean;
}

export function snapshotUserIdentifiers(
  fields: WizardIdentifierFields,
): UserIdentifiersSnapshot {
  const lead = wizardToLeadIdentifiers(fields);
  const corporateTaxId = normalizeCorporateTaxId(lead.userCorporateTaxId);
  return {
    mobile_phone: normalizeIsraeliMobile(lead.userPhone),
    national_id: normalizeDigits(lead.userId).padStart(9, '0'),
    corporate_tax_id: corporateTaxId
      ? normalizeDigits(corporateTaxId).padStart(9, '0')
      : '',
    email: lead.userEmail.trim().toLowerCase(),
    validated: areLeadIdentifiersValid(lead),
  };
}

export function hasValidatedUserIdentifiers(
  snapshot: UserIdentifiersSnapshot | undefined,
): boolean {
  if (!snapshot?.validated) return false;
  return (
    isValidIsraeliMobilePhone(snapshot.mobile_phone) &&
    isValidIsraeliNineDigitId(snapshot.national_id) &&
    (!snapshot.corporate_tax_id ||
      isValidIsraeliNineDigitId(snapshot.corporate_tax_id)) &&
    isValidEmail(snapshot.email)
  );
}
