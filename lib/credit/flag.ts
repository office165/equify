/**
 * CREDIT_CHAPTER (round 4): credit capacity questions in the wizard, the credit chapter in the
 * report and non-operating assets in the value bridge. Off unless set to "on".
 *
 * Server code reads CREDIT_CHAPTER. The wizard runs in the browser, where Next.js inlines only
 * NEXT_PUBLIC_ variables written literally, so the browser reads NEXT_PUBLIC_CREDIT_CHAPTER.
 * Turning the chapter on means setting both.
 */
function on(v: string | undefined): boolean {
  return v?.trim().toLowerCase() === 'on';
}

export function isCreditChapterOn(env: NodeJS.ProcessEnv = process.env): boolean {
  return on(env.CREDIT_CHAPTER);
}

/** Browser side (wizard questions). */
export function isCreditChapterOnClient(): boolean {
  return on(process.env.NEXT_PUBLIC_CREDIT_CHAPTER) || on(process.env.CREDIT_CHAPTER);
}
