/**
 * Valubot server gateway — NestJS paywall, Israeli ILS payment gateway, and white-label layer.
 *
 * Strict No-Free / No-Freemium: only ON_DEMAND (99 ILS token), STARTER, PRO, ENTERPRISE.
 * Mount via `ServerGatewayModule` in your application root module.
 */

import {
  BadRequestException,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Body,
  Headers,
  HttpCode,
  Param,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  Module,
  Get,
  Post,
  RawBodyRequest,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { WhatsAppOtpAuthService, WhatsAppOtpError } from './lib/auth/whatsapp_otp_service';
import { SessionTokenService } from './lib/auth/session_token_service';
import { ValuationDispatchService } from './lib/dispatch/valuation_dispatch';
import { CLIENT_PDF_REQUIRED_MESSAGE } from './lib/pdf/valuation_report_pdf';
import { VALUATION_REPORT_FILENAME } from './lib/pdf/theme';
import type { ValuationLocale } from './api_client';
import type { ForecastMatrixWithDiagnostics } from './valuation_forecast';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as crypto from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import {
  IsraeliPaymentGatewayClient,
  isSuccessfulPaymentStatus,
  type PaymentCallbackPayload,
} from './israeli_payment_gateway';
import { createPostgresPool } from './valuation_live';

// =============================================================================
// Domain types — no FREE tier exists in the type system
// =============================================================================

export const ALLOWED_SUBSCRIPTION_TIERS = [
  'ON_DEMAND',
  'STARTER',
  'PRO',
  'ENTERPRISE',
] as const;

export type SubscriptionTier = (typeof ALLOWED_SUBSCRIPTION_TIERS)[number];

/** Recurring tiers that unlock valuation without a one-time JWT. */
export const RECURRING_VALUATION_TIERS: readonly SubscriptionTier[] = [
  'STARTER',
  'PRO',
  'ENTERPRISE',
] as const;

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
] as const;

export type ActiveSubscriptionStatus = (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number];

export const ON_DEMAND_CHECKOUT_AMOUNT_ILS = 99.0;
export const ON_DEMAND_CURRENCY = 'ILS';
export const JWT_TRANSACTION_TYP = 'on_demand_valuation';
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days to redeem

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  phoneE164?: string;
}

export interface RequestOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

export interface GenerateValuationPdfDto {
  valuationId: string;
  locale?: ValuationLocale;
  dispatch?: boolean;
  email?: string;
  phone?: string;
}

export interface CreateCheckoutSessionDto {
  /** Browser return URL after the customer completes payment on the hosted page. */
  returnUrl: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResponseDto {
  sessionId: string;
  /** Secure hosted payment page URL from the local gateway. */
  redirect_url: string;
  /** @deprecated Use `redirect_url` — kept for backward-compatible clients. */
  url: string;
  amount: number;
  currency: string;
}

export interface PaymentCallbackAckDto {
  received: true;
  transactionId?: string;
}

export interface ValuationCalculateDto {
  companyId: string;
  valuationTitle?: string;
  rawRdExpenses: number[];
  purpose?: string;
}

export interface ValuationCalculateResponseDto {
  status: 'queued' | 'completed';
  valuationId: string;
  entitlement: 'subscription' | 'on_demand_token';
  whiteLabel?: WhiteLabelConfig | null;
}

export interface WhiteLabelConfig {
  enabled: true;
  advisoryMetadata: Record<string, unknown>;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  corporateAssets: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    footerLegalText: string;
  };
  templateCompilerHints: Record<string, unknown>;
}

export interface OnDemandJwtPayload {
  sub: string; // transaction_id (UUID)
  jti: string;
  typ: typeof JWT_TRANSACTION_TYP;
  org: string;
  uid: string;
  iat?: number;
  exp?: number;
}

export interface PaywallContext {
  user: AuthenticatedUser;
  entitlement: 'subscription' | 'on_demand_token';
  subscriptionTier?: SubscriptionTier;
  transactionId?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    paywall?: PaywallContext;
    user?: AuthenticatedUser;
  }
}

// =============================================================================
// Database access
// =============================================================================

