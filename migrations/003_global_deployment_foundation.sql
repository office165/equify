-- Valubot global deployment foundation: WhatsApp OTP, ML training, dispatch audit
-- PostgreSQL 15+

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_unique
    ON users (phone_e164)
    WHERE phone_e164 IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS whatsapp_otp_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164      TEXT NOT NULL,
    otp_hash        TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 5,
    verified_at     TIMESTAMPTZ,
    consumed_at     TIMESTAMPTZ,
    provider        TEXT NOT NULL DEFAULT 'twilio',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_otp_phone_format CHECK (phone_e164 ~ '^\+[1-9]\d{6,14}$')
);

CREATE INDEX IF NOT EXISTS whatsapp_otp_sessions_phone_active_idx
    ON whatsapp_otp_sessions (phone_e164, expires_at DESC)
    WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS ml_training_dataset (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymized_run_id           TEXT NOT NULL,
    sector_code                 TEXT,
    normalized_revenue          NUMERIC(18, 6),
    ebitda_margin               NUMERIC(10, 6),
    risk_modifiers              JSONB NOT NULL DEFAULT '{}',
    midpoint_multi_run_outcome  NUMERIC(18, 2),
    feature_vector              JSONB NOT NULL DEFAULT '{}',
    locale                      TEXT NOT NULL DEFAULT 'en',
    ingested_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ml_training_dataset_anonymized_run_unique UNIQUE (anonymized_run_id)
);

CREATE INDEX IF NOT EXISTS ml_training_dataset_sector_idx
    ON ml_training_dataset (sector_code);

CREATE TABLE IF NOT EXISTS valuation_dispatch_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valuation_id    UUID NOT NULL,
    channel         TEXT NOT NULL,
    destination     TEXT NOT NULL,
    locale          TEXT NOT NULL DEFAULT 'en',
    status          TEXT NOT NULL DEFAULT 'queued',
    provider        TEXT,
    error_message   TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    CONSTRAINT valuation_dispatch_channel_check CHECK (
        channel IN ('email', 'whatsapp', 'pdf_generated')
    )
);

CREATE INDEX IF NOT EXISTS valuation_dispatch_log_valuation_idx
    ON valuation_dispatch_log (valuation_id);

ALTER TABLE valuations
    ADD COLUMN IF NOT EXISTS forecast_matrix_json JSONB;

COMMIT;
