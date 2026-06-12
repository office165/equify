import type { Metadata } from 'next';
import { Assistant, Frank_Ruhl_Libre, IBM_Plex_Mono } from 'next/font/google';
import { LandingPage } from '../components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'equify BY SBC — מנוע הערכת השווי לעסקים בישראל',
  description:
    'אינדיקציית שווי מוסמכת בזמן אמת. DCF, WACC ומכפילים ישראליים 2026 — דוח PDF תוך 10 דקות.',
};

const landingDisplay = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '700', '900'],
  variable: '--font-landing-display',
  display: 'swap',
});

const landingBody = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-landing-body',
  display: 'swap',
});

const landingMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-landing-mono',
  display: 'swap',
});

export default function Home() {
  return (
    <div
      className={`${landingDisplay.variable} ${landingBody.variable} ${landingMono.variable}`}
    >
      <LandingPage />
    </div>
  );
}