export {
  createPostgresPool,
  getLiveDatabasePool,
  handleWizardValuationCalculate,
  verifyLiveDatabaseConnection,
  resolvePostgresSsl,
  type WizardValuationCalculateRequest,
} from './valuation_live';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.getOrThrow<string>('DATABASE_URL');
    this.pool = createPostgresPool(
      connectionString,
      this.config.get<number>('PG_POOL_MAX', 20),
    );
    this.logger.log('PostgreSQL pool connected (DATABASE_URL configured).');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

// =============================================================================
// Local payment transactions repository
// (persists to `stripe_transactions` — legacy table name; columns store gateway IDs)
// =============================================================================

export interface LocalPaymentTransactionRow {
  id: string;
  gateway_transaction_id: string;
  gateway_sale_id: string | null;
  is_used: boolean;
  token_jwt: string;
  token_jti: string;
  expires_at: Date;
  purchaser_user_id: string | null;
}

@Injectable()
export class LocalPaymentTransactionRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByJti(jti: string): Promise<LocalPaymentTransactionRow | null> {
    const { rows } = await this.db.getPool().query<{
      id: string;
      stripe_payment_intent_id: string;
      stripe_checkout_session_id: string | null;
      is_used: boolean;
      token_jwt: string;
      token_jti: string;
      expires_at: Date;
      purchaser_user_id: string | null;
    }>(
      `SELECT id, stripe_payment_intent_id, stripe_checkout_session_id,
              is_used, token_jwt, token_jti, expires_at, purchaser_user_id
       FROM stripe_transactions
       WHERE token_jti = $1
       LIMIT 1`,
      [jti],
    );
    const row = rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async insertUnusedTransaction(params: {
    id: string;
    gatewayTransactionId: string;
    gatewaySaleId: string;
    payerExternalId: string | null;
    purchaserUserId: string | null;
    tokenJwt: string;
    tokenJti: string;
    expiresAt: Date;
    gatewayMetadata?: Record<string, unknown>;
  }): Promise<string> {
    const { rows } = await this.db.getPool().query<{ id: string }>(
      `INSERT INTO stripe_transactions (
         id,
         stripe_payment_intent_id,
         stripe_checkout_session_id,
         stripe_customer_id,
         purchaser_user_id,
         amount,
         currency,
         is_used,
         token_jwt,
         token_jti,
         expires_at,
         metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, 'ILS', FALSE, $7, $8, $9, $10::jsonb)
       RETURNING id`,
      [
        params.id,
        params.gatewayTransactionId,
        params.gatewaySaleId,
        params.payerExternalId,
        params.purchaserUserId,
        ON_DEMAND_CHECKOUT_AMOUNT_ILS,
        params.tokenJwt,
        params.tokenJti,
        params.expiresAt,
        JSON.stringify({
          provider: 'israeli_gateway',
          ...params.gatewayMetadata,
        }),
      ],
    );
    return rows[0].id;
  }

