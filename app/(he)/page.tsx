import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { LandingPage } from '../../components/landing/LandingPage';
import { HOME_DESCRIPTION, HOME_TITLE } from '../../lib/brand/brand-identity';
import { publicPageMetadata } from '../../lib/seo/page_metadata';
import { HomeStructuredData } from '../../components/seo/HomeStructuredData';
import { HomeV2 } from '../../components/site-v2/HomeV2';
import { readSiteFlags } from '../../lib/flags/site_flags';
import { homeLanguages } from '../../lib/i18n/site/seo';

const homeMetadata = publicPageMetadata({ path: '/', title: HOME_TITLE, description: HOME_DESCRIPTION, fullTitle: true });
// Round 13: hreflang to the other languages, only when EN_SITE is on (with it off the metadata is what it was).
export const metadata: Metadata = readSiteFlags().enSite ? { ...homeMetadata, alternates: { ...homeMetadata.alternates, languages: homeLanguages() } } : homeMetadata;

const landingMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-landing-mono',
  display: 'swap',
});

export default function Home() {
  return (
    <div className={landingMono.variable}>
      <HomeStructuredData />
      {/* Round 11: SITE_V2 shows the same content in the SBC site's design (components/site-v2/HomeV2.tsx). */}
      {readSiteFlags().siteV2 ? <HomeV2 /> : <LandingPage />}
    </div>
  );
}
