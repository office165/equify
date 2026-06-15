'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationScenario } from '../../lib/valuation/canonical_valuation';
import {
  BLEND_WEIGHTS,
  buildReportViewModel,
  buildWaccDonutSlices,
} from '../../lib/results/report-view-model';
import { fmtMillionParts } from '../../lib/valuation';
import { formatCurrencyShort } from '../../lib/utils/formatCurrency';
import { downloadEquifyPdf } from '../../lib/results/download-equify-pdf';
import { getMultiplesIntroText } from '../../lib/constants/industry_config';
import { scenariosIntroFromRows } from '../../lib/i18n/equify_report_copy';
import { useEquifyStrings } from '../../lib/i18n/use_equify_strings';
import { getGoalPurposeLabel } from '../../lib/i18n/equify_wizard_steps';
import type { EquifySectorKey } from '../../lib/valuation';
import { loadEquifyWizardState } from '../../lib/wizard/equify_storage';
import { mapEquifyToWizardFormValues } from '../../lib/wizard/map_equify_wizard';
import { resolveDisplayCompanyName } from '../../lib/wizard/resolve_company_display';
import { EquifyLanguageToggle } from '../shared/EquifyLanguageToggle';
import { useReducedMotion } from '../landing/motion/useReducedMotion';
import {
  buildDcfBreakdown,
  buildExecSummary,
  buildFinChartData,
  buildMultipleRows,
  buildQualityFactors,
  buildScrollScenarioView,
  buildWaccRows,
  formatReportDate,
  resolvePurposeLabel,
  SCROLL_SECTIONS,
  toMillions,
} from '../../lib/results/scroll-report-vm';
import {
  FinancialBarChart,
  QualityGaugeChart,
  WaccDonutChart,
} from './scroll/ReportCharts';
import { useScrollReportMotion } from './useScrollReportMotion';
import { useScrollReportOrb } from './useScrollReportOrb';
import './equify-scroll-report.css';

const SCENARIO_KEYS: ValuationScenario[] = ['bear', 'base', 'bull'];

interface EquifyResultsReportProps {
  matrix: ForecastMatrixWithDiagnostics | null;
}