  async lockByJtiForUpdate(
    client: PoolClient,
    jti: string,
  ): Promise<LocalPaymentTransactionRow | null> {
    const { rows } = await client.query<{
      id: string;
      stripe_payment_intent_id: string;
      stripe_checkout_session_id: string | null;
      is_used: boolean;
      token_jwt: string;
      token_jti: string;
      expires_at: Date;
      purchaser_user_id: string | null;
    }>(
      `SELECT id, stripe_payment_intent_id, stripe_checkout_session_id,
              is_used, token_jwt, token_jti, expires_at, purchaser_user_id
       FROM stripe_transactions
       WHERE token_jti = $1
       FOR UPDATE`,
      [jti],
    );
    const row = rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * Atomically redeem a single-use token — prevents replay under concurrent requests.
   * Returns transaction id when exactly one row was updated.
   */
  async redeemTransactionAtomic(
    client: PoolClient,
    transactionId: string,
    usedByUserId: string,
  ): Promise<string | null> {
    const { rows } = await client.query<{ id: string }>(
      `UPDATE stripe_transactions
       SET is_used = TRUE,
           used_at = CURRENT_TIMESTAMP,
           used_by_user_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND is_used = FALSE
         AND expires_at > CURRENT_TIMESTAMP
         AND amount = $3
         AND currency = 'ILS'
       RETURNING id`,
      [transactionId, usedByUserId, ON_DEMAND_CHECKOUT_AMOUNT_ILS],
    );
    return rows[0]?.id ?? null;
  }

  async existsByGatewaySale(saleId: string): Promise<boolean> {
    const { rows } = await this.db.getPool().query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM stripe_transactions WHERE stripe_checkout_session_id = $1
       ) AS exists`,
      [saleId],
    );
    return rows[0]?.exists ?? false;
  }

  private mapRow(row: {
    id: string;
    stripe_payment_intent_id: string;
    stripe_checkout_session_id: string | null;
    is_used: boolean;
    token_jwt: string;
    token_jti: string;
    expires_at: Date;
    purchaser_user_id: string | null;
  }): LocalPaymentTransactionRow {
    return {
      id: row.id,
      gateway_transaction_id: row.stripe_payment_intent_id,
      gateway_sale_id: row.stripe_checkout_session_id,
      is_used: row.is_used,
      token_jwt: row.token_jwt,
      token_jti: row.token_jti,
      expires_at: row.expires_at,
      purchaser_user_id: row.purchaser_user_id,
    };
  }
}

// =============================================================================
// Subscriptions repository — rejects unknown / free tiers at query level
// =============================================================================

export interface ActiveSubscriptionRow {
  id: string;
  tier: SubscriptionTier;
  status: ActiveSubscriptionStatus;
  organization_id: string;
  current_period_end: Date | null;
}

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly db: DatabaseService) {}

  async findActiveRecurringForOrganization(
    organizationId: string,
  ): Promise<ActiveSubscriptionRow | null> {
    const { rows } = await this.db.getPool().query<ActiveSubscriptionRow>(
      `SELECT id, tier::text AS tier, status::text AS status,
              organization_id, current_period_end
       FROM subscriptions
       WHERE organization_id = $1
         AND tier = ANY($2::subscription_tier[])
         AND status = ANY($3::subscription_status[])
         AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
       ORDER BY
         CASE tier::text
           WHEN 'ENTERPRISE' THEN 1
           WHEN 'PRO' THEN 2
           WHEN 'STARTER' THEN 3
           ELSE 4
         END
       LIMIT 1`,
      [organizationId, RECURRING_VALUATION_TIERS, ACTIVE_SUBSCRIPTION_STATUSES],
    );

    const row = rows[0];
    if (!row) return null;
    this.assertAllowedTier(row.tier);
    return row;
  }

  private assertAllowedTier(tier: string): asserts tier is SubscriptionTier {
    if (!(ALLOWED_SUBSCRIPTION_TIERS as readonly string[]).includes(tier)) {
      throw new ForbiddenException(
        'Freemium and free-tier access are disabled. Upgrade to a paid plan.',
      );
    }
    if (tier === 'ON_DEMAND') {
      throw new ForbiddenException(
        'ON_DEMAND requires a single-use payment token. Purchase a 99 ILS run.',
      );
    }
  }
}

// =============================================================================
// Auth helper (integrate with your JWT/session strategy)
// =============================================================================

@Injectable()
export class AuthContextService {
  private readonly sessionTokens = new SessionTokenService();

  /**
   * Resolve the authenticated user from WhatsApp OTP session JWT or `req.user`.
   */
  resolveUser(req: Request): AuthenticatedUser {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (bearer) {
      try {
        const payload = this.sessionTokens.verifySession(bearer);
        return {
          id: payload.sub,
          email: payload.email,
          organizationId: payload.org,
          phoneE164: payload.phone,
        };
      } catch {
        /* fall through to req.user */
      }
    }

    const user = req.user;
    if (!user?.id || !user.organizationId) {
      throw new UnauthorizedException('Authentication required.');
    }
    return user;
  }

  resolveOptionalUser(req: Request): AuthenticatedUser | null {
    try {
      return this.resolveUser(req);
    } catch {
      return null;
    }
  }
}

// =============================================================================
// WhatsApp OTP authentication
// =============================================================================

@Injectable()
export class WhatsAppOtpAuthGatewayService {
  private readonly otp: WhatsAppOtpAuthService;

  constructor(private readonly db: DatabaseService) {
    this.otp = new WhatsAppOtpAuthService(db.getPool());
  }

  requestOtp(phone: string) {
    return this.otp.requestOtp(phone);
  }

  verifyOtp(phone: string, code: string) {
    return this.otp.verifyOtp(phone, code);
  }
}

@Controller('api/v1/auth/whatsapp')
export class WhatsAppAuthController {
  constructor(private readonly otp: WhatsAppOtpAuthGatewayService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    if (!dto?.phone?.trim()) {
      throw new BadRequestException('phone is required.');
    }
    try {
      return await this.otp.requestOtp(dto.phone.trim());
    } catch (err) {
      if (err instanceof WhatsAppOtpError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    if (!dto?.phone?.trim() || !dto?.code?.trim()) {
      throw new BadRequestException('phone and code are required.');
    }
    try {
      return await this.otp.verifyOtp(dto.phone.trim(), dto.code.trim());
    } catch (err) {
      if (err instanceof WhatsAppOtpError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}

// =============================================================================
// Executive PDF generation & dispatch
// =============================================================================

@Injectable()
export class ValuationReportGatewayService {
  constructor(private readonly db: DatabaseService) {}

  async generatePdfBuffer(
    valuationId: string,
    locale: ValuationLocale,
  ): Promise<{ buffer: Buffer; companyName: string }> {
    const { rows } = await this.db.getPool().query<{
      title: string;
      forecast_matrix: ForecastMatrixWithDiagnostics | null;
    }>(
      `SELECT v.title, v.forecast_matrix_json AS forecast_matrix
       FROM valuations v
       WHERE v.id = $1
       LIMIT 1`,
      [valuationId],
    );

    const row = rows[0];
    if (!row?.forecast_matrix) {
      throw new BadRequestException('Valuation forecast matrix not found.');
    }

    throw new BadRequestException(CLIENT_PDF_REQUIRED_MESSAGE);
  }

  async loadForecastMatrix(
    valuationId: string,
  ): Promise<ForecastMatrixWithDiagnostics> {
    const { rows } = await this.db.getPool().query<{
      forecast_matrix_json: ForecastMatrixWithDiagnostics | null;
    }>(
      `SELECT forecast_matrix_json FROM valuations WHERE id = $1 LIMIT 1`,
      [valuationId],
    );
    const matrix = rows[0]?.forecast_matrix_json;
    if (!matrix) {
      throw new BadRequestException('Valuation forecast matrix not found.');
    }
    return matrix;
  }

  async dispatchReport(
    user: AuthenticatedUser,
    dto: GenerateValuationPdfDto,
  ): Promise<{ pdfBytes: number; emailSent: boolean; whatsappSent: boolean }> {
    const locale: ValuationLocale = dto.locale === 'he' ? 'he' : 'en';
    const forecastMatrix = await this.loadForecastMatrix(dto.valuationId);
    const companyName =
      forecastMatrix.meta.company_name ?? dto.valuationId;
    const dispatcher = new ValuationDispatchService(this.db.getPool());
    return dispatcher.dispatchAfterPaymentResolution({
      valuationId: dto.valuationId,
      companyName,
      locale,
      forecastMatrix,
      email: dto.email ?? user.email,
      phoneE164: dto.phone ?? user.phoneE164 ?? null,
      paymentVerified: true,
    });
  }
}

@Controller('api/v1/reports')
export class ValuationReportController {
  constructor(
    private readonly reports: ValuationReportGatewayService,
    private readonly auth: AuthContextService,
  ) {}

  @Get('valuation/:valuationId/pdf')
  async downloadPdf(
    @Param('valuationId') valuationId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const locale: ValuationLocale =
      (req.query.locale as ValuationLocale) === 'he' ? 'he' : 'en';
    this.auth.resolveOptionalUser(req);
    const { buffer } = await this.reports.generatePdfBuffer(valuationId, locale);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${VALUATION_REPORT_FILENAME}"`,
    );
    res.send(buffer);
  }

  @Post('valuation/dispatch')
  @HttpCode(HttpStatus.ACCEPTED)
  async dispatch(
    @Req() req: Request,
    @Body() dto: GenerateValuationPdfDto,
  ) {
    const user = this.auth.resolveUser(req);
    if (!dto?.valuationId) {
      throw new BadRequestException('valuationId is required.');
    }
    return this.reports.dispatchReport(user, dto);
  }
}

