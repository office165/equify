import { Assistant, IBM_Plex_Mono } from 'next/font/google';

/** Round 13: the fonts of the prefixed languages' root layout (app/(intl)/[lang]/layout.tsx). next/font cannot load from a path with [lang]. */
export const assistantIntl = Assistant({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '600', '700'], variable: '--font-equify', display: 'swap' });
export const ibmPlexMonoIntl = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });
