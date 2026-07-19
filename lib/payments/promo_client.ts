'use client';

export interface PromoValidateResponse {
  valid: boolean;
  rateLimited?: boolean;
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

    return { valid: Boolean(data?.valid) };
  } catch {
    return { valid: false };
  }
}
