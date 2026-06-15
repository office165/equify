# Equify PDF report source

The production layout is implemented programmatically in:

- `lib/pdf-template/equify-pdf-styles.ts` — CSS (colors, typography, A4 sheets)
- `lib/pdf-template/equify-pdf-pages.ts` — 8-page HTML structure (01–08)
- `lib/pdf-template/equify-pdf-charts.ts` — SVG charts (bars, WACC donut, scenarios, quality)
- `lib/pdf-template/map-from-api.ts` — maps any client API payload → `ValuationData`
- `lib/pdf-template/map-from-wizard.ts` — maps wizard state → `ValuationData`

`equify-report-source.html` in this folder is a static design reference only.
The production PDF adds page **07 · Quality + Sensitivity** and renumbers the conclusion to **08**.

## Local smoke tests

HTML only (Hebrew + English):

```bash
jiti scripts/test-sample-report-html.ts
```

HTML + PDF (requires Chrome / Puppeteer):

```bash
jiti scripts/test-sample-report-pdf.ts
```

Outputs:

- `uploads/sample-report-preview.html`
- `uploads/sample-report-preview-en.html`
- `uploads/sample-report-he.pdf`
- `uploads/sample-report-en.pdf`

If PDF generation fails locally, install Chrome for Testing:

```bash
./node_modules/.bin/puppeteer browsers install chrome
jiti scripts/test-sample-report-pdf.ts
```

Fixture data lives in `lib/pdf-template/sample-report-fixture.ts` (`SAMPLE_REPORT_PAYLOAD`).
It is generic mock data — not tied to any real client.
