'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeFinancialDiagnostics,
  type DiagnosticStatus,
  type FinancialDiagnosticsPayload,
  type ForecastMatrixWithDiagnostics,
} from './api_client';
import { AmbientBackground } from './components/ambient/AmbientBackground';
import { EquifyLogo } from './components/brand/EquifyLogo';
import { Navbar } from './components/Navbar';
import {
  generateFundamentalInsights,
  healthStatusLabel,
} from './lib/analysis/fundamental_insights';
import {
  formatArbitrageGapPct,
  isArbitrageGapExtreme,
} from './lib/valuation/arbitrage_gap';
import { FundamentalAnalysisSection } from './lib/components/FundamentalAnalysisSection';
import { EquityWaterfall } from './components/verdict/EquityWaterfall';
import { ScenarioCards, type ScenarioKey } from './components/verdict/ScenarioCards';
import { VerdictHero } from './components/verdict/VerdictHero';
import { VerdictMarketContext } from './components/verdict/VerdictMarketContext';
import { valuationCopy } from './lib/brand/valuation_copy';
import {
  bridgeFromEnterpriseValue,
} from './lib/valuation/equity_bridge';
import {
  assertValuationCoherence,
  buildCanonicalValuation,
  scenarioEquitySlices,
} from './lib/valuation/canonical_valuation';
import { buildVerdictMetrics } from './lib/valuation/verdict_metrics';
import { MultiplesAnalysisPanel } from './components/MultiplesAnalysisPanel';
import { buildMultiplesPanelData } from './lib/valuation/multiples_panel_data';
import { SiteFooter } from './components/SiteFooter';
import { WhatsAppShareButton } from './components/ui/WhatsAppShareButton';
import { PdfLegalDisclaimerStamp } from './components/PdfLegalDisclaimerStamp';
import { executeClientPdfAndRelay } from './lib/pdf/client_pdf_relay_flow';
import {
  applyPdfClientIdentityToMatrix,
  harvestPdfClientIdentity,
} from './lib/pdf/harvest_client_identity';
import type { ReportDataOverrides } from './lib/pdf/map_matrix_to_report_data';
import { PdfClientIdentityCaptureBlock } from './components/pdf/PdfClientIdentityCaptureBlock';
import { normalizeMultiplesAnalysis } from './lib/valuation/normalize_multiples_analysis';
import { formatValuationRef } from './lib/pdf/formatters';
import {
  defaultQualitativeNarrative,
  getWizardContext,
  hasValidatedUserIdentifiers,
} from './lib/pdf/wizard_context';
import {
  formatValuationCurrency,
  LanguageToggle,
  useValuationI18n,
  type ValuationTranslations,
} from './valuation_i18n';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// =============================================================================
// Constants (mirrors valuation_engine.py)
// =============================================================================

const EXPLICIT_FORECAST_YEARS = 5;
const MID_YEAR_DISCOUNT_OFFSET = 0.5;
const MAX_REINVESTMENT_RATE = 1.0;
const MIN_WACC_MINUS_G_SPREAD = 0.005;
const DEFAULT_DLOM_RATE = 0.20;
const DEFAULT_TAX_RATE = 0.23;

const BEAR_GROWTH_SHIFT_PP = -3;
const BULL_GROWTH_SHIFT_PP = 3;
const BEAR_MARGIN_SHIFT_PP = -2;
const BULL_MARGIN_SHIFT_PP = 2;

// =============================================================================
// Strict backend payload schema (re-exported for consumers)
// =============================================================================

export type {
  ExplicitDcfRowJson,
  TerminalValueJson,
  ScenarioMetricsJson,
  ForecastMatrixAssumptions,
  ForecastMatrixCapitalStructure,
  ForecastMatrixMeta,
  ForecastMatrixJson,
} from './forecast_sample';

export { createSampleForecastMatrix } from './forecast_sample';

import type {
  ForecastMatrixAssumptions,
  ForecastMatrixCapitalStructure,
  ForecastMatrixJson,
} from './forecast_sample';

// =============================================================================
// Client-side valuation engine (mirrors backend)
// =============================================================================

export interface ComputedDcfRow {
  year: number;
  revenue: number;
  revenue_growth: number;
  ebit_margin: number;
  ebit: number;
  nopat: number;
  fcff: number;
  pv_fcff: number;
  cumulative_pv_fcff: number;
  implied_enterprise_value_partial: number;
}

export interface TerminalComputation {
  noplat_year_5: number;
  ronic_ss: number;
  reinvestment_rate_ss: number;
  implied_g: number;
  free_cash_flow_terminal: number;
  terminal_value: number;
  pv_terminal: number;
}

export interface ScenarioValuation {
  label: 'Bear' | 'Base' | 'Bull';
  enterprise_value: number;
  equity_before_dlom: number;
  equity_after_dlom: number;
  final_equity_value: number;
  explicit_rows: ComputedDcfRow[];
  terminal: TerminalComputation;
}

