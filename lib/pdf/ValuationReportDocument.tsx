import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationLocale } from '../../api_client';
import { generateFundamentalInsights } from '../analysis/fundamental_insights';
import { HEALTH_COLORS, healthStatusLabel } from '../analysis/fundamental_insights';
import { PDF_COLORS } from './theme';
import { buildDcfProjection, deriveWaccBreakdown } from './dcf_projection';
import { buildStrategicRecommendations } from './strategic_recommendations';
import {
  formatDate,
  formatMoney,
  formatPct,
  formatValuationRef,
  scenarioValues,
} from './formatters';
import { buildExecutiveBullets, countIsraelMultiples } from './executive_bullets';
import { buildPdfMultiplesTable } from './pdf_multiples_table';
import { PdfBoldNumbers, truncateWords } from './pdf_text_helpers';
import { createReportStyles } from './report_styles';

const COPY = {
  en: {
    tagline: 'Institutional Valuation Intelligence',
    reportDate: 'Report Date',
    refId: 'Report ID',
    execTitle: 'Executive Summary',
    valuationLabel: 'Valuation',
    rangeLabel: 'Range',
    methodLabel: 'Method',
    methodDcfMultiples: (n: number) => `DCF + ${n} Israeli market multiples 2026`,
    recommendationsTitle: 'Key Recommendations',
    revenue: 'Revenue',
    ebitda: 'EBITDA',
    wacc: 'WACC',
    multiplesTitle: 'Market Multiples Analysis',
    colMultiple: 'Multiple',
    colIndustry: 'Industry median',
    colCompany: 'Your company',
    colImplied: 'Implied value',
    multiplesAverage: 'Average multiples-implied value',
    fundamentalTitle: 'Fundamental Analysis',
    healthTitle: 'Business Health Score',
    dcfTitle: 'DCF Methodology',
    ebitdaProjection: '5-Year EBITDA Projection',
    year: 'Year',
    ebitdaColumn: 'EBITDA',
    waccCapm: 'WACC Components (CAPM)',
    riskFree: 'Risk-Free Rate (Rf)',
    beta: 'Beta (β)',
    erp: 'Equity Risk Premium',
    costEquity: 'Cost of Equity (Ke)',
    costDebt: 'Cost of Debt (Kd)',
    blendedWacc: 'Blended WACC',
    terminalAssumptions: 'Terminal Value Assumptions',
    terminalG: 'Terminal Growth (g∞)',
    terminalPv: 'Terminal Value (PV)',
    impliedEv: 'Implied Enterprise Value',
    footer: 'Confidential — Equify by SBC Institutional Valuation Platform',
    page: 'Page',
    disclaimer: 'Disclaimer',
  },
  he: {
    tagline: 'מודיעין הערכת שווי מוסדי',
    reportDate: 'תאריך הדוח',
    refId: 'מזהה דוח',
    execTitle: 'סיכום מנהלים',
    valuationLabel: 'הערכת שווי',
    rangeLabel: 'טווח',
    methodLabel: 'שיטה',
    methodDcfMultiples: (n: number) => `DCF + ${n} מכפילי שוק ישראלי 2026`,
    recommendationsTitle: 'המלצות מרכזיות',
    revenue: 'הכנסות',
    ebitda: 'EBITDA',
    wacc: 'WACC',
    multiplesTitle: 'ניתוח מכפילי שוק',
    colMultiple: 'מכפיל',
    colIndustry: 'ממוצע ענף',
    colCompany: 'חברתך',
    colImplied: 'שווי משתמע',
    multiplesAverage: 'ממוצע שווי מכפילים',
    fundamentalTitle: 'ניתוח פונדמנטלי',
    healthTitle: 'ציון בריאות עסקית',
    dcfTitle: 'מתודולוגיית DCF',
    ebitdaProjection: 'תחזית EBITDA ל-5 שנים',
    year: 'שנה',
    ebitdaColumn: 'EBITDA',
    waccCapm: 'רכיבי WACC (CAPM)',
    riskFree: 'ריבית חסרת סיכון (Rf)',
    beta: 'בטא (β)',
    erp: 'פרמיית סיכון להון',
    costEquity: 'עלות הון עצמי (Ke)',
    costDebt: 'עלות חוב (Kd)',
    blendedWacc: 'WACC משוקלל',
    terminalAssumptions: 'הנחות ערך סופי',
    terminalG: 'צמיחה לטווח ארוך (g∞)',
    terminalPv: 'ערך סופי (PV)',
    impliedEv: 'שווי פעילות משתמע',
    footer: 'סודי — פלטפורמת הערכת שווי מוסדית Equify by SBC',
    page: 'עמוד',
    disclaimer: 'הצהרת אחריות',
  },
} as const;

