'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationScenario } from '../../lib/valuation/canonical_valuation';
import {
  buildReportViewModel,
  buildWaccDonutSlices,
  getBlendWeights,
} from '../../lib/results/report-view-model';
import { fmtMillionParts } from '../../lib/valuation';
import { compactAmountNumber } from '../../lib/utils/formatCurrency';
import { formatCurrencyShort } from '../../lib/utils/formatCurrency';
import { downloadEquifyPdf } from '../../lib/results/download-equify-pdf';
import { downloadEquifyHtml } from '../../lib/results/download-equify-html';
import { buildExportValuationDataFromLiveSession } from '../../lib/results/build-export-valuation-data';
import { getMultiplesIntroText } from '../../lib/constants/industry_config';
import { scenariosIntroFromRows } from '../../lib/i18n/equify_report_copy';
import { useEquifyStrings } from '../../lib/i18n/use_equify_strings';
import { getGoalPurposeLabel } from '../../lib/i18n/equify_wizard_steps';
import type { EquifySectorKey } from '../../lib/valuation';
import { summarizeBlendedEbitda } from '../../lib/valuation/blended_ebitda';
import { loadEquifyWizardState } from '../../lib/wizard/equify_storage';
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import { mapEquifyToWizardFormValues } from '../../lib/wizard/map_equify_wizard';
import { resolveDisplayCompanyName } from '../../lib/wizard/resolve_company_display';
import { isValidLogoDataUrl } from '../../lib/utils/logo_data_url';
import { EquifyLanguageToggle } from '../shared/EquifyLanguageToggle';
import { EquifyLogo } from '../brand/EquifyLogo';
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

/** Footer / final-CTA download row — stacked on mobile, inline on desktop. */
const DOWNLOAD_ACTIONS_ROW_CLASS =
  'flex w-full min-w-0 max-w-full flex-col gap-4 sm:flex-row sm:w-auto items-stretch sm:items-center justify-center';
const DOWNLOAD_BTN_CLASS = 'w-full max-w-full sm:w-auto justify-center box-border';

/** Sticky top bar — compact horizontal controls on mobile. */
const BAR_ACTIONS_ROW_CLASS =
  'flex min-w-0 flex-1 flex-row items-center justify-end gap-2';
const BAR_BTN_CLASS =
  'bar-action-btn shrink-0 whitespace-nowrap text-sm leading-none px-3 py-2 sm:text-[15px] sm:px-5 sm:py-[11px]';

interface ReportDownloadButtonsProps {
  shell: {
    htmlDownload: string;
    htmlGenerating: string;
    pdfDownload: string;
    pdfGenerating: string;
  };
  isDownloadingPdf: boolean;
  isDownloadingHtml: boolean;
  onDownloadPdf: () => void;
  onDownloadHtml: () => void;
  /** Compact layout for the sticky top action bar. */
  variant?: 'default' | 'bar';
}

function ReportDownloadButtons({
  shell,
  isDownloadingPdf,
  isDownloadingHtml,
  onDownloadPdf,
  onDownloadHtml,
  variant = 'default',
}: ReportDownloadButtonsProps) {
  const disabled = isDownloadingPdf || isDownloadingHtml;
  const isBar = variant === 'bar';
  const rowClass = isBar ? BAR_ACTIONS_ROW_CLASS : DOWNLOAD_ACTIONS_ROW_CLASS;
  const btnClass = isBar ? BAR_BTN_CLASS : DOWNLOAD_BTN_CLASS;

  return (
    <div className={rowClass}>
      <button
        type="button"
        className={`btn btn-ghost ${btnClass}`}
        onClick={onDownloadHtml}
        disabled={disabled}
        aria-busy={isDownloadingHtml}
      >
        {isDownloadingHtml ? shell.htmlGenerating : shell.htmlDownload}
      </button>
      <button
        type="button"
        className={`btn ${btnClass}`}
        onClick={onDownloadPdf}
        disabled={disabled}
        aria-busy={isDownloadingPdf}
      >
        {isDownloadingPdf ? shell.pdfGenerating : shell.pdfDownload}
      </button>
    </div>
  );
}

interface EquifyResultsReportProps {
  matrix: ForecastMatrixWithDiagnostics | null;
  equifyState?: EquifyWizardState | null;
}

