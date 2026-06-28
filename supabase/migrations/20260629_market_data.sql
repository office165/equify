CREATE TABLE IF NOT EXISTS market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  industry_key text NOT NULL,
  metric_key text NOT NULL,
  value numeric NOT NULL,
  raw_ticker text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  effective_date date NOT NULL DEFAULT current_date
);

CREATE INDEX idx_market_data_industry ON market_data(industry_key, metric_key, fetched_at DESC);

CREATE TABLE IF NOT EXISTS market_data_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT current_date,
  damodaran_ev_ebitda jsonb,
  yahoo_israel_multiples jsonb,
  computed_multiples jsonb,
  wacc_by_industry jsonb,
  crp_israel numeric,
  risk_free_rate numeric,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_snapshots_date ON market_data_snapshots(snapshot_date);
