import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '../../../../lib/seo/page_metadata';

/** Round 13: the results page in another language; not a public page, like /results. */
export const metadata: Metadata = NOINDEX_METADATA;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
