import type { Metadata, Viewport } from 'next';
import { Assistant, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { BRAND_NAME } from '../lib/brand/brand-identity';
import { rootMetadata } from './site-metadata';
import { AppProviders } from '../components/shared/AppProviders';

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-equify',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  ...rootMetadata,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#020504' },
    { media: '(prefers-color-scheme: light)', color: '#020504' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className={`${assistant.variable} ${ibmPlexMono.variable} ${assistant.className} min-h-[100dvh] bg-[#020504] pb-safe text-slate-50 antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
