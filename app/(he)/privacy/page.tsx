import type { Metadata } from 'next';
import { PAGE_COPY, publicPageMetadata } from '../../../lib/seo/page_metadata';
import { LegalDocumentPage } from '../../../components/legal/LegalDocumentPage';
import { PRIVACY_POLICY_HE } from '../../../lib/legal/privacy_policy_he';

export const metadata: Metadata = publicPageMetadata({ path: '/privacy', ...PAGE_COPY.privacy });

export default function PrivacyPage() {
  return <LegalDocumentPage document={PRIVACY_POLICY_HE} />;
}
