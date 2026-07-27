import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { LandingPage } from '../components/landing/LandingPage';
import { HOME_DESCRIPTION, HOME_TITLE } from '../lib/brand/brand-identity';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

const landingMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-landing-mono',
  display: 'swap',
});

export default function Home() {
  return (
    <div className={landingMono.variable}>
      <LandingPage />
    </div>
  );
}
