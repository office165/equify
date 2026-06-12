import type { Metadata } from 'next';
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_OG_ALT,
  BRAND_TITLE,
} from '../lib/brand/brand-identity';

function resolveSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return new URL(explicit.endsWith('/') ? explicit : `${explicit}/`);
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return new URL(`https://${vercel.replace(/^https?:\/\//, '')}/`);
  }
  return new URL('http://localhost:3000/');
}

export const siteUrl = resolveSiteUrl();

const title = BRAND_TITLE;
const description = BRAND_DESCRIPTION;

export const rootMetadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: title,
    template: `%s · ${BRAND_NAME}`,
  },
  description,
  applicationName: BRAND_NAME,
  authors: [{ name: 'SBC' }],
  creator: BRAND_NAME,
  publisher: 'SBC',
  category: 'finance',
  keywords: [
    'corporate valuation',
    'DCF',
    'enterprise value',
    'M&A valuation',
    'הערכת שווי',
    'equify',
    'SBC',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: '/',
    languages: {
      'en-IL': '/',
      'he-IL': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    alternateLocale: ['en_US', 'en_IL'],
    url: '/',
    siteName: BRAND_NAME,
    title,
    description,
    images: [
      {
        url: '/og-equify.png',
        width: 1200,
        height: 630,
        alt: BRAND_OG_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-equify.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/equify-mark.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'og:locale:alternate': 'en_US',
    'linkedin:owner': BRAND_NAME,
  },
};
