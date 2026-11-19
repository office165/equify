# לילה 19.11.2026: סבבים 10 עד 13 בעמוד אחד

שעות: 02:31 עד 04:27. **הענף לדחוף: `round-13`.** הוא כולל את כל הקודמים (round-10 מתוך round-9, ו round-11 עד round-13 כל אחד מתוך הקודם). שום דבר לא נדחף, לא עלה לאתר, ולא נכתב למסד, למאנדיי או ל Resend.

**מול הלקוח אחרי הדחיפה, כשהדגלים כבויים:** האתר נראה בדיוק כמו היום (נבדק מול round-9: אותם פיקסלים, אותם כללי CSS, אותם sitemap, robots ו llms.txt). ההבדל היחיד בקוד ה HTML: כתובת תמונת השיתוף בבית, באשף ובתוצאה קיבלה סיומת (אותה תמונה). השווי לא זז באף תיק (value-lock עבר בכל קומיט).

## מה נעשה

| סבב | ענף | מה | מצב |
|---|---|---|---|
| 10 | `round-10` | טענות האתר: בלי 12 עסקאות M&A, בלי משקלות קבועים, בלי שיטת נכסים, בלי "מכפילי שוק ישראליים", ובלי סימנים אסורים בבית ובאשף. באנר עוגיות עם שלוש קטגוריות, אנליטיקס רק אחרי הסכמה (נבדק בדפדפן), ושורת שקיפות בשלב 1. טיוטת מדיניות פרטיות | נעשה |
| 11 | `round-11` | שפת העיצוב של sbc-site (לפי ה skill בשם sbc-brand) בצבעי אקוויפי: בית, אשף ועמוד תוצאה, יום ולילה לפי המכשיר, בלי הבהוב. axe: 0 הפרות ב 12 מצבים. Lighthouse בטלפון: בית 76 ל 82, אשף 83 ל 82 עד 83 | נעשה |
| 12 | `round-12` | מרכז תוכן במנגנון של sbc-site: `/guides`, `/articles`, טבלה `equify_posts` עם גיבוי בחבילה, 8 מדריכים עם מקורות, RSS, sitemap, llms.txt, IndexNow, ומסמך מסירה לסוכן העיתונאי עם 30 נושאים | נעשה |
| 13 | `round-13` | אנגלית תחת `/en` (בית, אשף, תוצאה), 349$ עם PayPal בדולרים, hreflang, ושפה חדשה היא קובץ אחד. הדוח באנגלית: עמודים 1, 2, 4, 5 ו 6, ונכנס ב 8 עמודים ב 13 תיקים | נעשה חלקית: עמודים 3, 7 ו 8 בדוח עדיין בעברית, והמיילים לא נגעו (כלל הלילה) |

## הדגלים (כולם כבויים) ואיך מדליקים

כל הדגלים: בוורסל, Settings, Environment Variables, הערך `on`, ואז redeploy (נקראים בזמן הבנייה). מומלץ קודם ב Preview.

| דגל | מה | הערה |
|---|---|---|
| `COPY_V2` | הטקסטים המתוקנים בבית, באשף ובעמוד התוצאה | אחרי אישור לירון |
| `CONSENT_BANNER` | באנר עוגיות, אנליטיקס אחרי הסכמה, שורת שקיפות בשלב 1 | האנליטיקס עצמו עדיין צריך `NEXT_PUBLIC_ANALYTICS=on` |
| `SITE_V2` | העיצוב החדש, יום ולילה | מומלץ יחד עם `COPY_V2` |
| `CONTENT_HUB` | מדריכים וכתבות | עובד גם בלי הטבלה (8 המדריכים מהחבילה) |
| `EN_SITE` | האתר באנגלית | ל 349$ צריך גם כפתור דולרי ו `PAYPAL_USD=on` |
| `INDEXNOW_ENABLED` | דיווח ל IndexNow | רק ב equify.co.il |

## מה צריך בבוקר

**מלירון (אישור טקסטים):**
1. הטענות המתוקנות: הטבלה ב `reports/round-10.md` (במיוחד "אבטחת מידע", כרטיס הדוגמה ושורת השקיפות בשלב 1).
2. 8 המדריכים (`content/posts.json`, צילומים ב `reports/round-12/shots/`).
3. האתר באנגלית (`lib/i18n/site/en.ts`, צילומים ב `reports/round-13/shots/`).
4. טיוטת מדיניות הפרטיות לעורך הדין: `reports/round-10/privacy-policy-draft.md`.

**מצור:**
1. לדחוף את `round-13`.
2. **SQL** (SQL Editor של אקוויפי): `supabase/migrations/20261119_equify_posts.sql`, ואז `/api/leads/health`. (מסבב 7 ו 9 עדיין ממתינים `20261118_report_narratives.sql` ו `20261118_upay_orders_and_invoices.sql`.)
3. **לסוכן העיתונאי** (סעיף 1 ב `reports/round-12/journalist-handoff.md`): כתובת הפרויקט של אקוויפי, מפתח ה service role, ומחרוזת רענון. אותה מחרוזת בוורסל כ `CONTENT_REVALIDATE_SECRET`.
4. **PayPal:** ליצור כפתור NCP ב 349 USD, ולהכניס את המזהה ל `NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_FULL_USD`.
5. **לבדוק את המפתח ב `.env.local`:** שרת מקומי טוען ממנו מפתחות אמיתיים, וכל כניסה לאשף מנסה לכתוב אירוע לטבלת `events`. המפתח מקבל היום 401, ולכן כנראה לא נכתב כלום הלילה. מהיום כל שרת מקומי רץ דרך `scripts/round-11/safe-env.sh` (רשום ב CLAUDE.md). אותו סיכון היה גם בבדיקות של סבבים 6 ו 8.

## צילומי המסך החשובים

* העיצוב החדש מול sbc-site: `reports/round-11/shots/after-home-dark-desktop.jpg`, `after-home-light-desktop.jpg`, `after-wizard-light-desktop.jpg`, `after-results-dark-desktop-full.jpg`, ולהשוואה `sbc-home-dark-desktop.jpg`.
* הבאנר: `reports/round-10/banner-desktop.png`, `banner-settings-mobile.png`, `step1-note.png`.
* מדריך: `reports/round-12/shots/hub-guides-wacc-and-country-risk-premium-light-desktop-full.jpg`.
* אנגלית: `reports/round-13/shots/en-en-light-desktop.jpg`, `en-en-wizard-light-desktop.jpg`.
* כבוי זהה להיום: `reports/round-11/flags-off/` (לפני ואחרי, זהים).

## מה לא נעשה, ולמה

* **המיילים לא שונו**, גם לא באנגלית: כלל הלילה גובר על הבקשה בסבב 13.
* **בדוח באנגלית** עמודים 3, 7 ו 8, וכמה הערות שמגיעות מהמיפוי, עדיין בעברית.
* **טקסט משפטי** (מדיניות, תנאים, נגישות) לא שונה ולא תורגם.
* **ממצא:** `ResultsScreen.tsx` לא מוצג בשום מקום. עמוד התוצאה האמיתי הוא `/results`, ושם תוקנה הטענה "עסקאות השוואה (M&A)" מאחורי `COPY_V2`.

פירוט: `reports/round-10.md` עד `reports/round-13.md`, `reports/status.md`.
