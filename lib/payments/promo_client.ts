'use client';

export interface PromoValidateResponse {
  valid: boolean;
  rateLimited?: boolean;
  /** Present only when valid — minted server-side; never invent on the client. */
  dispatchToken?: string;
  /** Server/signing failure — must not be shown as "invalid code". */
  reason?: 'server_error';
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

    if (
      response.status >= 500 ||
      data?.reason === 'server_error'
    ) {
      return { valid: false, reason: 'server_error' };
    }

    if (!data?.valid || typeof data.dispatchToken !== 'string' || !data.dispatchToken) {
      return { valid: false, rateLimited: data?.rateLimited };
    }

    return { valid: true, dispatchToken: data.dispatchToken };
  } catch {
    return { valid: false, reason: 'server_error' };
  }
}
