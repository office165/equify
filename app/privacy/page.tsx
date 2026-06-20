import type { Metadata } from 'next';
import { LegalDocumentPage } from '../../components/legal/LegalDocumentPage';
import { PRIVACY_POLICY_HE } from '../../lib/legal/privacy_policy_he';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות | equify BY SBC',
  description:
    'מדיניות פרטיות של equify BY SBC — איסוף נתונים, אחסון מקומי, שיתוף עם צדדים שלישיים, וזכויות משתמש.',
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={PRIVACY_POLICY_HE} />;
}