export function EquifyResultsReport({
  matrix,
  equifyState: equifyStateProp,
}: EquifyResultsReportProps) {
  const { shell, results: rs, isHe, locale } = useEquifyStrings();
  const [scenario, setScenario] = useState<ValuationScenario>('base');
  const [scVal, setScVal] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [idLabel, setIdLabel] = useState('');
  const [purposeLabel, setPurposeLabel] = useState('');
  const [wizardCompanyRaw, setWizardCompanyRaw] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const orbRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const equifyState = useMemo(
    () => equifyStateProp ?? loadEquifyWizardState(),
    [equifyStateProp],
  );

  useEffect(() => {
    setMounted(true);
    const stored = equifyState;
    const national =
      stored?.profile.userNationalId || stored?.profile.userCorporateTaxId;
    setIdLabel(national ?? '');
    setWizardCompanyRaw(stored?.profile.companyName ?? '');
    const logoFromStorage = stored?.profile.customLogoDataUrl?.trim() ?? '';
    const logoFromMatrix = matrix?.wizard_context?.custom_logo_data_url?.trim() ?? '';
    setCompanyLogo(
      isValidLogoDataUrl(logoFromStorage)
        ? logoFromStorage
        : isValidLogoDataUrl(logoFromMatrix)
          ? logoFromMatrix
          : '',
    );
    if (stored?.goal) {
      setPurposeLabel(getGoalPurposeLabel(locale, stored.goal) ?? '');
    } else {
      setPurposeLabel('');
    }
  }, [equifyState, locale, matrix]);

  const vm = useMemo(
    () =>
      matrix ? buildReportViewModel(matrix, locale, equifyState) : null,
    [matrix, locale, equifyState],
  );

  const exportValuationData = useMemo(() => {
    if (!matrix || !equifyState || !vm) return null;
    return buildExportValuationDataFromLiveSession(
      matrix,
      equifyState,
      locale,
      vm.reportId,
    );
  }, [matrix, equifyState, locale, vm]);

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

  const coverEquityAnim = base ? compactAmountNumber(base.equityValue) : 0;

  useScrollReportOrb(orbRef, { enabled: mounted && !!vm, reducedMotion });
  useScrollReportMotion({
    enabled: mounted && !!vm,
    reducedMotion,
    coverEquityAmount: coverEquityAnim,
    finalEquityAmount: coverEquityAnim,
  });

  const sectorKey = useMemo((): EquifySectorKey => {
    return equifyState?.profile?.sector ?? 'other';
  }, [equifyState]);

  const blendWeights = useMemo(
    () => getBlendWeights(sectorKey),
    [sectorKey],
  );

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

  const blendedEbitdaFootnote = useMemo(() => {
    if (!vm?.ebitdaBlend) return null;
    return rs.blendedEbitdaNote(summarizeBlendedEbitda(vm.ebitdaBlend, vm.currency));
  }, [rs, vm?.currency, vm?.ebitdaBlend]);

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
    if (!vm || !base || !equifyState || !exportValuationData) return;
    setIsDownloadingPdf(true);
    setExportError(null);
    try {
      const industryCode = mapEquifyToWizardFormValues(equifyState).industry;
      await downloadEquifyPdf({
        equityValue: base.equityValue,
        reportId: vm.reportId,
        companyName: displayCompanyName,
        industryCode,
        locale,
        state: equifyState,
        valuationData: exportValuationData,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : shell.exportFailed;
      setExportError(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [base, displayCompanyName, equifyState, exportValuationData, locale, shell.exportFailed, vm]);

  const handleDownloadHtml = useCallback(async () => {
    if (!vm || !base || !equifyState || !exportValuationData) return;
    setIsDownloadingHtml(true);
    setExportError(null);
    try {
      const industryCode = mapEquifyToWizardFormValues(equifyState).industry;
      await downloadEquifyHtml({
        equityValue: base.equityValue,
        reportId: vm.reportId,
        companyName: displayCompanyName,
        industryCode,
        locale,
        state: equifyState,
        valuationData: exportValuationData,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : shell.exportFailed;
      setExportError(message);
    } finally {
      setIsDownloadingHtml(false);
    }
  }, [base, displayCompanyName, equifyState, exportValuationData, locale, shell.exportFailed, vm]);

  const handleScenario = useCallback(
    (key: ValuationScenario) => {
      if (!vm) return;
      setScenario(key);
      const view = buildScrollScenarioView(vm, key, vm.currency, sectorKey);
      setScVal(view.equityAmount);
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

  const waccSlices = vm.waccDonutBase;
  const reportDate = formatReportDate(locale);
  const equityDisplay = scVal ?? scrollScenario.equityAmount;
  const scColor =
    scenario === 'bear' ? '#D97575' : scenario === 'bull' ? '#C49A3C' : '#9EEEE6';
  const equityParts = fmtMillionParts(locale, base.equityValue, vm.currency as 'ILS' | 'USD' | 'EUR');
  const evParts = fmtMillionParts(locale, base.enterpriseValue, vm.currency as 'ILS' | 'USD' | 'EUR');
  const scenarioEquityParts = fmtMillionParts(
    locale,
    vm.scenarios[scenario].equityValue,
    vm.currency as 'ILS' | 'USD' | 'EUR',
  );
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

      <header
        className="bar sticky top-0 z-50 w-full border-b border-teal-500/10 bg-slate-950/85 backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/85"
        id="bar"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bar-in wrap flex min-h-0 w-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-4">
          <Link href="/" className="logo shrink-0" aria-label={shell.homeAria}>
            <EquifyLogo variant="dark-bg" compact decorative />
          </Link>
          <span className="doc-id hidden min-w-0 flex-1 text-end sm:inline">
            REPORT #{vm.reportId} · {displayCompanyName}
          </span>
          <div className="bar-actions flex min-w-0 flex-1 basis-full flex-row items-center justify-between gap-2 sm:basis-auto sm:justify-end">
            <EquifyLanguageToggle className="shrink-0" />
            <ReportDownloadButtons
              variant="bar"
              shell={shell}
              isDownloadingPdf={isDownloadingPdf}
              isDownloadingHtml={isDownloadingHtml}
              onDownloadPdf={handleDownloadPdf}
              onDownloadHtml={handleDownloadHtml}
            />
          </div>
        </div>
      </header>

      <main className="report-body pt-24 md:pt-28 print:pt-0">
      {exportError ? (
        <div className="wrap" style={{ padding: '8px 0', color: '#D97575', fontSize: 13 }}>
          {exportError}
        </div>
      ) : null}

      <nav className="rail hidden md:flex" aria-label={shell.reportPagesNav}>
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
          <div className="cover-head">
            {companyLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={companyLogo} alt="" className="cover-co-logo" />
            ) : null}
            <h1 className="c-comp">{displayCompanyName}</h1>
            <p className="c-meta">
              {resolvedIdLabel
                ? `${rs.corpIdPrefix} ${resolvedIdLabel} · `
                : ''}
              {resolvedPurposeLabel}
            </p>
          </div>
          <div className="c-val num">
            {equityParts.prefix ? <span>{equityParts.prefix}</span> : null}
            <span id="coverVal">{equityParts.amount}</span>
            {equityParts.suffix}
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
          <p className="sub rv">{buildExecSummary(vm, vm.currency, locale, sectorKey)}</p>
          {equifyState?.profile.qualitativeDescription?.trim() ? (
            <div className="exec-moat-callout rv">
              <strong>{rs.moatCalloutLabel}</strong>{' '}
              {equifyState.profile.qualitativeDescription.trim()}
            </div>
          ) : null}

          <div className="kgrid">
            <div className="kcard rv">
              <div className="kv num" style={{ color: 'var(--mint)' }}>
                {equityParts.prefix}
                {equityParts.amount}
                {equityParts.suffix}
              </div>
              <div className="kl">{rs.kEquity}</div>
            </div>
            <div className="kcard rv">
              <div className="kv num">
                {evParts.prefix}
                {evParts.amount}
                {evParts.suffix}
              </div>
              <div className="kl">{rs.kEv}</div>
            </div>
            <div className="kcard rv">
              <div className="kv num">
                {base.waccPct.toFixed(1)}%
              </div>
              <div className="kl">{rs.kWacc}</div>
            </div>
            <div className="kcard rv">
              <div className="kv num" style={{ color: 'var(--gold)' }}>
                {vm.qualityGrade} · {vm.qualityScore}
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
            blendedNote={blendedEbitdaFootnote ?? undefined}
            currency={vm.currency}
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
                {scenarioEquityParts.prefix}
                <span id="scVal">{equityDisplay}</span>
                {scenarioEquityParts.suffix}
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
            <div className="w1" data-w={blendWeights.dcf * 100} title="DCF">
              DCF · {Math.round(blendWeights.dcf * 100)}%
            </div>
            <div className="w2" data-w={blendWeights.ebitda * 100} title={rs.blendEbitdaTitle}>
              EBITDA · {Math.round(blendWeights.ebitda * 100)}%
            </div>
            {blendWeights.rev > 0 ? (
              <div className="w3" data-w={blendWeights.rev * 100} title={rs.blendRevTitle}>
                REV · {Math.round(blendWeights.rev * 100)}%
              </div>
            ) : null}
          </div>

          <div className="final-val rv">
            {equityParts.prefix}
            <span id="finalVal">{equityParts.amount}</span>
            {equityParts.suffix}
          </div>
          <p className="final-cap rv">
            {rs.blendFooter(reportDate)}
          </p>

          <div className="final-cta rv flex w-full min-w-0 max-w-full flex-col items-center gap-4 px-6 sm:gap-6 sm:px-0">
            <div className="w-full min-w-0 max-w-md sm:max-w-none">
              <ReportDownloadButtons
                shell={shell}
                isDownloadingPdf={isDownloadingPdf}
                isDownloadingHtml={isDownloadingHtml}
                onDownloadPdf={handleDownloadPdf}
                onDownloadHtml={handleDownloadHtml}
              />
            </div>
            <Link
              className={`btn btn-ghost ${DOWNLOAD_BTN_CLASS} w-full max-w-md sm:max-w-none`}
              href="/wizard"
            >
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
      </main>
    </div>
  );
}
