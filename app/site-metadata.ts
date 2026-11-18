import type { Metadata } from 'next';
import {
  BRAND_NAME,
  HOME_DESCRIPTION,
  HOME_TITLE,
} from '../lib/brand/brand-identity';

import { SITE_ORIGIN } from '../lib/seo/site';

// Round 6: canonical base is always the equify.co.il domain (lib/seo/site.ts).
export const siteUrl = new URL(`${SITE_ORIGIN}/`);

/** Search Console verification, shown only when NEXT_PUBLIC_GSC_VERIFICATION is set. */
const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim();

const title = HOME_TITLE;
const description = HOME_DESCRIPTION;

export const rootMetadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: title,
    template: `%s | ${BRAND_NAME}`,
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
  },
  ...(gscVerification ? { verification: { google: gscVerification } } : {}),
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
    'linkedin:owner': BRAND_NAME,
  },
};
