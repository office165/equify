import type { ValuationData } from './types';
import {
  synthesizeFinancialCoreFromValuationData,
  type ReportFinancialCore,
} from './report-financial-core';

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

function relativeTolerance(base: number, ratio = 0.005, floor = 1_000): number {
  return Math.max(floor, Math.abs(base) * ratio);
}

function weightedEnterpriseValue(core: ReportFinancialCore): number {
  return (
    core.dcfEvAbs * core.blendWeights.dcf +
    core.ebitdaMultipleEvAbs * core.blendWeights.ebitda +
    core.revenueMultipleEvAbs * core.blendWeights.rev
  );
}

export function collectValuationDataViolations(data: ValuationData): string[] {
  const violations: string[] = [];
  const core = data.financialCore ?? synthesizeFinancialCoreFromValuationData(data);

  const evTol = relativeTolerance(core.blendedEnterpriseValueAbs);
  const weightedEv = weightedEnterpriseValue(core);
  if (Math.abs(weightedEv - core.blendedEnterpriseValueAbs) > evTol) {
    violations.push(
      `Blended EV ${core.blendedEnterpriseValueAbs.toFixed(0)} ≠ weighted model sum ${weightedEv.toFixed(0)}`,
    );
  }

  if (Math.abs(data.enterpriseValue - core.blendedEnterpriseValueAbs) > evTol) {
    violations.push(
      `data.enterpriseValue ${data.enterpriseValue.toFixed(0)} ≠ financialCore.blendedEnterpriseValueAbs ${core.blendedEnterpriseValueAbs.toFixed(0)}`,
    );
  }

  const contributionSum = data.modelBlend.reduce((sum, row) => sum + row.contribution, 0);
  if (Math.abs(contributionSum - data.enterpriseValue) > evTol) {
    violations.push(
      `Model blend contributions ${contributionSum.toFixed(0)} ≠ enterpriseValue ${data.enterpriseValue.toFixed(0)}`,
    );
  }

  for (const row of data.modelBlend) {
    const expectedContribution = row.ev * (row.weightPct / 100);
    const rowTol = relativeTolerance(row.contribution, 0.02, 500);
    if (Math.abs(row.contribution - expectedContribution) > rowTol) {
      violations.push(
        `Model row "${row.name}" contribution ${row.contribution.toFixed(0)} ≠ EV×weight ${expectedContribution.toFixed(0)}`,
      );
    }
  }

  const multTol = relativeTolerance(core.ebitdaMultipleEvAbs, 0.01);
  const impliedMultipleEv = core.multipleLegEbitdaBaseAbs * core.effectiveMultiple;
  if (Math.abs(impliedMultipleEv - core.ebitdaMultipleEvAbs) > multTol) {
    violations.push(
      `Multiples leg EV ${core.ebitdaMultipleEvAbs.toFixed(0)} ≠ base EBITDA × multiple (${core.multipleLegEbitdaBaseAbs.toFixed(0)} × ${core.effectiveMultiple.toFixed(2)} = ${impliedMultipleEv.toFixed(0)})`,
    );
  }

  if (data.sensitivityEbitdaMult?.baseEbitdaAbs != null) {
    const sensTol = relativeTolerance(core.multipleLegEbitdaBaseAbs, 0.001, 100);
    if (
      Math.abs(data.sensitivityEbitdaMult.baseEbitdaAbs - core.multipleLegEbitdaBaseAbs) >
      sensTol
    ) {
      violations.push(
        `Sensitivity matrix base EBITDA ${data.sensitivityEbitdaMult.baseEbitdaAbs.toFixed(0)} ≠ multipleLegEbitdaBaseAbs ${core.multipleLegEbitdaBaseAbs.toFixed(0)}`,
      );
    }
  }

  const trajectory2026 = [...data.trajectory]
    .reverse()
    .find((point) => point.label === '2026' && !point.forecast);
  if (trajectory2026) {
    const auditedM = core.auditedEbitda2026Abs / 1_000_000;
    const trajTol = relativeTolerance(auditedM, 0.001, 0.01);
    if (Math.abs(trajectory2026.ebitdaM - auditedM) > trajTol) {
      violations.push(
        `Trajectory 2026 EBITDA ${trajectory2026.ebitdaM.toFixed(2)}M ≠ auditedEbitda2026 ${auditedM.toFixed(2)}M`,
      );
    }
  }

  if (Math.abs(data.ebitda - core.auditedEbitda2026Abs) > relativeTolerance(core.auditedEbitda2026Abs)) {
    violations.push(
      `data.ebitda ${data.ebitda.toFixed(0)} ≠ auditedEbitda2026Abs ${core.auditedEbitda2026Abs.toFixed(0)}`,
    );
  }

  return violations;
}

/** Throws before PDF/HTML render when report sections disagree on valuation anchors. */
export function assertValuationDataCoherence(data: ValuationData): void {
  const violations = collectValuationDataViolations(data);
  if (violations.length > 0) {
    throw new ValuationReportCoherenceError(violations);
  }
}
