'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationScenario } from '../../lib/valuation/canonical_valuation';
import {
  BLEND_WEIGHTS,
  buildReportViewModel,
  buildWaccDonutSlices,
} from '../../lib/results/report-view-model';
import { formatCurrencyShort } from '../../lib/utils/formatCurrency';
import { PdfClientIdentityCaptureBlock } from '../pdf/PdfClientIdentityCaptureBlock';
import { getWizardContext, hasValidatedUserIdentifiers } from '../../lib/pdf/wizard_context';
import { useReducedMotion } from '../landing/motion/useReducedMotion';
import { ScenarioTabs } from './ScenarioTabs';
import { WaterfallBlock } from './WaterfallBlock';
import { TrajectoryChart } from './charts/TrajectoryChart';
import { WaccDonut } from './charts/WaccDonut';
import { QualityGauge } from './charts/QualityGauge';
import { useResultsBgOrb } from './useResultsBgOrb';
import './results-report.css';

const SECTIONS = [
  { id: 'rr-p1', num: '01', labelHe: 'סיכום ושווי', labelEn: 'Summary' },
  { id: 'rr-p2', num: '02', labelHe: 'גשר EV → הון', labelEn: 'EV bridge' },
  { id: 'rr-p3', num: '03', labelHe: 'מסלול תחזית', labelEn: 'Trajectory' },
  { id: 'rr-p4', num: '04', labelHe: 'פירוק WACC', labelEn: 'WACC' },
  { id: 'rr-p5', num: '05', labelHe: 'ציון איכות', labelEn: 'Quality' },
  { id: 'rr-p6', num: '06', labelHe: 'ממצאים', labelEn: 'Findings' },
  { id: 'rr-p7', num: '07', labelHe: 'שקלול 3 מודלים', labelEn: '3-model blend' },
] as const;

interface EquifyResultsReportProps {
  matrix: ForecastMatrixWithDiagnostics | null;
  locale: 'he' | 'en';
}

