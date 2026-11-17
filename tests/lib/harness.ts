/**
 * Minimal test harness for npx tsx (the repo has no test runner).
 * A check can be marked KNOWN_WRONG (see tests/known-wrong.ts): it is then reported
 * separately and does not fail the run. If a KNOWN_WRONG check starts passing, the run
 * fails until the marker is removed, so a fix must also clear its marker.
 */
import { isKnownWrong, type KnownWrongEntry } from '../known-wrong';

export interface KnownWrongHit {
  check: string;
  caseId: string;
  finding: number;
  detail: string;
}

export interface SuiteResult {
  name: string;
  passed: number;
  failures: string[];
  knownWrong: KnownWrongHit[];
  /** KNOWN_WRONG markers whose check now passes (must be removed). */
  staleMarkers: string[];
  notes: string[];
}

export class Suite {
  readonly result: SuiteResult;
  constructor(name: string) {
    this.result = { name, passed: 0, failures: [], knownWrong: [], staleMarkers: [], notes: [] };
  }

  /** Records one check. `check` is a stable id, `caseId` the case it ran on. */
  check(check: string, caseId: string, ok: boolean, detail = ''): boolean {
    const marker: KnownWrongEntry | null = isKnownWrong(this.result.name, check, caseId);
    if (marker) {
      if (ok) {
        this.result.staleMarkers.push(
          `${this.result.name}/${check} [${caseId}] passes now: remove KNOWN_WRONG marker (finding ${marker.finding})`,
        );
      } else {
        this.result.knownWrong.push({ check, caseId, finding: marker.finding, detail });
      }
      return ok;
    }
    if (ok) this.result.passed += 1;
    else this.result.failures.push(`${check} [${caseId}] ${detail}`);
    return ok;
  }

  note(line: string): void {
    this.result.notes.push(line);
  }
}

export function relDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / denom;
}

export function approx(a: number, b: number, tolRel = 0.001, tolAbs = 0.5): boolean {
  return Math.abs(a - b) <= Math.max(tolAbs, Math.abs(b) * tolRel);
}
