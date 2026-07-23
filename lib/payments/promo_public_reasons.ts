/**
 * Client-facing promo deny reasons (safe subset).
 * code_not_found + inactive collapse to invalid_code to avoid code enumeration.
 */

export type PromoPublicDenyReason =
  | 'invalid_code'
  | 'expired'
  | 'max_uses_reached'
  | 'server_error';

/** Map internal mint/deny reasons to a public, non-enumerating reason. */
export function toPublicPromoDenyReason(
  internal: string | undefined | null,
): PromoPublicDenyReason {
  const r = (internal ?? '').trim().toLowerCase();
  if (r === 'expired') return 'expired';
  if (r === 'max_uses_reached') return 'max_uses_reached';
  if (r === 'server_error') return 'server_error';
  // code_not_found, inactive, and all other denies → same bucket (anti-enumeration)
  return 'invalid_code';
}