export function EquifyResultsReport({ matrix, locale }: EquifyResultsReportProps) {
  const isHe = locale === 'he';
  const [selectedScenario, setSelectedScenario] = useState<ValuationScenario>('base');
  const orbHostRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useResultsBgOrb(orbHostRef, { enabled: !!matrix, reducedMotion });

  const vm = useMemo(
    () => (matrix ? buildReportViewModel(matrix, locale) : null),
    [matrix, locale],
  );

  const wizardContext = useMemo(
    () => (matrix ? getWizardContext(matrix) : null),
    [matrix],
  );

  const reportAccessGranted = useMemo(
    () =>
      wizardContext
        ? hasValidatedUserIdentifiers(wizardContext.user_identifiers)
        : false,
    [wizardContext],
  );

  if (!matrix || !vm) {
    return (
      <div className="results-report-root" dir="rtl" lang="he">
        <div className="rr-empty">
          <p>
            {isHe
              ? 'לא נמצאו תוצאות הערכה. הרץ הערכה חדשה מהאשף.'
              : 'No valuation results found. Run a new valuation from the wizard.'}
          </p>
          <Link href="/wizard" className="rr-btn rr-btn--primary">
            {isHe ? 'חזרה לאשף ההערכה' : 'Back to valuation wizard'}
          </Link>
        </div>
      </div>
    );
  }

  const scenario = vm.scenarios[selectedScenario];
  const waccSlices = buildWaccDonutSlices(scenario.waccPct);
  const { clientIdentity } = vm;
  const idLabel = clientIdentity.nationalId || clientIdentity.corporateTaxId;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="results-report-root pdf-root-container pdf-print-report"
      dir={isHe ? 'rtl' : 'ltr'}
      lang={isHe ? 'he' : 'en'}
      id="equify-report-capture"
    >
      <div ref={orbHostRef} className="rr-orb-host print:hidden" aria-hidden />

      <div className="rr-shell">
        <aside className="rr-sidebar print:hidden" data-pdf-exclude>
          <div className="rr-brand">
            equify<em>.</em>
            <div style={{ fontSize: '0.65rem', color: 'var(--paper-dim)', fontWeight: 500, marginTop: 4 }}>
              BY SBC
            </div>
          </div>

          <nav className="rr-nav" aria-label={isHe ? 'ניווט דוח' : 'Report navigation'}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                <span className="rr-nav__num">{s.num}</span>
                {isHe ? s.labelHe : s.labelEn}
              </a>
            ))}
          </nav>

          <div className="rr-sidebar-actions">
            <button type="button" className="rr-btn rr-btn--primary" onClick={handlePrint}>
              {isHe ? 'הורד PDF / הדפס' : 'Download PDF / Print'}
            </button>
            <Link href="/wizard" className="rr-btn rr-btn--ghost">
              {isHe ? 'אשף הערכה' : 'Valuation wizard'}
            </Link>
            <Link href="/" className="rr-btn rr-btn--ghost">
              {isHe ? 'דף הבית' : 'Home'}
            </Link>
          </div>
        </aside>

        <main className="rr-main pdf-report-subtree">
          {reportAccessGranted ? (
            <div className="rr-identity-slot print:hidden">
              <PdfClientIdentityCaptureBlock
                identity={clientIdentity}
                valuationMidpoint={scenario.enterpriseValue}
                currency={vm.currency}
                locale={locale}
                customLogoDataUrl={wizardContext?.custom_logo_data_url}
              />
            </div>
          ) : null}

          {/* Page 1 — Cover / Hero */}
          <section className="rr-page" id="rr-p1">
            <div className="rr-eyebrow">
              {isHe ? 'דוח הערכת שווי' : 'Valuation report'}
            </div>
            <h1 className="rr-page-title">{vm.companyName}</h1>
            <p className="rr-page-sub">
              {vm.industrySector} · {vm.lifecycleStage} · {vm.reportId}
            </p>

            <ScenarioTabs
              selected={selectedScenario}
              onSelect={setSelectedScenario}
              locale={locale}
            />

            <div className="rr-hero-equity">
              {formatCurrencyShort(scenario.equityValue, vm.currency)}
              <span>{isHe ? 'שווי לבעלים' : 'Equity value'}</span>
            </div>

            <div className="rr-meta-grid">
              <div className="rr-meta-cell">
                <dt>{isHe ? 'שם מלא' : 'Full name'}</dt>
                <dd>{clientIdentity.fullName || '—'}</dd>
              </div>
              <div className="rr-meta-cell">
                <dt>{isHe ? 'ת.ז. / ח.פ.' : 'ID / Reg. no.'}</dt>
                <dd dir="ltr">{idLabel || '—'}</dd>
              </div>
              <div className="rr-meta-cell">
                <dt>{isHe ? 'חברה' : 'Company'}</dt>
                <dd>{clientIdentity.companyName || '—'}</dd>
              </div>
              <div className="rr-meta-cell">
                <dt>{isHe ? 'טלפון' : 'Phone'}</dt>
                <dd dir="ltr">{clientIdentity.userPhone || '—'}</dd>
              </div>
              <div className="rr-meta-cell">
                <dt>{isHe ? 'דוא״ל' : 'Email'}</dt>
                <dd dir="ltr">{clientIdentity.userEmail || '—'}</dd>
              </div>
              <div className="rr-meta-cell">
                <dt>{isHe ? 'שווי פעילות (EV)' : 'Enterprise value'}</dt>
                <dd>{formatCurrencyShort(scenario.enterpriseValue, vm.currency)}</dd>
              </div>
            </div>

            <div className="rr-kpi-strip">
              <div className="rr-kpi">
                <div className="rr-kpi__label">WACC</div>
                <div className="rr-kpi__value">{scenario.waccPct.toFixed(1)}%</div>
              </div>
              <div className="rr-kpi">
                <div className="rr-kpi__label">
                  {isHe ? 'צמיחה לטווח ארוך' : 'Terminal growth'}
                </div>
                <div className="rr-kpi__value">{vm.terminalGrowthPct.toFixed(1)}%</div>
              </div>
              <div className="rr-kpi">
                <div className="rr-kpi__label">EBITDA margin</div>
                <div className="rr-kpi__value">{vm.ebitdaMarginPct.toFixed(0)}%</div>
              </div>
              <div className="rr-kpi">
                <div className="rr-kpi__label">
                  {isHe ? 'ציון איכות' : 'Quality score'}
                </div>
                <div className="rr-kpi__value">
                  {vm.qualityScore} ({vm.qualityGrade})
                </div>
              </div>
            </div>
          </section>

          {/* Page 2 — Waterfall */}
          <section className="rr-page" id="rr-p2">
            <div className="rr-eyebrow">{isHe ? 'גשר שווי' : 'Value bridge'}</div>
            <h2 className="rr-page-title">
              {isHe ? 'מ-EV לשווי לבעלים' : 'From EV to equity'}
            </h2>
            <p className="rr-page-sub">
              {isHe
                ? 'פירוק שווי הפעילות לחוב נטו ושווי הון — לפי תרחיש נבחר.'
                : 'Enterprise value bridge to net debt and equity — selected scenario.'}
            </p>
            <div className="rr-card">
              <WaterfallBlock
                metrics={scenario.waterfall}
                currency={vm.currency}
                locale={locale}
              />
            </div>
          </section>

          {/* Page 3 — Trajectory */}
          <section className="rr-page" id="rr-p3">
            <div className="rr-eyebrow">{isHe ? 'תחזית' : 'Forecast'}</div>
            <h2 className="rr-page-title">
              {isHe ? 'מסלול הכנסות ו-EBITDA' : 'Revenue & EBITDA trajectory'}
            </h2>
            <p className="rr-page-sub">
              {isHe
                ? `תחזית 5 שנים · WACC ${scenario.waccPct.toFixed(1)}% · g ${vm.terminalGrowthPct.toFixed(1)}%`
                : `5-year forecast · WACC ${scenario.waccPct.toFixed(1)}% · g ${vm.terminalGrowthPct.toFixed(1)}%`}
            </p>
            <div className="rr-card">
              <TrajectoryChart
                data={vm.trajectory}
                currency={vm.currency}
                locale={locale}
              />
            </div>
          </section>

          {/* Page 4 — WACC Donut */}
          <section className="rr-page" id="rr-p4">
            <div className="rr-eyebrow">WACC</div>
            <h2 className="rr-page-title">
              {isHe ? 'פירוק עלות ההון' : 'Cost of capital breakdown'}
            </h2>
            <p className="rr-page-sub">
              {isHe
                ? 'רכיבי WACC לפי CAPM מותאם לשוק הישראלי.'
                : 'WACC components per Israel-adjusted CAPM.'}
            </p>
            <div className="rr-card">
              <WaccDonut
                slices={waccSlices}
                waccPct={scenario.waccPct}
                locale={locale}
              />
            </div>
          </section>

          {/* Page 5 — Quality Gauge */}
          <section className="rr-page" id="rr-p5">
            <div className="rr-eyebrow">{isHe ? 'איכות' : 'Quality'}</div>
            <h2 className="rr-page-title">
              {isHe ? 'ציון איכות הנתונים' : 'Data quality score'}
            </h2>
            <p className="rr-page-sub">
              {isHe
                ? 'הערכת שלמות הנתונים, עקביות התחזית ורמת הביטחון באינדיקציה.'
                : 'Assessment of data completeness, forecast consistency, and confidence.'}
            </p>
            <div className="rr-card">
              <QualityGauge
                score={vm.qualityScore}
                grade={vm.qualityGrade}
                locale={locale}
              />
            </div>
          </section>

          {/* Page 6 — Findings */}
          <section className="rr-page" id="rr-p6">
            <div className="rr-eyebrow">{isHe ? 'תובנות' : 'Insights'}</div>
            <h2 className="rr-page-title">
              {isHe ? 'ממצאים מרכזיים' : 'Key findings'}
            </h2>
            <p className="rr-page-sub">
              {isHe
                ? 'סיכום מנהלים — מבוסס על ניתוח DCF, מכפילים ואבחון פיננסי.'
                : 'Executive summary — based on DCF, multiples, and financial diagnostics.'}
            </p>
            <ul className="rr-findings">
              {vm.findings.map((finding, i) => (
                <li key={`${i}-${finding.slice(0, 24)}`}>{finding}</li>
              ))}
            </ul>
          </section>

          {/* Page 7 — 3-model blend */}
          <section className="rr-page" id="rr-p7">
            <div className="rr-eyebrow">{isHe ? 'שקלול' : 'Blend'}</div>
            <h2 className="rr-page-title">
              {isHe ? 'שקלול 3 מודלים' : 'Three-model blend'}
            </h2>
            <p className="rr-page-sub">
              {isHe
                ? 'DCF 50% · מכפיל EBITDA 30% · מכפיל הכנסות 20%'
                : 'DCF 50% · EBITDA multiple 30% · Revenue multiple 20%'}
            </p>

            <div className="rr-card rr-blend">
              <div className="rr-blend__bar" aria-hidden>
                <div
                  className="rr-blend__seg rr-blend__seg--dcf"
                  style={{ width: `${BLEND_WEIGHTS.dcf * 100}%` }}
                >
                  DCF 50%
                </div>
                <div
                  className="rr-blend__seg rr-blend__seg--ebitda"
                  style={{ width: `${BLEND_WEIGHTS.ebitda * 100}%` }}
                >
                  EBITDA 30%
                </div>
                <div
                  className="rr-blend__seg rr-blend__seg--rev"
                  style={{ width: `${BLEND_WEIGHTS.rev * 100}%` }}
                >
                  Rev 20%
                </div>
              </div>

              <div className="rr-blend__models">
                <div className="rr-blend__model">
                  <div className="rr-blend__model-label">DCF</div>
                  <div className="rr-blend__model-weight">50%</div>
                  <div className="rr-blend__model-value">
                    {formatCurrencyShort(scenario.evDcf, vm.currency)}
                  </div>
                </div>
                <div className="rr-blend__model">
                  <div className="rr-blend__model-label">
                    {isHe ? 'מכפיל EBITDA' : 'EBITDA multiple'}
                  </div>
                  <div className="rr-blend__model-weight">30%</div>
                  <div className="rr-blend__model-value">
                    {formatCurrencyShort(scenario.evEbitda, vm.currency)}
                  </div>
                </div>
                <div className="rr-blend__model">
                  <div className="rr-blend__model-label">
                    {isHe ? 'מכפיל הכנסות' : 'Revenue multiple'}
                  </div>
                  <div className="rr-blend__model-weight">20%</div>
                  <div className="rr-blend__model-value">
                    {formatCurrencyShort(scenario.evRev, vm.currency)}
                  </div>
                </div>
              </div>

              <div className="rr-blend__total">
                <span>{isHe ? 'שווי משוקלל (EV)' : 'Blended EV'}</span>
                <strong>{formatCurrencyShort(scenario.blendedEv, vm.currency)}</strong>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
