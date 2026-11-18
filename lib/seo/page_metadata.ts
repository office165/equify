import type { Metadata } from 'next';
import { BRAND_NAME } from '../brand/brand-identity';

/**
 * Round 6: metadata of a public page (title, description, canonical, Open Graph, Twitter card).
 * `title` is the page name; the root layout adds " | equify BY SBC" (title.template), except on the
 * home page, which sets its full title. The Open Graph and Twitter images come from
 * app/opengraph-image.png and app/twitter-image.png.
 */
export function publicPageMetadata(p: { path: string; title: string; description: string; fullTitle?: boolean }): Metadata {
  const shownTitle = p.fullTitle ? p.title : `${p.title} | ${BRAND_NAME}`;
  return {
    title: p.fullTitle ? { absolute: p.title } : p.title,
    description: p.description,
    alternates: { canonical: p.path },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      url: p.path,
      siteName: BRAND_NAME,
      title: shownTitle,
      description: p.description,
    },
    twitter: {
      card: 'summary',
      title: shownTitle,
      description: p.description,
    },
  };
}

/** Pages that are not public (wizard, results, report): no index, no follow. */
export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const PAGE_COPY = {
  privacy: {
    title: 'מדיניות פרטיות',
    description: 'מדיניות הפרטיות של equify BY SBC: אילו נתונים נאספים, איך הם נשמרים, עם מי הם משותפים, ומה הזכויות שלך.',
  },
  terms: {
    title: 'תנאי שימוש',
    description: 'תנאי השימוש באתר equify BY SBC: הדוח הוא אינדיקציית שווי אלגוריתמית, הגבלת אחריות, וזכויות המשתמש.',
  },
  accessibility: {
    title: 'הצהרת נגישות',
    description: 'הצהרת הנגישות של equify BY SBC: התאמה ל WCAG 2.1 ברמה AA ולתקן הישראלי 5568, ופרטי רכז הנגישות.',
  },
} as const;
