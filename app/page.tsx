import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { LandingPage } from '../components/landing/LandingPage';
import { HOME_DESCRIPTION, HOME_TITLE } from '../lib/brand/brand-identity';
import { publicPageMetadata } from '../lib/seo/page_metadata';
import { HomeStructuredData } from '../components/seo/HomeStructuredData';

export const metadata: Metadata = publicPageMetadata({ path: '/', title: HOME_TITLE, description: HOME_DESCRIPTION, fullTitle: true });

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
      <LandingPage />
    </div>
  );
}
