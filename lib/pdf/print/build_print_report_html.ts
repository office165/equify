import type { ForecastMatrixWithDiagnostics } from '../../../valuation_forecast';
import type { ValuationLocale } from '../../../api_client';
import type { ValuationReportData } from '../types';
import {
  buildValuationPdfTemplateHtml,
  VALUATION_PDF_SHEET_COUNT,
} from './valuation_pdf_template';

export interface BuildPrintReportHtmlOptions {
  matrix: ForecastMatrixWithDiagnostics;
  locale?: ValuationLocale;
}

/** Server-side printable valuation report — 7 rigid A4 sheets. */
export function buildPrintReportHtml(
  data: ValuationReportData,
  options: BuildPrintReportHtmlOptions,
): string {
  return buildValuationPdfTemplateHtml(data, options);
}

export function buildPuppeteerHeaderTemplate(_companyName: string): string {
  return '<div></div>';
}

export function buildPuppeteerFooterTemplate(_reportId: string): string {
  return '<div></div>';
}

export const REPORT_CHAPTER_COUNT = VALUATION_PDF_SHEET_COUNT;