type ReportCopy = (typeof COPY)[ValuationLocale];

function PageFooter({
  styles,
  t,
  refId,
  pageNum,
  totalPages,
}: {
  styles: ReturnType<typeof createReportStyles>;
  t: ReportCopy;
  refId: string;
  pageNum: number;
  totalPages: number;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{t.footer}</Text>
      <Text style={styles.footerPage}>
        {refId} · {t.page} {pageNum}/{totalPages}
      </Text>
    </View>
  );
}

function ReportHeader({
  styles,
  companyName,
  refId,
  reportDate,
  t,
}: {
  styles: ReturnType<typeof createReportStyles>;
  companyName: string;
  refId: string;
  reportDate: string;
  t: ReportCopy;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarRow}>
        <View>
          <Text style={styles.logo}>EQUIFY</Text>
          <Text style={styles.logoTag}>{t.tagline}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>{t.refId}</Text>
          <Text style={styles.metaValue}>{refId}</Text>
          <Text style={[styles.metaLabel, { marginTop: 6 }]}>{t.reportDate}</Text>
          <Text style={styles.metaValue}>{reportDate}</Text>
        </View>
      </View>
      <Text style={styles.companyHero}>{companyName}</Text>
      <View style={styles.divider} />
    </View>
  );
}

export interface ValuationReportDocumentProps {
  matrix: ForecastMatrixWithDiagnostics;
  locale: ValuationLocale;
}

