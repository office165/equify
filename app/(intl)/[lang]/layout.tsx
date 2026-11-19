import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { assistantIntl as assistant, ibmPlexMonoIntl as ibmPlexMono } from '../../intl-fonts';
import '../../globals.css';
import { BRAND_NAME } from '../../../lib/brand/brand-identity';
import { rootMetadata } from '../../site-metadata';
import { AppProviders } from '../../../components/shared/AppProviders';
import { SiteFlagsProvider } from '../../../components/shared/SiteFlagsContext';
import { ConsentRoot } from '../../../components/consent/ConsentRoot';
import { SiteAnalytics } from '../../../components/analytics/SiteAnalytics';
import { readSiteFlags } from '../../../lib/flags/site_flags';
import { THEME_BOOT } from '../../../components/site-v2/theme_boot';
import { langDef } from '../../../lib/i18n/site';
import { langAllowed, langStaticParams } from '../../../lib/i18n/site/routes';

/**
 * Round 13 (EN_SITE): every language but Hebrew, with its own <html lang dir>, as on the SBC site (app/(intl)/intl/[lang]). The
 * addresses are /<code>/... (/en now). A new language in lib/i18n/site needs no new route. With EN_SITE off there is no page here:
 * no params are built and dynamicParams is false, so /en is a 404 as it is today.
 * The prefixed languages always use the new design (SITE_V2's tokens and switch), whatever SITE_V2 says for Hebrew.
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ lang: string }> {
  return langStaticParams(readSiteFlags());
}


export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const def = langDef(params.lang);
  return {
    ...rootMetadata,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: 'black-translucent' },
    formatDetection: { telephone: false },
    openGraph: { ...(rootMetadata.openGraph ?? {}), locale: def.ogLocale },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#050F0D' },
    { media: '(prefers-color-scheme: light)', color: '#F6FAF9' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  const flags = readSiteFlags();
  if (!langAllowed(params.lang, flags)) notFound();
  const def = langDef(params.lang);
  return (
    <html lang={def.code} dir={def.dir} className="eq-v2" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="stylesheet" href="/site-v2/v2.css" />
        <link rel="stylesheet" href="/site-v2/wizard-light.css" />
        <link rel="stylesheet" href="/site-v2/results-light.css" />
        <link rel="stylesheet" href="/site-v2/ltr.css" />
        {flags.consentBanner ? <link rel="stylesheet" href="/site-v2/consent.css" /> : null}
      </head>
      <body className={`${assistant.variable} ${ibmPlexMono.variable} ${assistant.className} min-h-[100dvh] bg-[#020504] pb-safe text-slate-50 antialiased`}>
        <SiteFlagsProvider value={{ ...flags, siteV2: true }}>
          <AppProviders locale={def.appLocale}>{children}</AppProviders>
        </SiteFlagsProvider>
        {flags.consentBanner ? <ConsentRoot lang={def.code} /> : <SiteAnalytics />}
      </body>
    </html>
  );
}
