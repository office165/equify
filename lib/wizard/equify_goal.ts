import type { EquifyGoalKey } from '../valuation';

export type EquifyGoalId = Exclude<EquifyGoalKey, ''>;

export const EQUIFY_GOAL_IDS: EquifyGoalId[] = [
  'negotiation',
  'fundraise',
  'partner',
  'bank',
  'internal',
  'legal',
];

export function isEquifyGoalId(value: unknown): value is EquifyGoalId {
  return (
    typeof value === 'string' &&
    EQUIFY_GOAL_IDS.includes(value as EquifyGoalId)
  );
}

/** Full wizard goal on the forecast matrix — not the collapsed valuation_purpose. */
declare module 'valuation_forecast' {
  interface WizardContextSnapshot {
    equify_goal?: EquifyGoalId;
  }
}

export function attachEquifyGoalToMatrix<
  T extends { wizard_context?: { equify_goal?: EquifyGoalId } },
>(matrix: T, goal: EquifyGoalKey | undefined): T {
  if (!isEquifyGoalId(goal) || !matrix.wizard_context) return matrix;
  return {
    ...matrix,
    wizard_context: {
      ...matrix.wizard_context,
      equify_goal: goal,
    },
  };
}
