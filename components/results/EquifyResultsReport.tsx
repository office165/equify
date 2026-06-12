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
import { formatCurrencyShort } from '../../lib/utils/formatCurrency';
import { downloadEquifyPdf } from '../../lib/results/download-equify-pdf';
import { loadEquifyWizardState } from '../../lib/wizard/equify_storage';
import { mapEquifyToWizardFormValues } from '../../lib/wizard/map_equify_wizard';
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

const SCENARIO_TABS: { key: ValuationScenario; label: string }[] = [
  { key: 'bear', label: 'Bear 🐻' },
  { key: 'base', label: 'Base ◆' },
  { key: 'bull', label: 'Bull 🚀' },
];

interface EquifyResultsReportProps {
  matrix: ForecastMatrixWithDiagnostics | null;
  locale: 'he' | 'en';
}

export function EquifyResultsReport({ matrix, locale }: EquifyResultsReportProps) {
  const isHe = locale === 'he';
  const [scenario, setScenario] = useState<ValuationScenario>('base');
  const [scVal, setScVal] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [idLabel, setIdLabel] = useState('');
  const [purposeLabel, setPurposeLabel] = useState('');
  const orbRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    const stored = loadEquifyWizardState();
    const national =
      stored?.profile.userNationalId || stored?.profile.userCorporateTaxId;
    setIdLabel(national ?? '');
    const goalMap: Record<string, string> = {
      negotiation: 'משא ומתן אסטרטגי',
      fundraise: 'גיוס הון',
      partner: 'שותפות עסקית',
      bank: 'מימון בנקאי',
      internal: 'שימוש פנימי',
      legal: 'הליך משפטי / ירושה',
    };
    if (stored?.goal && goalMap[stored.goal]) {
      setPurposeLabel(`מטרת ההערכה: ${goalMap[stored.goal]}`);
    }
  }, []);

  const vm = useMemo(
    () => (matrix ? buildReportViewModel(matrix, locale) : null),
    [matrix, locale],
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

  const scrollScenario = useMemo(
    () =>
      vm ? buildScrollScenarioView(vm, scenario, vm.currency) : null,
    [scenario, vm],
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
        companyName: vm.companyName,
        industryCode,
        locale,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'יצירת PDF נכשלה. נסה שוב.';
      setPdfError(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [base, locale, vm]);

  const handleScenario = useCallback(
    (key: ValuationScenario) => {
      if (!vm) return;
      setScenario(key);
      const view = buildScrollScenarioView(vm, key, vm.currency);
      setScVal(view.equityM.toFixed(1));
    },
    [vm],
  );

  if (!matrix || !vm || !base || !bear || !bull || !scrollScenario) {
    return (
      <div className="equify-scroll-report" dir="rtl" lang="he">
        <div className="esr-empty">
          <p>
            {isHe
              ? 'לא נמצאו תוצאות הערכה. הרץ הערכה חדשה מהאשף.'
              : 'No valuation results found. Run a new valuation from the wizard.'}
          </p>
          <Link href="/wizard" className="btn">
            {isHe ? 'חזרה לאשף ההערכה' : 'Back to valuation wizard'}
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
          <Link href="/" className="logo" aria-label="equify BY SBC — דף הבית">
            equify<em>.</em>
            <small>BY SBC</small>
          </Link>
          <span className="doc-id">
            REPORT #{vm.reportId} · {vm.companyName}
          </span>
          <button
            type="button"
            className="btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            aria-busy={isDownloadingPdf}
          >
            {isDownloadingPdf ? 'מפיק PDF...' : 'הורד PDF נקי ↓'}
          </button>
        </div>
      </header>

      {pdfError ? (
        <div className="wrap" style={{ padding: '8px 0', color: '#D97575', fontSize: 13 }}>
          {pdfError}
        </div>
      ) : null}

      <nav className="rail" aria-label="עמודי הדוח">
        {SCROLL_SECTIONS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className={i === 0 ? 'on' : undefined}>
            <span>{isHe ? s.labelHe : s.labelEn}</span>
          </a>
        ))}
      </nav>

      {/* PAGE 1 · COVER */}
      <section className="pg cover" id="p1">
        <div id="orb" ref={orbRef} aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            דוח הערכת שווי · {reportDate}
          </span>
          <h1 style={{ marginTop: 22 }}>
            <span className="h-title-ln">
              <span className="c-comp">{vm.companyName}</span>
            </span>
            <span className="h-title-ln">
              <span className="c-meta">
                {resolvedIdLabel ? `ח.פ. ${resolvedIdLabel} · ` : ''}
                {resolvedPurposeLabel}
              </span>
            </span>
          </h1>
          <div className="c-val">
            <span id="coverVal">0.0</span>M ₪
          </div>
          <p className="c-cap">
            שווי לבעלים (Equity Value) · תרחיש בסיס · טווח{' '}
            <b className="num">
              {formatCurrencyShort(bear.equityValue, vm.currency)}–
              {formatCurrencyShort(bull.equityValue, vm.currency)}
            </b>
          </p>
          <div className="seal">
            <i />
            CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY
          </div>
        </div>
        <div className="scroll-hint">
          לקריאת הדוח<i />
        </div>
      </section>

      {/* PAGE 2 · EXEC SUMMARY */}
      <section className="pg" id="p2">
        <span className="pg-num">
          <b>02</b> / 07 · EXECUTIVE SUMMARY
        </span>
        <div className="wrap">
          <span className="eyebrow rv">תקציר מנהלים</span>
          <h2 className="t rv">
            השורה התחתונה — <span className="hl">קודם.</span>
          </h2>
          <p className="sub rv">{buildExecSummary(vm, vm.currency, locale)}</p>

          <div className="kgrid">
            <div className="kcard rv">
              <div className="kv num" style={{ color: 'var(--mint)' }}>
                <span className="cnt" data-to={toMillions(base.equityValue)} data-dec={1}>
                  0
                </span>
                M ₪
              </div>
              <div className="kl">שווי לבעלים · בסיס</div>
            </div>
            <div className="kcard rv">
              <div className="kv num">
                <span className="cnt" data-to={toMillions(base.enterpriseValue)} data-dec={1}>
                  0
                </span>
                M ₪
              </div>
              <div className="kl">שווי פעילות (EV)</div>
            </div>
            <div className="kcard rv">
              <div className="kv num">
                <span className="cnt" data-to={base.waccPct} data-dec={1}>
                  0
                </span>
                %
              </div>
              <div className="kl">WACC אפקטיבי</div>
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
            <h3>מ-EV לשווי לבעלים</h3>
            <div className="wf-row">
              <span className="lbl">שווי פעילות</span>
              <div className="wf-track">
                <div className="wf-fill ev" data-w={100} />
              </div>
              <b className="num">
                {formatCurrencyShort(base.waterfall.ev, vm.currency)}
              </b>
            </div>
            <div className="wf-row">
              <span className="lbl">חוב נטו</span>
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
              <span className="lbl">שווי לבעלים</span>
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
          <span className="eyebrow rv">נתונים פיננסיים</span>
          <h2 className="t rv">
            המספרים שמאחורי <span className="hl">המודל.</span>
          </h2>
          <p className="sub rv">
            הכנסות ו-EBITDA בפועל ותחזית, כפי שהוזנו לאשף ואומתו מול מודל ההערכה.
          </p>
          <FinancialBarChart
            data={finData}
            growthNote={`צמיחה שנתית ממוצעת ${vm.terminalGrowthPct.toFixed(0)}%`}
            marginNote={`שיעור EBITDA ${vm.ebitdaMarginPct.toFixed(1)}%`}
          />
        </div>
      </section>

      {/* PAGE 4 · DCF */}
      <section className="pg" id="p4">
        <span className="pg-num">
          <b>04</b> / 07 · DCF + WACC
        </span>
        <div className="wrap">
          <span className="eyebrow rv">היוון תזרימי מזומנים</span>
          <h2 className="t rv">
            מבט קדימה: <span className="hl">DCF.</span>
          </h2>
          <p className="sub rv">
            תזרימי המזומנים החופשיים מהוונים בעלות הון של {base.waccPct.toFixed(1)}
            %, כולל פרמיית סיכון מדינה לפי Damodaran. ערך טרמינלי בצמיחה של{' '}
            {vm.terminalGrowthPct.toFixed(1)}%.
          </p>

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
                  <span>WACC אפקטיבי</span>
                  <b className="num">{base.waccPct.toFixed(1)}%</b>
                </div>
              </div>
              {dcfBreakdown && (
                <div className="wacc-list" style={{ marginTop: 26 }}>
                  <div className="wl">
                    <span>שווי נוכחי של תזרימים</span>
                    <b className="num">{dcfBreakdown.explicitPv}</b>
                  </div>
                  <div className="wl">
                    <span>
                      ערך טרמינלי מהוון (g = {vm.terminalGrowthPct.toFixed(1)}%)
                    </span>
                    <b className="num">{dcfBreakdown.terminal}</b>
                  </div>
                  <div className="wl sum">
                    <span>שווי פעילות לפי DCF</span>
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
          <span className="eyebrow rv">מכפילי שוק</span>
          <h2 className="t rv">
            מבט הצידה: <span className="hl">השוק.</span>
          </h2>
          <p className="sub rv">
            המכפילים מכוילים מול עסקאות M&A ישראליות בענף {vm.industrySector}.
            הפס מציג את טווח השוק; הנקודה — את המיקום שלך.
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
          <span className="eyebrow rv">תרחישים</span>
          <h2 className="t rv">
            לא רק כמה — <span className="hl">באיזה טווח.</span>
          </h2>
          <p className="sub rv">
            החלף תרחיש וראה את כל הדוח מתעדכן: שווי, מכפיל, WACC וההנחות מאחוריהם.
          </p>

          <div className="scen-tabs rv" role="tablist" aria-label="בחירת תרחיש">
            {SCENARIO_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                data-s={tab.key}
                role="tab"
                aria-selected={scenario === tab.key}
                className={scenario === tab.key ? 'on' : undefined}
                onClick={() => handleScenario(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="scen-stage">
            <div className="rv">
              <div className="sc-val" style={{ color: scColor }}>
                <span id="scVal">{equityDisplay}</span>M ₪
              </div>
              <p className="sc-cap" id="scCap">
                {scrollScenario.cap}
              </p>
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
                  <span>צמיחת הכנסות שנתית</span>
                  <b className="num" id="sGro">
                    {scrollScenario.growth}
                  </b>
                </div>
                <div className="sl">
                  <span>שיעור EBITDA יציב</span>
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
                  <span>מכפיל EBITDA אפקטיבי</span>
                  <b className="num" id="sMult">
                    {scrollScenario.mult}
                  </b>
                </div>
                <div className="sl">
                  <span>שווי פעילות (EV)</span>
                  <b className="num" id="sEv">
                    {scrollScenario.ev}
                  </b>
                </div>
              </div>
            </div>
          </div>

          <div className="gauge-wrap">
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
            שווי משולב
          </span>
          <h2 className="t rv" style={{ textAlign: 'center' }}>
            שלושה מודלים. <span className="hl">מספר אחד.</span>
          </h2>

          <div className="weights rv" aria-label="משקלות המודלים">
            <div className="w1" data-w={BLEND_WEIGHTS.dcf * 100} title="DCF">
              DCF · 50%
            </div>
            <div className="w2" data-w={BLEND_WEIGHTS.ebitda * 100} title="מכפיל EBITDA">
              EBITDA · 30%
            </div>
            <div className="w3" data-w={BLEND_WEIGHTS.rev * 100} title="מכפיל הכנסות">
              REV · 20%
            </div>
          </div>

          <div className="final-val rv">
            <span id="finalVal">0.0</span>M ₪
          </div>
          <p className="final-cap rv">
            שווי לבעלים · תרחיש בסיס · נכון ל-{reportDate}
          </p>

          <div className="final-cta rv">
            <button
              type="button"
              className="btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              aria-busy={isDownloadingPdf}
            >
              {isDownloadingPdf ? 'מפיק PDF...' : 'הורד PDF נקי ↓'}
            </button>
            <Link className="btn btn-ghost" href="/wizard">
              הערכה חדשה
            </Link>
          </div>

          <p className="disc rv">
            דוח זה הינו אינדיקציית שווי אלגוריתמית המבוססת על נתונים שהוזנו על ידי
            המשתמש ועל נתוני שוק פומביים. אין לראות בו ייעוץ השקעות, חוות דעת
            חשבונאית או הערכת שווי לצרכים סטטוטוריים. © 2026 equify BY SBC.
          </p>
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
