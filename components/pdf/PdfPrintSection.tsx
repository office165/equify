'use client';

import React from 'react';
import {
  printSafeClasses,
  printSectionClasses,
} from '../../lib/pdf/print/print-compliance';

export interface PdfPrintSectionProps {
  /** Section title — receives orphan-header protection in print CSS */
  title: string;
  subtitle?: string;
  titleId?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Canonical print-safe section: header + body share a fragmentation group.
 * Use for multiples grids, DCF appendix blocks, diagnostic matrices.
 */
export function PdfPrintSection({
  title,
  subtitle,
  titleId,
  children,
  className = '',
}: PdfPrintSectionProps) {
  const headingId = titleId ?? `pdf-section-${title.replace(/\s+/g, '-').slice(0, 32)}`;

  return (
    <section
      className={`${printSectionClasses('my-6')} ${className}`.trim()}
      aria-labelledby={headingId}
    >
      <header className="print-section-header mb-4">
        <h2 id={headingId} className="section-header-title text-lg font-semibold">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </header>
      <div className="print-block-flow space-y-4">{children}</div>
    </section>
  );
}

export interface PdfPrintMetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}

/** Single financial metric row — never split mid-card in print. */
export function PdfPrintMetricCard({
  label,
  value,
  hint,
  className = '',
}: PdfPrintMetricCardProps) {
  return (
    <article
      className={`${printSafeClasses('metric-card', 'bento-item', 'rounded-xl border border-slate-200 p-4')} ${className}`.trim()}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="font-mono text-base font-semibold tabular-nums">{value}</span>
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}

export interface PdfPrintTableProps {
  caption?: string;
  headers: string[];
  rows: (string | number)[][];
  className?: string;
}

/**
 * Block-level table wrapper — rows use `break-inside: avoid` on `tr` only;
 * table keeps `display: table` per print-compliance.css.
 */
export function PdfPrintTable({
  caption,
  headers,
  rows,
  className = '',
}: PdfPrintTableProps) {
  return (
    <div className={`print-block-flow chart-wrapper ${className}`.trim()}>
      <table className="print-table-safe pdf-capture-table w-full text-sm">
        {caption ? <caption className="mb-2 text-start text-slate-600">{caption}</caption> : null}
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="border-b border-slate-200 px-2 py-2 text-start font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="border-b border-slate-100 px-2 py-2 font-mono tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface PdfPrintReportRootProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

/** Top-level A4 capture root — attach before Puppeteer PDF generation. */
export function PdfPrintReportRoot({
  children,
  id = 'valubot-report-capture',
  className = '',
}: PdfPrintReportRootProps) {
  return (
    <div
      id={id}
      className={`print-a4-root pdf-root-container pdf-print-report pdf-report-subtree ${className}`.trim()}
    >
      <div className="print-a4-sheet print-block-flow">{children}</div>
    </div>
  );
}