// =============================================================================
// Payment service & controller
// =============================================================================

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly defaultCancelUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: IsraeliPaymentGatewayClient,
    private readonly txRepo: LocalPaymentTransactionRepository,
    private readonly jwtService: JwtService,
  ) {
    this.defaultCancelUrl = this.config.get<string>(
      'PAYMENT_GATEWAY_CANCEL_URL',
      '',
    );
  }

  async createOnDemandCheckoutSession(
    user: AuthenticatedUser,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    if (!dto?.returnUrl?.trim()) {
      throw new BadRequestException('returnUrl is required.');
    }

    const sale = await this.gateway.createHostedSale({
      amountIls: ON_DEMAND_CHECKOUT_AMOUNT_ILS,
      currency: 'ILS',
      description: 'Equify On-Demand Valuation (Single Run) — 99.00 ILS',
      returnUrl: dto.returnUrl.trim(),
      cancelUrl: dto.cancelUrl?.trim() || this.defaultCancelUrl || undefined,
      customerEmail: user.email,
      metadata: {
        organization_id: user.organizationId,
        user_id: user.id,
        product: 'on_demand_single_run',
        tier: 'ON_DEMAND',
      },
    });

    return {
      sessionId: sale.saleId,
      redirect_url: sale.redirectUrl,
      url: sale.redirectUrl,
      amount: ON_DEMAND_CHECKOUT_AMOUNT_ILS,
      currency: ON_DEMAND_CURRENCY,
    };
  }

  async handlePaymentCallback(
    signature: string | undefined,
    rawBody: Buffer,
    parsedBody: Record<string, unknown>,
  ): Promise<PaymentCallbackAckDto> {
    if (!this.gateway.verifyCallbackSignature(signature, rawBody)) {
      this.logger.warn('Payment callback signature verification failed.');
      throw new BadRequestException('Invalid payment callback signature.');
    }

    const callback = this.gateway.parseCallbackPayload(parsedBody);

    if (!isSuccessfulPaymentStatus(callback.status)) {
      this.logger.debug(
        `Acknowledged non-success callback "${callback.status}" for sale ${callback.saleId || 'unknown'}`,
      );
      return { received: true };
    }

    this.assertSuccessfulSettlement(callback);

    if (await this.txRepo.existsByGatewaySale(callback.saleId)) {
      this.logger.log(`Idempotent callback: sale ${callback.saleId} already processed.`);
      return { received: true };
    }

    const organizationId = callback.metadata.organization_id ?? '';
    const userId = callback.metadata.user_id ?? null;

    const transactionId = crypto.randomUUID();
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

    const jwtPayload: OnDemandJwtPayload = {
      sub: transactionId,
      jti,
      typ: JWT_TRANSACTION_TYP,
      org: organizationId,
      uid: userId ?? '',
    };

    const tokenJwt = await this.jwtService.signAsync(jwtPayload, {
      jwtid: jti,
      expiresIn: TOKEN_TTL_SECONDS,
      issuer: 'valubot',
      audience: 'valubot-valuation',
    });

    await this.txRepo.insertUnusedTransaction({
      id: transactionId,
      gatewayTransactionId: callback.transactionId,
      gatewaySaleId: callback.saleId,
      payerExternalId: callback.payerEmail ?? null,
      purchaserUserId: userId,
      tokenJwt,
      tokenJti: jti,
      expiresAt,
      gatewayMetadata: {
        gateway_status: callback.status,
        gateway_amount: callback.amountIls,
        gateway_currency: callback.currency,
      },
    });

    this.logger.log(
      `Minted on-demand token ${transactionId} after ILS gateway sale ${callback.saleId}`,
    );
    return { received: true, transactionId };
  }

  private assertSuccessfulSettlement(callback: PaymentCallbackPayload): void {
    if (!callback.saleId || !callback.transactionId) {
      throw new BadRequestException('Callback missing sale or transaction identifier.');
    }

    if (callback.currency !== 'ILS') {
      throw new BadRequestException('Only ILS settlements are accepted.');
    }

    const amount = Number(callback.amountIls);
    if (!Number.isFinite(amount) || Math.abs(amount - ON_DEMAND_CHECKOUT_AMOUNT_ILS) > 0.01) {
      throw new BadRequestException(
        `Invalid settlement amount. Expected ${ON_DEMAND_CHECKOUT_AMOUNT_ILS} ILS.`,
      );
    }

    const tier = callback.metadata.tier;
    const product = callback.metadata.product;
    if (
      (tier && tier !== 'ON_DEMAND') ||
      (product && product !== 'on_demand_single_run')
    ) {
      throw new BadRequestException('Callback metadata does not match on-demand product.');
    }
  }
}

