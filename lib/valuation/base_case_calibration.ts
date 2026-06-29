/**
 * Base-case center of gravity — trailing run-rate anchor.
 * Backlog equity uplift is applied after calibration in the valuation engine.
 */

/** @deprecated Backlog no longer inflates forward run-rate — retained for legacy exports. */
export const BACKLOG_TO_FORWARD_RUN_RATE = 0.643;

/** @deprecated Equity no longer scaled by forward/trailing elasticity. */
export const FORWARD_RUN_RATE_EQUITY_ELASTICITY = 0.68;

export interface CenterOfGravityCalibration {
  trailingRunRateK: number;
  forwardRunRateK: number;
  runRateFactor: number;
  calibrationFactor: number;
  rawEvK: number;
  rawEquityK: number;
  calibratedEvK: number;
  calibratedEquityK: number;
}

export function resolveForwardOperationalRunRateK(params: {
  revenue2026K: number;
  revK: number;
  backlogSignedK?: number;
  backlogInflectionActive: boolean;
  /** Organic 2027F revenue from user growth — display anchor only. */
  organicForwardRevenue2027K?: number;
}): number {
  return params.revenue2026K ?? params.revK ?? 0;
}

export function calibrateCenterOfGravity(params: {
  rawEvK: number;
  rawEquityK: number;
  debtK: number;
  revenue2026K: number;
  revK: number;
  backlogSignedK?: number;
  backlogInflectionActive: boolean;
  organicForwardRevenue2027K?: number;
  backlogCoverageRatio?: number;
}): CenterOfGravityCalibration {
  const trailingRunRateK = params.revenue2026K ?? params.revK ?? 0;
  const forwardRunRateK = resolveForwardOperationalRunRateK({
    revenue2026K: params.revenue2026K,
    revK: params.revK,
    backlogSignedK: params.backlogSignedK,
    backlogInflectionActive: params.backlogInflectionActive,
    organicForwardRevenue2027K: params.organicForwardRevenue2027K,
  });

  return {
    trailingRunRateK,
    forwardRunRateK,
    runRateFactor: 1,
    calibrationFactor: 1,
    rawEvK: params.rawEvK,
    rawEquityK: params.rawEquityK,
    calibratedEvK: params.rawEvK,
    calibratedEquityK: Math.max(0, params.rawEquityK),
  };
}
