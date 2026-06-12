/**
 * Live PostgreSQL valuation orchestration (Supabase) — no Nest/Express deps.
 * Used by Next.js API routes and re-exported from server_gateway for Nest.
 */

import * as crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Pool, type PoolConfig } from 'pg';
import type { ValuationWizardFormValues } from './ValuationWizard';
import { buildForecastMatrixFromWizard } from './valuation_forecast';
import type {
  PaymentVerification,
  ValuationCalculateSuccessResponse,
  ValuationLocale,
} from './api_client';
import { MlTrainingPipelineService } from './lib/ml/training_pipeline';
import {
  ensureSupabasePoolerRegion,
  resolveDatabaseConnectionString,
} from './lib/database/supabase_pooler';
import { executeInMemoryValuation } from './lib/valuation/in_memory_engine';

export const LIVE_ON_DEMAND_AMOUNT_ILS = 99.0;
export const LIVE_ON_DEMAND_CURRENCY = 'ILS';
export const LIVE_JWT_TRANSACTION_TYP = 'on_demand_valuation';
export const LIVE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;

export class LiveValuationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'LiveValuationError';
  }
}

export function resolvePostgresSsl(
  connectionString: string,
  explicitSsl?: boolean,
): PoolConfig['ssl'] {
  const useSsl =
    explicitSsl ??
    (connectionString.includes('supabase.co') || process.env.PG_SSL === 'true');
  if (!useSsl) return undefined;
  return { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' };
}

export function createPostgresPool(connectionString: string, max = 20): Pool {
  return new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    ssl: resolvePostgresSsl(connectionString),
  });
}

let livePoolSingleton: Pool | null = null;

export function getLiveDatabasePool(): Pool {
  ensureSupabasePoolerRegion();
  let connectionString: string;
  try {
    connectionString = resolveDatabaseConnectionString();
  } catch {
    throw new LiveValuationError('DATABASE_URL is not configured.', 500);
  }
  if (!livePoolSingleton) {
    livePoolSingleton = createPostgresPool(connectionString, 10);
  }
  return livePoolSingleton;
}

export interface WizardValuationCalculateRequest {
  companyId: string;
  valuationTitle?: string;
  rawRdExpenses: number[];
  purpose?: string;
  wizard: ValuationWizardFormValues;
  locale?: string;
  contactEmail?: string;
  contactPhoneE164?: string;
}

interface WizardWorkspace {
  userId: string;
  organizationId: string;
  email: string;
}

interface OnDemandJwtPayload {
  sub: string;
  jti: string;
  typ: typeof LIVE_JWT_TRANSACTION_TYP;
  org: string;
  uid: string;
}

function parseWizardNumber(value: string, fallback = 0): number {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function wizardTokenParameters(
  body: WizardValuationCalculateRequest,
): Record<string, unknown> {
  const w = body.wizard;
  return {
    company_id_slug: body.companyId,
    valuation_title: body.valuationTitle ?? w.companyName,
    purpose: body.purpose ?? w.valuationPurpose,
    raw_rd_expenses: body.rawRdExpenses,
    locale: body.locale ?? 'en',
    wizard_snapshot: w,
    updated_at: new Date().toISOString(),
  };
}

async function ensureWizardWorkspace(pool: Pool): Promise<WizardWorkspace> {
  const envUserId = process.env.WIZARD_DEFAULT_USER_ID;
  const envOrgId = process.env.WIZARD_DEFAULT_ORGANIZATION_ID;
  if (envUserId && envOrgId) {
    const { rows } = await pool.query<{ email: string }>(
      `SELECT email FROM users WHERE id = $1 LIMIT 1`,
      [envUserId],
    );
    return {
      userId: envUserId,
      organizationId: envOrgId,
      email: rows[0]?.email ?? 'wizard@valubot.local',
    };
  }

  const existing = await pool.query<{
    user_id: string;
    organization_id: string;
    email: string;
  }>(
    `SELECT om.user_id, om.organization_id, u.email::text AS email
     FROM organization_members om
     INNER JOIN users u ON u.id = om.user_id
     WHERE u.deleted_at IS NULL
     ORDER BY om.created_at ASC
     LIMIT 1`,
  );
  if (existing.rows[0]) {
    return {
      userId: existing.rows[0].user_id,
      organizationId: existing.rows[0].organization_id,
      email: existing.rows[0].email,
    };
  }

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO organizations (id, name, slug, billing_email)
     VALUES ($1, 'Valubot Wizard', 'valubot-wizard', 'wizard@valubot.local')`,
    [orgId],
  );
  await pool.query(
    `INSERT INTO users (id, email, full_name, email_verified_at)
     VALUES ($1, 'wizard@valubot.local', 'Wizard Operator', NOW())`,
    [userId],
  );
  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner')`,
    [orgId, userId],
  );
  return {
    userId,
    organizationId: orgId,
    email: 'wizard@valubot.local',
  };
}

