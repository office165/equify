/**
 * Israeli domestic payment gateway adapter (Grow / Meshulam · PayMe-style REST).
 * Configure via PAYMENT_GATEWAY_* environment variables.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

export type PaymentGatewayProvider = 'grow' | 'payme' | 'paypal';

export const PAYMENT_SUCCESS_STATUSES = ['success', 'paid', 'approved', 'completed'] as const;

export interface CreateHostedSaleInput {
  amountIls: number;
  currency: 'ILS';
  description: string;
  returnUrl: string;
  cancelUrl?: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}

export interface HostedSaleResult {
  saleId: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
}

/** Normalized IPN / server-to-server callback payload. */
export interface PaymentCallbackPayload {
  saleId: string;
  transactionId: string;
  status: string;
  amountIls: number;
  currency: string;
  payerEmail?: string;
  metadata: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface GrowCreateSaleRequest {
  pageCode: string;
  userId: string;
  sum: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl?: string;
  notifyUrl: string;
  cField1?: string;
  cField2?: string;
  cField3?: string;
  cField4?: string;
}

export interface GrowCreateSaleResponse {
  err?: string | null;
  status?: string | number;
  data?: {
    sale_url?: string;
    saleUrl?: string;
    sale_id?: string;
    saleId?: string;
    processId?: string;
  };
}

export interface PayMeCreateSaleRequest {
  seller_payme_id: string;
  sale_price: number;
  currency: string;
  product_name: string;
  sale_return_url: string;
  sale_callback_url: string;
  sale_cancel_url?: string;
  buyer_email?: string;
  custom?: string;
}

export interface PayMeCreateSaleResponse {
  status_code?: number;
  sale_url?: string;
  payme_sale_id?: string;
  sale_id?: string;
  error?: string;
}

@Injectable()
export class IsraeliPaymentGatewayClient {
  private readonly logger = new Logger(IsraeliPaymentGatewayClient.name);
  private readonly provider: PaymentGatewayProvider;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly callbackUrl: string;
  private readonly growPageCode: string;
  private readonly growUserId: string;
  private readonly paymeSellerId: string;

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>('PAYMENT_GATEWAY_PROVIDER', 'grow') ??
      'grow') as PaymentGatewayProvider;
    // PayPal uses PAYPAL_* env only — do not require Grow/PayMe gateway env.
    if (this.provider === 'paypal') {
      this.baseUrl = '';
      this.apiKey = '';
      this.webhookSecret = '';
      this.callbackUrl = '';
    } else {
      this.baseUrl = this.config.getOrThrow<string>('PAYMENT_GATEWAY_BASE_URL');
      this.apiKey = this.config.getOrThrow<string>('PAYMENT_GATEWAY_API_KEY');
      this.webhookSecret = this.config.getOrThrow<string>('PAYMENT_GATEWAY_WEBHOOK_SECRET');
      this.callbackUrl = this.config.getOrThrow<string>('PAYMENT_GATEWAY_CALLBACK_URL');
    }
    this.growPageCode = this.config.get<string>('GROW_PAGE_CODE', '');
    this.growUserId = this.config.get<string>('GROW_USER_ID', '');
    this.paymeSellerId = this.config.get<string>('PAYME_SELLER_ID', '');
  }

  async createHostedSale(input: CreateHostedSaleInput): Promise<HostedSaleResult> {
    if (input.currency !== 'ILS') {
      throw new BadRequestException('Only ILS domestic processing is supported.');
    }

    if (this.provider === 'paypal') {
      const { PayPalGateway } = await import('./lib/gateway/paypal_gateway');
      return new PayPalGateway().createHostedSale(input);
    }

    if (this.provider === 'payme') {
      return this.createPayMeSale(input);
    }
    return this.createGrowSale(input);
  }

  verifyCallbackSignature(
    signatureHeader: string | undefined,
    rawBody: Buffer | string,
  ): boolean {
    if (!signatureHeader?.trim()) {
      return false;
    }
    const body =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    const provided = signatureHeader.replace(/^sha256=/i, '').trim();
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(provided, 'hex'),
      );
    } catch {
      return false;
    }
  }

  parseCallbackPayload(body: Record<string, unknown>): PaymentCallbackPayload {
    if (this.provider === 'payme') {
      return this.parsePayMeCallback(body);
    }
    return this.parseGrowCallback(body);
  }

  private async createGrowSale(input: CreateHostedSaleInput): Promise<HostedSaleResult> {
    const request: GrowCreateSaleRequest = {
      pageCode: this.growPageCode || this.config.get<string>('PAYMENT_GATEWAY_PAGE_CODE', ''),
      userId: this.growUserId || this.config.get<string>('PAYMENT_GATEWAY_MERCHANT_ID', ''),
      sum: input.amountIls,
      currency: 'ILS',
      description: input.description,
      successUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      notifyUrl: this.callbackUrl,
      cField1: input.metadata.organization_id,
      cField2: input.metadata.user_id,
      cField3: input.metadata.product,
      cField4: input.metadata.tier,
    };

    const response = await this.postJson<GrowCreateSaleResponse>(
      '/createPaymentProcess',
      request,
    );

    const redirectUrl = response.data?.sale_url ?? response.data?.saleUrl;
    const saleId =
      response.data?.sale_id ??
      response.data?.saleId ??
      response.data?.processId;

    if (response.err || !redirectUrl || !saleId) {
      this.logger.error(`Grow sale init failed: ${JSON.stringify(response)}`);
      throw new BadRequestException('Payment gateway failed to initialize hosted sale.');
    }

    return {
      saleId: String(saleId),
      redirectUrl: String(redirectUrl),
      raw: response as unknown as Record<string, unknown>,
    };
  }

  private async createPayMeSale(input: CreateHostedSaleInput): Promise<HostedSaleResult> {
    const request: PayMeCreateSaleRequest = {
      seller_payme_id: this.paymeSellerId || this.config.get<string>('PAYMENT_GATEWAY_MERCHANT_ID', ''),
      sale_price: Math.round(input.amountIls * 100),
      currency: 'ILS',
      product_name: input.description,
      sale_return_url: input.returnUrl,
      sale_callback_url: this.callbackUrl,
      sale_cancel_url: input.cancelUrl,
      buyer_email: input.customerEmail,
      custom: JSON.stringify(input.metadata),
    };

    const response = await this.postJson<PayMeCreateSaleResponse>('/generate-sale', request);
    const redirectUrl = response.sale_url;
    const saleId = response.payme_sale_id ?? response.sale_id;

    if (!redirectUrl || !saleId || response.error) {
      this.logger.error(`PayMe sale init failed: ${JSON.stringify(response)}`);
      throw new BadRequestException('Payment gateway failed to initialize hosted sale.');
    }

    return {
      saleId: String(saleId),
      redirectUrl: String(redirectUrl),
      raw: response as unknown as Record<string, unknown>,
    };
  }

  private parseGrowCallback(body: Record<string, unknown>): PaymentCallbackPayload {
    const status = String(body.status ?? body.paymentStatus ?? body.sale_status ?? '');
    const amountRaw = body.sum ?? body.amount ?? body.payment_sum;
    const metadata = this.extractGrowMetadata(body);

    return {
      saleId: String(body.saleId ?? body.sale_id ?? body.processId ?? ''),
      transactionId: String(
        body.transactionId ?? body.transaction_id ?? body.asmachta ?? body.id ?? '',
      ),
      status,
      amountIls: Number(amountRaw),
      currency: String(body.currency ?? body.coin ?? 'ILS').toUpperCase(),
      payerEmail: body.payerEmail ? String(body.payerEmail) : undefined,
      metadata,
      raw: body,
    };
  }

  private parsePayMeCallback(body: Record<string, unknown>): PaymentCallbackPayload {
    const status = String(body.status ?? body.sale_status ?? body.transaction_status ?? '');
    const priceAgorot = Number(body.price ?? body.sale_price ?? body.transaction_price ?? 0);
    let metadata: Record<string, string> = {};
    if (typeof body.custom === 'string' && body.custom.trim()) {
      try {
        metadata = JSON.parse(body.custom) as Record<string, string>;
      } catch {
        metadata = { custom: body.custom };
      }
    }

    return {
      saleId: String(body.payme_sale_id ?? body.sale_id ?? ''),
      transactionId: String(body.transaction_id ?? body.payme_transaction_id ?? ''),
      status,
      amountIls: priceAgorot > 0 ? priceAgorot / 100 : Number(body.sum ?? 0),
      currency: String(body.currency ?? 'ILS').toUpperCase(),
      payerEmail: body.buyer_email ? String(body.buyer_email) : undefined,
      metadata,
      raw: body,
    };
  }

  private extractGrowMetadata(body: Record<string, unknown>): Record<string, string> {
    return {
      organization_id: String(body.cField1 ?? body.organization_id ?? ''),
      user_id: String(body.cField2 ?? body.user_id ?? ''),
      product: String(body.cField3 ?? body.product ?? ''),
      tier: String(body.cField4 ?? body.tier ?? ''),
    };
  }

  private async postJson<T>(path: string, payload: unknown): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json: T;
    try {
      json = JSON.parse(text) as T;
    } catch {
      this.logger.error(`Gateway non-JSON response (${res.status}): ${text.slice(0, 500)}`);
      throw new BadRequestException('Invalid payment gateway response.');
    }

    if (!res.ok) {
      this.logger.error(`Gateway HTTP ${res.status}: ${text.slice(0, 500)}`);
      throw new BadRequestException('Payment gateway request failed.');
    }

    return json;
  }
}

export function isSuccessfulPaymentStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return PAYMENT_SUCCESS_STATUSES.some((s) => normalized === s || normalized.includes(s));
}
