/**
 * Round 8: every feature flag in one list (for /api/pulse and the docs). A flag is on only when its
 * environment variable is exactly "on" (case and spaces ignored). Values are never exposed, only on/off.
 */
export const FEATURE_FLAGS = [
  'METHOD_V2',
  'CREDIT_CHAPTER',
  'NEXT_PUBLIC_CREDIT_CHAPTER',
  'PAYWALL_V2',
  'PAYPAL_USD',
  'LEAD_VALUE_FROM_REPORT',
  'NEXT_PUBLIC_ANALYTICS',
  'EXCEL_APPENDIX',
  'OPUS_NARRATIVE',
  'UPAY',
  'NEXT_PUBLIC_UPAY',
  'GREEN_INVOICE',
  'COPY_V2',
  'CONSENT_BANNER',
  'SITE_V2',
  'CONTENT_HUB',
  'EN_SITE',
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export function flagState(name: string, env: NodeJS.ProcessEnv = process.env): 'on' | 'off' {
  return env[name]?.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

export function allFlagStates(env: NodeJS.ProcessEnv = process.env): Record<string, 'on' | 'off'> {
  return Object.fromEntries(FEATURE_FLAGS.map((f) => [f, flagState(f, env)]));
}
