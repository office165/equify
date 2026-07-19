-- =============================================================================
-- Valubot — Production PostgreSQL DDL
-- Startup valuation platform (Israeli market: ILS on-demand tokens)
-- =============================================================================
-- Requires: PostgreSQL 15+
-- No FREE tier — subscription_tier enum is the sole source of truth for tiers.
-- All monetary and ratio fields use NUMERIC/DECIMAL (never FLOAT/REAL).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

-- Strict tier set: ON_DEMAND is pay-per-valuation (999 ILS tokens); no FREE tier.
CREATE TYPE subscription_tier AS ENUM (
    'ON_DEMAND',
    'STARTER',
    'PRO',
    'ENTERPRISE'
);

CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
);

CREATE TYPE valuation_status AS ENUM (
    'draft',
    'inputs_pending',
    'computing',
    'completed',
    'failed',
    'archived'
);

CREATE TYPE security_class AS ENUM (
    'common',
    'preferred',
    'option',
    'warrant',
    'safe',
    'convertible_note',
    'rsu',
    'other'
);

CREATE TYPE stakeholder_role AS ENUM (
    'founder',
    'employee',
    'advisor',
    'investor',
    'esop_pool',
    'other'
);

CREATE TYPE currency_code AS ENUM (
    'ILS',
    'USD',
    'EUR',
    'GBP'
);

-- -----------------------------------------------------------------------------
-- Core identity
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT NOT NULL,
    full_name           TEXT,
    password_hash       TEXT,
    stripe_customer_id  TEXT UNIQUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    slug                TEXT NOT NULL,
    billing_email       CITEXT,
    stripe_customer_id  TEXT UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT organizations_slug_unique UNIQUE (slug),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
);

CREATE TABLE organization_members (
    organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role                TEXT NOT NULL DEFAULT 'member',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id),
    CONSTRAINT organization_members_role_check CHECK (
        role IN ('owner', 'admin', 'member', 'viewer')
    )
);

-- -----------------------------------------------------------------------------
-- Subscriptions (tier enforced via subscription_tier enum — no FREE value exists)
-- -----------------------------------------------------------------------------

CREATE TABLE subscription_plans (
    tier                subscription_tier PRIMARY KEY,
    display_name        TEXT NOT NULL,
    stripe_price_id     TEXT UNIQUE,
    monthly_price_ils   NUMERIC(12, 2) NOT NULL,
    valuations_per_month  INTEGER,
    max_team_seats       INTEGER,
    features             JSONB NOT NULL DEFAULT '{}',
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscription_plans_no_free_tier CHECK (
        tier::TEXT IN ('ON_DEMAND', 'STARTER', 'PRO', 'ENTERPRISE')
    ),
    CONSTRAINT subscription_plans_on_demand_pricing CHECK (
        (tier = 'ON_DEMAND' AND monthly_price_ils = 0 AND valuations_per_month IS NULL)
        OR (tier = 'ENTERPRISE')
        OR (tier IN ('STARTER', 'PRO') AND monthly_price_ils > 0)
    )
);

CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    tier                    subscription_tier NOT NULL,
    status                  subscription_status NOT NULL DEFAULT 'incomplete',
    stripe_subscription_id  TEXT UNIQUE,
    stripe_price_id         TEXT,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscriptions_tier_fk FOREIGN KEY (tier)
        REFERENCES subscription_plans (tier),
    CONSTRAINT subscriptions_no_free_tier CHECK (
        tier::TEXT IN ('ON_DEMAND', 'STARTER', 'PRO', 'ENTERPRISE')
    ),
    CONSTRAINT subscriptions_recurring_tier_has_stripe CHECK (
        tier = 'ON_DEMAND'
        OR stripe_subscription_id IS NOT NULL
        OR status IN ('incomplete', 'incomplete_expired', 'canceled')
    )
);

-- One active recurring subscription per org (ON_DEMAND uses tokens, not this row).
CREATE UNIQUE INDEX subscriptions_one_active_recurring_per_org
    ON subscriptions (organization_id)
    WHERE status IN ('trialing', 'active', 'past_due', 'paused')
      AND tier <> 'ON_DEMAND';

-- -----------------------------------------------------------------------------
-- Local ILS gateway: single-use 999 ILS on-demand transaction tokens
-- (Table name retained for compatibility; columns store Israeli gateway IDs.)
-- -----------------------------------------------------------------------------

