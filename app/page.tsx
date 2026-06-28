import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { LandingPage } from '../components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'equify BY SBC — שווי העסק שלך. בנתונים.',
  description:
    'דוח הערכת שווי על שלושה יסודות: DCF, מכפילי שוק מכוילים ל-12 עסקאות M&A בישראל, וציון איכות. שווי משוקלל מעשי.',
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
