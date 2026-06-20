import type { Metadata } from 'next';
import { LegalDocumentPage } from '../../components/legal/LegalDocumentPage';
import { ACCESSIBILITY_STATEMENT_PAGE_HE } from '../../lib/legal/accessibility_statement_page';

export const metadata: Metadata = {
  title: 'הצהרת נגישות | equify BY SBC',
  description:
    'הצהרת נגישות equify BY SBC — מחויבות ל-WCAG 2.1 AA, ת"י 5568, ופרטי רכז/ת הנגישות.',
};

export default function AccessibilityPage() {
  return <LegalDocumentPage document={ACCESSIBILITY_STATEMENT_PAGE_HE} />;
}
