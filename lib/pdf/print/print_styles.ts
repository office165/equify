import { buildPdfFontFaceCss } from '../pdf_font_faces';
import { getPrintComplianceCss } from './print-compliance';

export function buildPrintReportCss(): string {
  const fontFaces = buildPdfFontFaceCss();
  const compliance = getPrintComplianceCss();

  return `
${fontFaces}
${compliance}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: 'Heebo', Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #0F172A;
  background: #ffffff;
  direction: rtl;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  width: 100%;
  margin: 0;
  padding: 0;
}

/* ── Chapter-per-page architecture ── */
.report-page {
  display: block;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  break-before: page;
  page-break-before: always;
  break-inside: avoid;
  page-break-inside: avoid;
  padding-inline: 0;
}
.report-page:first-child {
  break-before: auto;
  page-break-before: auto;
}
.report-page--flow {
  break-inside: auto;
  page-break-inside: auto;
}
.report-block {
  display: block;
  width: 100%;
  margin-bottom: 5mm;
  break-inside: avoid;
  page-break-inside: avoid;
}
.report-block:last-child {
  margin-bottom: 0;
}
.report-running-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4mm;
  margin-bottom: 5mm;
  padding-bottom: 2mm;
  border-bottom: 0.5pt solid #E2E8F0;
  font-size: 8pt;
  color: #64748B;
}
.report-running-header__company {
  max-width: 55%;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-caption {
  font-size: 9pt;
  color: #64748B;
  line-height: 1.45;
}
.report-eyebrow {
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #10B981;
}
.report-h1 {
  font-size: 22pt;
  font-weight: 800;
  line-height: 1.15;
  color: #0F172A;
  margin: 4mm 0 2mm;
}
.report-h2 {
  font-size: 13pt;
  font-weight: 700;
  color: #0F172A;
  margin: 0 0 3mm;
  padding-bottom: 2mm;
  border-bottom: 0.5pt solid #D1FAE5;
}
.report-rule {
  height: 0;
  border: none;
  border-top: 0.75pt solid #00F5A0;
  margin: 4mm 0;
}
.num {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  direction: ltr;
  unicode-bidi: embed;
  display: inline-block;
}
.num--king {
  font-size: 28pt;
  font-weight: 800;
  color: #10B981;
  line-height: 1.05;
}
.num--lg { font-size: 14pt; font-weight: 700; }
.num--md { font-size: 12pt; font-weight: 600; }
.num--sm { font-size: 10pt; font-weight: 600; }
.subordinate { font-size: 9pt; color: #64748B; }
.subordinate-box {
  border: 0.5pt solid #E2E8F0;
  border-radius: 3pt;
  padding: 3mm 4mm;
  background: #F8FAFC;
  margin-top: 3mm;
}
.waterfall-row {
  display: block;
  border: 0.5pt solid #E2E8F0;
  border-radius: 3pt;
  padding: 3mm 4mm;
  margin-bottom: 2mm;
  background: #fff;
}
.waterfall-row--result {
  border-color: #00F5A0;
  background: #F0FDF4;
}
.waterfall-op {
  display: block;
  text-align: center;
  margin: 1mm 0;
  color: #10B981;
  font-weight: 700;
  font-size: 11pt;
}
.waterfall-blend {
  margin: 2mm 0 3mm;
  padding: 2mm 3mm;
  border-inline-start: 2pt solid #34D399;
  background: #F8FAFC;
}
.scenario-strip {
  display: block;
  width: 100%;
  margin-top: 3mm;
}
.scenario-cell {
  display: inline-block;
  width: 32%;
  vertical-align: top;
  text-align: center;
  border: 0.5pt solid #E2E8F0;
  border-radius: 3pt;
  padding: 3mm 2mm;
  margin-inline-start: 1%;
}
.scenario-cell:first-child { margin-inline-start: 0; }
.scenario-cell--base {
  border-color: #00F5A0;
  background: #F0FDF4;
}
.metrics-grid {
  display: block;
  width: 100%;
}
.metric-cell {
  display: inline-block;
  width: 48%;
  vertical-align: top;
  border: 0.5pt solid #E2E8F0;
  border-radius: 3pt;
  padding: 3mm;
  margin-bottom: 3mm;
  margin-inline-start: 2%;
}
.metric-cell:nth-child(odd) { margin-inline-start: 0; }
.chart-wrap {
  width: 100%;
  max-height: 62mm;
  margin: 3mm 0;
  break-inside: avoid;
  page-break-inside: avoid;
}
table.report-table {
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 9.5pt;
}
table.report-table thead {
  display: table-header-group;
}
table.report-table tfoot {
  display: table-footer-group;
  break-inside: avoid;
  page-break-inside: avoid;
}
table.report-table th {
  background: #0F172A;
  color: #6EE7B7;
  font-weight: 600;
  padding: 2.5mm 2mm;
  text-align: right;
  font-size: 9pt;
}
table.report-table td {
  padding: 2.5mm 2mm;
  border-bottom: 0.5pt solid #E2E8F0;
  text-align: right;
  word-break: break-word;
}
table.report-table tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
table.report-table tbody tr:nth-child(even) td {
  background: #F8FAFC;
}
.bullet-list { list-style: none; padding: 0; }
.bullet-list li {
  display: block;
  margin-bottom: 2mm;
  padding-inline-start: 4mm;
  position: relative;
}
.bullet-list li::before {
  content: '•';
  position: absolute;
  inset-inline-start: 0;
  color: #00F5A0;
  font-weight: 700;
}
.glossary dt {
  font-weight: 700;
  margin-top: 2mm;
}
.glossary dd {
  margin: 1mm 0 2mm;
  color: #475569;
  font-size: 9.5pt;
}
.legal-note {
  font-size: 8pt;
  color: #94A3B8;
  line-height: 1.5;
  margin-top: 4mm;
}
.cover-meta {
  margin-top: 8mm;
  font-size: 10pt;
  color: #475569;
}
.cover-meta div { margin-bottom: 2mm; }
.confidence-ring {
  display: block;
  margin: 6mm auto;
  text-align: center;
}
.confidence-ring svg {
  width: 88px;
  height: 88px;
  max-width: 88px;
  max-height: 88px;
}
.confidence-ring text {
  font-size: 15px;
}
.pill {
  display: inline-block;
  border: 0.5pt solid #A7F3D0;
  background: #ECFDF5;
  color: #065F46;
  border-radius: 12pt;
  padding: 1.5mm 3mm;
  font-size: 9pt;
  font-weight: 600;
  margin: 1mm;
}
.omitted-note {
  font-size: 9pt;
  color: #64748B;
  font-style: italic;
  margin-top: 3mm;
  padding: 3mm;
  border-top: 0.5pt solid #E2E8F0;
}
`;
}
