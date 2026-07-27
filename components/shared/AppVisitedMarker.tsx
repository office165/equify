'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** sessionStorage key — set on any in-app page except legal routes. */
export const APP_VISITED_STORAGE_KEY = 'equify_app_visited';

const LEGAL_PATHS = new Set(['/terms', '/privacy', '/accessibility']);

/** Marks that the user visited an in-app page in this tab (client nav safe). */
export function AppVisitedMarker() {
  const pathname = usePathname();

  useEffect(() => {
    if (LEGAL_PATHS.has(pathname)) return;
    sessionStorage.setItem(APP_VISITED_STORAGE_KEY, '1');
  }, [pathname]);

  return null;
}