CREATE TABLE stripe_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_payment_intent_id TEXT NOT NULL,  -- gateway_transaction_id
    stripe_checkout_session_id TEXT,       -- gateway_sale_id
    stripe_customer_id      TEXT,          -- payer_external_id
    purchaser_user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
    amount                  NUMERIC(12, 2) NOT NULL,
    currency                currency_code NOT NULL DEFAULT 'ILS',
    is_used                 BOOLEAN NOT NULL DEFAULT FALSE,
    token_jwt               TEXT NOT NULL,
    token_jti               TEXT NOT NULL,
    used_at                 TIMESTAMPTZ,
    used_by_user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
    valuation_id            UUID,
    gateway_provider        TEXT,          -- paypal | grow | payme | israeli_gateway
    metadata                JSONB NOT NULL DEFAULT '{}',
    expires_at              TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stripe_transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT stripe_transactions_on_demand_99_ils CHECK (
        amount = 999.00 AND currency = 'ILS'
    ),
    CONSTRAINT stripe_transactions_token_jwt_unique UNIQUE (token_jwt),
    CONSTRAINT stripe_transactions_token_jti_unique UNIQUE (token_jti),
    CONSTRAINT stripe_transactions_stripe_pi_unique UNIQUE (stripe_payment_intent_id),
    CONSTRAINT stripe_transactions_used_consistency CHECK (
        (is_used = FALSE AND used_at IS NULL)
        OR (is_used = TRUE AND used_at IS NOT NULL)
    ),
    CONSTRAINT stripe_transactions_expires_after_create CHECK (expires_at > created_at)
);

COMMENT ON TABLE stripe_transactions IS
    'Single-use 999 ILS payment tokens for ON_DEMAND valuations (Israeli gateway / PayPal). token_jwt is presented by the client; is_used prevents replay.';
COMMENT ON COLUMN stripe_transactions.token_jwt IS
    'Signed JWT issued after successful local ILS payment; invalidated logically via is_used.';
COMMENT ON COLUMN stripe_transactions.is_used IS
    'Set TRUE atomically when the token is redeemed for one valuation run.';
COMMENT ON COLUMN stripe_transactions.gateway_provider IS
    'Payment provider: paypal | grow | payme | israeli_gateway. Null = legacy rows.';

-- Partial index: fast lookup of redeemable 999 ILS tokens (hot path for ON_DEMAND checkout).
CREATE INDEX stripe_transactions_unused_99_ils_tokens
    ON stripe_transactions (token_jti, expires_at)
    WHERE is_used = FALSE
      AND amount = 999.00
      AND currency = 'ILS';

CREATE INDEX stripe_transactions_purchaser_user_id
    ON stripe_transactions (purchaser_user_id)
    WHERE purchaser_user_id IS NOT NULL;

CREATE INDEX stripe_transactions_stripe_customer_id
    ON stripe_transactions (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- PayPal captures with no matching users.email (manual reconciliation).
CREATE TABLE unmatched_payments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_email             TEXT,
    amount                  NUMERIC(12, 2),
    currency                TEXT DEFAULT 'ILS',
    gateway_provider        TEXT NOT NULL DEFAULT 'paypal',
    gateway_transaction_id  TEXT,
    raw_event               JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX unmatched_payments_payer_email_idx ON unmatched_payments (payer_email);
CREATE INDEX unmatched_payments_created_at_idx ON unmatched_payments (created_at DESC);

-- -----------------------------------------------------------------------------
-- Companies & valuations
-- -----------------------------------------------------------------------------

CREATE TABLE companies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    legal_name          TEXT NOT NULL,
    display_name        TEXT NOT NULL,
    incorporation_country CHAR(2),
    industry_code       TEXT,
    founded_year        SMALLINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT companies_founded_year_check CHECK (
        founded_year IS NULL OR (founded_year >= 1900 AND founded_year <= EXTRACT(YEAR FROM NOW())::SMALLINT + 1)
    )
);

CREATE TABLE valuations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    organization_id         UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    created_by_user_id      UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status                  valuation_status NOT NULL DEFAULT 'draft',
    title                   TEXT NOT NULL,
    as_of_date              DATE NOT NULL,
    currency                currency_code NOT NULL DEFAULT 'ILS',
    -- Entitlement: recurring tier subscription OR redeemed on-demand token
    subscription_id         UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
    stripe_transaction_id   UUID REFERENCES stripe_transactions (id) ON DELETE SET NULL,
    enterprise_valuation    NUMERIC(22, 2),
    equity_value            NUMERIC(22, 2),
    share_price             NUMERIC(18, 6),
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valuations_entitlement_xor CHECK (
        (subscription_id IS NOT NULL AND stripe_transaction_id IS NULL)
        OR (subscription_id IS NULL AND stripe_transaction_id IS NOT NULL)
        OR status = 'draft'
    ),
    CONSTRAINT valuations_completed_has_results CHECK (
        status <> 'completed'
        OR (enterprise_valuation IS NOT NULL AND equity_value IS NOT NULL)
    )
);

