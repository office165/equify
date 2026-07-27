/** sessionStorage: landing preloader completed at least once this tab session. */
export const PRELOADER_SHOWN_KEY = 'equify_preloader_shown';

/** sessionStorage: wizard entrance animation completed at least once this tab session. */
export const WIZARD_ENTERED_KEY = 'equify_wizard_entered';

export function readSessionFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(key) === '1';
}

export function writeSessionFlag(key: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key, '1');
}

function scrollStorageKey(path: string): string {
  return `equify_scroll${path}`;
}

export function readSavedScroll(path: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(scrollStorageKey(path));
  if (!raw) return null;
  const y = Number(raw);
  return Number.isFinite(y) ? y : null;
}

export function saveScroll(path: string, y: number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(scrollStorageKey(path), String(Math.round(y)));
}
