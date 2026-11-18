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
