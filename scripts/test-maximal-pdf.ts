/**
 * Local smoke test — maximal Hebrew PDF via Puppeteer.
 * Usage: npx tsx scripts/test-maximal-pdf.ts
 *
 * Chrome resolution order:
 *   PUPPETEER_EXECUTABLE_PATH → OS well-known paths → @sparticuz/chromium
 */

import fs from 'fs';
import path from 'path';
import { createSampleForecastMatrix } from '../forecast_sample';
import type { DiagnosticsInputsSnapshot } from '../api_client';
import type { ForecastMatrixWithDiagnostics } from '../valuation_forecast';
import { buildVerdictMetrics } from '../lib/valuation/verdict_metrics';
import { buildValuationReportPdf } from '../lib/pdf/valuation_report_pdf';
import {
  buildPrintReportHtml,
  REPORT_CHAPTER_COUNT,
} from '../lib/pdf/print/build_print_report_html';
import { mapMatrixToReportData } from '../lib/pdf/map_matrix_to_report_data';
import {
  probeLocalChromeExecutable,
  resolveChromeExecutableAsync,
  PUPPETEER_CHROME_MAJOR,
} from '../lib/pdf/resolve_chrome_executable';

function buildMaximalMatrix(): ForecastMatrixWithDiagnostics {
  const sample = createSampleForecastMatrix();
  const longName =
    'חברת טכנולוגיה מתקדמת לפתרונות אנרגיה מתחדשת וניהול מערכות חכמות בע״מ — ישראל';

  return {
    ...sample,
    meta: {
      ...sample.meta,
      company_name: longName,
      confidence_score: 92,
      generated_at: new Date().toISOString(),
    },
    wizard_context: {
      qualitative_description:
        'חברה מובילה בתחום האנרגיה המתחדשת עם צמיחה עקבית, חוזים ארוכי טווח, ופורטפוליו מגוון של לקוחות ממשלתיים ופרטיים.',
      recurring_revenue_percent: 68,
      net_debt: 12_500_000,
      customer_concentration_over_20: true,
      customer_concentration_pct: 34,
      full_name: 'ישראל ישראלי-כהן',
      company_name: longName,
      sector_label: 'אנרגיה מתחדשת',
      user_identifiers: {
        mobile_phone: '+972501234567',
        national_id: '123456782',
        corporate_tax_id: '514567890',
        email: 'israel.cohen@example.co.il',
        validated: true,
      },
    },
    multiples_analysis: (sample as ForecastMatrixWithDiagnostics).multiples_analysis ?? {
      comparisonGroup: 'אנרגיה מתחדשת · צמיחה',
      valuationRange: { low: 85_000_000, base: 102_000_000, high: 128_000_000 },
      selectedMultiple: {
        multiple: 'ev_ebitda',
        label: 'EV/EBITDA',
        rationale: 'Sector median',
      },
      cards: [],
    },
  } as ForecastMatrixWithDiagnostics;
}

/** 39x implied vs ~8x median — sanity guard must trigger */
function buildNegativeEbitdaMatrix(): ForecastMatrixWithDiagnostics {
  const base = buildMaximalMatrix();
  return {
    ...base,
    meta: { ...base.meta, company_name: 'חברת בדיקת EBITDA שלילי בע״מ' },
    assumptions: {
      ...base.assumptions,
      adjusted_ebit: -2_000_000,
      base_revenue: 8_000_000,
    },
    diagnostics_inputs: {
      ...base.diagnostics_inputs,
      ebitda: -500_000,
      ebit: -2_000_000,
    } as DiagnosticsInputsSnapshot,
  };
}

async function ensureChromeAvailable(): Promise<boolean> {
  const local = probeLocalChromeExecutable();
  if (local) {
    console.log(`[pdf-smoke] Chrome: ${local.path} (${local.source})`);
    return true;
  }

  try {
    const resolved = await resolveChromeExecutableAsync();
    console.log(`[pdf-smoke] Chrome: ${resolved.path} (${resolved.source})`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      [
        '[pdf-smoke] SKIP — no Chromium executable available.',
        'Set PUPPETEER_EXECUTABLE_PATH to your local Chrome, or install Google Chrome.',
        `Production uses @sparticuz/chromium@${PUPPETEER_CHROME_MAJOR} with puppeteer-core@25.x.`,
        `Detail: ${message}`,
      ].join('\n'),
    );
    return false;
  }
}

function countPdfPages(buffer: Buffer): number {
  const raw = buffer.toString('latin1');
  const matches = raw.match(/\/Type[\s]*\/Page(?!s)/g);
  return matches?.length ?? 0;
}

function assertPrintStructure(
  label: string,
  matrix: ForecastMatrixWithDiagnostics,
  buffer: Buffer,
) {
  const data = mapMatrixToReportData(matrix, 'he');
  const html = buildPrintReportHtml(data, { matrix, locale: 'he' });
  const chapterMatches = html.match(/class="sheet/g);
  const chapterCount = chapterMatches?.length ?? 0;

  if (chapterCount !== REPORT_CHAPTER_COUNT) {
    throw new Error(
      `[${label}] expected ${REPORT_CHAPTER_COUNT} sheets, got ${chapterCount}`,
    );
  }
  if (!html.includes('viewBox="0 0 760 280"')) {
    throw new Error(`[${label}] dynamic trajectory SVG missing`);
  }
  if (!html.includes('מ-EV לשווי לבעלים') || !html.includes('DCF · 50%')) {
    throw new Error(`[${label}] waterfall or blend bar missing`);
  }
  const pageCount = countPdfPages(buffer);
  if (pageCount !== REPORT_CHAPTER_COUNT) {
    throw new Error(
      `[${label}] expected ${REPORT_CHAPTER_COUNT} PDF pages, got ${pageCount}`,
    );
  }
  console.log(
    `[${label}] structure OK — ${chapterCount} chapters, ${pageCount} PDF pages`,
  );
}

async function runCase(label: string, matrix: ForecastMatrixWithDiagnostics) {
  const metrics = buildVerdictMetrics(matrix, { enterpriseValue: 118_500_000 });
  if (metrics?.primaryPill?.useSanityNote) {
    console.log(`[${label}] sanity guard active:`, metrics.primaryPill.sanityNoteHe);
  }

  const buffer = await buildValuationReportPdf(matrix, 'he', {
    clientIdentity: {
      fullName: 'ישראל ישראלי-כהן',
      companyName: matrix.meta.company_name,
      nationalId: '123456782',
      corporateTaxId: '514567890',
      userPhone: '+972501234567',
      userEmail: 'israel.cohen@example.co.il',
    },
  });

  const safeLabel = label.replace(/\s+/g, '_');
  const outPath = path.join(process.cwd(), 'tmp', `Equify_${safeLabel}.pdf`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
  assertPrintStructure(label, matrix, buffer);
  console.log(`[${label}] PDF written: ${outPath} (${buffer.length} bytes)`);
}

async function main() {
  const chromeReady = await ensureChromeAvailable();
  if (!chromeReady) {
    process.exit(0);
  }

  await runCase('Maximal_Test', buildMaximalMatrix());
  await runCase('Negative_EBITDA_Sanity', buildNegativeEbitdaMatrix());
}

main().catch((error) => {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === 'ENOEXEC' || code === 'ENOENT') {
    console.warn(
      [
        '[pdf-smoke] SKIP — Chromium binary could not be executed on this host.',
        'Set PUPPETEER_EXECUTABLE_PATH to a local Chrome install and retry.',
      ].join('\n'),
    );
    process.exit(0);
  }

  console.error('PDF test failed:', error);
  process.exit(1);
});
