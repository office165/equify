/**
 * CREDIT_CHAPTER (round 4): credit capacity questions in the wizard, the credit chapter in the
 * report and non-operating assets in the value bridge. Off unless set to "on".
 *
 * The wizard runs in the browser, where Next.js inlines only NEXT_PUBLIC_ variables written
 * literally, so the browser reads NEXT_PUBLIC_CREDIT_CHAPTER and the server reads either one.
 * Turning the chapter on in production means setting both (CREDIT_CHAPTER and
 * NEXT_PUBLIC_CREDIT_CHAPTER) to "on".
 */
function on(v: string | undefined): boolean {
  return v?.trim().toLowerCase() === 'on';
}

export function isCreditChapterOn(): boolean {
  return on(process.env.CREDIT_CHAPTER) || on(process.env.NEXT_PUBLIC_CREDIT_CHAPTER);
}

/**
 * Round 14: two answers we wait for from Orly, each a server variable (the chapter is built on the server).
 *   CREDIT_CFADS        tax_and_capex (default, round 4): CFADS = EBITDA - tax - maintenance CAPEX.
 *                       capex_only: CFADS = EBITDA - maintenance CAPEX (no tax).
 *   CREDIT_DISCOUNTING  annual (default, round 4): the repayment capacity discounts the annual CFADS once a year.
 *                       monthly: it discounts a twelfth of it every month, at a twelfth of the rate.
 * Any other value is the default.
 */
export type CfadsDefinition = 'tax_and_capex' | 'capex_only';
export type CreditDiscounting = 'annual' | 'monthly';

export function creditCfadsDefinition(env: NodeJS.ProcessEnv = process.env): CfadsDefinition {
  return env.CREDIT_CFADS?.trim().toLowerCase() === 'capex_only' ? 'capex_only' : 'tax_and_capex';
}

export function creditDiscounting(env: NodeJS.ProcessEnv = process.env): CreditDiscounting {
  return env.CREDIT_DISCOUNTING?.trim().toLowerCase() === 'monthly' ? 'monthly' : 'annual';
}
