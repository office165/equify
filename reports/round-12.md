# סבב 12: מרכז תוכן, מדריכים וכתבות

ענף `round-12` מתוך `round-11`. שעות: 03:41 עד 03:58 (19.11.2026). לא נדחף.

| דגל | מה הוא מדליק | איך מדליקים |
|---|---|---|
| `CONTENT_HUB` | `/guides`, `/articles`, עמוד לכל פריט, `/feed`, הכתבות ב `sitemap.xml` וב `llms.txt`, וקישורים מעמוד הבית | `CONTENT_HUB=on` בוורסל, ואז redeploy. הטבלה לא חובה (בלעדיה מוצגים המדריכים מהחבילה) |
| `INDEXNOW_ENABLED` (קיים ב sbc-site) | דיווח ל IndexNow על כתבה חדשה | `INDEXNOW_ENABLED=on`. עובד רק ב equify.co.il וב Production |
| `CONTENT_REVALIDATE_SECRET` (מפתח, לא דגל) | רענון מיידי אחרי כתבה חדשה (`POST /api/content/revalidate`) | מחרוזת אקראית בוורסל, ואותה מחרוזת לסוכן |

## נעשה

### 1. המנגנון (`lib/content/posts.ts`), כמו `sbc-site/lib/posts.ts`

* **טבלה `equify_posts`** ב Supabase של אקוויפי, באותו מבנה כמו `site_posts` של SBC: `slug, title, content_html, excerpt, featured_image_url, featured_image_alt, meta_title, meta_description, desk, published_at, updated_at, author_name, status, summary, faq, seo_title`. קובץ: `supabase/migrations/20261119_equify_posts.sql`, עם הדלקה וכיבוי. **לא הורץ.**
* **RLS:** המפתח הציבורי קורא רק שורות עם `status = 'published'`. רק service role כותב. בדיקות במסד על ה slug, ה desk, ה status ושה faq הוא מערך.
* **גיבוי בחבילה:** `content/posts.json` עם 8 המדריכים, כך שהמרכז אף פעם לא ריק: כשהטבלה לא קיימת, לא מוגדרת, או שהקריאה נכשלת, מוצגת החבילה. שורה בטבלה גוברת על אותו slug בחבילה. שורת טיוטה לא מוצגת לעולם (וגם מסתירה את העותק בחבילה, כמו ב SBC).
* **revalidate:** כל קריאה נשמרת ל 10 דקות עם תג `equify-posts`, כמו ב SBC. כתבה חדשה מופיעה תוך 10 דקות בלי דיפלוי, ומיד עם `POST /api/content/revalidate` (סוד, כמו `app/api/revalidate` של SBC).
* **ניקוי HTML:** `lib/content/sanitize.ts` משאיר רק תגיות טקסט, בלי סקריפט, iframe, אירועים, `style` או קישורי `javascript:`. קישור החוצה נפתח בלשונית חדשה.
* **הכותב:** "מערכת equify" (גם כשהסוכן כותב "הסוכן העיתונאי", כמו ב SBC).

### 2. העמודים

`/guides`, `/guides/[slug]`, `/articles`, `/articles/[slug]`, באותו עיצוב כמו ב sbc-site (פירורי לחם, כותרת, פסקת פתיחה, כרטיסים עם תחום ותאריך, כותב ותאריך, תקציר עם קו, שאלות ותשובות, כתבות קשורות), בצבעי אקוויפי ביום ובלילה. הכותרת והפוטר הם של העיצוב מסבב 11. עמודי המרכז תמיד בעיצוב החדש: אם `SITE_V2` כבוי, נטענים רק הטוקנים והמתג לעמודים האלה (`.eq-hub`), ושאר האתר לא משתנה.

בכל עמוד פריט: JSON-LD של Article, BreadcrumbList, ו FAQPage כשיש שאלות. כתבות קשורות (אותו תחום קודם, אחר כך החדשות). כפתור לאשף בגוף הכתבה ובסופה.

### 3. sitemap, RSS, llms.txt ו IndexNow

* `sitemap.xml`: עם הדגל, גם `/guides`, `/articles` וכל פריט, עם תאריך העדכון.
* `/feed`: RSS 2.0 עם 20 הפריטים האחרונים, כמו `/feed/` של SBC.
* `llms.txt`: עם הדגל, `next.config.js` מפנה אותו ל `app/api/llms`, שמחזיר את הטקסט של היום ואחריו רשימת המדריכים והכתבות. בלי הדגל אין הפניה, והקובץ הוא אותו קובץ.
* IndexNow: כמו `sbc-site/lib/indexnow.ts`. כבוי עד `INDEXNOW_ENABLED=on`, ורק מהכתובת של Production. קובץ המפתח ב `public/` (ציבורי מעצם הגדרתו).

### 4. שמונת המדריכים