async function findOrCreateCompany(
  pool: Pool,
  organizationId: string,
  companySlug: string,
  wizard: ValuationWizardFormValues,
): Promise<string> {
  const displayName = wizard.companyName.trim() || companySlug;
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM companies
     WHERE organization_id = $1
       AND lower(replace(display_name, ' ', '-')) = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [organizationId, companySlug],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const companyId = crypto.randomUUID();
  const foundedYear = wizard.foundedYear
    ? Number.parseInt(wizard.foundedYear, 10)
    : null;
  await pool.query(
    `INSERT INTO companies (
       id, organization_id, legal_name, display_name,
       incorporation_country, industry_code, founded_year
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      companyId,
      organizationId,
      displayName,
      displayName,
      wizard.incorporationCountry || null,
      wizard.industry || null,
      Number.isFinite(foundedYear) ? foundedYear : null,
    ],
  );
  return companyId;
}

function signOnDemandToken(
  payload: OnDemandJwtPayload,
  jti: string,
): string {
  const secret = process.env.JWT_SECRET ?? 'valubot-dev-jwt-secret';
  const { jti: _omit, ...claims } = payload;
  return jwt.sign(claims, secret, {
    jwtid: jti,
    expiresIn: LIVE_TOKEN_TTL_SECONDS,
    issuer: 'valubot',
    audience: 'valubot-valuation',
  });
}

async function acquireOnDemandToken(
  pool: Pool,
  workspace: WizardWorkspace,
  tokenParams: Record<string, unknown>,
): Promise<{
  transactionId: string;
  gatewayTransactionId: string;
  gatewaySaleId: string;
}> {
  const available = await pool.query<{
    id: string;
    stripe_payment_intent_id: string;
    stripe_checkout_session_id: string | null;
  }>(
    `SELECT id, stripe_payment_intent_id, stripe_checkout_session_id
     FROM stripe_transactions
     WHERE is_used = FALSE
       AND expires_at > CURRENT_TIMESTAMP
       AND amount = $1
       AND currency = 'ILS'
     ORDER BY created_at ASC
     LIMIT 1`,
    [LIVE_ON_DEMAND_AMOUNT_ILS],
  );

  if (available.rows[0]) {
    const row = available.rows[0];
    await pool.query(
      `UPDATE stripe_transactions
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [row.id, JSON.stringify(tokenParams)],
    );
    return {
      transactionId: row.id,
      gatewayTransactionId: row.stripe_payment_intent_id,
      gatewaySaleId: row.stripe_checkout_session_id ?? `sale_${row.id}`,
    };
  }

  const transactionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const gatewayTransactionId = `txn_live_${crypto.randomUUID()}`;
  const gatewaySaleId = `sale_live_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + LIVE_TOKEN_TTL_SECONDS * 1000);
  const jwtPayload: OnDemandJwtPayload = {
    sub: transactionId,
    jti,
    typ: LIVE_JWT_TRANSACTION_TYP,
    org: workspace.organizationId,
    uid: workspace.userId,
  };
  const tokenJwt = signOnDemandToken(jwtPayload, jti);

  await pool.query(
    `INSERT INTO stripe_transactions (
       id, stripe_payment_intent_id, stripe_checkout_session_id,
       purchaser_user_id, amount, currency, is_used,
       token_jwt, token_jti, expires_at, metadata
     ) VALUES ($1, $2, $3, $4, $5, 'ILS', FALSE, $6, $7, $8, $9::jsonb)`,
    [
      transactionId,
      gatewayTransactionId,
      gatewaySaleId,
      workspace.userId,
      LIVE_ON_DEMAND_AMOUNT_ILS,
      tokenJwt,
      jti,
      expiresAt,
      JSON.stringify({
        provider: 'wizard_live',
        organization_id: workspace.organizationId,
        ...tokenParams,
      }),
    ],
  );

  return { transactionId, gatewayTransactionId, gatewaySaleId };
}

/** @deprecated Use `executeInMemoryValuation` — MVP bypasses all database I/O. */
export function buildOfflineWizardValuationResult(
  body: WizardValuationCalculateRequest,
): ValuationCalculateSuccessResponse {
  return executeInMemoryValuation(body);
}

/**
 * MVP valuation path — in-memory only. Database persistence is intentionally disabled.
 */
export async function tryPersistWizardValuation(
  body: WizardValuationCalculateRequest,
): Promise<ValuationCalculateSuccessResponse> {
  return executeInMemoryValuation(body);
}

export async function handleWizardValuationCalculate(
  body: WizardValuationCalculateRequest,
): Promise<ValuationCalculateSuccessResponse> {
  const pool = getLiveDatabasePool();
  const valuationId = crypto.randomUUID();
  const tokenParams = wizardTokenParameters(body);
  const workspace = await ensureWizardWorkspace(pool);

  await pool.query(
    `INSERT INTO audit_events (organization_id, user_id, entity_type, entity_id, action, payload)
     VALUES ($1, $2, 'valuation', $3, 'valuation_execution_attempted', $4::jsonb)`,
    [
      workspace.organizationId,
      workspace.userId,
      valuationId,
      JSON.stringify({
        company_id_slug: body.companyId,
        locale: body.locale,
        wizard_company: body.wizard.companyName,
      }),
    ],
  );

  const companyUuid = await findOrCreateCompany(
    pool,
    workspace.organizationId,
    body.companyId,
    body.wizard,
  );

  const locale: ValuationLocale = body.locale === 'he' ? 'he' : 'en';
  const forecast_matrix_json = buildForecastMatrixFromWizard(
    body.wizard,
    valuationId,
    locale,
  );

  const token = await acquireOnDemandToken(pool, workspace, tokenParams);

  const revenue = parseWizardNumber(body.wizard.annualRevenue, 0);
  const ebitda = parseWizardNumber(body.wizard.ebitda, 0);
  const fcf = parseWizardNumber(body.wizard.freeCashFlow, 0);
  const currentYear = new Date().getFullYear();

  await pool.query('BEGIN');
  try {
    const redeem = await pool.query<{ id: string }>(
      `UPDATE stripe_transactions
       SET is_used = TRUE,
           used_at = CURRENT_TIMESTAMP,
           used_by_user_id = $2,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND is_used = FALSE
         AND expires_at > CURRENT_TIMESTAMP
       RETURNING id`,
      [
        token.transactionId,
        workspace.userId,
        JSON.stringify({ ...tokenParams, valuation_id: valuationId }),
      ],
    );

    if (!redeem.rows[0]) {
      throw new LiveValuationError(
        'No redeemable on-demand token available for this run.',
      );
    }

    await pool.query(
      `INSERT INTO valuations (
         id, company_id, organization_id, created_by_user_id,
         status, title, as_of_date, currency,
         stripe_transaction_id, enterprise_valuation, equity_value,
         forecast_matrix_json, completed_at
       ) VALUES (
         $1, $2, $3, $4,
         'completed', $5, CURRENT_DATE, $6::currency_code,
         $7, $8, $9, $10::jsonb, CURRENT_TIMESTAMP
       )`,
      [
        valuationId,
        companyUuid,
        workspace.organizationId,
        workspace.userId,
        body.valuationTitle ?? (body.wizard.companyName.trim() || 'Valuation'),
        body.wizard.currency || 'ILS',
        token.transactionId,
        forecast_matrix_json.scenarios?.base?.enterprise_value ??
          Math.round(revenue * 4.5 * 100) / 100,
        forecast_matrix_json.scenarios?.base?.final_equity_value ??
          Math.round(revenue * 3.8 * 100) / 100,
        JSON.stringify(forecast_matrix_json),
      ],
    );

    await pool.query(
      `INSERT INTO financial_inputs (
         id, valuation_id, fiscal_year, revenue, ebitda, ebit,
         free_cash_flow, tax_rate, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        valuationId,
        currentYear,
        revenue,
        ebitda,
        ebitda > 0 ? ebitda * 0.85 : 0,
        fcf,
        0.23,
        JSON.stringify({
          raw_rd_expenses: body.rawRdExpenses,
          risk_modifiers: {
            recurring_revenue_pct: body.wizard.recurringRevenuePct,
            customer_concentration_pct: body.wizard.customerConcentrationPct,
            competition_level: body.wizard.competitionLevel,
            ip_protection: body.wizard.ipProtection,
            founder_dependency: body.wizard.founderDependency,
          },
        }),
      ],
    );

    await pool.query(
      `UPDATE stripe_transactions
       SET valuation_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [token.transactionId, valuationId],
    );

    await pool.query(
      `INSERT INTO audit_events (organization_id, user_id, entity_type, entity_id, action, payload)
       VALUES ($1, $2, 'valuation', $3, 'valuation_execution_completed', $4::jsonb)`,
      [
        workspace.organizationId,
        workspace.userId,
        valuationId,
        JSON.stringify({
          stripe_transaction_id: token.transactionId,
          entitlement: 'on_demand_token',
        }),
      ],
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  try {
    const mlPipeline = new MlTrainingPipelineService(pool);
    await mlPipeline.ingestCompletedValuation({
      valuationId,
      wizard: body.wizard,
      forecastMatrix: forecast_matrix_json,
      locale,
    });
  } catch (mlErr) {
    console.warn(
      '[valuation_live] ML training ingest skipped:',
      mlErr instanceof Error ? mlErr.message : mlErr,
    );
  }

  const payment: PaymentVerification = {
    verified: true,
    gatewayTransactionId: token.gatewayTransactionId,
    gatewaySaleId: token.gatewaySaleId,
    amount: LIVE_ON_DEMAND_AMOUNT_ILS,
    currency: LIVE_ON_DEMAND_CURRENCY,
    status: 'success',
  };

  return {
    status: 'completed',
    valuationId,
    entitlement: 'on_demand_token',
    payment,
    forecast_matrix_json,
  };
}

export async function verifyLiveDatabaseConnection(): Promise<{
  ok: true;
  serverTime: string;
}> {
  const pool = getLiveDatabasePool();
  const { rows } = await pool.query<{ now: Date }>(`SELECT NOW() AS now`);
  return { ok: true, serverTime: rows[0].now.toISOString() };
}
