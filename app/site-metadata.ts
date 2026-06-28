import type { Metadata } from 'next';
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
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
        url: '/equify-icon.png',
        width: 1024,
        height: 1024,
        alt: `${BRAND_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/equify-icon.png'],
  },
  other: {
    'og:locale:alternate': 'en_US',
    'linkedin:owner': BRAND_NAME,
  },
};