@Controller('api/v1/payments')
export class PaymentController {
  constructor(
    private readonly payments: PaymentService,
    private readonly auth: AuthContextService,
  ) {}

  @Post('checkout-session')
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(
    @Req() req: Request,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    const user = this.auth.resolveUser(req);
    return this.payments.createOnDemandCheckoutSession(user, dto);
  }

  /**
   * Authenticated server-to-server callback from the Israeli payment gateway (IPN).
   * Verifies HMAC signature, validates ILS / success / amount, mints JWT, persists token.
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async paymentCallback(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-payment-signature') signature: string | undefined,
    @Headers('x-grow-signature') growSignature: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<PaymentCallbackAckDto> {
    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException(
        'Raw body required for payment callbacks. Enable rawBody in NestFactory.create.',
      );
    }

    const headerSignature = signature ?? growSignature;
    const parsedBody =
      body && Object.keys(body).length > 0
        ? body
        : (JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>);

    return this.payments.handlePaymentCallback(headerSignature, rawBody, parsedBody);
  }
}

// =============================================================================
// Valuation guard (paywall)
// =============================================================================

@Injectable()
export class ValuationGuard implements CanActivate {
  private readonly logger = new Logger(ValuationGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
    private readonly txRepo: LocalPaymentTransactionRepository,
    private readonly subsRepo: SubscriptionRepository,
    private readonly auth: AuthContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = this.auth.resolveUser(req);

    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (bearer) {
      const redeemed = await this.tryRedeemOnDemandToken(req, user, bearer);
      if (redeemed) return true;
    }

    const subscription = await this.subsRepo.findActiveRecurringForOrganization(
      user.organizationId,
    );

    if (subscription && RECURRING_VALUATION_TIERS.includes(subscription.tier)) {
      req.paywall = {
        user,
        entitlement: 'subscription',
        subscriptionTier: subscription.tier,
      };
      return true;
    }

    throw new ForbiddenException(
      'No active paid subscription or valid on-demand token. Freemium access is not available.',
    );
  }

  private async tryRedeemOnDemandToken(
    req: Request,
    user: AuthenticatedUser,
    token: string,
  ): Promise<boolean> {
    let payload: OnDemandJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<OnDemandJwtPayload>(token, {
        issuer: 'valubot',
        audience: 'valubot-valuation',
      });
    } catch {
      return false;
    }

    if (payload.typ !== JWT_TRANSACTION_TYP || !payload.sub || !payload.jti) {
      return false;
    }

    if (payload.org && payload.org !== user.organizationId) {
      throw new ForbiddenException('Token organization mismatch.');
    }

    if (payload.uid && payload.uid !== user.id) {
      throw new ForbiddenException('Token user mismatch.');
    }

    const redeemedId = await this.db.withTransaction(async (client) => {
      const row = await this.txRepo.lockByJtiForUpdate(client, payload.jti);
      if (!row || row.id !== payload.sub) {
        return null;
      }
      if (row.is_used) {
        throw new ForbiddenException(
          'On-demand token already redeemed. Each 99 ILS payment allows exactly one valuation run.',
        );
      }
      if (row.expires_at.getTime() <= Date.now()) {
        throw new ForbiddenException('On-demand token expired.');
      }
      return this.txRepo.redeemTransactionAtomic(client, payload.sub, user.id);
    });

    if (!redeemedId) {
      throw new ForbiddenException(
        'Unable to redeem on-demand token. It may be invalid, expired, or already used.',
      );
    }

    this.logger.log(`Redeemed on-demand transaction ${redeemedId} for user ${user.id}`);

    await this.db.getPool().query(
      `INSERT INTO audit_events (organization_id, user_id, entity_type, entity_id, action, payload)
       VALUES ($1, $2, 'local_payment_transaction', $3, 'on_demand_token_redeemed', $4::jsonb)`,
      [
        user.organizationId,
        user.id,
        redeemedId,
        JSON.stringify({ jti: payload.jti, redeemed_at: new Date().toISOString() }),
      ],
    );

    req.paywall = {
      user,
      entitlement: 'on_demand_token',
      transactionId: redeemedId,
    };
    return true;
  }
}

// =============================================================================
// White-label service (PRO tier)
// =============================================================================

export interface OrganizationBrandingRow {
  organization_id: string;
  advisory_metadata: Record<string, unknown>;
  logo_url: string | null;
  logo_dark_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  footer_legal_text: string;
  template_hints: Record<string, unknown>;
}

@Injectable()
export class WhiteLabelService {
  constructor(
    private readonly subsRepo: SubscriptionRepository,
    private readonly db: DatabaseService,
  ) {}

  async resolveWhiteLabelConfig(
    organizationId: string,
  ): Promise<WhiteLabelConfig | null> {
    const subscription =
      await this.subsRepo.findActiveRecurringForOrganization(organizationId);

    if (!subscription || subscription.tier !== 'PRO') {
      return null;
    }

    const branding = await this.loadOrganizationBranding(organizationId);
    if (!branding) {
      return this.defaultProWhiteLabel();
    }

    return {
      enabled: true,
      advisoryMetadata: branding.advisory_metadata ?? {},
      logoUrl: branding.logo_url,
      logoDarkUrl: branding.logo_dark_url,
      corporateAssets: {
        primaryColor: branding.primary_color,
        secondaryColor: branding.secondary_color,
        fontFamily: branding.font_family,
        footerLegalText: branding.footer_legal_text,
      },
      templateCompilerHints: branding.template_hints ?? {},
    };
  }

  private async loadOrganizationBranding(
    organizationId: string,
  ): Promise<OrganizationBrandingRow | null> {
    const { rows } = await this.db.getPool().query<OrganizationBrandingRow>(
      `SELECT organization_id,
              COALESCE(advisory_metadata, '{}'::jsonb) AS advisory_metadata,
              logo_url,
              logo_dark_url,
              COALESCE(primary_color, '#0B1F3A') AS primary_color,
              COALESCE(secondary_color, '#2F6FED') AS secondary_color,
              COALESCE(font_family, 'Inter, system-ui, sans-serif') AS font_family,
              COALESCE(footer_legal_text, '') AS footer_legal_text,
              COALESCE(template_hints, '{}'::jsonb) AS template_hints
       FROM organization_white_label_settings
       WHERE organization_id = $1
       LIMIT 1`,
      [organizationId],
    );
    return rows[0] ?? null;
  }

  private defaultProWhiteLabel(): WhiteLabelConfig {
    return {
      enabled: true,
      advisoryMetadata: {},
      logoUrl: null,
      logoDarkUrl: null,
      corporateAssets: {
        primaryColor: '#0B1F3A',
        secondaryColor: '#2F6FED',
        fontFamily: 'Inter, system-ui, sans-serif',
        footerLegalText: '',
      },
      templateCompilerHints: { theme: 'pro_default' },
    };
  }
}

// =============================================================================
// Valuation controller (protected route)
// =============================================================================

@Injectable()
export class ValuationOrchestrationService {
  private readonly logger = new Logger(ValuationOrchestrationService.name);

  constructor(
    private readonly whiteLabel: WhiteLabelService,
    private readonly db: DatabaseService,
  ) {}

  async calculate(
    dto: ValuationCalculateDto,
    paywall: PaywallContext,
  ): Promise<ValuationCalculateResponseDto> {
    const valuationId = crypto.randomUUID();

    if (paywall.entitlement === 'on_demand_token' && paywall.transactionId) {
      await this.db.getPool().query(
        `UPDATE stripe_transactions
         SET valuation_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [valuationId, paywall.transactionId],
      );
    }

    const whiteLabel = await this.whiteLabel.resolveWhiteLabelConfig(paywall.user.organizationId);

    // Dispatch to Python ValubotFinancialCore worker (queue/HTTP) — hook point
    this.logger.log(
      `Valuation ${valuationId} authorized via ${paywall.entitlement} for org ${paywall.user.organizationId}`,
    );

    return {
      status: 'queued',
      valuationId,
      entitlement: paywall.entitlement,
      whiteLabel,
    };
  }
}

@Controller('api/v1/valuation')
export class ValuationController {
  constructor(
    private readonly valuations: ValuationOrchestrationService,
    private readonly auth: AuthContextService,
  ) {}

  @Post('calculate')
  @UseGuards(ValuationGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async calculate(
    @Req() req: Request,
    @Body() dto: ValuationCalculateDto,
  ): Promise<ValuationCalculateResponseDto> {
    const paywall = req.paywall;
    if (!paywall) {
      throw new InternalServerErrorException('Paywall context missing after guard.');
    }
    if (!dto?.companyId || !Array.isArray(dto.rawRdExpenses)) {
      throw new BadRequestException('companyId and rawRdExpenses are required.');
    }
    return this.valuations.calculate(dto, paywall);
  }
}

// =============================================================================
// Nest module — wire all providers and routes
// =============================================================================

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          issuer: 'valubot',
          audience: 'valubot-valuation',
        },
      }),
    }),
  ],
  controllers: [
    PaymentController,
    ValuationController,
    WhatsAppAuthController,
    ValuationReportController,
  ],
  providers: [
    DatabaseService,
    IsraeliPaymentGatewayClient,
    LocalPaymentTransactionRepository,
    SubscriptionRepository,
    AuthContextService,
    PaymentService,
    ValuationGuard,
    WhiteLabelService,
    ValuationOrchestrationService,
    WhatsAppOtpAuthGatewayService,
    ValuationReportGatewayService,
  ],
  exports: [
    PaymentService,
    ValuationGuard,
    WhiteLabelService,
    DatabaseService,
    IsraeliPaymentGatewayClient,
    LocalPaymentTransactionRepository,
    SubscriptionRepository,
    WhatsAppOtpAuthGatewayService,
    ValuationReportGatewayService,
  ],
})
export class ServerGatewayModule {}

/** @deprecated Use `LocalPaymentTransactionRepository` — legacy Stripe naming. */
export { LocalPaymentTransactionRepository as StripeTransactionRepository };

/**
 * Application bootstrap helper (use in main.ts):
 *
 * ```ts
 * import { NestFactory } from '@nestjs/core';
 * import { AppModule } from './app.module';
 *
 * const app = await NestFactory.create(AppModule, { rawBody: true });
 * await app.listen(3000);
 * ```
 *
 * Required env (Israeli gateway):
 * - PAYMENT_GATEWAY_PROVIDER=grow|payme
 * - PAYMENT_GATEWAY_BASE_URL
 * - PAYMENT_GATEWAY_API_KEY
 * - PAYMENT_GATEWAY_WEBHOOK_SECRET
 * - PAYMENT_GATEWAY_CALLBACK_URL  (POST /api/v1/payments/callback)
 * - GROW_PAGE_CODE / GROW_USER_ID  (when provider=grow)
 * - PAYME_SELLER_ID                (when provider=payme)
 *
 * WhatsApp OTP / dispatch:
 * - WHATSAPP_PROVIDER=twilio|green-api
 * - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM
 * - GREEN_API_INSTANCE_ID / GREEN_API_TOKEN
 * - EMAIL_PROVIDER=resend|sendgrid
 * - RESEND_API_KEY / SENDGRID_API_KEY / EMAIL_FROM
 * - OTP_DEV_BYPASS=true (dev only) / OTP_DEV_BYPASS_CODE=4242
 * - ML_ANONYMIZATION_PEPPER
 */

// =============================================================================
// Optional: JWT module factory for root AppModule registration
// =============================================================================

export const jwtModuleFactory = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      issuer: 'valubot',
      audience: 'valubot-valuation',
    },
  }),
};
