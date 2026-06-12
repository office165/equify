/**
 * Server-safe forecast matrix sample (shared by dashboard + API mock).
 */

export interface ExplicitDcfRowJson {
  year: number;
  revenue_growth?: number;
  revenue: number;
  ebit_margin?: number;
  ebit?: number;
  nopat?: number;
  fcff: number;
  pv_fcff?: number;
  discount_factor?: number;
  cumulative_pv_fcff?: number;
}

export interface TerminalValueJson {
  noplat_year_5: number;
  g_terminal?: number;
  wacc?: number;
  industry_tronic?: number;
  ronic_ss?: number;
  reinvestment_rate_ss?: number;
  free_cash_flow_terminal?: number;
  terminal_value: number;
  pv_terminal?: number;
  implied_growth_from_reinvestment?: number;
}

export interface ScenarioMetricsJson {
  enterprise_value: number;
  final_equity_value: number;
  equity_after_dlom?: number;
}

export interface ForecastMatrixAssumptions {
  wacc: number;
  g_terminal: number;
  industry_tronic: number;
  effective_tax_rate?: number;
  adjusted_ebit: number;
  base_revenue: number;
  revenue_growth_rates: number[];
  ebit_margin_targets: number[];
  da_pct_of_ebit?: number;
  capex_pct_of_revenue?: number;
  nwc_pct_of_revenue_change?: number;
}

export interface ForecastMatrixCapitalStructure {
  total_debt: number;
  cash_and_equivalents: number;
  minority_interest?: number;
  non_operating_assets?: number;
  market_cap_or_offer_price: number;
  dlom_rate?: number;
  control_premium_rate?: number;
  valuation_purpose?: string;
}

export interface ForecastMatrixMeta {
  company_name: string;
  currency: string;
  valuation_id?: string;
  confidence_score: number;
  generated_at?: string;
}

export interface ForecastMatrixJson {
  meta: ForecastMatrixMeta;
  assumptions: ForecastMatrixAssumptions;
  capital_structure: ForecastMatrixCapitalStructure;
  scenarios?: {
    bear?: ScenarioMetricsJson;
    base?: ScenarioMetricsJson;
    bull?: ScenarioMetricsJson;
  };
  explicit_dcf: ExplicitDcfRowJson[];
  terminal_value: TerminalValueJson;
  enterprise_value?: number;
}

export function createSampleForecastMatrix(): ForecastMatrixJson {
  return {
    meta: {
      company_name: 'Acme Technologies Ltd.',
      currency: 'ILS',
      valuation_id: '00000000-0000-4000-8000-000000000001',
      confidence_score: 78,
      generated_at: new Date().toISOString(),
    },
    assumptions: {
      wacc: 0.142,
      g_terminal: 0.025,
      industry_tronic: 0.12,
      effective_tax_rate: 0.23,
      adjusted_ebit: 2_400_000,
      base_revenue: 12_000_000,
      revenue_growth_rates: [0.12, 0.1, 0.09, 0.08, 0.07],
      ebit_margin_targets: [0.2, 0.21, 0.22, 0.23, 0.24],
      da_pct_of_ebit: 0.1,
      capex_pct_of_revenue: 0.05,
      nwc_pct_of_revenue_change: 0.1,
    },
    capital_structure: {
      total_debt: 1_800_000,
      cash_and_equivalents: 2_200_000,
      minority_interest: 0,
      non_operating_assets: 0,
      market_cap_or_offer_price: 28_000_000,
      dlom_rate: 0.2,
      valuation_purpose: 'CAPITAL_RAISE',
      control_premium_rate: 0.27,
    },
    explicit_dcf: [],
    terminal_value: {
      noplat_year_5: 2_500_000,
      terminal_value: 24_000_000,
      pv_terminal: 14_000_000,
    },
  };
}