export interface LiveValuationResult {
  scenarios: {
    bear: ScenarioValuation;
    base: ScenarioValuation;
    bull: ScenarioValuation;
  };
  chart_series: {
    year: number;
    fcff: number;
    cumulative_pv: number;
    implied_ev_path: number;
  }[];
  market_cap_baseline: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function padRates(rates: number[], years: number): number[] {
  const out = rates.slice(0, years);
  while (out.length < years) {
    out.push(out[out.length - 1] ?? 0.08);
  }
  return out;
}

function applyDeltaToGrowthRates(
  baseRates: number[],
  growthDeltaPctPoints: number,
): number[] {
  const delta = growthDeltaPctPoints / 100;
  return baseRates.map((g) => clamp(g + delta, -0.5, 1.5));
}

function applyDeltaToMargins(
  baseMargins: number[],
  marginDeltaPctPoints: number,
): number[] {
  const delta = marginDeltaPctPoints / 100;
  return baseMargins.map((m) => clamp(m + delta, -0.5, 0.85));
}

function computeExplicitDcf(params: {
  assumptions: ForecastMatrixAssumptions;
  growthDelta: number;
  marginDelta: number;
}): ComputedDcfRow[] {
  const { assumptions, growthDelta, marginDelta } = params;
  const tax = assumptions.effective_tax_rate ?? DEFAULT_TAX_RATE;
  const wacc = assumptions.wacc;
  const rev0 = Math.max(assumptions.base_revenue, 1);
  const daPct = assumptions.da_pct_of_ebit ?? 0.1;
  const capexPct = assumptions.capex_pct_of_revenue ?? 0.05;
  const nwcPct = assumptions.nwc_pct_of_revenue_change ?? 0.1;

  const gRates = applyDeltaToGrowthRates(
    padRates(assumptions.revenue_growth_rates, EXPLICIT_FORECAST_YEARS),
    growthDelta,
  );
  const margins = applyDeltaToMargins(
    padRates(assumptions.ebit_margin_targets, EXPLICIT_FORECAST_YEARS),
    marginDelta,
  );

  const rows: ComputedDcfRow[] = [];
  let revenue = rev0;
  let priorRevenue = rev0;
  let cumulativePv = 0;

  for (let t = 1; t <= EXPLICIT_FORECAST_YEARS; t++) {
    const g = gRates[t - 1];
    revenue = priorRevenue * (1 + g);
    const ebit = revenue * margins[t - 1];
    const da = Math.abs(ebit) * daPct;
    const nopat = ebit * (1 - tax);
    const capex = revenue * capexPct;
    const deltaNwc = (revenue - priorRevenue) * nwcPct;
    const fcff = nopat + da - capex - deltaNwc;
    const discountPeriod = t - MID_YEAR_DISCOUNT_OFFSET;
    const discountFactor = 1 / (1 + wacc) ** discountPeriod;
    const pvFcff = fcff * discountFactor;
    cumulativePv += pvFcff;

    rows.push({
      year: t,
      revenue,
      revenue_growth: g,
      ebit_margin: margins[t - 1],
      ebit,
      nopat,
      fcff,
      pv_fcff: pvFcff,
      cumulative_pv_fcff: cumulativePv,
      implied_enterprise_value_partial: cumulativePv,
    });
    priorRevenue = revenue;
  }

  return rows;
}

function computeTerminalValue(params: {
  noplatYear5: number;
  wacc: number;
  gTerminal: number;
  industryTronic: number;
}): TerminalComputation {
  const { noplatYear5, wacc, gTerminal, industryTronic } = params;
  const ronicSs = Math.max(industryTronic, wacc);
  let g = gTerminal;

  if (g >= wacc - MIN_WACC_MINUS_G_SPREAD) {
    g = wacc - MIN_WACC_MINUS_G_SPREAD - 0.0001;
  }

  let reinvestmentRateSs = g / ronicSs;
  reinvestmentRateSs = clamp(reinvestmentRateSs, 0, MAX_REINVESTMENT_RATE);
  const impliedG = reinvestmentRateSs * ronicSs;
  const fcfTerminal = noplatYear5 * (1 - reinvestmentRateSs);
  const denominator = wacc - impliedG;

  if (denominator <= 0) {
    throw new Error('Invalid perpetuity denominator');
  }

  const terminalValue = fcfTerminal / denominator;
  const pvTerminal =
    terminalValue / (1 + wacc) ** (EXPLICIT_FORECAST_YEARS - MID_YEAR_DISCOUNT_OFFSET);

  return {
    noplat_year_5: noplatYear5,
    ronic_ss: ronicSs,
    reinvestment_rate_ss: reinvestmentRateSs,
    implied_g: impliedG,
    free_cash_flow_terminal: fcfTerminal,
    terminal_value: terminalValue,
    pv_terminal: pvTerminal,
  };
}

function bridgeToEquity(params: {
  enterpriseValue: number;
  capital: ForecastMatrixCapitalStructure;
}): {
  equity_before_dlom: number;
  equity_after_dlom: number;
  final_equity_value: number;
} {
  const { enterpriseValue, capital } = params;
  const dlom = capital.dlom_rate ?? DEFAULT_DLOM_RATE;
  const netDebt = capital.total_debt - capital.cash_and_equivalents;
  const minority = capital.minority_interest ?? 0;
  const nonOp = capital.non_operating_assets ?? 0;

  const equityBeforeDlom = enterpriseValue - netDebt - minority + nonOp;
  const equityAfterDlom = equityBeforeDlom * (1 - dlom);

  const purpose = capital.valuation_purpose ?? 'GENERAL';
  const applyControl =
    purpose === 'M&A_SALE' ||
    purpose === 'M_AND_A_SALE' ||
    purpose === 'CAPITAL_RAISE';
  const controlMult = applyControl ? 1 + (capital.control_premium_rate ?? 0.27) : 1;

  return {
    equity_before_dlom: equityBeforeDlom,
    equity_after_dlom: equityAfterDlom,
    final_equity_value: equityAfterDlom * controlMult,
  };
}

function buildScenario(
  label: 'Bear' | 'Base' | 'Bull',
  assumptions: ForecastMatrixAssumptions,
  capital: ForecastMatrixCapitalStructure,
  growthDelta: number,
  marginDelta: number,
): ScenarioValuation {
  const explicitRows = computeExplicitDcf({
    assumptions,
    growthDelta,
    marginDelta,
  });
  const noplatY5 = explicitRows[EXPLICIT_FORECAST_YEARS - 1].nopat;
  const terminal = computeTerminalValue({
    noplatYear5: noplatY5,
    wacc: assumptions.wacc,
    gTerminal: assumptions.g_terminal,
    industryTronic: assumptions.industry_tronic,
  });
  const sumPvExplicit = explicitRows.reduce((s, r) => s + r.pv_fcff, 0);
  const enterpriseValue = sumPvExplicit + terminal.pv_terminal;
  const equity = bridgeToEquity({ enterpriseValue, capital });

  return {
    label,
    enterprise_value: enterpriseValue,
    equity_before_dlom: equity.equity_before_dlom,
    equity_after_dlom: equity.equity_after_dlom,
    final_equity_value: equity.final_equity_value,
    explicit_rows: explicitRows,
    terminal,
  };
}

function computeLiveValuation(
  payload: ForecastMatrixJson,
  growthDelta: number,
  marginDelta: number,
): LiveValuationResult {
  const { assumptions, capital_structure: capital } = payload;

  const bear = buildScenario(
    'Bear',
    assumptions,
    capital,
    growthDelta + BEAR_GROWTH_SHIFT_PP,
    marginDelta + BEAR_MARGIN_SHIFT_PP,
  );
  const base = buildScenario('Base', assumptions, capital, growthDelta, marginDelta);
  const bull = buildScenario(
    'Bull',
    assumptions,
    capital,
    growthDelta + BULL_GROWTH_SHIFT_PP,
    marginDelta + BULL_MARGIN_SHIFT_PP,
  );

  const chart_series = base.explicit_rows.map((row, idx) => {
    const terminalPvShare =
      idx === base.explicit_rows.length - 1 ? base.terminal.pv_terminal : 0;
    return {
      year: row.year,
      fcff: row.fcff,
      cumulative_pv: row.cumulative_pv_fcff,
      implied_ev_path: row.cumulative_pv_fcff + terminalPvShare * (idx === 4 ? 1 : 0),
    };
  });

  // Extend year 5 point to full EV for trajectory visualization
  chart_series[4] = {
    ...chart_series[4],
    implied_ev_path: base.enterprise_value,
  };

  return {
    scenarios: { bear, base, bull },
    chart_series,
    market_cap_baseline: capital.market_cap_or_offer_price,
  };
}

// =============================================================================
// Formatting & UI primitives
// =============================================================================

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function DashboardCard({
  title,
  subtitle,
  children,
  className,
  accent = false,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        'pdf-card-break pdf-block-contain pdf-block-contain-spaced vb-bento-card rounded-xl border-[#00F5A0]/20 shadow-lg',
        accent && 'border-[#00F5A0]/35 ring-1 ring-[#00F5A0]/15',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-[#00F5A0]/15 bg-[#161D2A]/60 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00F5A0]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-slate-400/70">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

function ConfidenceRadial({
  score,
  label,
  size = 'md',
}: {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const pct = clamp(score, 0, 100);
  const dims = size === 'lg' ? 128 : size === 'sm' ? 96 : 112;
  const radius = size === 'lg' ? 52 : size === 'sm' ? 38 : 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const gradId = `confidenceGradient-${size}`;

  return (
    <div
      className="confidence-ring relative flex items-center justify-center"
      style={{ width: dims, height: dims }}
      role="img"
      aria-label={`${label}: ${Math.round(pct)}%`}
    >
      <svg
        className="-rotate-90"
        width={dims}
        height={dims}
        viewBox={`0 0 ${dims} ${dims}`}
        aria-hidden
      >
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          fill="none"
          stroke="#1a4a3f"
          strokeWidth="8"
        />
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F5A0" />
            <stop offset="100%" stopColor="#5eead4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
        <span
          className={cn(
            'confidence-ring__score font-bold tabular-nums text-[#00F5A0]',
            size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl',
          )}
        >
          {Math.round(pct)}
        </span>
        <span className="confidence-ring__label mt-0.5 max-w-[5.5rem] text-center text-[9px] uppercase leading-tight tracking-wider text-slate-300/60">
          {label}
        </span>
      </div>
    </div>
  );
}

function ReportBrandLogo({
  customLogoDataUrl,
  prominent = false,
}: {
  customLogoDataUrl?: string;
  prominent?: boolean;
}) {
  if (customLogoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customLogoDataUrl}
        alt=""
        className={cn(
          'mb-2 object-contain',
          prominent ? 'h-20 max-w-[280px]' : 'h-16 max-w-[220px]',
        )}
      />
    );
  }
  return (
    <EquifyLogo
      variant="dark-bg"
      className={cn(
        'mb-2',
        prominent ? 'max-w-[300px]' : 'max-w-[240px]',
      )}
    />
  );
}

function BusinessOverviewSection({
  text,
  i18n,
}: {
  text: string;
  i18n: ValuationTranslations;
}) {
  const display = text.trim() || i18n.t('businessOverviewEmpty');

  return (
    <DashboardCard
      title={i18n.t('businessOverviewTitle')}
      className="mb-8"
      accent
    >
      <p
        className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100/90 sm:text-[15px]"
        dir={i18n.dir}
      >
        {display}
      </p>
    </DashboardCard>
  );
}

function KeyFinancialMetricsCard({
  revenue,
  ebitda,
  wacc,
  blendedEnterpriseValue,
  currency,
  locale,
  i18n,
}: {
  revenue: number;
  ebitda: number;
  wacc: number;
  blendedEnterpriseValue?: number | null;
  currency: string;
  locale: ValuationTranslations['locale'];
  i18n: ValuationTranslations;
}) {
  const metrics: Array<{
    label: string;
    value: string;
    accent?: boolean;
    mobileFirst?: boolean;
  }> = [];

  if (
    blendedEnterpriseValue != null &&
    Number.isFinite(blendedEnterpriseValue)
  ) {
    metrics.push({
      label: i18n.t('blendedEnterpriseValue'),
      value: formatValuationCurrency(
        blendedEnterpriseValue,
        currency,
        locale,
        true,
      ),
      accent: true,
      mobileFirst: true,
    });
  }

  metrics.push(
    {
      label: i18n.t('annualRevenueActual'),
      value: formatValuationCurrency(revenue, currency, locale, true),
    },
    {
      label: i18n.t('ebitda'),
      value: formatValuationCurrency(ebitda, currency, locale, true),
    },
    {
      label: i18n.terms.wacc,
      value: `${(wacc * 100).toFixed(2)}%`,
    },
  );

  return (
    <DashboardCard title={i18n.t('keyFinancialMetricsTitle')} accent>
      <div
        className={cn(
          'grid gap-4',
          metrics.length > 3 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3',
        )}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={cn(
              'rounded-xl border px-4 py-4 shadow-inner',
              metric.accent
                ? 'order-first border-[#00F5A0]/40 bg-[#00F5A0]/10 ring-1 ring-[#00F5A0]/20 sm:order-none'
                : 'border-[#00F5A0]/15 bg-white/5',
              metric.mobileFirst && 'order-first sm:order-none',
            )}
          >
            <p
              className={cn(
                'text-[10px] font-semibold uppercase tracking-[0.14em]',
                metric.accent ? 'text-[#00F5A0]/90' : 'text-slate-400/70',
              )}
            >
              {metric.label}
            </p>
            <p
              className={cn(
                'mt-2',
                metric.accent ? 'num-metric text-[#00F5A0]' : 'num-metric-sm text-white/90',
              )}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function ConfidenceHealthCard({
  confidenceScore,
  healthScores,
  i18n,
  confidenceLabel,
  healthTitle,
}: {
  confidenceScore: number;
  healthScores: { label: string; status: string }[];
  i18n: ValuationTranslations;
  confidenceLabel: string;
  healthTitle: string;
}) {
  return (
    <DashboardCard title={i18n.t('modelConfidenceTitle')} className="h-full">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <ConfidenceRadial score={confidenceScore} label={confidenceLabel} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400/70">
            {healthTitle}
          </p>
          <ul className="space-y-2">
            {healthScores.map((item) => (
              <li
                key={item.label}
                className="diagnostic-block flex w-full items-center justify-between gap-4 rounded-lg border border-slate-800/40 bg-[#161D2A]/60 px-3 py-2 text-xs"
              >
                <span className="text-slate-100/85">{item.label}:</span>
                <span className="shrink-0 font-semibold uppercase tracking-wide text-[#00F5A0]">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}

function ScenarioSlider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  format,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  format: (v: number) => string;
}) {
  const display = format(value);
  const valueId = `${id}-value`;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-100">
          {label}
        </label>
        <span
          id={valueId}
          className="rounded-lg bg-mint-400/10 px-2.5 py-1 font-mono text-sm text-mint-400/90"
          aria-live="polite"
        >
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        role="slider"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
        aria-describedby={valueId}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600/90 accent-mint-400"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

interface AiInsight {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'watch' | 'opportunity';
}

function generateInsights(
  live: LiveValuationResult,
  growthDelta: number,
  marginDelta: number,
  marketCap: number,
  i18n: ValuationTranslations,
): AiInsight[] {
  const base = live.scenarios.base;
  const ev = base.enterprise_value;
  const gapPct = marketCap > 0 ? ((ev - marketCap) / marketCap) * 100 : 0;
  const insights: AiInsight[] = [];

  if (gapPct > 15) {
    insights.push({
      id: 'arb-upside',
      title: i18n.t('insightArbUpTitle'),
      body: isArbitrageGapExtreme(gapPct)
        ? 'פער חריג — מומלץ ניתוח ידני'
        : i18n.tf('insightArbUpBody', { pct: formatArbitrageGapPct(gapPct) }),
      severity: 'opportunity',
    });
  } else if (gapPct < -15) {
    insights.push({
      id: 'arb-downside',
      title: i18n.t('insightArbDownTitle'),
      body: isArbitrageGapExtreme(gapPct)
        ? 'פער חריג — מומלץ ניתוח ידני'
        : i18n.tf('insightArbDownBody', {
            pct: formatArbitrageGapPct(Math.abs(gapPct)),
          }),
      severity: 'watch',
    });
  }

  if (growthDelta > 2) {
    insights.push({
      id: 'growth-stretch',
      title: i18n.t('insightGrowthTitle'),
      body: i18n.tf('insightGrowthBody', { delta: growthDelta.toFixed(1) }),
      severity: 'watch',
    });
  }

  if (marginDelta > 2) {
    insights.push({
      id: 'margin-expand',
      title: i18n.t('insightMarginTitle'),
      body: i18n.tf('insightMarginBody', { delta: marginDelta.toFixed(1) }),
      severity: 'info',
    });
  }

  if (base.terminal.reinvestment_rate_ss > 0.35) {
    insights.push({
      id: 'reinvest-heavy',
      title: i18n.t('insightReinvestTitle'),
      body: i18n.tf('insightReinvestBody', {
        pct: (base.terminal.reinvestment_rate_ss * 100).toFixed(1),
      }),
      severity: 'info',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'stable',
      title: i18n.t('insightStableTitle'),
      body: i18n.t('insightStableBody'),
      severity: 'info',
    });
  }

  return insights;
}

const STATUS_STYLES: Record<
  DiagnosticStatus,
  { border: string; bg: string; text: string }
> = {
  healthy: {
    border: 'border-slate-800/40',
    bg: 'bg-[#161D2A]/80',
    text: 'text-mint-400',
  },
  watch: {
    border: 'border-amber-500/35',
    bg: 'bg-amber-950/20',
    text: 'text-amber-300',
  },
  stress: {
    border: 'border-rose-500/35',
    bg: 'bg-rose-950/20',
    text: 'text-rose-300',
  },
  na: {
    border: 'border-slate-600/50',
    bg: 'bg-slate-800/30',
    text: 'text-slate-400',
  },
};

function statusLabel(status: DiagnosticStatus, i18n: ValuationTranslations): string {
  switch (status) {
    case 'healthy':
      return i18n.t('ratioHealthy');
    case 'watch':
      return i18n.t('ratioWatch');
    case 'stress':
      return i18n.t('ratioStress');
    default:
      return i18n.t('ratioNa');
  }
}

function DiagnosticMetricCard({
  title,
  metric,
  description,
  i18n,
}: {
  title: string;
  metric: FinancialDiagnosticsPayload['liquidity']['currentRatio'];
  description: string;
  i18n: ValuationTranslations;
}) {
  const styles = STATUS_STYLES[metric.status];

  return (
    <article
      className={cn(
        'bento-grid-item pdf-card-contain metric-card diagnostic-block pdf-card-break pdf-block-contain pdf-block-contain-spaced rounded-2xl border p-5 shadow-inner shadow-black/20 transition hover:border-mint-400/25',
        styles.border,
        styles.bg,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        <span
          className={cn(
            'shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            styles.bg,
            styles.text,
          )}
        >
          {statusLabel(metric.status, i18n)}
        </span>
      </div>
      <p className="valubot-mono-figure mt-3 font-mono font-bold tabular-nums text-mint-400/90">
        {metric.formatted}
        {metric.id !== 'net_profit_margin' && metric.value !== null && (
          <span className="ms-1 text-lg text-slate-500">×</span>
        )}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      {metric.benchmarkNote && (
        <p className="mt-2 text-[10px] text-slate-500">{metric.benchmarkNote}</p>
      )}
    </article>
  );
}

function ExtendedCorporateProfileSection({
  diagnostics,
  currency,
  i18n,
}: {
  diagnostics: FinancialDiagnosticsPayload;
  currency: string;
  i18n: ValuationTranslations;
}) {
  const { proxies } = diagnostics;
  const fmt = (n: number) => formatValuationCurrency(n, currency, i18n.locale, true);

  return (
    <section
      className="pdf-section-group pdf-block-contain-spaced vb-bento-card my-6 mt-8 rounded-3xl shadow-2xl shadow-black/30"
      aria-label={i18n.t('extendedProfileTitle')}
    >
      <div className="border-b border-slate-700/50 bg-slate-800/30 px-6 py-5 sm:px-8">
        <h2 className="section-header-title text-lg font-semibold text-slate-50">
          {i18n.t('extendedProfileTitle')}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          {i18n.t('extendedProfileDesc')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-1.5">
            {i18n.t('assetsProxyNote')}
          </span>
          <span className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-1.5">
            {i18n.t('stObligationsNote')}
          </span>
        </div>
      </div>

      <div className="space-y-8 px-6 py-8 sm:px-8">
        <div className="pdf-section-group pdf-block-contain-spaced my-6">
          <h3 className="section-header-title pdf-block-contain mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-mint-400/90">
            {i18n.t('liquidityMetrics')}
          </h3>
          <div className="pdf-diagnostics-grid grid gap-4 md:grid-cols-2">
            <DiagnosticMetricCard
              title={i18n.terms.currentRatio}
              metric={diagnostics.liquidity.currentRatio}
              description={i18n.t('currentRatioDesc')}
              i18n={i18n}
            />
            <DiagnosticMetricCard
              title={i18n.terms.quickRatio}
              metric={diagnostics.liquidity.quickRatio}
              description={i18n.t('quickRatioDesc')}
              i18n={i18n}
            />
          </div>
        </div>

        <div className="pdf-section-group pdf-block-contain-spaced my-6">
          <h3 className="section-header-title pdf-block-contain mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-mint-400/90">
            {i18n.t('leverageMetrics')}
          </h3>
          <div className="pdf-diagnostics-grid grid gap-4 md:grid-cols-2">
            <DiagnosticMetricCard
              title={i18n.terms.netDebtEbitda}
              metric={diagnostics.leverage.netDebtToEbitda}
              description={i18n.t('netDebtEbitdaDesc')}
              i18n={i18n}
            />
            <DiagnosticMetricCard
              title={i18n.terms.debtToEquity}
              metric={diagnostics.leverage.debtToEquity}
              description={i18n.t('debtEquityDesc')}
              i18n={i18n}
            />
          </div>
        </div>

        <div className="pdf-section-group pdf-block-contain-spaced my-6">
          <h3 className="section-header-title pdf-block-contain mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-mint-400/90">
            {i18n.t('operationalEfficiency')}
          </h3>
          <div className="pdf-diagnostics-grid grid gap-4 md:grid-cols-2">
            <DiagnosticMetricCard
              title={i18n.terms.assetTurnover}
              metric={diagnostics.operational.assetTurnover}
              description={i18n.t('assetTurnoverDesc')}
              i18n={i18n}
            />
            <DiagnosticMetricCard
              title={i18n.terms.netProfitMargin}
              metric={diagnostics.operational.netProfitMargin}
              description={i18n.t('netMarginDesc')}
              i18n={i18n}
            />
          </div>
        </div>

        <div className="pdf-card-break pdf-block-contain pdf-block-contain-spaced rounded-2xl border border-slate-700/50 bg-slate-800/25 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {i18n.t('diagnosticInterpretation')}
          </p>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex justify-between gap-2 border-b border-slate-700/40 pb-2 sm:flex-col sm:border-0 sm:pb-0">
              <dt className="text-slate-500">{i18n.t('proxyTotalAssets')}</dt>
              <dd className="font-mono tabular-nums text-slate-200">{fmt(proxies.totalAssetsProxy)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-700/40 pb-2 sm:flex-col sm:border-0 sm:pb-0">
              <dt className="text-slate-500">{i18n.t('proxyStObligations')}</dt>
              <dd className="font-mono tabular-nums text-slate-200">
                {fmt(proxies.shortTermObligationsProxy)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-700/40 pb-2 sm:flex-col sm:border-0 sm:pb-0">
              <dt className="text-slate-500">{i18n.t('proxyNetDebt')}</dt>
              <dd className="font-mono tabular-nums text-slate-200">{fmt(proxies.netDebt)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-slate-700/40 pb-2 sm:flex-col sm:border-0 sm:pb-0">
              <dt className="text-slate-500">{i18n.t('proxyEquity')}</dt>
              <dd className="font-mono tabular-nums text-slate-200">{fmt(proxies.equityBookProxy)}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col">
              <dt className="text-slate-500">{i18n.t('proxyNetIncome')}</dt>
              <dd className="font-mono tabular-nums text-mint-400">
                {fmt(proxies.estimatedNetIncome)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Chart tooltip
// =============================================================================

function ChartTooltipContent({
  active,
  payload,
  label,
  currency,
  locale,
  yearLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    name?: string | number;
    value?: number | string;
    color?: string;
  }>;
  label?: string | number;
  currency: string;
  locale: ValuationTranslations['locale'];
  yearLabel: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-xs font-medium text-slate-400">
        {yearLabel} {label}
      </p>
      {payload.map((entry) => (
        <p
          key={entry.name ?? String(entry.value)}
          className="text-sm"
          style={{ color: entry.color ?? '#94a3b8' }}
        >
          {String(entry.name ?? '')}:{' '}
          {formatValuationCurrency(Number(entry.value ?? 0), currency, locale, true)}
        </p>
      ))}
    </div>
  );
}

// =============================================================================
// Main dashboard
// =============================================================================

export interface ValuationDashboardProps {
  forecast_matrix_json: ForecastMatrixJson | ForecastMatrixWithDiagnostics;
  onRunAnotherValuation?: () => void;
  onBackToHome?: () => void;
}

export default function ValuationDashboard({
  forecast_matrix_json,
  onRunAnotherValuation,
  onBackToHome,
}: ValuationDashboardProps) {
  const { i18n, locale } = useValuationI18n();
  const reportRef = useRef<HTMLDivElement>(null);
  const [growthDelta, setGrowthDelta] = useState(0);
  const [marginDelta, setMarginDelta] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('base');

  const matrix = forecast_matrix_json as ForecastMatrixWithDiagnostics;
  const currency = matrix.meta.currency ?? 'ILS';
  const companyName = matrix.meta.company_name ?? 'Company';
  const confidenceScore = matrix.meta.confidence_score ?? 72;

  const diagnostics = useMemo(() => {
    if (matrix.diagnostics_inputs) {
      return computeFinancialDiagnostics(matrix.diagnostics_inputs);
    }
    const rev = matrix.assumptions.base_revenue;
    const ebitda = matrix.assumptions.adjusted_ebit / 0.85;
    return computeFinancialDiagnostics({
      annual_revenue: rev,
      ebitda,
      ebit: matrix.assumptions.adjusted_ebit,
      total_debt: matrix.capital_structure.total_debt,
      cash: matrix.capital_structure.cash_and_equivalents,
      interest_expense: 0,
      free_cash_flow: 0,
      tax_rate: matrix.assumptions.effective_tax_rate ?? 0.23,
    });
  }, [matrix]);

  const live = useMemo(
    () => computeLiveValuation(matrix, growthDelta, marginDelta),
    [matrix, growthDelta, marginDelta],
  );

  const canonical = useMemo(
    () =>
      buildCanonicalValuation(matrix, {
        bear: live.scenarios.bear,
        base: live.scenarios.base,
        bull: live.scenarios.bull,
      }),
    [matrix, live.scenarios],
  );

  const insights = useMemo(
    () =>
      generateInsights(
        live,
        growthDelta,
        marginDelta,
        live.market_cap_baseline,
        i18n,
      ),
    [live, growthDelta, marginDelta, i18n],
  );

  const fundamentalAnalysis = useMemo(
    () =>
      generateFundamentalInsights({
        matrix,
        baseEnterpriseValue: live.scenarios.base.enterprise_value,
        growthDeltaPp: growthDelta,
        marginDeltaPp: marginDelta,
        locale,
      }),
    [matrix, live.scenarios.base.enterprise_value, growthDelta, marginDelta, locale],
  );

  const chartTerms = i18n.terms;

  const chartData = useMemo(
    () =>
      live.chart_series.map((row) => ({
        year: `Y${row.year}`,
        fcff: row.fcff,
        impliedEv: row.implied_ev_path,
        cumulativePv: row.cumulative_pv,
      })),
    [live.chart_series],
  );

  const arbGap = canonical.ev_blended - live.market_cap_baseline;

  const equityBridge = useMemo(
    () =>
      bridgeFromEnterpriseValue(
        canonical.ev_blended_by_scenario[selectedScenario],
        matrix.capital_structure,
        matrix.wizard_context?.net_debt,
      ),
    [
      canonical.ev_blended_by_scenario,
      selectedScenario,
      matrix.capital_structure,
      matrix.wizard_context?.net_debt,
    ],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    assertValuationCoherence(
      canonical,
      equityBridge,
      canonical.equity_by_scenario[selectedScenario],
    );
  }, [canonical, equityBridge, selectedScenario]);

  const waterfallWeighting = useMemo(
    () => ({
      dcfPct: Math.round(canonical.weights.dcf * 100),
      multPct: Math.round(canonical.weights.multiples * 100),
      dcfComponent: canonical.weights.dcf * canonical.ev_dcf_by_scenario[selectedScenario],
      multComponent:
        canonical.weights.multiples *
        (selectedScenario === 'bear'
          ? canonical.multiples_raw_low
          : selectedScenario === 'bull'
            ? canonical.multiples_raw_high
            : (canonical.ev_blended -
                canonical.weights.dcf * canonical.ev_dcf) /
              Math.max(canonical.weights.multiples, 0.0001)),
      labelHe: canonical.weightingLabelHe,
    }),
    [canonical, selectedScenario],
  );

  const scenarioSlices = useMemo(
    () =>
      scenarioEquitySlices(
        canonical,
        matrix.capital_structure,
        matrix.wizard_context?.net_debt,
      ),
    [canonical, matrix.capital_structure, matrix.wizard_context?.net_debt],
  );

  const verdictMetrics = useMemo(
    () =>
      buildVerdictMetrics(matrix, {
        enterpriseValue: canonical.ev_blended_by_scenario[selectedScenario],
        bearEquity: canonical.equity_by_scenario.bear,
        baseEquity: canonical.equity_by_scenario.base,
        bullEquity: canonical.equity_by_scenario.bull,
      }),
    [matrix, canonical, selectedScenario],
  );

  const normalizedMultiplesAnalysis = useMemo(
    () => normalizeMultiplesAnalysis(matrix.multiples_analysis),
    [matrix.multiples_analysis],
  );

  const multiplesPanelSummary = useMemo(() => {
    if (!normalizedMultiplesAnalysis) return null;
    return buildMultiplesPanelData(
      normalizedMultiplesAnalysis,
      matrix,
      canonical.ev_dcf,
      canonical.equity_value,
      { dcf: canonical.weights.dcf, mult: canonical.weights.multiples },
    );
  }, [normalizedMultiplesAnalysis, matrix, canonical]);
  const baseRevenue = canonical.revenue_basis.actual;
  const baseEbitda = matrix.assumptions.adjusted_ebit / 0.85;
  const baseWacc = matrix.assumptions.wacc;
  const reportRefId = formatValuationRef(matrix);
  const wizardContext = getWizardContext(matrix);
  const reportAccessGranted = hasValidatedUserIdentifiers(
    wizardContext.user_identifiers,
  );
  const qualitativeText =
    wizardContext.qualitative_description.trim() ||
    defaultQualitativeNarrative(locale);
  const reportDate = new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(
    matrix.meta.generated_at ? new Date(matrix.meta.generated_at) : new Date(),
  );

  const clientIdentity = useMemo(
    () =>
      harvestPdfClientIdentity({
        ...matrix,
        wizard_context: wizardContext,
      }),
    [matrix, wizardContext],
  );

  const valuationMidpoint = canonical.ev_blended;

  const matrixForPdf = useMemo(
    () => applyPdfClientIdentityToMatrix(matrix, clientIdentity),
    [matrix, clientIdentity],
  );

  const pdfOverrides = useMemo((): ReportDataOverrides => {
    const baseScenario = live.scenarios.base;
    return {
      baseEV: canonical.ev_blended_by_scenario.base,
      bullEV: canonical.ev_blended_by_scenario.bull,
      bearEV: canonical.ev_blended_by_scenario.bear,
      evDcf: canonical.ev_dcf,
      evDcfBear: canonical.ev_dcf_by_scenario.bear,
      evDcfBull: canonical.ev_dcf_by_scenario.bull,
      canonicalValuation: canonical,
      arbitrageGap: arbGap,
      reinvestmentRate: baseScenario.terminal.reinvestment_rate_ss * 100,
      terminalValuePV: baseScenario.terminal.pv_terminal,
      dcfRows: baseScenario.explicit_rows.map((row) => ({
        revenue: row.revenue,
        ebit: row.ebit,
        fcff: row.fcff,
        pvFCFF: row.pv_fcff,
        cumulativePV: row.cumulative_pv_fcff,
      })),
      clientIdentity,
    };
  }, [live.scenarios, canonical, arbGap, clientIdentity]);

  const handleDownloadPdf = async () => {
    if (!reportAccessGranted) {
      setPdfError(i18n.t('errReportIdentifiersGate'));
      return;
    }

    const captureRoot = reportRef.current;
    if (!captureRoot) {
      setPdfError(i18n.t('downloadReportFailed'));
      return;
    }

    setPdfBusy(true);
    setPdfError(null);

    if (!clientIdentity.fullName) {
      console.error(
        'CRITICAL ERROR: fullName missing from harvested client identity — relay may use incomplete Monday title',
      );
    }

    const sectorLabel =
      wizardContext.sector_label?.trim() ||
      normalizedMultiplesAnalysis?.comparisonGroup?.split('·')[0]?.trim() ||
      undefined;

    const { pdf, relayDispatched } = await executeClientPdfAndRelay({
      captureRoot,
      matrix: matrixForPdf,
      overrides: pdfOverrides,
      identity: {
        ...clientIdentity,
        companyName: clientIdentity.companyName || companyName,
      },
      valuationMidpoint,
      industry: wizardContext.industry_code,
      sectorLabel,
      locale,
      filename: 'Equify_Valuation_Report.pdf',
    });

    if (!pdf.ok || !pdf.pdfBase64) {
      setPdfError(i18n.t('downloadReportFailed'));
    } else if (!relayDispatched) {
      console.warn('[PDF] backup-relay not queued');
    }

    setPdfBusy(false);
  };

  return (
    <main
      dir={i18n.dir}
      lang={locale === 'he' ? 'he' : 'en'}
      aria-label={i18n.t('analysisBrand')}
      className="vb-space-backdrop relative min-h-screen overflow-x-hidden text-slate-100 print:min-h-0 print:h-auto"
    >
      <AmbientBackground />

      <Navbar
        premium
        className="relative z-10 mx-auto max-w-7xl border-b border-slate-800/40 bg-transparent px-4 sm:px-6 backdrop-blur-sm"
      />

      <div className="pdf-capture-host relative z-[1] mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12 print:max-w-none print:px-0 print:py-0">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-6 border-b border-slate-800/40 pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="typo-eyebrow">{i18n.t('analysisBrand')}</p>
            <h1 className="typo-h2 mt-2 tracking-tight sm:text-4xl">
              {companyName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300/70">{i18n.t('liveDcfSubtitle')}</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end" data-pdf-exclude>
            <div className="flex flex-wrap items-center gap-3">
              <LanguageToggle />
              {onBackToHome ? (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="text-sm text-slate-300/60 underline-offset-2 transition hover:text-mint-400 hover:underline"
                >
                  {i18n.t('backToHome')}
                </button>
              ) : null}
            </div>
            {pdfError && (
              <span role="alert" className="text-xs text-rose-300 lg:text-right">
                {pdfError}
              </span>
            )}
            {!reportAccessGranted && (
              <span role="alert" className="text-xs text-amber-300 lg:text-right">
                {i18n.t('errReportIdentifiersGate')}
              </span>
            )}
          </div>
        </header>

        <div
          id="valubot-report-capture"
          ref={reportRef}
          aria-label={valuationCopy(locale, 'conclusionEyebrow')}
          className="pdf-report-subtree pdf-root-container pdf-card-contain pdf-print-report valubot-pdf-capture vb-glass-plate w-full min-w-0 max-w-full overflow-visible rounded-2xl p-4 sm:p-6 sm:overflow-x-hidden print:overflow-visible print:rounded-none print:p-0"
        >
        {reportAccessGranted ? (
          <PdfClientIdentityCaptureBlock
            identity={clientIdentity}
            valuationMidpoint={valuationMidpoint}
            currency={currency}
            locale={locale}
            customLogoDataUrl={wizardContext.custom_logo_data_url}
          />
        ) : null}

        <VerdictHero
          matrix={matrix}
          currency={currency}
          locale={locale}
          enterpriseValue={canonical.ev_blended_by_scenario[selectedScenario]}
          equityValue={canonical.equity_by_scenario[selectedScenario]}
          bearEquity={canonical.equity_by_scenario.bear}
          baseEquity={canonical.equity_by_scenario.base}
          bullEquity={canonical.equity_by_scenario.bull}
        />

        <EquityWaterfall
          bridge={equityBridge}
          currency={currency}
          locale={locale}
          animateValues
          weighting={waterfallWeighting}
        />

        <ScenarioCards
          scenarios={scenarioSlices}
          selected={selectedScenario}
          onSelect={setSelectedScenario}
          currency={currency}
          locale={locale}
        />

        {verdictMetrics ? (
          <VerdictMarketContext metrics={verdictMetrics} locale={locale} />
        ) : null}

        {/* PDF report banner — captured in export */}
        <div className="pdf-card-break pdf-block-contain pdf-block-contain-spaced vb-bento-card mb-8 flex flex-col gap-4 rounded-2xl border-[#00F5A0]/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <ReportBrandLogo
              customLogoDataUrl={wizardContext.custom_logo_data_url}
              prominent
            />
            <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
              {i18n.t('pdfReportTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-300/80">{companyName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-xs text-slate-300">
              <p className="text-slate-500">{i18n.t('pdfReportDate')}</p>
              <p className="font-semibold text-white">{reportDate}</p>
            </div>
            <div className="text-xs text-slate-300">
              <p className="text-slate-500">{i18n.t('pdfReportId')}</p>
              <p className="font-mono font-semibold text-[#00F5A0]">{reportRefId}</p>
            </div>
            <ConfidenceRadial score={confidenceScore} label={chartTerms.confidence} />
          </div>
        </div>

        <div className="pdf-block-contain-spaced my-6 mb-8 grid gap-4 lg:grid-cols-12">
          <div className="pdf-block-contain pdf-block-contain-spaced lg:col-span-8">
            <KeyFinancialMetricsCard
              revenue={baseRevenue}
              ebitda={baseEbitda}
              wacc={baseWacc}
              blendedEnterpriseValue={canonical.ev_blended}
              currency={currency}
              locale={locale}
              i18n={i18n}
            />
          </div>
          <div className="pdf-block-contain pdf-block-contain-spaced lg:col-span-4">
            <ConfidenceHealthCard
              confidenceScore={confidenceScore}
              confidenceLabel={chartTerms.confidence}
              healthTitle={i18n.t('healthScoreTitle')}
              healthScores={fundamentalAnalysis.healthScores.map((item) => ({
                label: item.label,
                status: healthStatusLabel(item.status, locale),
              }))}
              i18n={i18n}
            />
          </div>
        </div>

        <BusinessOverviewSection text={qualitativeText} i18n={i18n} />

        {normalizedMultiplesAnalysis && multiplesPanelSummary && (
          <div className="pdf-card-contain pdf-block-contain-spaced my-6 mb-8">
            <MultiplesAnalysisPanel
              analysis={normalizedMultiplesAnalysis}
              matrix={matrix}
              dcfBaseEv={canonical.ev_dcf}
              equityValue={canonical.equity_value}
              blendWeights={{
                dcf: canonical.weights.dcf,
                mult: canonical.weights.multiples,
              }}
              currency={currency}
              locale={locale}
            />
          </div>
        )}

        <FundamentalAnalysisSection
          analysis={fundamentalAnalysis}
          locale={locale}
          healthScoreTitle={i18n.t('healthScoreTitle')}
        />

        <div className="pdf-block-contain-spaced my-6 grid gap-8 lg:grid-cols-12">
          {/* Trajectory chart */}
          <section className="pdf-block-contain pdf-block-contain-spaced lg:col-span-8">
            <div className="vb-bento-card rounded-xl border-[#00F5A0]/20 p-6 shadow-lg">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    {i18n.t('valuationTrajectory')}
                  </h2>
                  <p className="text-xs text-slate-400">{i18n.t('trajectoryDesc')}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {chartTerms.wacc} {(matrix.assumptions.wacc * 100).toFixed(2)}% ·{' '}
                  {chartTerms.gTerminal}{' '}
                  {(matrix.assumptions.g_terminal * 100).toFixed(2)}%
                </p>
              </div>

              <div
                className="chart-wrapper-block chart-block-wrapper h-80 w-full sm:h-96 print:h-auto print:max-h-[250px] print:w-full"
                role="img"
                aria-label={i18n.t('valuationTrajectory')}
              >
                <ResponsiveContainer width="100%" height="100%" aria-hidden>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fcffGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00F5A0" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#00F5A0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: '#475569' }}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={{ stroke: '#475569' }}
                      tickFormatter={(v) =>
                        formatValuationCurrency(v, currency, locale, true)
                      }
                    />
                    <Tooltip
                      content={(props) => (
                        <ChartTooltipContent
                          active={props.active}
                          payload={
                            props.payload as
                              | ReadonlyArray<{
                                  name?: string | number;
                                  value?: number | string;
                                  color?: string;
                                }>
                              | undefined
                          }
                          label={props.label}
                          currency={currency}
                          locale={locale}
                          yearLabel={i18n.t('chartTooltipYear')}
                        />
                      )}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="fcff"
                      name={chartTerms.fcff}
                      stroke="#00F5A0"
                      fill="url(#fcffGradient)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="impliedEv"
                      name={chartTerms.impliedEvPath}
                      stroke="#5eead4"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#00F5A0', strokeWidth: 0 }}
                    />
                    <ReferenceLine
                      y={live.market_cap_baseline}
                      stroke="#f472b6"
                      strokeDasharray="8 6"
                      strokeWidth={2}
                      label={{
                        value: chartTerms.marketOffer,
                        position: i18n.isRtl ? 'insideTopLeft' : 'insideTopRight',
                        fill: '#f9a8d4',
                        fontSize: 11,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Scenario controls — accordion on mobile */}
          <section className="pdf-block-contain-spaced space-y-4 lg:col-span-4">
            <div className="pdf-block-contain pdf-block-contain-spaced rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {i18n.t('scenarioControls')}
              </p>
              <p className="mt-2 text-slate-300">
                {i18n.t('growthAcceleration')}:{' '}
                <span className="font-mono text-mint-400">
                  {growthDelta >= 0 ? '+' : ''}
                  {growthDelta.toFixed(1)} pp
                </span>
              </p>
              <p className="text-slate-300">
                {i18n.t('profitMarginAdj')}:{' '}
                <span className="font-mono text-mint-400">
                  {marginDelta >= 0 ? '+' : ''}
                  {marginDelta.toFixed(1)} pp
                </span>
              </p>
            </div>

            <details
              className="group rounded-3xl border border-slate-700/50 bg-slate-900/50 shadow-xl backdrop-blur-xl lg:open:bg-slate-900/50"
              data-pdf-exclude
            >
              <summary className="cursor-pointer list-none p-6 lg:hidden">
                <h2 className="text-lg font-semibold text-slate-100">
                  {i18n.t('scenarioControls')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {i18n.t('scenarioControlsDesc')}
                </p>
              </summary>
              <div className="space-y-4 p-6 pt-0 lg:p-6 lg:pt-6">
                <h2 className="hidden text-lg font-semibold text-slate-100 lg:block">
                  {i18n.t('scenarioControls')}
                </h2>
                <p className="hidden text-xs text-slate-500 lg:block">
                  {i18n.t('scenarioControlsDesc')}
                </p>
                <ScenarioSlider
                  id="growthDelta"
                  label={i18n.t('growthAcceleration')}
                  value={growthDelta}
                  onChange={setGrowthDelta}
                  min={-10}
                  max={10}
                  format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} pp`}
                />
                <ScenarioSlider
                  id="marginDelta"
                  label={i18n.t('profitMarginAdj')}
                  value={marginDelta}
                  onChange={setMarginDelta}
                  min={-10}
                  max={10}
                  format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} pp`}
                />
              </div>
            </details>

            <div className="pdf-card-break pdf-block-contain pdf-block-contain-spaced rounded-2xl border border-slate-700/50 bg-slate-800/25 p-4 text-xs text-slate-500">
              <p className="font-medium text-slate-400">{i18n.t('engineSync')}</p>
              <p className="mt-2 leading-relaxed text-slate-400">
                {i18n.t('modelMethodNote')}
              </p>
            </div>
          </section>
        </div>

        {/* AI Insights */}
        <section className="pdf-block-contain-spaced my-6 mt-8" aria-label="AI insights">
          <h2 className="pdf-block-contain mb-4 text-lg font-semibold text-slate-100">
            {i18n.t('aiInsights')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <article
                key={insight.id}
                className={cn(
                  'pdf-card-break pdf-block-contain pdf-block-contain-spaced rounded-2xl border p-5 transition hover:border-mint-400/30',
                  insight.severity === 'opportunity' &&
                    'border-slate-800/40 bg-[#161D2A]/80',
                  insight.severity === 'watch' && 'border-amber-500/25 bg-amber-950/15',
                  insight.severity === 'info' && 'border-slate-700/50 bg-slate-800/30',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mint-400/80">
                  {i18n.t(
                    insight.severity === 'opportunity'
                      ? 'severityOpportunity'
                      : insight.severity === 'watch'
                        ? 'severityWatch'
                        : 'severityInfo',
                  )}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{insight.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{insight.body}</p>
              </article>
            ))}
          </div>
        </section>

        <ExtendedCorporateProfileSection
          diagnostics={diagnostics}
          currency={currency}
          i18n={i18n}
        />

        <div className="pdf-section-group">
          <div className="mt-10 border-t border-[#00F5A0]/20 pt-6">
            <p className="section-header-title text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {i18n.t('technicalAnnexTitle')}
            </p>
          </div>

          {/* Explicit projection table (audit) */}
          <section className="pdf-card-contain metric-card pdf-card-break pdf-block-contain pdf-block-contain-spaced mt-4 rounded-2xl border border-slate-700/50 bg-slate-900/40">
          <div className="border-b border-slate-700/50 px-5 py-3">
            <h2 className="section-header-title text-sm font-semibold text-slate-300">
              {i18n.t('baseExplicitFcff')}
            </h2>
          </div>
          <div className="pdf-block-contain table-scroll-fade">
            <table className="pdf-capture-table w-full min-w-0 max-w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-500">
                  <th className="dcf-table-sticky-col px-5 py-3 font-medium">
                    {i18n.t('tableYear')}
                  </th>
                  <th className="px-5 py-3 font-medium">{i18n.t('tableRevenue')}</th>
                  <th className="px-5 py-3 font-medium">{i18n.t('tableEbit')}</th>
                  <th className="px-5 py-3 font-medium">{i18n.t('tableFcff')}</th>
                  <th className="px-5 py-3 font-medium">{i18n.t('tablePvFcff')}</th>
                  <th className="px-5 py-3 font-medium">{i18n.t('tableCumPv')}</th>
                </tr>
              </thead>
              <tbody>
                {live.scenarios.base.explicit_rows.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b border-slate-800/50 text-slate-300"
                  >
                    <td className="dcf-table-sticky-col px-5 py-2.5 font-mono text-mint-400/90">
                      Y{row.year}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">
                      {formatValuationCurrency(row.revenue, currency, locale, true)}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">
                      {formatValuationCurrency(row.ebit, currency, locale, true)}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">
                      {formatValuationCurrency(row.fcff, currency, locale, true)}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">
                      {formatValuationCurrency(row.pv_fcff, currency, locale, true)}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums text-mint-400/90">
                      {formatValuationCurrency(
                        row.cumulative_pv_fcff,
                        currency,
                        locale,
                        true,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/40 text-slate-200">
                  <td colSpan={4} className="px-5 py-3 text-end font-medium">
                    {i18n.t('terminalPvY5')}
                  </td>
                  <td colSpan={2} className="px-5 py-3 font-mono tabular-nums text-mint-400">
                    {formatValuationCurrency(
                      live.scenarios.base.terminal.pv_terminal,
                      currency,
                      locale,
                      true,
                    )}
                  </td>
                </tr>
                <tr className="bg-emerald-950/20 text-slate-100">
                  <td colSpan={4} className="px-5 py-3 text-end font-semibold">
                    {chartTerms.enterpriseValue}
                  </td>
                  <td colSpan={2} className="px-5 py-3 text-base font-bold tabular-nums text-mint-400">
                    {formatValuationCurrency(
                      live.scenarios.base.enterprise_value,
                      currency,
                      locale,
                      true,
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        </div>

        <PdfLegalDisclaimerStamp />
        </div>

        <div data-pdf-exclude>
          <SiteFooter className="max-w-7xl" />
        </div>

        <div
          className="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-[#00F5A0]/20 bg-[#080B11]/95 px-4 py-4 backdrop-blur-md sm:justify-center"
          data-pdf-exclude
        >
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfBusy || !reportAccessGranted}
            aria-disabled={pdfBusy || !reportAccessGranted}
            title={
              !reportAccessGranted ? i18n.t('errReportIdentifiersGate') : undefined
            }
            className="vb-cta-primary min-h-[48px] rounded-xl px-8 py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pdfBusy ? i18n.t('downloadingReport') : i18n.t('downloadReportPdf')}
          </button>
          {wizardContext.user_identifiers?.mobile_phone ? (
            <WhatsAppShareButton
              phone={wizardContext.user_identifiers.mobile_phone}
              companyName={companyName}
              baseEv={canonical.ev_blended}
            />
          ) : null}
          {onRunAnotherValuation ? (
            <button
              type="button"
              onClick={onRunAnotherValuation}
              className="min-h-[48px] rounded-xl border-2 border-[#00F5A0]/50 bg-transparent px-6 py-3.5 text-sm font-semibold text-[#00F5A0] transition hover:border-[#00F5A0] hover:bg-[#00F5A0]/10"
            >
              {i18n.t('runAnotherValuation')}
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

