import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '../../../lib/seo/page_metadata';

/** Round 9: payment pages are not public. */
export const metadata: Metadata = NOINDEX_METADATA;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