ALTER TABLE stripe_transactions
    ADD CONSTRAINT stripe_transactions_valuation_fk
    FOREIGN KEY (valuation_id) REFERENCES valuations (id) ON DELETE SET NULL;

CREATE INDEX valuations_company_id ON valuations (company_id);
CREATE INDEX valuations_organization_status ON valuations (organization_id, status);
CREATE INDEX valuations_as_of_date ON valuations (company_id, as_of_date DESC);

-- -----------------------------------------------------------------------------
-- Financial inputs (DCF / multiples — all ratios and amounts as NUMERIC)
-- -----------------------------------------------------------------------------

CREATE TABLE financial_inputs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_id                UUID NOT NULL REFERENCES valuations (id) ON DELETE CASCADE,
    fiscal_year                 SMALLINT NOT NULL,
    period_label                TEXT,
    revenue                     NUMERIC(22, 2) NOT NULL DEFAULT 0,
    cost_of_goods_sold          NUMERIC(22, 2) NOT NULL DEFAULT 0,
    gross_profit                NUMERIC(22, 2) GENERATED ALWAYS AS (revenue - cost_of_goods_sold) STORED,
    operating_expenses          NUMERIC(22, 2) NOT NULL DEFAULT 0,
    ebitda                      NUMERIC(22, 2) NOT NULL DEFAULT 0,
    depreciation_amortization   NUMERIC(22, 2) NOT NULL DEFAULT 0,
    ebit                        NUMERIC(22, 2) NOT NULL DEFAULT 0,
    net_income                  NUMERIC(22, 2) NOT NULL DEFAULT 0,
    capex                       NUMERIC(22, 2) NOT NULL DEFAULT 0,
    change_in_working_capital   NUMERIC(22, 2) NOT NULL DEFAULT 0,
    free_cash_flow              NUMERIC(22, 2) NOT NULL DEFAULT 0,
    -- Valuation model parameters (stored per projection row or base year)
    discount_rate               NUMERIC(9, 6),
    terminal_growth_rate        NUMERIC(9, 6),
    tax_rate                    NUMERIC(9, 6),
    wacc                        NUMERIC(9, 6),
    revenue_growth_rate         NUMERIC(9, 6),
    ebitda_margin               NUMERIC(9, 6),
    terminal_value              NUMERIC(22, 2),
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT financial_inputs_valuation_year_unique UNIQUE (valuation_id, fiscal_year),
    CONSTRAINT financial_inputs_fiscal_year_check CHECK (fiscal_year >= 1900 AND fiscal_year <= 2100),
    CONSTRAINT financial_inputs_rates_range CHECK (
        (discount_rate IS NULL OR (discount_rate >= 0 AND discount_rate <= 1))
        AND (terminal_growth_rate IS NULL OR (terminal_growth_rate >= -0.5 AND terminal_growth_rate <= 0.5))
        AND (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1))
        AND (wacc IS NULL OR (wacc >= 0 AND wacc <= 1))
        AND (revenue_growth_rate IS NULL OR (revenue_growth_rate >= -1 AND revenue_growth_rate <= 10))
        AND (ebitda_margin IS NULL OR (ebitda_margin >= -1 AND ebitda_margin <= 1))
    )
);

CREATE INDEX financial_inputs_valuation_id ON financial_inputs (valuation_id);
CREATE INDEX financial_inputs_valuation_fiscal_year ON financial_inputs (valuation_id, fiscal_year);

-- Comparable / market inputs (optional supplement)
CREATE TABLE financial_input_comparables (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_id        UUID NOT NULL REFERENCES valuations (id) ON DELETE CASCADE,
    peer_name           TEXT NOT NULL,
    ev_revenue          NUMERIC(12, 4),
    ev_ebitda           NUMERIC(12, 4),
    pe_ratio            NUMERIC(12, 4),
    revenue             NUMERIC(22, 2),
    ebitda              NUMERIC(22, 2),
    weight              NUMERIC(9, 6) NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT financial_input_comparables_weight_positive CHECK (weight > 0)
);

CREATE INDEX financial_input_comparables_valuation_id
    ON financial_input_comparables (valuation_id);

-- -----------------------------------------------------------------------------
-- Cap tables (fully diluted)
-- -----------------------------------------------------------------------------

