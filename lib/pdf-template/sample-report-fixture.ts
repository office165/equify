import type { EquifyReportApiPayload } from './map-from-api';

/** Generic API payload for local PDF/HTML smoke tests — not tied to any real client. */
export const SAMPLE_REPORT_PAYLOAD: EquifyReportApiPayload = {
  companyName: 'חברת דוגמה בע״מ',
  registrationId: '00-000-0001',
  valuationPurpose: 'משא ומתן אסטרטגי',
  reportId: '#EQ-SAMPLE-001',
  valuationDate: '12.06.2026',
  language: 'he',
  sector: 'hospitality',
  sectorLabel: 'אירוח ומלונאות',
  data: {
    financials: {
      '2023': { revenue: 10.4, ebitda: 2.1, ebitda_pct: 19.8 },
      '2024': { revenue: 11.3, ebitda: 2.4, ebitda_pct: 21.5 },
      '2025': { revenue: 12.4, ebitda: 2.8, ebitda_pct: 22.6 },
      '2026F': { revenue: 13.5, ebitda: 3.0, ebitda_pct: 22.6 },
      '2027F': { revenue: 14.7, ebitda: 3.4, ebitda_pct: 23.0 },
      '2028F': { revenue: 16.0, ebitda: 3.7, ebitda_pct: 23.4 },
    },
    valuation: {
      equity_value_base: 20.1,
      equity_value_bear: 16.3,
      equity_value_bull: 24.8,
      enterprise_value: 24.5,
      net_debt: 4.4,
      wacc: 16.2,
      ebitda_multiple: 7.5,
      revenue_multiple: 1.9,
      dcf_ev: 26.8,
      ebitda_ev: 21.0,
      revenue_ev: 23.6,
      quality_score: 78,
      quality_grade: 'B+',
    },
    scenarios: {
      bear: { growth: 3, wacc: 17.8, multiple: 5.8, ev: 20.7, ebitda_margin: 19.8 },
      base: { growth: 9, wacc: 16.2, multiple: 7.5, ev: 24.5, ebitda_margin: 22.6 },
      bull: { growth: 15, wacc: 14.8, multiple: 8.8, ev: 29.2, ebitda_margin: 24.5 },
    },
    wacc_breakdown: {
      rf: 4.3,
      erp: 5.4,
      crp: 1.6,
      size_premium: 3.1,
      specific_risk: 1.8,
    },
    comps: [
      {
        name: 'עסקה לדוגמה א׳',
        year: 2024,
        ev: 27,
        ev_ebitda: 7.8,
        ev_revenue: 2.1,
        ebitda_pct: 27,
      },
      {
        name: 'עסקה לדוגמה ב׳',
        year: 2023,
        ev: 22,
        ev_ebitda: 6.4,
        ev_revenue: 1.5,
        ebitda_pct: 24,
      },
    ],
    quality_factors: {
      recurring_revenue: { score: 18, max: 28, label: 'הכנסות חוזרות', finding: '64% מסך ההכנסות' },
      customer_concentration: { score: 16, max: 22, label: 'ריכוז לקוחות', finding: 'לקוח מרכזי 18%' },
      founder_dependence: { score: 14, max: 14, label: 'תלות במייסד', finding: 'שכבת ניהול שנייה' },
      market_competition: { score: 8, max: 10, label: 'תחרות בשוק', finding: 'תחרות בינונית-גבוהה' },
      ip_protection: { score: 12, max: 12, label: 'קניין רוחני', finding: 'מיצוב נישתי' },
      contract_length: { score: 10, max: 10, label: 'חוזים ארוכי טווח', finding: 'חוזים שנתיים' },
      growth_premium: { score: 7, max: 14, label: 'פרמיית צמיחה', finding: 'צמיחה 9%' },
    },
    sensitivity_wacc: {
      '14.5': [22.5, 20.4, 18.2, 16.3, 14.7],
      '15.2': [23.6, 21.3, 19.1, 17.1, 15.4],
      '16.2': [24.8, 22.4, 20.1, 18.0, 16.3],
      '17.2': [26.1, 23.5, 21.5, 19.0, 17.2],
      '18.0': [27.4, 24.8, 22.8, 20.1, 18.1],
    },
    sensitivity_ebitda: {
      '2.0': [11.0, 13.0, 15.0, 17.0, 19.0],
      '2.4': [13.2, 15.6, 18.0, 20.4, 22.8],
      '2.8': [15.4, 18.2, 21.0, 23.8, 26.6],
      '3.2': [17.6, 20.8, 24.0, 27.2, 30.4],
    },
    dcf_rows: [
      { label: '2026', fcffM: 2.31, discountFactor: 0.861, pvM: 1.99 },
      { label: '2027', fcffM: 2.56, discountFactor: 0.741, pvM: 1.9 },
      { label: '2028', fcffM: 2.84, discountFactor: 0.637, pvM: 1.81 },
      { label: '2029', fcffM: 3.07, discountFactor: 0.548, pvM: 1.68 },
      { label: '2030', fcffM: 3.28, discountFactor: 0.472, pvM: 1.55 },
    ],
    terminal_pv_m: 15.2,
    terminal_growth_pct: 2.5,
    terminal_share_pct: 57,
  },
};

/** English-locale variant of the sample payload for bilingual smoke tests. */
export const SAMPLE_REPORT_PAYLOAD_EN: EquifyReportApiPayload = {
  ...SAMPLE_REPORT_PAYLOAD,
  language: 'en',
  companyName: 'Sample Company Ltd.',
  valuationPurpose: 'Strategic negotiation',
  sectorLabel: 'Hospitality',
};