כתובים בעברית, עובדתיים, בלי הבטחות, חתומים "מערכת equify", בלי תמונות. כל מספר מבחוץ עם מקור ותאריך בסעיף "מקורות": פרמיית סיכון מדינה לישראל 1.98% ופרמיה כוללת 6.18% (Damodaran, יולי 2026), פרמיה גלומה של S&P 500 4.23% (Damodaran, ינואר 2026), תשואת אג"ח ממשלתית ל 10 שנים 4.24% (בנק ישראל, ממוצע אוקטובר 2026), ריבית בנק ישראל 3.25% (17.11.2026). אלה אותם נתונים שכבר בריפו (`lib/market-data/`). המספרים היחידים בלי מקור חיצוני הם פרמטרים של equify עצמה (צמיחה טרמינלית 2.5%, שקלול ה EBITDA 30/50/20), וכתוב שהם של equify. בנרמול EBITDA יש דוגמה מספרית אחת, מסומנת "דוגמה להמחשה".

| מדריך | כתובת |
|---|---|
| איך מעריכים שווי של עסק פרטי בישראל | `/guides/how-to-value-a-private-business-in-israel` |
| DCF בשפה פשוטה | `/guides/dcf-in-plain-language` |
| מכפיל EBITDA: מה הוא, ולמה לחברה פרטית יש הנחה | `/guides/ebitda-multiple-private-company-discount` |
| WACC ופרמיית סיכון מדינה | `/guides/wacc-and-country-risk-premium` |
| נרמול EBITDA ושכר בעלים | `/guides/normalizing-ebitda-owner-salary` |
| ריכוזיות לקוחות ותלות במייסד | `/guides/customer-concentration-founder-dependence` |
| מה בודק קונה או בנק בדוח שווי | `/guides/what-buyers-and-banks-check-in-a-valuation` |
| כושר אשראי מול שווי: ההבדל | `/guides/credit-capacity-vs-valuation` |

### 5. החיבור לסוכן העיתונאי

`reports/round-12/journalist-handoff.md`: איך כותבים לטבלה (איזה מפתח, אילו שדות, ערכי desk ו status), כללי הכתיבה לאקוויפי, הבלוק לאשף שבסוף כל כתבה, 30 נושאים ראשונים, ומה צור צריך לעשות.

### 6. בדיקות

* סוויטה `round12` ב `npm test` (76 בדיקות): המרכז נבנה מהחבילה כשאין טבלה, כשהיא מחזירה שגיאה וכשאין רשת; שורה מהטבלה גוברת; טיוטה לא מוצגת (גם כש RLS לא מסנן, הקוד מסנן); כתבה מהטבלה מקבלת עמוד ו FAQPage; JSON-LD עובר parse עם השדות הנכונים; ה sitemap, ה RSS וה llms.txt כוללים את הפריטים; מדריך לא נפתח תחת `/articles`; כשהדגל כבוי, כל ארבעת העמודים קוראים ל `notFound()`, `/feed` וה llms מחזירים 404, ה sitemap זהה, ואין קישור משני עמודי הבית; כללי הכתיבה של המדריכים; ניקוי ה HTML; IndexNow כבוי ושולח רק כתובות של האתר.
* מול שרת אמיתי עם הדגל: `/guides`, מדריך, `/articles`, `/feed`, `/llms.txt` ו `/sitemap.xml` מחזירים 200, ו slug לא קיים מחזיר 404.
* axe: 0 הפרות ב `/guides`, במדריך וב `/articles`, ביום ובלילה, במחשב ובטלפון (`reports/round-12/axe.json`).
* כשהדגלים כבויים, מול round-9: ה HTML, ה CSS והפיקסלים של 6 העמודים זהים, וגם `sitemap.xml`, `robots.txt` ו `llms.txt` זהים לביט (`reports/round-12/flags-off.txt`). עמודי המרכז מחזירים 404 כמו היום. ב `/feed` גוף ה 404 הוא טקסט קצר ולא עמוד ה 404 של Next.
* `npm test` ו `CREDIT_CHAPTER=on npm test` ירוקים (שתי המתודולוגיות), value-lock עובר, `npm run build` ירוק, וגם build עם `CONTENT_HUB`, `COPY_V2` ו `CONSENT_BANNER` דלוקים. בדרך תוקנה בדיקה בסוויטה `round6`: ה sitemap עכשיו אסינכרוני.
* צילומים: `reports/round-12/shots/` (המדריכים, מדריך אחד והכתבות, ביום ובלילה, במחשב ובטלפון).

## נעשה חלקית

* מרכז התוכן באנגלית: התשתית בסבב 13.
* לא נבדקה קריאה אמיתית מהטבלה (היא לא קיימת עדיין). נבדק מול תשובות מוקלטות בפורמט של PostgREST.

## לא נעשה

* לא נבנה סוכן חדש, לפי ההנחיה.
* אין תמונה ראשית למדריכים (בכוונה, בלי תמונות של אנשים). אם הסוכן ישלח תמונה, היא תוצג רק אם תתווסף תמיכה בעמוד (היום לא מוצגת).
* מסנן לפי תחום בעמוד הכתבות (כמו `DeskFilter` של SBC): כשיהיו מספיק כתבות.

## מה צריך מצור ומלירון

1. **לירון:** לקרוא את 8 המדריכים (`content/posts.json`, או בצילומים) ולאשר.
2. **צור:** להריץ את `20261119_equify_posts.sql` בפרויקט של אקוויפי, ולתת לסוכן את שלושת הפרטים בסעיף 1 של מסמך המסירה.
3. אחרי האישור: `CONTENT_HUB=on` ב Preview, לבדוק, ואז ב Production. ואז `INDEXNOW_ENABLED=on` אם רוצים.
