import type { Metadata } from 'next';
import { LegalDocumentPage } from '../../components/legal/LegalDocumentPage';
import { TERMS_OF_USE_HE } from '../../lib/legal/terms_page_he';

export const metadata: Metadata = {
  title: 'תנאי שימוש | equify BY SBC',
  description:
    'תנאי שימוש לפלטפורמת equify BY SBC — אינדיקציית שווי אלגוריתמית, הגבלת אחריות, וזכויות משתמש.',
};

export default function TermsPage() {
  return <LegalDocumentPage document={TERMS_OF_USE_HE} />;
}
