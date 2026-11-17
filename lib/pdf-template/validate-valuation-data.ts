import type { ValuationData } from './types';
import {
  synthesizeFinancialCoreFromValuationData,
  type ReportFinancialCore,
} from './report-financial-core';
import { sendOfficeAlert } from '../alerts/office_alert';

/** Gaps above this share of the anchor value block the report. */
export const COHERENCE_BLOCK_RATIO = 0.005;
/** Gaps above this share (and at most the block ratio) build the report, log and alert office. */
export const COHERENCE_WARN_RATIO = 0.0005;
/** Absolute floors (currency units) so rounding noise never warns or blocks. */
const BLOCK_FLOOR_ABS = 1_000;
const WARN_FLOOR_ABS = 100;

export class ValuationReportCoherenceError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super(
      `Valuation report coherence check failed (${violations.length} violation(s)): ${violations.join(' · ')}`,
    );
    this.name = 'ValuationReportCoherenceError';
    this.violations = violations;
  }
}

/** Customer-facing message when a report is blocked (no technical detail, no promise on value). */
export const REPORT_BLOCKED_CUSTOMER_MESSAGE_HE =
  'הדוח שלך דורש בדיקה ידנית של הצוות שלנו לפני שהוא נשלח. קיבלנו את הפרטים, ונחזור אליך במייל תוך יום עסקים.';
export const REPORT_BLOCKED_CUSTOMER_MESSAGE_EN =
  'Your report needs a manual review by our team before it is sent. We have your details and will email you within one business day.';

export interface ValuationDataIssues {
  /** Gaps above the block threshold: the report must not be issued. */
  violations: string[];
  /** Small gaps (below the block threshold): report is issued, office is alerted. */
  warnings: string[];
}

function relativeTolerance(base: number, ratio = COHERENCE_BLOCK_RATIO, floor = BLOCK_FLOOR_ABS): number {
  return Math.max(floor, Math.abs(base) * ratio);
}

function weightedEnterpriseValue(core: ReportFinancialCore): number {
  return (
    core.dcfEvAbs * core.blendWeights.dcf +
    core.ebitdaMultipleEvAbs * core.blendWeights.ebitda +
    core.revenueMultipleEvAbs * core.blendWeights.rev +
    (core.backlogEvAdjustmentAbs ?? 0)
  );
}

/** Classifies a gap between two values that should match. */
function classify(
  issues: ValuationDataIssues,
  message: string,
  a: number,
  b: number,
  base: number,
  blockRatio = COHERENCE_BLOCK_RATIO,
  blockFloor = BLOCK_FLOOR_ABS,
): void {
  const gap = Math.abs(a - b);
  if (gap > relativeTolerance(base, blockRatio, blockFloor)) {
    issues.violations.push(message);
  } else if (gap > Math.max(WARN_FLOOR_ABS, Math.abs(base) * COHERENCE_WARN_RATIO)) {
    issues.warnings.push(`${message} (gap ${((gap / Math.max(1, Math.abs(base))) * 100).toFixed(3)}%)`);
  }
}

/** Exact engine weight for a model-blend row (display weights are rounded to whole %). */
function exactRowWeight(name: string, core: ReportFinancialCore): number | null {
  if (/backlog|צבר/i.test(name)) return 1;
  if (/dcf/i.test(name)) return core.blendWeights.dcf;
  if (/ebitda/i.test(name)) return core.blendWeights.ebitda;
  if (/revenue|הכנסות/i.test(name)) return core.blendWeights.rev;
  return null;
}