CREATE TABLE cap_tables (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                      UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    valuation_id                    UUID REFERENCES valuations (id) ON DELETE SET NULL,
    name                            TEXT NOT NULL DEFAULT 'Primary cap table',
    as_of_date                      DATE NOT NULL,
    currency                        currency_code NOT NULL DEFAULT 'ILS',
    -- Fully diluted totals (denominator for ownership %)
    total_outstanding_shares        NUMERIC(24, 8) NOT NULL DEFAULT 0,
    total_options_outstanding       NUMERIC(24, 8) NOT NULL DEFAULT 0,
    total_warrants_outstanding      NUMERIC(24, 8) NOT NULL DEFAULT 0,
    total_convertibles_as_converted NUMERIC(24, 8) NOT NULL DEFAULT 0,
    total_fully_diluted_shares      NUMERIC(24, 8) NOT NULL DEFAULT 0,
    -- Valuation linkage
    pre_money_valuation             NUMERIC(22, 2),
    post_money_valuation            NUMERIC(22, 2),
    price_per_share                 NUMERIC(18, 6),
    option_pool_available           NUMERIC(24, 8) NOT NULL DEFAULT 0,
    option_pool_authorized          NUMERIC(24, 8) NOT NULL DEFAULT 0,
    is_primary                      BOOLEAN NOT NULL DEFAULT FALSE,
    notes                           TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cap_tables_shares_non_negative CHECK (
        total_outstanding_shares >= 0
        AND total_options_outstanding >= 0
        AND total_warrants_outstanding >= 0
        AND total_convertibles_as_converted >= 0
        AND total_fully_diluted_shares >= 0
        AND option_pool_available >= 0
        AND option_pool_authorized >= 0
    ),
    CONSTRAINT cap_tables_fully_diluted_formula CHECK (
        total_fully_diluted_shares =
            total_outstanding_shares
            + total_options_outstanding
            + total_warrants_outstanding
            + total_convertibles_as_converted
    )
);

CREATE UNIQUE INDEX cap_tables_one_primary_per_company
    ON cap_tables (company_id)
    WHERE is_primary = TRUE;

CREATE INDEX cap_tables_company_as_of ON cap_tables (company_id, as_of_date DESC);
CREATE INDEX cap_tables_valuation_id ON cap_tables (valuation_id) WHERE valuation_id IS NOT NULL;

CREATE TABLE cap_table_stakeholders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cap_table_id        UUID NOT NULL REFERENCES cap_tables (id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    role                stakeholder_role NOT NULL DEFAULT 'other',
    email               CITEXT,
    external_id         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cap_table_stakeholders_cap_table_id ON cap_table_stakeholders (cap_table_id);

CREATE TABLE cap_table_securities (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cap_table_id            UUID NOT NULL REFERENCES cap_tables (id) ON DELETE CASCADE,
    stakeholder_id          UUID NOT NULL REFERENCES cap_table_stakeholders (id) ON DELETE CASCADE,
    security_class          security_class NOT NULL,
    series_name             TEXT,
    certificate_id        TEXT,
    shares_issued           NUMERIC(24, 8) NOT NULL DEFAULT 0,
    shares_outstanding      NUMERIC(24, 8) NOT NULL DEFAULT 0,
    -- For options / warrants / convertibles (fully diluted basis)
    shares_fully_diluted    NUMERIC(24, 8) NOT NULL DEFAULT 0,
    strike_price            NUMERIC(18, 6),
    conversion_price        NUMERIC(18, 6),
    liquidation_preference  NUMERIC(22, 2),
    participation_cap       NUMERIC(22, 2),
    investment_amount       NUMERIC(22, 2),
    ownership_percent_fd    NUMERIC(9, 6),
    issue_date              DATE,
    vesting_start_date      DATE,
    vesting_cliff_months    SMALLINT,
    vesting_duration_months SMALLINT,
    is_outstanding          BOOLEAN NOT NULL DEFAULT TRUE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cap_table_securities_shares_non_negative CHECK (
        shares_issued >= 0
        AND shares_outstanding >= 0
        AND shares_fully_diluted >= 0
    ),
    CONSTRAINT cap_table_securities_ownership_percent_range CHECK (
        ownership_percent_fd IS NULL
        OR (ownership_percent_fd >= 0 AND ownership_percent_fd <= 100)
    ),
    CONSTRAINT cap_table_securities_option_has_strike CHECK (
        security_class NOT IN ('option', 'warrant')
        OR strike_price IS NOT NULL
    )
);

CREATE INDEX cap_table_securities_cap_table_id ON cap_table_securities (cap_table_id);
CREATE INDEX cap_table_securities_stakeholder_id ON cap_table_securities (stakeholder_id);
CREATE INDEX cap_table_securities_class ON cap_table_securities (cap_table_id, security_class);

-- Materialized ownership roll-up view helper table (optional cache; maintained by app or trigger)
CREATE TABLE cap_table_ownership_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cap_table_id            UUID NOT NULL REFERENCES cap_tables (id) ON DELETE CASCADE,
    stakeholder_id          UUID NOT NULL REFERENCES cap_table_stakeholders (id) ON DELETE CASCADE,
    fully_diluted_shares    NUMERIC(24, 8) NOT NULL,
    ownership_percent_fd    NUMERIC(9, 6) NOT NULL,
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cap_table_ownership_snapshots_unique UNIQUE (cap_table_id, stakeholder_id),
    CONSTRAINT cap_table_ownership_snapshots_percent_range CHECK (
        ownership_percent_fd >= 0 AND ownership_percent_fd <= 100
    )
);

