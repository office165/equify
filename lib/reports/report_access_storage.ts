'use client';

/** Browser storage for the signed report access token (PAYWALL_V2). */
export const REPORT_ACCESS_STORAGE_KEY = 'equify_report_access_token';

export function storeReportAccessToken(token: unknown): void {
  if (typeof window === 'undefined' || typeof token !== 'string' || !token) return;
  try {
    window.sessionStorage.setItem(REPORT_ACCESS_STORAGE_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function readStoredReportAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(REPORT_ACCESS_STORAGE_KEY);
  } catch {
    return null;
  }
}
