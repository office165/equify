/**
 * Round 10 to 13: the site flags. Each is read on the server from its environment variable (exactly "on", case and spaces ignored)
 * and handed to the client through SiteFlagsProvider (components/shared/SiteFlagsContext.tsx). A page that is built statically reads
 * the variable at build time, so turning a flag on or off needs a redeploy.
 *
 *   COPY_V2         round 10: the corrected claims on the home page and in the wizard, and the text without the forbidden marks.
 *   CONSENT_BANNER  round 10: the cookie banner, analytics only after consent, and the transparency line in step 1 of the wizard.
 *   SITE_V2         round 11: the new design (the SBC site's structure in equify's colors), day and night.
 *   CONTENT_HUB     round 12: /guides and /articles.
 *   EN_SITE         round 13: the English site under /en.
 */
export type SiteFlags = {
  copyV2: boolean;
  consentBanner: boolean;
  siteV2: boolean;
  contentHub: boolean;
  enSite: boolean;
};

export const SITE_FLAG_ENV: Record<keyof SiteFlags, string> = {
  copyV2: 'COPY_V2',
  consentBanner: 'CONSENT_BANNER',
  siteV2: 'SITE_V2',
  contentHub: 'CONTENT_HUB',
  enSite: 'EN_SITE',
};

export const SITE_FLAGS_OFF: SiteFlags = { copyV2: false, consentBanner: false, siteV2: false, contentHub: false, enSite: false };

const isOn = (v: string | undefined): boolean => v?.trim().toLowerCase() === 'on';

export function readSiteFlags(env: NodeJS.ProcessEnv = process.env): SiteFlags {
  return {
    copyV2: isOn(env.COPY_V2),
    consentBanner: isOn(env.CONSENT_BANNER),
    siteV2: isOn(env.SITE_V2),
    contentHub: isOn(env.CONTENT_HUB),
    enSite: isOn(env.EN_SITE),
  };
}

export const anySiteFlagOn = (f: SiteFlags): boolean => Object.values(f).some(Boolean);
