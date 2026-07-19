/**
 * Single-use JWT minted only by PayPal webhook after PAYMENT.CAPTURE.COMPLETED.
 * Required by POST /api/v1/reports/valuation/dispatch.
 */

import * as crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/deployment_env';

export const PAYMENT_DISPATCH_AUDIENCE = 'equify-payment-dispatch';
export const PAYMENT_DISPATCH_ISSUER = 'equify';
export const PAYMENT_DISPATCH_TTL_SECONDS = 60 * 60 * 24;

export interface PaymentDispatchPayload {
  sub: string; // stripe_transactions.id
  jti: string;
  valuationId: string;
  email: string;
  typ: 'paypal_payment_dispatch';
}

export class PaymentDispatchTokenService {
  signDispatch(
    payload: Omit<PaymentDispatchPayload, 'typ' | 'jti'> & { jti?: string },
  ): { token: string; jti: string } {
    const jti = payload.jti ?? crypto.randomUUID();
    const full: PaymentDispatchPayload = {
      sub: payload.sub,
      jti,
      valuationId: payload.valuationId,
      email: payload.email,
      typ: 'paypal_payment_dispatch',
    };
    const token = jwt.sign(full, getJwtSecret(), {
      jwtid: jti,
      expiresIn: PAYMENT_DISPATCH_TTL_SECONDS,
      issuer: PAYMENT_DISPATCH_ISSUER,
      audience: PAYMENT_DISPATCH_AUDIENCE,
    });
    return { token, jti };
  }

  verifyDispatch(token: string): PaymentDispatchPayload {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: PAYMENT_DISPATCH_ISSUER,
      audience: PAYMENT_DISPATCH_AUDIENCE,
    }) as PaymentDispatchPayload;

    if (
      payload.typ !== 'paypal_payment_dispatch' ||
      !payload.sub ||
      !payload.valuationId ||
      !payload.jti
    ) {
      throw new Error('Invalid payment dispatch token.');
    }
    return payload;
  }
}
