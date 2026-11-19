/** Round 10 and 13: the words of the cookie banner (components/consent/CookieConsent.tsx), in a plain module so server code can read them. */
export const CONSENT_TEXT = {
  region: 'הסכמה לעוגיות',
  text: 'האתר משתמש בעוגיות ובכלים דומים. כלי מדידה ושיווק נטענים רק באישורך.',
  policy: 'מדיניות הפרטיות',
  settings: 'הגדרות עוגיות',
  necessary: 'הכרחיות: הפעלת האתר והאשף. תמיד פעילות',
  measurement: 'מדידה: Vercel Analytics ו Speed Insights, סטטיסטיקה של שימוש ומהירות',
  marketing: 'שיווק: אין כרגע כלי שיווק באתר. אם יתווסף, הוא ייטען רק באישורך',
  acceptAll: 'אישור הכל',
  more: 'הגדרות',
  necessaryOnly: 'רק הכרחיות',
  save: 'שמירת הבחירה',
} as const;

/** Round 13: the banner in English for /en (the policy itself is in Hebrew, and the link says so), as on the SBC site. */
export const CONSENT_TEXT_EN = {
  region: 'Cookie consent',
  text: 'The site uses cookies and similar tools. Measurement and marketing tools load only with your consent.',
  policy: 'Privacy policy (Hebrew)',
  settings: 'Cookie settings',
  necessary: 'Necessary: running the site and the wizard. Always on',
  measurement: 'Measurement: Vercel Analytics and Speed Insights, usage and speed statistics',
  marketing: 'Marketing: there are no marketing tools on the site today. If one is added, it loads only with your consent',
  acceptAll: 'Accept all',
  more: 'Settings',
  necessaryOnly: 'Necessary only',
  save: 'Save my choice',
} as const;
