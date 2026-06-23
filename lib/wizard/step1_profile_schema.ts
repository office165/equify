import { z } from 'zod';

export const STEP1_PHONE_INVALID_MESSAGE =
  'נא להזין מספר טלפון תקין (ספרות בלבד)';

/** Allowed characters while typing: digits, +, hyphen, space. */
export const STEP1_PHONE_INPUT_REGEX = /^[\d+\-\s]*$/;

/** Strip Hebrew/English letters and other disallowed characters. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\-\s]/g, '');
}

export function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}

/**
 * Israeli mobile (05X), landline (0[2-489]…), or international (+ / 972 prefix).
 * Requires 9–15 digits after stripping separators.
 */
export function isValidStep1Phone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || !STEP1_PHONE_INPUT_REGEX.test(trimmed)) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, '');
  const digitCount = digits.length;
  if (digitCount < 9 || digitCount > 15) {
    return false;
  }

  const compact = trimmed.replace(/[\s-]/g, '');

  if (compact.startsWith('+')) {
    return /^\+[1-9]\d{8,14}$/.test(compact);
  }

  if (digits.startsWith('972')) {
    const local = digits.slice(3);
    if (local.startsWith('5')) {
      return /^5[0-9]\d{7}$/.test(local);
    }
    return /^[2-489]\d{7,8}$/.test(local);
  }

  if (digits.startsWith('0')) {
    if (/^05[0-9]\d{7}$/.test(digits)) {
      return true;
    }
    return /^0[2-489]\d{7,8}$/.test(digits);
  }

  return false;
}

export const step1PhoneSchema = z
  .string()
  .trim()
  .min(1, { message: STEP1_PHONE_INVALID_MESSAGE })
  .regex(STEP1_PHONE_INPUT_REGEX, { message: STEP1_PHONE_INVALID_MESSAGE })
  .refine(isValidStep1Phone, { message: STEP1_PHONE_INVALID_MESSAGE });

export function validateStep1Phone(value: string): string | null {
  const result = step1PhoneSchema.safeParse(value);
  if (result.success) {
    return null;
  }
  return result.error.issues[0]?.message ?? STEP1_PHONE_INVALID_MESSAGE;
}
