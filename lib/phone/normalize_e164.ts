/**
 * Normalize Israeli and international phone input to E.164 (+972…).
 */
export function normalizePhoneE164(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.startsWith('972')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length >= 9) {
    return `+972${digits.slice(1)}`;
  }

  return `+${digits}`;
}
