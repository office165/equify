'use client';

import { createContext, useContext } from 'react';
import { SITE_FLAGS_OFF, type SiteFlags } from '../../lib/flags/site_flags';

/**
 * Round 10: the site flags on the client (lib/flags/site_flags.ts). The root layout renders the provider only when at least one flag
 * is on, so with every flag off the page and its HTML are exactly what they were, and every hook below answers "off".
 */
const SiteFlagsContext = createContext<SiteFlags>(SITE_FLAGS_OFF);

export function SiteFlagsProvider({ value, children }: { value: SiteFlags; children: React.ReactNode }) {
  return <SiteFlagsContext.Provider value={value}>{children}</SiteFlagsContext.Provider>;
}

export function useSiteFlags(): SiteFlags {
  return useContext(SiteFlagsContext);
}
