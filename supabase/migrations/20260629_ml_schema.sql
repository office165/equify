-- ML learning engine schema: valuation training data, market deals, benchmarks, performance tracking.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.compute_company_size_category(revenue NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF revenue IS NULL OR revenue < 0 THEN
    RETURN NULL;
  ELSIF revenue < 5_000_000 THEN
    RETURN 'micro';
  ELSIF revenue < 50_000_000 THEN
    RETURN 'small';
  ELSIF revenue < 250_000_000 THEN
    RETURN 'medium';
  ELSE
    RETURN 'large';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_valuations_log_company_size()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.company_size_category := public.compute_company_size_category(NEW.revenue_ils);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. valuations_log
-- ---------------------------------------------------------------------------

CREATE TABLE public.valuations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  industry TEXT NOT NULL,
  revenue_ils NUMERIC NOT NULL,
  ebitda_ils NUMERIC,
  ebitda_margin NUMERIC,
  net_debt_ils NUMERIC NOT NULL DEFAULT 0,
  growth_rate NUMERIC,
  quality_score NUMERIC,
  quality_breakdown JSONB,
  dcf_value NUMERIC,
  ebitda_multiple_used NUMERIC,
  revenue_multiple_used NUMERIC,
  equity_value_final NUMERIC NOT NULL,
  valuation_purpose TEXT,
  bear_value NUMERIC,
  base_value NUMERIC,
  bull_value NUMERIC,
  wacc_used NUMERIC,
  terminal_growth_rate NUMERIC NOT NULL DEFAULT 0.025,
  geographic_region TEXT NOT NULL DEFAULT 'israel',
  company_size_category TEXT,
  anonymized BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valuations_log_quality_score_range CHECK (
    quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)
  ),
  CONSTRAINT valuations_log_company_size_category_check CHECK (
    company_size_category IS NULL
    OR company_size_category IN ('micro', 'small', 'medium', 'large')
  )
);

CREATE TRIGGER trg_valuations_log_company_size
  BEFORE INSERT OR UPDATE OF revenue_ils ON public.valuations_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_valuations_log_company_size();

CREATE INDEX idx_valuations_log_industry ON public.valuations_log (industry);
CREATE INDEX idx_valuations_log_created_at ON public.valuations_log (created_at DESC);
CREATE INDEX idx_valuations_log_company_size_category ON public.valuations_log (company_size_category);

ALTER TABLE public.valuations_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. market_deals
-- ---------------------------------------------------------------------------

CREATE TABLE public.market_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deal_date DATE,
  industry TEXT NOT NULL,
  deal_value_ils NUMERIC,
  revenue_ils NUMERIC,
  ebitda_ils NUMERIC,
  ebitda_multiple NUMERIC,
  revenue_multiple NUMERIC,
  company_size_category TEXT,
  deal_type TEXT,
  source TEXT,
  notes TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT market_deals_company_size_category_check CHECK (
    company_size_category IS NULL
    OR company_size_category IN ('micro', 'small', 'medium', 'large')
  )
);

CREATE INDEX idx_market_deals_industry ON public.market_deals (industry);
CREATE INDEX idx_market_deals_created_at ON public.market_deals (created_at DESC);
CREATE INDEX idx_market_deals_company_size_category ON public.market_deals (company_size_category);
CREATE INDEX idx_market_deals_verified_industry ON public.market_deals (industry, verified)
  WHERE verified = true;

ALTER TABLE public.market_deals ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. industry_benchmarks
-- ---------------------------------------------------------------------------

CREATE TABLE public.industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  industry TEXT NOT NULL UNIQUE,
  ebitda_multiple_p25 NUMERIC,
  ebitda_multiple_median NUMERIC,
  ebitda_multiple_p75 NUMERIC,
  revenue_multiple_p25 NUMERIC,
  revenue_multiple_median NUMERIC,
  revenue_multiple_p75 NUMERIC,
  sample_size INTEGER NOT NULL DEFAULT 0,
  last_calibration_date DATE,
  data_sources JSONB
);

CREATE INDEX idx_industry_benchmarks_industry ON public.industry_benchmarks (industry);
CREATE INDEX idx_industry_benchmarks_updated_at ON public.industry_benchmarks (updated_at DESC);

ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. model_performance_log
-- ---------------------------------------------------------------------------

CREATE TABLE public.model_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valuation_id UUID REFERENCES public.valuations_log (id) ON DELETE SET NULL,
  predicted_value NUMERIC,
  actual_deal_value NUMERIC,
  error_pct NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN predicted_value IS NOT NULL
        AND actual_deal_value IS NOT NULL
        AND actual_deal_value <> 0
      THEN abs(predicted_value - actual_deal_value) / abs(actual_deal_value) * 100
      ELSE NULL
    END
  ) STORED,
  industry TEXT,
  notes TEXT
);

CREATE INDEX idx_model_performance_log_industry ON public.model_performance_log (industry);
CREATE INDEX idx_model_performance_log_created_at ON public.model_performance_log (created_at DESC);
CREATE INDEX idx_model_performance_log_valuation_id ON public.model_performance_log (valuation_id);

ALTER TABLE public.model_performance_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Benchmark resolver: verified deals (n >= 3) → fallback to industry_benchmarks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_industry_benchmark(p_industry TEXT)
RETURNS TABLE (
  ebitda_multiple_median NUMERIC,
  revenue_multiple_median NUMERIC,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal_count INTEGER;
  v_ebitda_median NUMERIC;
  v_revenue_median NUMERIC;
BEGIN
  SELECT
    count(*)::INTEGER,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY md.ebitda_multiple)
      FILTER (WHERE md.ebitda_multiple IS NOT NULL),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY md.revenue_multiple)
      FILTER (WHERE md.revenue_multiple IS NOT NULL)
  INTO v_deal_count, v_ebitda_median, v_revenue_median
  FROM public.market_deals AS md
  WHERE md.industry = p_industry
    AND md.verified = true;

  IF v_deal_count >= 3 THEN
    RETURN QUERY
    SELECT v_ebitda_median, v_revenue_median, 'market_deals'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ib.ebitda_multiple_median,
    ib.revenue_multiple_median,
    'industry_benchmarks'::TEXT
  FROM public.industry_benchmarks AS ib
  WHERE ib.industry = p_industry;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, 'none'::TEXT;
  END IF;
END;
$$;

COMMENT ON TABLE public.valuations_log IS 'Completed valuations as ML training data points.';
COMMENT ON TABLE public.market_deals IS 'Verified M&A transactions for benchmark calibration.';
COMMENT ON TABLE public.industry_benchmarks IS 'Calibrated industry multiples consumed by the valuation engine.';
COMMENT ON TABLE public.model_performance_log IS 'Predicted vs actual deal outcomes for model accuracy tracking.';
COMMENT ON FUNCTION public.get_industry_benchmark(TEXT) IS
  'Returns median EBITDA and revenue multiples from verified market_deals (min 3), else industry_benchmarks.';
