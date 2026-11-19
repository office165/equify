import type { Metadata } from 'next';
import { PAGE_COPY, publicPageMetadata } from '../../../lib/seo/page_metadata';
import { LegalDocumentPage } from '../../../components/legal/LegalDocumentPage';
import { ACCESSIBILITY_STATEMENT_PAGE_HE } from '../../../lib/legal/accessibility_statement_page';

export const metadata: Metadata = publicPageMetadata({ path: '/accessibility', ...PAGE_COPY.accessibility });

export default function AccessibilityPage() {
  return <LegalDocumentPage document={ACCESSIBILITY_STATEMENT_PAGE_HE} />;
}