export function EquifyResultsReport({ matrix }: EquifyResultsReportProps) {
  const { shell, results: rs, isHe, locale } = useEquifyStrings();
  const [scenario, setScenario] = useState<ValuationScenario>('base');
  const [scVal, setScVal] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [idLabel, setIdLabel] = useState('');
  const [purposeLabel, setPurposeLabel] = useState('');
  const [wizardCompanyRaw, setWizardCompanyRaw] = useState('');
  const orbRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    const stored = loadEquifyWizardState();
    const national =
      stored?.profile.userNationalId || stored?.profile.userCorporateTaxId;
    setIdLabel(national ?? '');
    setWizardCompanyRaw(stored?.profile.companyName ?? '');
    if (stored?.goal) {
      setPurposeLabel(getGoalPurposeLabel(locale, stored.goal) ?? '');
    } else {
      setPurposeLabel('');
    }
  }, [locale]);

  const vm = useMemo(
    () => (matrix ? buildReportViewModel(matrix, locale) : null),
    [matrix, locale],
  );

  const displayCompanyName = useMemo(
    () =>
      resolveDisplayCompanyName(
        wizardCompanyRaw || vm?.companyName || matrix?.meta?.company_name,
        locale,
      ),
    [wizardCompanyRaw, vm?.companyName, matrix?.meta?.company_name, locale],
  );

  const base = vm?.scenarios.base;
  const bear = vm?.scenarios.bear;
  const bull = vm?.scenarios.bull;

  const coverEquityM = base ? base.equityValue / 1_000_000 : 0;

  useScrollReportOrb(orbRef, { enabled: mounted && !!vm, reducedMotion });
  useScrollReportMotion({
    enabled: mounted && !!vm,
    reducedMotion,
    coverEquityM,
    finalEquityM: coverEquityM,
  });

  const sectorKey = useMemo((): EquifySectorKey => {
    return loadEquifyWizardState()?.profile?.sector ?? 'other';
  }, []);

  const scrollScenario = useMemo(
    () =>
      vm ? buildScrollScenarioView(vm, scenario, vm.currency, sectorKey) : null,
    [scenario, sectorKey, vm],
  );

  const finData = useMemo(
    () => (vm ? buildFinChartData(vm) : []),
    [vm],
  );

  const multipleRows = useMemo(
    () => (vm ? buildMultipleRows(vm, vm.currency) : []),
    [vm],
  );

  const qualityFactors = useMemo(
    () => (matrix ? buildQualityFactors(matrix) : []),
    [matrix],
  );

  const waccRows = useMemo(
    () => (vm ? buildWaccRows(vm, scenario) : []),
    [scenario, vm],
  );

  const dcfBreakdown = useMemo(
    () => (vm ? buildDcfBreakdown(vm, vm.currency) : null),
    [vm],
  );

  const multiplesIntro = useMemo(() => {
    const stored = loadEquifyWizardState();
    const sector = stored?.profile?.sector;
    if (sector) {
      return getMultiplesIntroText(sector, locale);
    }
    return rs.multIntro(vm?.industrySector ?? (isHe ? 'כללי' : 'General'));
  }, [isHe, locale, rs, vm?.industrySector]);

  const scenariosIntro = useMemo(() => {
    if (!vm) return rs.scenSub;
    const baseGrowth = (vm.matrix.assumptions.revenue_growth_rates[0] ?? 0.09) * 100;
    const baseMargin = vm.ebitdaMarginPct;
    return scenariosIntroFromRows(
      [
        {
          key: 'bear',
          growthPct: Math.max(-5, baseGrowth - 6),
          ebitdaMarginPct: baseMargin - 2,
        },
        { key: 'base', growthPct: baseGrowth, ebitdaMarginPct: baseMargin },
        {
          key: 'bull',
          growthPct: baseGrowth + 6,
          ebitdaMarginPct: baseMargin + 2,
        },
      ],
      locale,
    );
  }, [locale, rs, vm]);

  const resolvedPurposeLabel = useMemo(() => {
    if (purposeLabel) return purposeLabel;
    return vm ? resolvePurposeLabel(vm) : '';
  }, [purposeLabel, vm]);

  const resolvedIdLabel = useMemo(() => {
    if (idLabel) return idLabel;
    return (
      vm?.clientIdentity.nationalId || vm?.clientIdentity.corporateTaxId || ''
    );
  }, [idLabel, vm]);

  const handleDownloadPdf = useCallback(async () => {
    if (!vm || !base) return;
    setIsDownloadingPdf(true);
    setPdfError(null);
    try {
      const stored = loadEquifyWizardState();
      const industryCode = stored
        ? mapEquifyToWizardFormValues(stored).industry
        : undefined;
      await downloadEquifyPdf({
        equityValue: base.equityValue,
        reportId: vm.reportId,
        companyName: displayCompanyName,
        industryCode,
        locale,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : shell.pdfFailed;
      setPdfError(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [base, displayCompanyName, locale, shell.pdfFailed, vm]);

  const handleScenario = useCallback(
    (key: ValuationScenario) => {
      if (!vm) return;
      setScenario(key);
      const view = buildScrollScenarioView(vm, key, vm.currency, sectorKey);
      setScVal(view.equityM.toFixed(1));
    },
    [sectorKey, vm],
  );

  if (!matrix || !vm || !base || !bear || !bull || !scrollScenario) {
    return (
      <div
        className="equify-scroll-report"
        dir={isHe ? 'rtl' : 'ltr'}
        lang={isHe ? 'he' : 'en'}
      >
        <div className="esr-empty">
          <div className="esr-empty-actions">
            <EquifyLanguageToggle />
          </div>
          <p>{shell.noResults}</p>
          <Link href="/wizard" className="btn">
            {shell.backToWizard}
          </Link>
        </div>
      </div>
    );
  }

  const waccSlices = buildWaccDonutSlices(base.waccPct);
  const reportDate = formatReportDate(locale);
  const equityDisplay = scVal ?? scrollScenario.equityM.toFixed(1);
  const scColor =
    scenario === 'bear' ? '#D97575' : scenario === 'bull' ? '#C49A3C' : '#9EEEE6';
  const millionParts = fmtMillionParts(locale);
  const scenarioLabel = (key: ValuationScenario) => {
    if (key === 'bear') return rs.scenarioBear;
    if (key === 'bull') return rs.scenarioBull;
    return rs.scenarioBase;
  };

  return (
    <div
      className="equify-scroll-report pdf-root-container pdf-print-report"
      dir={isHe ? 'rtl' : 'ltr'}
      lang={isHe ? 'he' : 'en'}
      id="equify-report-capture"
    >
      <div id="prog" aria-hidden="true">
        <i />
      </div>

      <header className="bar" id="bar">
        <div className="wrap bar-in">
          <Link href="/" className="logo" aria-label={shell.homeAria}>
            equify<em>.</em>
            <small>BY SBC</small>
          </Link>
          <span className="doc-id">
            REPORT #{vm.reportId} · {displayCompanyName}
          </span>
          <div className="bar-actions">
            <EquifyLanguageToggle />
            <button
              type="button"
              className="btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              aria-busy={isDownloadingPdf}
            >
              {isDownloadingPdf ? shell.pdfGenerating : shell.pdfDownload}
            </button>
          </div>
        </div>
      </header>

      {pdfError ? (
        <div className="wrap" style={{ padding: '8px 0', color: '#D97575', fontSize: 13 }}>
          {pdfError}
        </div>
      ) : null}

      <nav className="rail" aria-label={shell.reportPagesNav}>
        {SCROLL_SECTIONS.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={i === 0 ? 'on' : undefined}
            aria-label={isHe ? s.labelHe : s.labelEn}
          >
            <span className="rail-dot" aria-hidden="true" />
            <span className="rail-label">{isHe ? s.labelHe : s.labelEn}</span>
          </a>
        ))}
      </nav>

      {/* PAGE 1 · COVER */}
      <section className="pg cover" id="p1">
        <div id="orb" ref={orbRef} aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            {shell.valuationReportEyebrow} {reportDate}
          </span>
          <h1 style={{ marginTop: 22 }}>
            <span className="h-title-ln">
              <span className="c-comp">{displayCompanyName}</span>
            </span>
            <span className="h-title-ln">
              <span className="c-meta">
                {resolvedIdLabel
                  ? `${rs.corpIdPrefix} ${resolvedIdLabel} · `
                  : ''}
                {resolvedPurposeLabel}
              </span>
            </span>
          </h1>
          <div className="c-val num">
            {millionParts.prefix ? <span>{millionParts.prefix}</span> : null}
            <span id="coverVal">0.0</span>
            {millionParts.suffix}
          </div>
          <p className="c-cap">
            {rs.coverCaption}{' '}
            <b className="num">
              {formatCurrencyShort(bear.equityValue, vm.currency)}–
              {formatCurrencyShort(bull.equityValue, vm.currency)}
            </b>
          </p>
          <div className="seal">
            <i />
            {rs.sealBadge}
          </div>
        </div>
        <div className="scroll-hint">
          {shell.scrollHint}
          <i />
        </div>
      </section>

      {/* PAGE 2 · EXEC SUMMARY */}
      <section className="pg" id="p2">
        <span className="pg-num">
          <b>02</b> / 07 · EXECUTIVE SUMMARY
        </span>
        <div className="wrap">
          <span className="eyebrow rv">{rs.execEyebrow}</span>
          <h2 className="t rv">
            {rs.execTitle} <span className="hl">{rs.execTitleHl}</span>
          </h2>
          <p className="sub rv">{buildExecSummary(vm, vm.currency, locale)}</p>

          <div className="kgrid">
            <div className="kcard rv">
              <div className="kv num" style={{ color: 'var(--mint)' }}>
                {millionParts.prefix}
                <span className="cnt" data-to={toMillions(base.equityValue)} data-dec={1}>
                  0
                </span>
                {millionParts.suffix}
              </div>
              <div className="kl">{rs.kEquity}</div>
            </div>
            <div className="kcard rv">
              <div className="kv num">
                {millionParts.prefix}
                <span className="cnt" data-to={toMillions(base.enterpriseValue)} data-dec={1}>
                  0
                </span>
                {millionParts.suffix}
              </div>
              <div className="kl">{rs.kEv}</div>
            </div>
            <div className="kcard rv">
              <div className="kv num">
                <span className="cnt" data-to={base.waccPct} data-dec={1}>
                  0
                </span>
                %
              </div>
              <div className="kl">{rs.kWacc}</div>
            </div>
            <div className="kcard rv">
              <div className="kv num" style={{ color: 'var(--gold)' }}>
                {vm.qualityGrade} ·{' '}
                <span className="cnt" data-to={vm.qualityScore}>
                  0
                </span>
              </div>
              <div className="kl">Quality Score</div>
            </div>
          </div>

          <div className="wf rv">
            <h3>{rs.waterfallTitle}</h3>
            <div className="wf-row">
              <span className="lbl">{rs.wfEv}</span>
              <div className="wf-track">
                <div className="wf-fill ev" data-w={100} />
              </div>
              <b className="num">
                {formatCurrencyShort(base.waterfall.ev, vm.currency)}
              </b>
            </div>
            <div className="wf-row">
              <span className="lbl">{rs.wfDebt}</span>
              <div className="wf-track">
                <div
                  className="wf-fill debt"
                  data-w={Math.round(base.waterfall.debtPct)}
                />
              </div>
              <b className="num" style={{ color: 'var(--red)' }}>
                −{formatCurrencyShort(base.waterfall.netDebt, vm.currency)}
              </b>
            </div>
            <div className="wf-row total">
              <span className="lbl">{rs.wfEquity}</span>
              <div className="wf-track">
                <div
                  className="wf-fill eq"
                  data-w={Math.round(base.waterfall.equityPct)}
                />
              </div>
              <b className="num">
                {formatCurrencyShort(base.waterfall.equity, vm.currency)}
              </b>
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 3 · FINANCIALS */}
      <section className="pg" id="p3">
        <span className="pg-num">
          <b>03</b> / 07 · FINANCIAL DATA
        </span>
        <div className="wrap">
          <span className="eyebrow rv">{rs.finEyebrow}</span>
          <h2 className="t rv">
            {rs.finTitle} <span className="hl">{rs.finTitleHl}</span>
          </h2>
          <p className="sub rv">{rs.finSub}</p>
          <FinancialBarChart
            data={finData}
            growthNote={rs.growthNote(vm.terminalGrowthPct)}
            marginNote={rs.marginNote(vm.ebitdaMarginPct.toFixed(1))}
          />
        </div>
      </section>

      {/* PAGE 4 · DCF */}
      <section className="pg" id="p4">
        <span className="pg-num">
          <b>04</b> / 07 · DCF + WACC
        </span>
        <div className="wrap">
          <span className="eyebrow rv">{rs.dcfEyebrow}</span>
          <h2 className="t rv">
            {rs.dcfTitle} <span className="hl">{rs.dcfTitleHl}</span>
          </h2>
          <p className="sub rv">{rs.dcfSub}</p>

          <div className="split">
            <div className="rv">
              <WaccDonutChart slices={waccSlices} waccPct={base.waccPct} />
            </div>
            <div className="rv">
              <div className="wacc-list">
                {waccRows.map((row) => (
                  <div key={row.label} className="wl">
                    <span>{row.label}</span>
                    <b className="num">{row.pct}</b>
                  </div>
                ))}
                <div className="wl sum">
                  <span>{rs.dcfWacc}</span>
                  <b className="num">{base.waccPct.toFixed(1)}%</b>
                </div>
              </div>
              {dcfBreakdown && (
                <div className="wacc-list" style={{ marginTop: 26 }}>
                  <div className="wl">
                    <span>{rs.dcfPv}</span>
                    <b className="num">{dcfBreakdown.explicitPv}</b>
                  </div>
                  <div className="wl">
                    <span>{rs.dcfTerminal(`${vm.terminalGrowthPct.toFixed(1)}%`)}</span>
                    <b className="num">{dcfBreakdown.terminal}</b>
                  </div>
                  <div className="wl sum">
                    <span>{rs.dcfEv}</span>
                    <b className="num">{dcfBreakdown.total}</b>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 5 · MULTIPLES */}
      <section className="pg" id="p5">
        <span className="pg-num">
          <b>05</b> / 07 · MARKET MULTIPLES
        </span>
        <div className="wrap">
          <span className="eyebrow rv">{rs.multEyebrow}</span>
          <h2 className="t rv">
            {rs.multTitle} <span className="hl">{rs.multTitleHl}</span>
          </h2>
          <p className="sub rv">
            {multiplesIntro}
          </p>

          <div className="mult-rows">
            {multipleRows.map((row) => (
              <div key={row.title} className="mr rv">
                <div className="ml">
                  {row.title}
                  <small>{row.subtitle}</small>
                </div>
                <div>
                  <div className="mr-track">
                    <div
                      className="mr-band"
                      style={{
                        insetInlineStart: row.bandStart,
                        insetInlineEnd: row.bandEnd,
                      }}
                    />
                    <div
                      className="mr-dot"
                      data-x={row.dotPct}
                      style={
                        row.dotGold
                          ? { background: 'var(--gold)' }
                          : undefined
                      }
                    />
                  </div>
                  <div className="mr-ends">
                    <span>{row.rangeStart}</span>
                    <span>{row.rangeEnd}</span>
                  </div>
                </div>
                <div className="mr-val num">
                  {row.value}
                  <small>{row.valueSub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAGE 6 · SCENARIOS */}
      <section className="pg" id="p6">
        <span className="pg-num">
          <b>06</b> / 07 · SCENARIOS & QUALITY
        </span>
        <div className="wrap">
          <span className="eyebrow rv">{rs.scenEyebrow}</span>
          <h2 className="t rv">
            {rs.scenTitle} <span className="hl">{rs.scenTitleHl}</span>
          </h2>
          <p className="sub rv">{scenariosIntro}</p>

          <div className="scen-tabs rv" role="tablist" aria-label={rs.scenTabList}>
            {SCENARIO_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                data-s={key}
                role="tab"
                aria-selected={scenario === key}
                className={scenario === key ? 'on' : undefined}
                onClick={() => handleScenario(key)}
              >
                {scenarioLabel(key)}
              </button>
            ))}
          </div>

          <div className="scen-stage">
            <div className="rv">
              <div className="sc-val" style={{ color: scColor }}>
                {millionParts.prefix}
                <span id="scVal">{equityDisplay}</span>
                {millionParts.suffix}
              </div>
              <p className="sc-cap" id="scCap">
                {scrollScenario.cap}
              </p>
              {scrollScenario.capFull ? (
                <p className="sub rv" style={{ marginTop: '0.75rem', maxWidth: '42rem' }}>
                  {scrollScenario.capFull}
                </p>
              ) : null}
              <div className="range-big">
                <div className="rb-bar">
                  <div className="rb-fill" />
                  <div
                    className="rb-dot"
                    id="rbDot"
                    style={{ left: `${scrollScenario.dotPct}%` }}
                  />
                </div>
                <div className="rb-ends">
                  <span>
                    Bear {formatCurrencyShort(bear.equityValue, vm.currency)}
                  </span>
                  <span>
                    Bull {formatCurrencyShort(bull.equityValue, vm.currency)}
                  </span>
                </div>
              </div>
            </div>
            <div className="rv">
              <div className="sc-list">
                <div className="sl">
                  <span>{rs.scenGrowth}</span>
                  <b className="num" id="sGro">
                    {scrollScenario.growth}
                  </b>
                </div>
                <div className="sl">
                  <span>{rs.scenEbitda}</span>
                  <b className="num" id="sMar">
                    {scrollScenario.margin}
                  </b>
                </div>
                <div className="sl">
                  <span>WACC</span>
                  <b className="num" id="sWacc">
                    {scrollScenario.wacc}
                  </b>
                </div>
                <div className="sl">
                  <span>{rs.scenMult}</span>
                  <b className="num" id="sMult">
                    {scrollScenario.mult}
                  </b>
                </div>
                <div className="sl">
                  <span>{rs.scenEv}</span>
                  <b className="num" id="sEv">
                    {scrollScenario.ev}
                  </b>
                </div>
              </div>
            </div>
          </div>

          <div className="gauge-wrap">
            <p className="sub rv">{rs.qualSub}</p>
            <div className="rv">
              <QualityGaugeChart score={vm.qualityScore} grade={vm.qualityGrade} />
            </div>
            <div className="rv">
              {qualityFactors.map((qf) => (
                <div key={qf.label} className="qf">
                  <div className="qf-top">
                    <span>{qf.label}</span>
                    <span>{qf.pct}%</span>
                  </div>
                  <div className="qf-bar">
                    <i data-w={qf.pct} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 7 · COMBINED */}
      <section className="pg" id="p7">
        <span className="pg-num">
          <b>07</b> / 07 · COMBINED VALUE
        </span>
        <div className="wrap">
          <span className="eyebrow rv" style={{ justifyContent: 'center', display: 'flex' }}>
            {rs.blendEyebrow}
          </span>
          <h2 className="t rv" style={{ textAlign: 'center' }}>
            {rs.blendTitle} <span className="hl">{rs.blendTitleHl}</span>
          </h2>

          <div className="weights rv" aria-label={rs.blendWeights}>
            <div className="w1" data-w={BLEND_WEIGHTS.dcf * 100} title="DCF">
              DCF · 50%
            </div>
            <div className="w2" data-w={BLEND_WEIGHTS.ebitda * 100} title={rs.blendEbitdaTitle}>
              EBITDA · 30%
            </div>
            <div className="w3" data-w={BLEND_WEIGHTS.rev * 100} title={rs.blendRevTitle}>
              REV · 20%
            </div>
          </div>

          <div className="final-val rv">
            {millionParts.prefix}
            <span id="finalVal">0.0</span>
            {millionParts.suffix}
          </div>
          <p className="final-cap rv">
            {rs.blendFooter(reportDate)}
          </p>

          <div className="final-cta rv">
            <button
              type="button"
              className="btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              aria-busy={isDownloadingPdf}
            >
              {isDownloadingPdf ? shell.pdfGenerating : shell.pdfDownload}
            </button>
            <Link className="btn btn-ghost" href="/wizard">
              {rs.newValuation}
            </Link>
          </div>

          <p className="disc rv">{rs.disclaimer}</p>
        </div>
      </section>

      <footer>
        EQUIFY VALUATION ENGINE · REPORT #{vm.reportId} · GENERATED{' '}
        {new Date().toLocaleTimeString(isHe ? 'he-IL' : 'en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </footer>
    </div>
  );
}
