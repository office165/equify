import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '../../lib/seo/page_metadata';

/** Round 6: not a public page, so search engines do not index it (robots.txt also disallows it). */
export const metadata: Metadata = NOINDEX_METADATA;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