export function ValuationReportDocument({
  matrix,
  locale,
}: ValuationReportDocumentProps) {
  const t = COPY[locale];
  const styles = createReportStyles(locale);
  const currency = matrix.meta.currency || 'ILS';
  const refId = formatValuationRef(matrix);
  const reportDate = formatDate(matrix.meta.generated_at, locale);
  const ev = scenarioValues(matrix);
  const dcf = buildDcfProjection(matrix);
  const wacc = deriveWaccBreakdown(matrix);
  const strategy = buildStrategicRecommendations(matrix, locale);
  const executiveBullets = buildExecutiveBullets(matrix, locale);
  const multiplesCount = countIsraelMultiples(matrix);
  const multiplesTable = buildPdfMultiplesTable(matrix, locale, currency);

  const ebitda =
    matrix.diagnostics_inputs?.ebitda ??
    matrix.assumptions.adjusted_ebit / 0.85;
  const revenue = matrix.assumptions.base_revenue;

  const fundamental = generateFundamentalInsights({
    matrix,
    baseEnterpriseValue: ev.base,
    growthDeltaPp: 0,
    marginDeltaPp: 0,
    locale,
  });
  const fundamentalBullets = fundamental.paragraphs
    .slice(0, 3)
    .map((p) => truncateWords(p, 15));

  const waccRows = [
    { label: t.riskFree, value: formatPct(wacc.riskFreeRate) },
    { label: t.beta, value: wacc.beta.toFixed(2) },
    { label: t.erp, value: formatPct(wacc.equityRiskPremium) },
    { label: t.costEquity, value: formatPct(wacc.costOfEquity) },
    { label: t.costDebt, value: formatPct(wacc.costOfDebt) },
    { label: t.blendedWacc, value: formatPct(wacc.wacc), accent: true },
  ];

  const rowDir = locale === 'he' ? 'row-reverse' : 'row';
  const dcfTableStandalone = dcf.rows.length > 6;
  const totalPages = dcfTableStandalone ? 4 : 3;
  const dcfPageNum = dcfTableStandalone ? 3 : 3;
  const dcfDetailPageNum = dcfTableStandalone ? 4 : 3;

  const ebitdaProjectionTable = (
    <>
      <Text style={styles.sectionTitle}>{t.ebitdaProjection}</Text>
      <View style={styles.table} wrap={false}>
        <View style={styles.tableHead} wrap={false}>
          <Text style={styles.th}>{t.year}</Text>
          <Text style={[styles.th, styles.thRight]}>{t.ebitdaColumn}</Text>
        </View>
        {dcf.rows.map((row, idx) => (
          <View
            key={row.year}
            wrap={false}
            style={[styles.tr, idx % 2 === 1 ? styles.trAlt : {}]}
          >
            <Text style={styles.td}>Y{row.year}</Text>
            <Text style={[styles.td, styles.tdRight]}>
              {formatMoney(row.ebitda, currency, locale)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  const dcfDetailSections = (
    <>
      {!dcfTableStandalone ? ebitdaProjectionTable : null}

      <Text style={styles.sectionTitle}>{t.waccCapm}</Text>
      <View style={styles.waccGrid}>
        {waccRows.map((row) => (
          <View
            key={row.label}
            style={[styles.waccTile, row.accent ? styles.waccTileAccent : {}]}
          >
            <Text style={styles.metricTileLabel}>{row.label}</Text>
            <Text style={styles.metricTileValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t.terminalAssumptions}</Text>
      <View style={styles.table} wrap={false}>
        {[
          { label: t.terminalG, value: formatPct(matrix.assumptions.g_terminal) },
          {
            label: t.terminalPv,
            value: formatMoney(dcf.terminalPv, currency, locale),
          },
          {
            label: t.impliedEv,
            value: formatMoney(dcf.enterpriseValue, currency, locale),
          },
        ].map((row, idx) => (
          <View
            key={row.label}
            wrap={false}
            style={[styles.tr, idx % 2 === 1 ? styles.trAlt : {}]}
          >
            <Text style={styles.td}>{row.label}</Text>
            <Text style={[styles.td, styles.tdRight]}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>{t.disclaimer}</Text>
        <Text style={styles.disclaimerText}>{strategy.disclaimer}</Text>
      </View>
    </>
  );

  return (
    <Document
      title={`Equify — ${matrix.meta.company_name}`}
      author="Equify by SBC"
      language={locale === 'he' ? 'he-IL' : 'en-US'}
    >
      {/* PAGE 1 — Executive Summary */}
      <Page size="A4" style={styles.page}>
        <ReportHeader
          styles={styles}
          companyName={matrix.meta.company_name ?? 'Company'}
          refId={refId}
          reportDate={reportDate}
          t={t}
        />
        <View style={styles.pageBody}>
          <View style={styles.heroBox} wrap={false}>
            <Text style={styles.heroMainLine}>
              {t.valuationLabel}: {formatMoney(ev.base, currency, locale)}
            </Text>
            <Text style={styles.heroSub}>
              {t.rangeLabel}: {formatMoney(ev.bear, currency, locale)} –{' '}
              {formatMoney(ev.bull, currency, locale)}
            </Text>
            <Text style={styles.heroSub}>
              {t.methodLabel}: {t.methodDcfMultiples(multiplesCount)}
            </Text>
          </View>

          <View style={{ flexDirection: rowDir as 'row' | 'row-reverse' }}>
            {[
              { label: t.revenue, value: formatMoney(revenue, currency, locale) },
              { label: t.ebitda, value: formatMoney(ebitda, currency, locale) },
              {
                label: t.wacc,
                value: formatPct(matrix.assumptions.wacc),
              },
            ].map((metric) => (
              <View key={metric.label} style={styles.metricTileThird}>
                <Text style={styles.metricTileLabel}>{metric.label}</Text>
                <Text style={styles.metricTileValue}>{metric.value}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 8 }]}>
            {t.recommendationsTitle}
          </Text>
          {executiveBullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <PdfBoldNumbers text={`• ${bullet}`} style={styles.bulletCompact} />
            </View>
          ))}
        </View>
        <PageFooter
          styles={styles}
          t={t}
          refId={refId}
          pageNum={1}
          totalPages={totalPages}
        />
      </Page>

      {/* PAGE 2 — Multiples + Fundamental + Health */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.pageBody, { paddingTop: 28 }]}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderTitle}>{t.multiplesTitle}</Text>
            <Text style={styles.pageHeaderRef}>{refId}</Text>
          </View>

          {multiplesTable && multiplesTable.rows.length > 0 ? (
            <>
              <View style={styles.table} wrap={false}>
                <View style={styles.tableHead} wrap={false}>
                  <Text style={[styles.th, { flex: 0.9 }]}>{t.colMultiple}</Text>
                  <Text style={styles.th}>{t.colIndustry}</Text>
                  <Text style={styles.th}>{t.colCompany}</Text>
                  <Text style={[styles.th, styles.thRight]}>{t.colImplied}</Text>
                </View>
                {multiplesTable.rows.map((row, idx) => (
                  <View
                    key={row.label}
                    wrap={false}
                    style={[styles.tr, idx % 2 === 1 ? styles.trAlt : {}]}
                  >
                    <Text style={[styles.td, { flex: 0.9, fontWeight: 700 }]}>
                      {row.label}
                    </Text>
                    <Text style={styles.td}>{row.industryMedian}</Text>
                    <Text style={[styles.td, { fontWeight: 700 }]}>
                      {row.companyMultiple}
                    </Text>
                    <Text style={[styles.td, styles.tdRight]}>{row.impliedEv}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.summaryText, { marginBottom: 16, fontWeight: 700 }]}>
                {t.multiplesAverage}: {multiplesTable.averageEv}
              </Text>
            </>
          ) : (
            <Text style={[styles.summaryText, { marginBottom: 16 }]}>
              {locale === 'he'
                ? 'נתוני מכפילים לא זמינים לדוח זה.'
                : 'Multiples data not available for this report.'}
            </Text>
          )}

          <Text style={styles.sectionTitle}>{t.fundamentalTitle}</Text>
          {fundamentalBullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <PdfBoldNumbers text={`• ${bullet}`} style={styles.bulletCompact} />
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 14, marginBottom: 8 }]}>
            {t.healthTitle}
          </Text>
          <View style={{ flexDirection: rowDir as 'row' | 'row-reverse' }}>
            {fundamental.healthScores.map((item) => (
              <View key={item.id} style={styles.healthTile}>
                <Text style={styles.metricTileLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.healthStatus,
                    { color: HEALTH_COLORS[item.status] },
                  ]}
                >
                  {healthStatusLabel(item.status, locale)}
                </Text>
                <Text style={[styles.summaryText, { fontSize: 8, marginTop: 4 }]}>
                  {truncateWords(item.summary, 12)}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <PageFooter
          styles={styles}
          t={t}
          refId={refId}
          pageNum={2}
          totalPages={totalPages}
        />
      </Page>

      {dcfTableStandalone ? (
        <Page size="A4" style={styles.page}>
          <View style={[styles.pageBody, { paddingTop: 28 }]}>
            <View style={styles.pageHeader}>
              <Text style={styles.pageHeaderTitle}>{t.dcfTitle}</Text>
              <Text style={styles.pageHeaderRef}>{matrix.meta.company_name}</Text>
            </View>
            {ebitdaProjectionTable}
          </View>
          <PageFooter
            styles={styles}
            t={t}
            refId={refId}
            pageNum={dcfPageNum}
            totalPages={totalPages}
          />
        </Page>
      ) : null}

      {/* DCF methodology (combined or continuation after large projection table) */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.pageBody, { paddingTop: 28 }]}>
          {!dcfTableStandalone ? (
            <View style={styles.pageHeader}>
              <Text style={styles.pageHeaderTitle}>{t.dcfTitle}</Text>
              <Text style={styles.pageHeaderRef}>{matrix.meta.company_name}</Text>
            </View>
          ) : null}
          {dcfDetailSections}
        </View>
        <PageFooter
          styles={styles}
          t={t}
          refId={refId}
          pageNum={dcfDetailPageNum}
          totalPages={totalPages}
        />
      </Page>
    </Document>
  );
}
