'use client';

import type { PromoPublicDenyReason } from './promo_public_reasons';

export interface PromoValidateResponse {
  valid: boolean;
  rateLimited?: boolean;
  /** Present only when valid — minted server-side; never invent on the client. */
  dispatchToken?: string;
  /**
   * Deny / server reason. `invalid_code` covers code_not_found + inactive
   * (anti-enumeration). Optional for backward compatibility.
   */
  reason?: PromoPublicDenyReason;
}

export async function postValidatePromoCode(input: {
  code: string;
  email: string;
}): Promise<PromoValidateResponse> {
  if (typeof window === 'undefined') {
    return { valid: false };
  }

  try {
    const response = await fetch('/api/v1/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: input.code,
        email: input.email,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | PromoValidateResponse
      | null;

    if (response.status === 429) {
      return { valid: false, rateLimited: true };
    }

    if (response.status >= 500 || data?.reason === 'server_error') {
      return { valid: false, reason: 'server_error' };
    }

    if (!data?.valid || typeof data.dispatchToken !== 'string' || !data.dispatchToken) {
      return {
        valid: false,
        rateLimited: data?.rateLimited,
        reason:
          data?.reason === 'expired' ||
          data?.reason === 'max_uses_reached' ||
          data?.reason === 'invalid_code'
            ? data.reason
            : data?.reason === 'server_error'
              ? 'server_error'
              : undefined,
      };
    }

    return { valid: true, dispatchToken: data.dispatchToken };
  } catch {
    return { valid: false, reason: 'server_error' };
  }
}
