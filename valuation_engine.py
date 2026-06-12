"""
Valubot financial valuation core.

Multi-method corporate valuation engine: R&D normalization, synthetic cost of debt,
Hamada/Ibbotson WACC, explicit DCF (mid-year convention), perpetuity terminal value
with endogenous reinvestment (Osem/Materna-safe), and private equity bridge.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Final, Mapping, Sequence

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Constants (Israeli corporate tax default; Damodaran / Ibbotson conventions)
# ---------------------------------------------------------------------------

DEFAULT_EFFECTIVE_TAX_RATE: Final[float] = 0.23
RD_CAPITALIZATION_YEARS: Final[int] = 5
DLOM_RATE: Final[float] = 0.20
CONTROL_PREMIUM_RATE: Final[float] = 0.27
IBBOTSON_SIZE_PREMIUM_BASE: Final[float] = 0.0181
IBBOTSON_SIZE_PREMIUM_MICRO: Final[float] = 0.0407
MICRO_CAP_REVENUE_THRESHOLD: Final[float] = 1_500_000.0
HAMADA_R_SQUARED_THRESHOLD: Final[float] = 0.50
MAX_CUSTOMER_CONCENTRATION_PREMIUM: Final[float] = 0.025
MAX_RECURRING_REVENUE_DISCOUNT: Final[float] = 0.015
EXPLICIT_FORECAST_YEARS: Final[int] = 5
MID_YEAR_DISCOUNT_OFFSET: Final[float] = 0.5
MAX_REINVESTMENT_RATE: Final[float] = 1.0
MIN_WACC_MINUS_G_SPREAD: Final[float] = 0.005


class ValuationPurpose(str, Enum):
    """Purpose drives control premium application."""

    GENERAL = "GENERAL"
    M_AND_A_SALE = "M&A_SALE"
    CAPITAL_RAISE = "CAPITAL_RAISE"
    ESOP = "ESOP"
    TAX = "TAX"


# Damodaran synthetic rating: interest coverage (EBIT/Interest) -> default spread over Rf.
# Source: Damodaran, "Interest Coverage Ratios & Ratings" (US traded bonds);
# small-firm column adds incremental spread for private / sub-investment-grade borrowers.
_DAMODARAN_COVERAGE_BREAKPOINTS: Final[tuple[float, ...]] = (
    -np.inf,
    0.0,
    0.5,
    1.0,
    1.5,
    2.0,
    2.5,
    3.0,
    3.5,
    4.0,
    4.5,
    6.0,
    7.5,
    9.5,
    12.5,
    np.inf,
)

_DAMODARAN_BASE_SPREADS: Final[tuple[float, ...]] = (
    0.1512,  # D / negative coverage
    0.1212,
    0.0912,
    0.0712,
    0.0512,
    0.0412,
    0.0362,
    0.0312,
    0.0272,
    0.0214,
    0.0164,
    0.0126,
    0.0098,
    0.0078,
    0.0063,
    0.0045,  # Aaa bucket floor
)

# Incremental spread for small / private firms (Damodaran private company adjustment).
_SMALL_FIRM_SPREAD_ADDON: Final[float] = 0.0025


@dataclass(frozen=True)
class RdEstimate:
    """Pretax cost of debt from synthetic rating."""

    interest_coverage_ratio: float
    rating_bucket_index: int
    base_default_spread: float
    small_firm_addon: float
    default_spread: float
    risk_free_rate: float
    pretax_cost_of_debt: float


@dataclass(frozen=True)
class WaccBreakdown:
    """Full WACC build-up audit trail."""

    unlevered_beta_used: float
    levered_beta: float
    beta_source: str
    hamada_applied: bool
    debt_weight: float
    equity_weight: float
    cost_of_equity: float
    pretax_cost_of_debt: float
    after_tax_cost_of_debt: float
    size_premium: float
    customer_concentration_premium: float
    recurring_revenue_adjustment: float
    wacc: float
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class TerminalValueResult:
    """Terminal value with endogenous steady-state reinvestment."""

    noplat_year_5: float
    g_terminal: float
    wacc: float
    industry_tronic: float
    ronic_ss: float
    reinvestment_rate_ss: float
    free_cash_flow_terminal: float
    terminal_value: float
    implied_growth_from_reinvestment: float
    perpetuity_denominator: float
    consistency_check_passed: bool
    details: dict[str, Any] = field(default_factory=dict)


class ValubotFinancialCore:
    """
    Production valuation core for Valubot.

    Holds company inputs and exposes R&D normalization, synthetic Rd, WACC,
    explicit DCF, terminal value, and equity value translation.
    """

    def __init__(
        self,
        *,
        reported_ebit: float,
        interest_expense: float,
        market_value_equity: float,
        market_value_debt: float,
        risk_free_rate: float,
        equity_risk_premium: float,
        revenue: float,
        regression_levered_beta: float | None = None,
        r_squared: float = 0.0,
        industry_unlevered_beta: float = 1.0,
        effective_tax_rate: float = DEFAULT_EFFECTIVE_TAX_RATE,
        top_customer_revenue_share: float = 0.0,
        recurring_revenue_pct: float = 0.0,
        book_value_debt: float | None = None,
        cash_and_equivalents: float = 0.0,
        minority_interest: float = 0.0,
        non_operating_assets: float = 0.0,
    ) -> None:
        self.reported_ebit = float(reported_ebit)
        self.interest_expense = max(float(interest_expense), 1e-9)
        self.market_value_equity = max(float(market_value_equity), 0.0)
        self.market_value_debt = max(float(market_value_debt), 0.0)
        self.risk_free_rate = float(risk_free_rate)
        self.equity_risk_premium = float(equity_risk_premium)
        self.revenue = float(revenue)
        self.regression_levered_beta = (
            float(regression_levered_beta) if regression_levered_beta is not None else None
        )
        self.r_squared = float(r_squared)
        self.industry_unlevered_beta = float(industry_unlevered_beta)
        self.effective_tax_rate = float(effective_tax_rate)
        self.top_customer_revenue_share = float(np.clip(top_customer_revenue_share, 0.0, 1.0))
        self.recurring_revenue_pct = float(np.clip(recurring_revenue_pct, 0.0, 1.0))
        self.book_value_debt = (
            float(book_value_debt) if book_value_debt is not None else self.market_value_debt
        )
        self.cash_and_equivalents = float(cash_and_equivalents)
        self.minority_interest = float(minority_interest)
        self.non_operating_assets = float(non_operating_assets)

        self._adjusted_ebit: float | None = None
        self._rd_normalization: dict[str, Any] | None = None
        self._rd_estimate: RdEstimate | None = None
        self._wacc_breakdown: WaccBreakdown | None = None
        self._explicit_dcf: pd.DataFrame | None = None
        self._terminal_result: TerminalValueResult | None = None

    # ------------------------------------------------------------------
    # 1. R&D normalization (5-year straight-line)
    # ------------------------------------------------------------------

    def normalize_earnings_and_rd(
        self,
        raw_rd_expenses: Sequence[float],
    ) -> dict[str, Any]:
        """
        Capitalize R&D on a 5-year straight-line basis and adjust EBIT.

        Each year's R&D outlay is amortized evenly over ``RD_CAPITALIZATION_YEARS``.
        Economic amortization in the current (last) year is the sum of annual
        amortization charges on all vintages still on the balance sheet. Reported
        EBIT is restated by adding back current R&D expense and subtracting economic
        amortization (matching capitalized-asset treatment).

        Parameters
        ----------
        raw_rd_expenses :
            Chronological R&D expense series; the final element is the current year.
            Up to five trailing years are used; shorter histories are zero-padded.

        Returns
        -------
        dict
            adjusted_ebit, schedules, capitalized asset, and audit arrays.
        """
        expenses = np.asarray(raw_rd_expenses, dtype=np.float64).ravel()
        if expenses.size == 0:
            expenses = np.array([0.0], dtype=np.float64)

        # Pad to at least 5 years for a full capitalization window.
        if expenses.size < RD_CAPITALIZATION_YEARS:
            pad = np.zeros(RD_CAPITALIZATION_YEARS - expenses.size, dtype=np.float64)
            expenses = np.concatenate([pad, expenses])
        else:
            expenses = expenses[-RD_CAPITALIZATION_YEARS:]

        n = RD_CAPITALIZATION_YEARS
        years = np.arange(n)
        labels = [f"t-{n - 1 - i}" if i < n - 1 else "t (current)" for i in range(n)]

        # Amortization schedule: row i = expense from vintage i, columns = years of amort.
        amort_matrix = np.zeros((n, n), dtype=np.float64)
        for vintage_idx, expense in enumerate(expenses):
            annual_amort = expense / n
            for year_offset in range(n - vintage_idx):
                amort_matrix[vintage_idx, vintage_idx + year_offset] = annual_amort

        economic_amortization_current = float(amort_matrix[:, -1].sum())
        current_rd_expense = float(expenses[-1])

        # Capitalized R&D asset = unamortized balance at end of current year.
        remaining_per_vintage = expenses - amort_matrix.sum(axis=1)
        capitalized_rd_asset = float(np.clip(remaining_per_vintage, 0.0, None).sum())

        # EBIT adjustment: expense recognized in P&L -> add back; subtract economic amort.
        adjusted_ebit = self.reported_ebit + current_rd_expense - economic_amortization_current

        schedule_df = pd.DataFrame(
            amort_matrix,
            index=pd.Index(labels, name="rd_vintage"),
            columns=pd.Index([f"amort_y{j}" for j in range(n)], name="projection_year"),
        )
        schedule_df["rd_expense"] = expenses
        schedule_df["remaining_unamortized"] = remaining_per_vintage

        result = {
            "reported_ebit": self.reported_ebit,
            "current_rd_expense": current_rd_expense,
            "economic_amortization": economic_amortization_current,
            "adjusted_ebit": adjusted_ebit,
            "capitalized_rd_asset": capitalized_rd_asset,
            "rd_expenses_used": expenses.tolist(),
            "amortization_schedule": schedule_df,
            "annual_amortization_by_forecast_year": amort_matrix.sum(axis=0).tolist(),
        }
        self._adjusted_ebit = adjusted_ebit
        self._rd_normalization = result
        return result

    # ------------------------------------------------------------------
    # 2. Synthetic pretax cost of debt (Damodaran)
    # ------------------------------------------------------------------

    @staticmethod
    def _map_interest_coverage_to_spread(interest_coverage_ratio: float) -> tuple[int, float]:
        """Map ICR to Damodaran base spread; return bucket index and spread."""
        icr = float(interest_coverage_ratio)
        idx = int(np.searchsorted(_DAMODARAN_COVERAGE_BREAKPOINTS, icr, side="right") - 1)
        idx = int(np.clip(idx, 0, len(_DAMODARAN_BASE_SPREADS) - 1))
        return idx, _DAMODARAN_BASE_SPREADS[idx]

    def estimate_synthetic_cost_of_debt(
        self,
        adjusted_ebit: float | None = None,
    ) -> RdEstimate:
        """
        Pretax Rd = risk-free rate + Damodaran default spread (small-firm adjusted).

        Interest Coverage Ratio = adjusted EBIT / interest expense.
        """
        ebit = float(adjusted_ebit if adjusted_ebit is not None else self._adjusted_ebit or self.reported_ebit)
        icr = ebit / self.interest_expense
        bucket_idx, base_spread = self._map_interest_coverage_to_spread(icr)
        default_spread = base_spread + _SMALL_FIRM_SPREAD_ADDON
        pretax_rd = self.risk_free_rate + default_spread

        estimate = RdEstimate(
            interest_coverage_ratio=icr,
            rating_bucket_index=bucket_idx,
            base_default_spread=base_spread,
            small_firm_addon=_SMALL_FIRM_SPREAD_ADDON,
            default_spread=default_spread,
            risk_free_rate=self.risk_free_rate,
            pretax_cost_of_debt=pretax_rd,
        )
        self._rd_estimate = estimate
        return estimate

    # ------------------------------------------------------------------
    # 3. WACC
    # ------------------------------------------------------------------

    @staticmethod
    def _hamada_lever_beta(
        unlevered_beta: float,
        debt_to_equity: float,
        tax_rate: float,
    ) -> float:
        """Hamada (1969): beta_L = beta_U * [1 + (1 - T) * D/E]."""
        if debt_to_equity <= 0.0:
            return unlevered_beta
        return unlevered_beta * (1.0 + (1.0 - tax_rate) * debt_to_equity)

    def _capital_structure_weights(self) -> tuple[float, float, float]:
        """Return (debt_weight, equity_weight, debt_to_equity)."""
        total_capital = self.market_value_equity + self.market_value_debt
        if total_capital <= 0.0:
            return 0.0, 1.0, 0.0
        wd = self.market_value_debt / total_capital
        we = self.market_value_equity / total_capital
        de = self.market_value_debt / self.market_value_equity if self.market_value_equity > 0 else 0.0
        return wd, we, de

    def _ibbotson_size_premium(self) -> float:
        if self.revenue < MICRO_CAP_REVENUE_THRESHOLD:
            return IBBOTSON_SIZE_PREMIUM_MICRO
        return IBBOTSON_SIZE_PREMIUM_BASE

    def _customer_concentration_premium(self) -> float:
        """Linear scale: 100% concentration -> +2.5% to cost of equity."""
        return MAX_CUSTOMER_CONCENTRATION_PREMIUM * self.top_customer_revenue_share

    def _recurring_revenue_adjustment(self) -> float:
        """Linear scale: 100% recurring -> -1.5% from cost of equity."""
        return -MAX_RECURRING_REVENUE_DISCOUNT * self.recurring_revenue_pct

    def calculate_wacc(
        self,
        industry_unlevered_beta: float | None = None,
        r_squared: float | None = None,
        adjusted_ebit: float | None = None,
    ) -> WaccBreakdown:
        """
        Blended WACC with regression beta or Hamada-levered industry beta.

        If ``r_squared`` < 0.5, industry unlevered beta is levered via Hamada
        (T = 23% by default). Cost of equity includes Ibbotson size premium and
        private-company risk overlays for customer concentration / recurring revenue.
        """
        beta_u = float(
            industry_unlevered_beta
            if industry_unlevered_beta is not None
            else self.industry_unlevered_beta
        )
        r2 = float(r_squared if r_squared is not None else self.r_squared)
        wd, we, de_ratio = self._capital_structure_weights()

        hamada_applied = r2 < HAMADA_R_SQUARED_THRESHOLD
        if hamada_applied or self.regression_levered_beta is None:
            levered_beta = self._hamada_lever_beta(beta_u, de_ratio, self.effective_tax_rate)
            beta_source = "hamada_industry_unlevered"
            unlevered_used = beta_u
        else:
            levered_beta = float(self.regression_levered_beta)
            beta_source = "regression_levered"
            unlevered_used = beta_u

        size_prem = self._ibbotson_size_premium()
        conc_prem = self._customer_concentration_premium()
        recur_adj = self._recurring_revenue_adjustment()

        cost_of_equity = (
            self.risk_free_rate
            + levered_beta * self.equity_risk_premium
            + size_prem
            + conc_prem
            + recur_adj
        )

        rd_est = self.estimate_synthetic_cost_of_debt(adjusted_ebit)
        pretax_rd = rd_est.pretax_cost_of_debt
        after_tax_rd = pretax_rd * (1.0 - self.effective_tax_rate)

        wacc = we * cost_of_equity + wd * after_tax_rd

        breakdown = WaccBreakdown(
            unlevered_beta_used=unlevered_used,
            levered_beta=levered_beta,
            beta_source=beta_source,
            hamada_applied=hamada_applied,
            debt_weight=wd,
            equity_weight=we,
            cost_of_equity=cost_of_equity,
            pretax_cost_of_debt=pretax_rd,
            after_tax_cost_of_debt=after_tax_rd,
            size_premium=size_prem,
            customer_concentration_premium=conc_prem,
            recurring_revenue_adjustment=recur_adj,
            wacc=wacc,
            details={
                "r_squared": r2,
                "debt_to_equity": de_ratio,
                "interest_coverage_ratio": rd_est.interest_coverage_ratio,
                "effective_tax_rate": self.effective_tax_rate,
                "equity_risk_premium": self.equity_risk_premium,
            },
        )
        self._wacc_breakdown = breakdown
        return breakdown

    # ------------------------------------------------------------------
    # 4. Explicit 5-year DCF (mid-year convention)
    # ------------------------------------------------------------------

    def run_explicit_dcf_forecast(
        self,
        adjusted_ebit: float,
        wacc: float,
        *,
        revenue_growth_rates: Sequence[float] | None = None,
        ebit_margin_targets: Sequence[float] | None = None,
        base_revenue: float | None = None,
        da_pct_of_ebit: float = 0.10,
        capex_pct_of_revenue: float = 0.05,
        nwc_pct_of_revenue_change: float = 0.10,
        rd_amortization_schedule: Sequence[float] | None = None,
    ) -> pd.DataFrame:
        """
        Build a 5-year explicit FCFF projection with mid-year discounting.

        NOPAT = EBIT * (1 - T). FCFF = NOPAT + D&A - CapEx - ΔNWC.
        Present values use exponent (year - 0.5) for mid-year convention.

        If growth/margin vectors are omitted, EBIT grows uniformly from
        ``adjusted_ebit`` using implied 8% CAGR and stable margins.
        """
        years = EXPLICIT_FORECAST_YEARS
        wacc = float(wacc)
        tax = self.effective_tax_rate
        ebit_base = float(adjusted_ebit)
        rev0 = float(base_revenue if base_revenue is not None else max(self.revenue, 1.0))

        if revenue_growth_rates is None:
            revenue_growth_rates = [0.12, 0.10, 0.09, 0.08, 0.07]
        if ebit_margin_targets is None:
            implied_margin = ebit_base / rev0 if rev0 > 0 else 0.15
            ebit_margin_targets = [implied_margin] * years

        g_rates = list(revenue_growth_rates)[:years]
        if len(g_rates) < years:
            g_rates.extend([g_rates[-1]] * (years - len(g_rates)))

        margins = list(ebit_margin_targets)[:years]
        if len(margins) < years:
            margins.extend([margins[-1]] * (years - len(margins)))

        if rd_amortization_schedule is None and self._rd_normalization:
            rd_amort = self._rd_normalization.get("annual_amortization_by_forecast_year", [0.0] * years)
        elif rd_amortization_schedule is not None:
            rd_amort = list(rd_amortization_schedule)
        else:
            rd_amort = [0.0] * years
        if len(rd_amort) < years:
            rd_amort = list(rd_amort) + [0.0] * (years - len(rd_amort))

        rows: list[dict[str, Any]] = []
        revenue = rev0
        prior_revenue = rev0

        for t in range(1, years + 1):
            g = g_rates[t - 1]
            revenue = prior_revenue * (1.0 + g)
            ebit = revenue * margins[t - 1]
            da = abs(ebit) * da_pct_of_ebit
            nopat = ebit * (1.0 - tax)
            capex = revenue * capex_pct_of_revenue
            delta_nwc = (revenue - prior_revenue) * nwc_pct_of_revenue_change
            # R&D amortization is non-cash add-back after EBIT-based NOPAT if expensed;
            # here EBIT is pre-R&D expensing; amort reduces economic EBIT already — add back D&A only.
            fcff = nopat + da - capex - delta_nwc
            discount_period = t - MID_YEAR_DISCOUNT_OFFSET
            discount_factor = 1.0 / ((1.0 + wacc) ** discount_period)
            pv_fcff = fcff * discount_factor

            rows.append(
                {
                    "year": t,
                    "revenue_growth": g,
                    "revenue": revenue,
                    "ebit_margin": margins[t - 1],
                    "ebit": ebit,
                    "da": da,
                    "nopat": nopat,
                    "capex": capex,
                    "delta_nwc": delta_nwc,
                    "rd_amortization": rd_amort[t - 1],
                    "fcff": fcff,
                    "discount_period_midyear": discount_period,
                    "discount_factor": discount_factor,
                    "pv_fcff": pv_fcff,
                }
            )
            prior_revenue = revenue

        df = pd.DataFrame(rows)
        df["cumulative_pv_fcff"] = df["pv_fcff"].cumsum()
        self._explicit_dcf = df
        return df

    # ------------------------------------------------------------------
    # 5. Terminal value (endogenous reinvestment / Osem-Materna safe)
    # ------------------------------------------------------------------

    def calculate_terminal_value(
        self,
        noplat_year_5: float,
        wacc: float,
        g_terminal: float,
        industry_tronic: float,
    ) -> TerminalValueResult:
        """
        Gordon terminal value with steady-state reinvestment tied to ``g`` and RONIC.

        RR_ss = g_terminal / RONIC_ss,  RONIC_ss = max(industry_tronic, wacc).
        FCF_terminal = NOPLAT * (1 - RR_ss).

        This enforces ``g = RR * RONIC`` in perpetuity and prevents the Osem/Materna
        infinity trap where ``g`` approaches ``wacc`` without a funded reinvestment path.
        """
        noplat = float(noplat_year_5)
        wacc = float(wacc)
        g = float(g_terminal)
        tronic = float(industry_tronic)

        ronic_ss = max(tronic, wacc)
        if ronic_ss <= 0.0:
            raise ValueError("RONIC_ss must be positive after capping.")

        if g >= wacc - MIN_WACC_MINUS_G_SPREAD:
            raise ValueError(
                f"Terminal growth {g:.4f} must be strictly below WACC {wacc:.4f} "
                f"by at least {MIN_WACC_MINUS_G_SPREAD:.4f} for a stable perpetuity."
            )

        reinvestment_rate_ss = g / ronic_ss
        reinvestment_rate_ss = float(np.clip(reinvestment_rate_ss, 0.0, MAX_REINVESTMENT_RATE))

        # Reconcile g with capped reinvestment (perpetuity consistency).
        implied_g = reinvestment_rate_ss * ronic_ss

        free_cash_flow_terminal = noplat * (1.0 - reinvestment_rate_ss)
        denominator = wacc - implied_g
        if denominator <= 0.0:
            raise ValueError(
                f"Perpetuity denominator non-positive: WACC={wacc}, implied_g={implied_g}."
            )

        terminal_value = free_cash_flow_terminal / denominator
        consistency = abs(implied_g - g) < 1e-6 or reinvestment_rate_ss < MAX_REINVESTMENT_RATE

        result = TerminalValueResult(
            noplat_year_5=noplat,
            g_terminal=g,
            wacc=wacc,
            industry_tronic=tronic,
            ronic_ss=ronic_ss,
            reinvestment_rate_ss=reinvestment_rate_ss,
            free_cash_flow_terminal=free_cash_flow_terminal,
            terminal_value=terminal_value,
            implied_growth_from_reinvestment=implied_g,
            perpetuity_denominator=denominator,
            consistency_check_passed=consistency,
            details={
                "formula": "TV = NOPLAT * (1 - g/RONIC) / (WACC - g_implied)",
                "ossem_materna_guard": "reinvestment endogenous; RONIC capped at max(TRONIC, WACC)",
            },
        )
        self._terminal_result = result
        return result

    # ------------------------------------------------------------------
    # 6. Equity value bridge
    # ------------------------------------------------------------------

    def calculate_final_equity_value(
        self,
        enterprise_value: float,
        purpose: ValuationPurpose | str = ValuationPurpose.GENERAL,
        *,
        total_debt: float | None = None,
        cash: float | None = None,
        minority_interest: float | None = None,
        non_operating_assets: float | None = None,
        dlom_rate: float = DLOM_RATE,
        control_premium_rate: float = CONTROL_PREMIUM_RATE,
    ) -> dict[str, float]:
        """
        EV -> equity -> DLOM -> optional control premium.

        Equity (pre-DLOM) = EV - net debt + non-operating assets - minority interest.
        Fair marketable minority value = equity * (1 - DLOM).
        Control value (M&A / capital raise) = FM * (1 + control premium).
        """
        ev = float(enterprise_value)
        debt = float(total_debt if total_debt is not None else self.book_value_debt)
        cash_bal = float(cash if cash is not None else self.cash_and_equivalents)
        minority = float(minority_interest if minority_interest is not None else self.minority_interest)
        non_op = float(non_operating_assets if non_operating_assets is not None else self.non_operating_assets)

        if isinstance(purpose, str):
            purpose = ValuationPurpose(purpose)

        net_debt = debt - cash_bal
        equity_operating = ev - net_debt - minority + non_op
        equity_after_dlom = equity_operating * (1.0 - dlom_rate)

        apply_control = purpose in (
            ValuationPurpose.M_AND_A_SALE,
            ValuationPurpose.CAPITAL_RAISE,
        )
        control_multiplier = 1.0 + control_premium_rate if apply_control else 1.0
        final_equity_value = equity_after_dlom * control_multiplier

        return {
            "enterprise_value": ev,
            "total_debt": debt,
            "cash_and_equivalents": cash_bal,
            "net_debt": net_debt,
            "minority_interest": minority,
            "non_operating_assets": non_op,
            "equity_value_before_dlom": equity_operating,
            "dlom_rate": dlom_rate,
            "equity_value_after_dlom": equity_after_dlom,
            "control_premium_applied": apply_control,
            "control_premium_rate": control_premium_rate if apply_control else 0.0,
            "control_premium_multiplier": control_multiplier,
            "final_equity_value": final_equity_value,
            "valuation_purpose": purpose.value,
        }

    # ------------------------------------------------------------------
    # End-to-end orchestration
    # ------------------------------------------------------------------

    def run_full_valuation(
        self,
        raw_rd_expenses: Sequence[float],
        *,
        industry_unlevered_beta: float | None = None,
        r_squared: float | None = None,
        g_terminal: float = 0.025,
        industry_tronic: float = 0.12,
        purpose: ValuationPurpose | str = ValuationPurpose.GENERAL,
        revenue_growth_rates: Sequence[float] | None = None,
    ) -> dict[str, Any]:
        """
        Execute the full Valubot pipeline and return a consolidated result bag.
        """
        rd = self.normalize_earnings_and_rd(raw_rd_expenses)
        adj_ebit = rd["adjusted_ebit"]

        wacc_bd = self.calculate_wacc(
            industry_unlevered_beta=industry_unlevered_beta,
            r_squared=r_squared,
            adjusted_ebit=adj_ebit,
        )
        wacc = wacc_bd.wacc

        explicit = self.run_explicit_dcf_forecast(
            adj_ebit,
            wacc,
            revenue_growth_rates=revenue_growth_rates,
        )
        noplat_y5 = float(explicit.loc[explicit["year"] == EXPLICIT_FORECAST_YEARS, "nopat"].iloc[0])

        tv = self.calculate_terminal_value(
            noplat_y5,
            wacc,
            g_terminal,
            industry_tronic,
        )
        pv_terminal = tv.terminal_value / ((1.0 + wacc) ** (EXPLICIT_FORECAST_YEARS - MID_YEAR_DISCOUNT_OFFSET))
        enterprise_value = float(explicit["pv_fcff"].sum() + pv_terminal)

        equity = self.calculate_final_equity_value(enterprise_value, purpose=purpose)

        return {
            "rd_normalization": rd,
            "cost_of_debt": self._rd_estimate,
            "wacc": wacc_bd,
            "explicit_dcf": explicit,
            "terminal_value": tv,
            "pv_terminal": pv_terminal,
            "enterprise_value": enterprise_value,
            "equity": equity,
        }


__all__ = [
    "ValubotFinancialCore",
    "ValuationPurpose",
    "RdEstimate",
    "WaccBreakdown",
    "TerminalValueResult",
    "DEFAULT_EFFECTIVE_TAX_RATE",
    "DLOM_RATE",
    "CONTROL_PREMIUM_RATE",
]
