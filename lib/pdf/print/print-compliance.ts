/**
 * Print compliance module — CSS loader + class registry for Puppeteer and React trees.
 * @see docs/pdf-print-architecture.md
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Class applied to document root during Puppeteer / html2canvas capture. */
export const PDF_CAPTURE_ROOT_CLASS = 'valubot-pdf-capturing';

/** Canonical selectors that must not split across pages. */
export const PRINT_SAFE_CARD_SELECTORS = [
  'print-card-safe',
  'pdf-card-contain',
  'metric-card',
  'diagnostic-block',
  'bento-item',
  'chart-wrapper',
  'chart-wrapper-block',
] as const;

export type PrintSafeCardClass = (typeof PRINT_SAFE_CARD_SELECTORS)[number];

/** Merge into a className string for metric / bento wrappers. */
export function printSafeClasses(...extra: string[]): string {
  return ['print-block-flow', 'print-card-safe', ...extra].filter(Boolean).join(' ');
}

/** Section wrapper: header + grid stay on same fragmentation unit when possible. */
export function printSectionClasses(...extra: string[]): string {
  return ['print-section-group', 'pdf-section-group', ...extra].filter(Boolean).join(' ');
}

let cachedCss: string | null = null;

/** Raw compliance CSS for inline Puppeteer `<style>` injection. */
export function getPrintComplianceCss(): string {
  if (cachedCss) return cachedCss;
  const path = join(__dirname, 'print-compliance.css');
  cachedCss = readFileSync(path, 'utf8');
  return cachedCss;
}

/** Append compliance rules to an existing print stylesheet builder. */
export function appendPrintComplianceCss(existingCss: string): string {
  return `${existingCss}\n\n/* ── print-compliance module ── */\n${getPrintComplianceCss()}`;
}
