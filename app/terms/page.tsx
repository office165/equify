import type { Metadata } from 'next';
import { PAGE_COPY, publicPageMetadata } from '../../lib/seo/page_metadata';
import { LegalDocumentPage } from '../../components/legal/LegalDocumentPage';
import { TERMS_OF_USE_HE } from '../../lib/legal/terms_page_he';

export const metadata: Metadata = publicPageMetadata({ path: '/terms', ...PAGE_COPY.terms });

export default function TermsPage() {
  return <LegalDocumentPage document={TERMS_OF_USE_HE} />;
}