export function collectValuationDataIssues(data: ValuationData): ValuationDataIssues {
  const issues: ValuationDataIssues = { violations: [], warnings: [] };
  const core = data.financialCore ?? synthesizeFinancialCoreFromValuationData(data);
  const ev = core.blendedEnterpriseValueAbs;

  const weightedEv = weightedEnterpriseValue(core);
  classify(
    issues,
    `Blended EV ${ev.toFixed(0)} ≠ weighted model sum ${weightedEv.toFixed(0)}`,
    weightedEv,
    ev,
    ev,
  );

  classify(
    issues,
    `data.enterpriseValue ${data.enterpriseValue.toFixed(0)} ≠ financialCore.blendedEnterpriseValueAbs ${ev.toFixed(0)}`,
    data.enterpriseValue,
    ev,
    ev,
  );

  const contributionSum = data.modelBlend.reduce((sum, row) => sum + row.contribution, 0);
  classify(
    issues,
    `Model blend contributions ${contributionSum.toFixed(0)} ≠ enterpriseValue ${data.enterpriseValue.toFixed(0)}`,
    contributionSum,
    data.enterpriseValue,
    ev,
  );

  for (const row of data.modelBlend) {
    const exact = data.financialCore ? exactRowWeight(row.name, core) : null;
    const weight = exact ?? row.weightPct / 100;
    const expectedContribution = row.ev * weight;
    classify(
      issues,
      `Model row "${row.name}" contribution ${row.contribution.toFixed(0)} ≠ EV×weight ${expectedContribution.toFixed(0)}`,
      row.contribution,
      expectedContribution,
      row.contribution,
      0.02,
      500,
    );
  }

  // The engine zeroes the EBITDA leg when its base is not positive.
  const impliedMultipleEv =
    core.multipleLegEbitdaBaseAbs > 0 ? core.multipleLegEbitdaBaseAbs * core.effectiveMultiple : 0;
  classify(
    issues,
    `Multiples leg EV ${core.ebitdaMultipleEvAbs.toFixed(0)} ≠ base EBITDA × multiple (${core.multipleLegEbitdaBaseAbs.toFixed(0)} × ${core.effectiveMultiple.toFixed(2)} = ${impliedMultipleEv.toFixed(0)})`,
    impliedMultipleEv,
    core.ebitdaMultipleEvAbs,
    core.ebitdaMultipleEvAbs,
    0.01,
  );

  if (data.sensitivityEbitdaMult?.baseEbitdaAbs != null) {
    classify(
      issues,
      `Sensitivity matrix base EBITDA ${data.sensitivityEbitdaMult.baseEbitdaAbs.toFixed(0)} ≠ multipleLegEbitdaBaseAbs ${core.multipleLegEbitdaBaseAbs.toFixed(0)}`,
      data.sensitivityEbitdaMult.baseEbitdaAbs,
      core.multipleLegEbitdaBaseAbs,
      core.multipleLegEbitdaBaseAbs,
      0.001,
      100,
    );
  }

  const trajectory2026 = [...data.trajectory]
    .reverse()
    .find((point) => point.label === '2026' && !point.forecast);
  if (trajectory2026) {
    const auditedM = core.auditedEbitda2026Abs / 1_000_000;
    const trajTol = Math.max(0.01, Math.abs(auditedM) * 0.001);
    if (Math.abs(trajectory2026.ebitdaM - auditedM) > trajTol) {
      issues.violations.push(
        `Trajectory 2026 EBITDA ${trajectory2026.ebitdaM.toFixed(2)}M ≠ auditedEbitda2026 ${auditedM.toFixed(2)}M`,
      );
    }
  }

  classify(
    issues,
    `data.ebitda ${data.ebitda.toFixed(0)} ≠ auditedEbitda2026Abs ${core.auditedEbitda2026Abs.toFixed(0)}`,
    data.ebitda,
    core.auditedEbitda2026Abs,
    core.auditedEbitda2026Abs,
  );

  return issues;
}

/** Blocking violations only (kept for existing callers and tests). */
export function collectValuationDataViolations(data: ValuationData): string[] {
  return collectValuationDataIssues(data).violations;
}

/**
 * Runs before PDF/HTML render.
 * Gap above 0.5%: throws ValuationReportCoherenceError (callers show a clear customer message).
 * Gap below 0.5%: the report is built, a warning is logged and the office is alerted.
 */
export function assertValuationDataCoherence(data: ValuationData): void {
  const { violations, warnings } = collectValuationDataIssues(data);
  if (violations.length > 0) {
    throw new ValuationReportCoherenceError(violations);
  }
  if (warnings.length > 0) {
    console.warn('[report-coherence] small gaps, report issued', {
      reportId: data.reportId,
      warnings,
    });
    sendOfficeAlert({
      kind: 'report_coherence_warning',
      subject: `פער קטן במספרי הדוח ${data.reportId}`,
      lines: [
        `דוח ${data.reportId} הופק, אבל נמצא פער קטן מ 0.5% בין מספרים שאמורים להיות זהים.`,
        ...warnings,
      ],
    });
  }
}

/** Office alert for a blocked report (no customer details beyond the report id). */
export function alertOfficeReportBlocked(reportId: string, err: ValuationReportCoherenceError, context: string): void {
  sendOfficeAlert({
    kind: 'report_coherence_blocked',
    subject: `דוח נחסם בבדיקת עקביות ${reportId}`,
    lines: [`מקור: ${context}`, `דוח ${reportId} לא הופק. פער של יותר מ 0.5%:`, ...err.violations],
  });
}