CREATE INDEX cap_table_ownership_snapshots_cap_table
    ON cap_table_ownership_snapshots (cap_table_id);

-- -----------------------------------------------------------------------------
-- CRM leads (Monday.com sync companion)
-- -----------------------------------------------------------------------------

CREATE TABLE crm_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone              TEXT NOT NULL,
    user_national_id        TEXT NOT NULL,
    user_corporate_tax_id   TEXT NOT NULL,
    user_email              CITEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'STARTED',
    monday_item_id          TEXT,
    monday_sync_error       TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT crm_leads_status_check CHECK (status IN ('STARTED', 'CONVERTED', 'LOST'))
);

CREATE INDEX crm_leads_email_created_idx ON crm_leads (user_email, created_at DESC);

-- -----------------------------------------------------------------------------
-- Valuation PDF archive (Supabase Storage + history)
-- Bucket: valuation_reports (create in Supabase Storage dashboard)
-- -----------------------------------------------------------------------------

CREATE TABLE valuations_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email              CITEXT NOT NULL,
    user_phone              TEXT NOT NULL,
    valuation_midpoint      NUMERIC(18, 2) NOT NULL DEFAULT 0,
    pdf_url                 TEXT NOT NULL,
    user_id                 TEXT,
    user_corporate_tax_id   TEXT DEFAULT '',
    currency                TEXT DEFAULT 'ILS',
    valuation_id            TEXT,
    pdf_storage_path        TEXT,
    pdf_public_url          TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX valuations_history_email_created_idx
    ON valuations_history (user_email, created_at DESC);

CREATE INDEX valuations_history_valuation_id_idx
    ON valuations_history (valuation_id)
    WHERE valuation_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Audit & usage metering
-- -----------------------------------------------------------------------------

CREATE TABLE audit_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
    entity_type     TEXT NOT NULL,
    entity_id       UUID,
    action          TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_events_org_created ON audit_events (organization_id, created_at DESC);
CREATE INDEX audit_events_entity ON audit_events (entity_type, entity_id);

CREATE TABLE valuation_usage_counters (
    organization_id     UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    tier                subscription_tier NOT NULL,
    valuations_created  INTEGER NOT NULL DEFAULT 0,
    valuations_completed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (organization_id, period_start),
    CONSTRAINT valuation_usage_counters_no_free CHECK (
        tier::TEXT IN ('ON_DEMAND', 'STARTER', 'PRO', 'ENTERPRISE')
    )
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER organizations_set_updated_at
    BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscription_plans_set_updated_at
    BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_set_updated_at
    BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER stripe_transactions_set_updated_at
    BEFORE UPDATE ON stripe_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER companies_set_updated_at
    BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER valuations_set_updated_at
    BEFORE UPDATE ON valuations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER financial_inputs_set_updated_at
    BEFORE UPDATE ON financial_inputs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER cap_tables_set_updated_at
    BEFORE UPDATE ON cap_tables FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER cap_table_stakeholders_set_updated_at
    BEFORE UPDATE ON cap_table_stakeholders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER cap_table_securities_set_updated_at
    BEFORE UPDATE ON cap_table_securities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER crm_leads_set_updated_at
    BEFORE UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_white_label_settings (
    organization_id     UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
    advisory_metadata   JSONB NOT NULL DEFAULT '{}',
    logo_url            TEXT,
    logo_dark_url       TEXT,
    primary_color       TEXT NOT NULL DEFAULT '#0B1F3A',
    secondary_color     TEXT NOT NULL DEFAULT '#2F6FED',
    font_family         TEXT NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
    footer_legal_text   TEXT NOT NULL DEFAULT '',
    template_hints      JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organization_white_label_settings_set_updated_at
    BEFORE UPDATE ON organization_white_label_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Seed canonical tiers (no FREE row possible — enum + CHECK enforce set)
-- -----------------------------------------------------------------------------

