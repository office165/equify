# upay: מה ממלאים ביום שעונים

סבב 14, שלב 1. המטרה: כשהתשובה מ upay מגיעה, זה שינוי של קובץ הגדרות אחד ומשתני סביבה, לא סבב חדש.

**הקובץ האחד:** `lib/payments/upay/upay_answer_config.ts`. כל מה שלא ידוע לנו על התשובות של upay נמצא שם כנתונים: שמות השדות, הערכים של "שולם", "נכשל" ו"בוטל", שם הפעולה של שאילתת הסטטוס, ואיך נבנית החתימה. לכל חלק יש `confirmed`. כל עוד הוא `false`, המאמת שמשתמש בו רץ רק עם `UPAY_ENV=demo`, ובחי אין מאמת ולא משתחרר שום דוח.

**הבדיקה האחת:** `npx tsx tests/run.ts --only round14-upay --method v1`. התשובות המוקלטות ב `tests/fixtures/upay/round14/` הן דוגמאות שכתבנו בעצמנו. ביום שעונים מחליפים אותן בתשובות האמיתיות (בלי מפתחות ובלי מספרי כרטיס), ומעדכנים את קובץ ההגדרות עד שהבדיקה עוברת.

## הסדר ביום שעונים

1. משתני סביבה של חשבון הבדיקה, ב Vercel בסביבת Preview בלבד (לא בצ'אט): `UPAY_EMAIL`, `UPAY_API_KEY`, `UPAY_ENV=demo`.
2. עסקת בדיקה מהמק (לא נכתב כלום במסד, לא נשלח מייל):

```bash
UPAY_ENV=demo UPAY_EMAIL=... UPAY_API_KEY=... npx tsx scripts/round-14/upay-demo-transaction.ts
```

   הסקריפט מסרב לרוץ בלי `UPAY_ENV=demo`. הוא מדפיס קישור לדף התשלום. משלמים שם בכרטיס הבדיקה של upay.
3. לפי צורת התשובה של upay: ממלאים את החלק המתאים בקובץ ההגדרות, מחליפים את התשובות המוקלטות, ומריצים את הבדיקה.
4. `UPAY_VERIFIER=<השם>` ב Preview, ו `UPAY=on` ו `NEXT_PUBLIC_UPAY=on` (redeploy). עוד עסקת בדיקה, הפעם דרך האשף, ובדיקה ב `/internal/payments` שההזמנה שוחררה פעם אחת.
5. רק אחרי שזה עבר: `confirmed: true` בחלק שנבחר, קומיט, ו `UPAY_ENV=live` ב Production.

## לכל שאלה ששאלנו את upay

### 1. חשבון בדיקה

| | |
|---|---|
| קובץ | `lib/payments/upay/upay_client.ts` |
| פונקציה | `readUpayConfig`, `upayEnvMode`, `upayUrl` |
| משתני סביבה | `UPAY_EMAIL`, `UPAY_API_KEY`, `UPAY_ENV=demo` |
| מה ממלאים | אם שרת הבדיקה לא נמצא ב `https://demo.upay.co.il/API6/clientsecure/json.php` (הנחה מסבב 9, לא נבדקה), מתקנים את `UPAY_TEST_URL` |
| בדיקה | `round14-upay` / `env/demo-server-livesystem-0`, ואחר כך הסקריפט `upay-demo-transaction.ts` מדפיס קישור |

### 2. IPN: הפורמט והאימות

שלוש צורות אפשריות, ולכל אחת מאמת מוכן ב `lib/payments/upay/upay_verifiers.ts`. בוחרים ב `UPAY_VERIFIER`.

| התשובה של upay | `UPAY_VERIFIER` | חלק בקובץ ההגדרות | משתני סביבה | בדיקות |
|---|---|---|---|---|
| "יש שאילתת סטטוס" | `status_query` | `statusQuery` | (אין חדשים) | `A/*` |
| "ה IPN חתום בסוד משותף" | `signed_ipn` | `signedIpn`: שם שדה החתימה, האלגוריתם (`hmac-sha256-sorted`, `md5-concat` או `sha256-concat`), והשדות שנכנסים לחתימה לפי הסדר | `UPAY_IPN_SECRET` | `B/*` |
| "ה IPN מגיע מכתובות קבועות, ותשאלו אותנו שוב" | `ip_requery` | `ipRequery`: `mode` (`postback` או `status_query`) ו `okToken` | `UPAY_IPN_IPS`, ו `UPAY_IPN_VERIFY_URL` במצב postback | `C/*` |

בכל השלוש: הדוח משתחרר רק אם upay אמרו "שולם", ורק אם הסכום, המטבע ומספר העסקה (cashierid) שווים להזמנה שלנו, ופעם אחת בלבד (`lib/payments/upay/upay_settle.ts`, ללא שינוי מסבב 9).

שדות ה IPN בכל הצורות: `fields` בחלק המתאים. שמות השדה (status, amount, currency, cashierid, 4 ספרות), והערכים של "שולם" (`paidValues`), "נכשל" ו"בוטל". מטבע חסר נקרא כ `currencyDefault`.

כתובת ה IPN שלנו: `https://equify.co.il/api/v1/payments/upay-ipn` (GET ו POST, כל קריאה נרשמת ב `upay_ipn_log`). ההזמנה מזוהה מההערה `equify order <מזהה>` שאנחנו שולחים, או מ `?order=&sig=`.

### 3. שאילתת סטטוס

| | |
|---|---|
| קובץ | `lib/payments/upay/upay_answer_config.ts`, חלק `statusQuery` |
| מה ממלאים | `mainaction`, `minoraction` (היום שמות משוערים, `CASHIER` / `GETTRANSACTIONSTATUS`), `idParam` (שם הפרמטר של מספר העסקה), ו `fields` |
| פונקציות | `buildStatusQueryMsgs`, `parseStatusQueryResponse`, `statusQueryVerifier` ב `upay_verifiers.ts` |
| משתנה סביבה | `UPAY_VERIFIER=status_query` |
| בדיקה | `round14-upay` / `A/*`, ובשרת הבדיקה: `upay-demo-transaction.ts --status <cashierid>` מדפיס את התשובה של המאמת |

### 4. הטמעה בתוך העמוד

| | |
|---|---|
| קובץ | `components/payments/UpayCheckout.tsx` |
| מה ממלאים | אם upay אומרים שאסור iframe (או שדפי 3DS לא נטענים בתוכו): מחליפים את החלון בהפניה רגילה. הקישור "הדף לא נטען? פתיחה בחלון הזה" כבר קיים, אז אפשר גם להשאיר |
| משתנה סביבה | `NEXT_PUBLIC_UPAY=on` (נכנס בזמן בנייה, redeploy) |
| בדיקה | עסקת בדיקה דרך האשף ב Preview, כולל כרטיס בדיקה עם 3DS אם upay נותנים |

### 5. חשבונית ירוקה

| | |
|---|---|
| קובץ | `lib/invoices/green_invoice.ts` |
| פונקציות | `buildInvoiceBody`, `issueInvoiceOnce` |
| משתני סביבה | `GREEN_INVOICE=on`, `GREEN_INVOICE_API_ID`, `GREEN_INVOICE_API_SECRET` (מפתח sandbox), `GREEN_INVOICE_LIVE` ריק |
| מה ממלאים | אם upay מוציאים חשבונית בעצמם (בממשק שלהם יש "הוצאת חשבונית"): משאירים `GREEN_INVOICE` כבוי, כדי שלא יהיו שתי חשבוניות |
| בדיקה מול sandbox | `GREEN_INVOICE=on GREEN_INVOICE_API_ID=... GREEN_INVOICE_API_SECRET=... npx tsx scripts/round-14/green-invoice-sandbox.ts` (מסרב עם `GREEN_INVOICE_LIVE=1`, לא כותב למסד). מדפיס את התשובות בלי הטוקן, כדי לשמור אותן כתשובות מוקלטות |
| בדיקות | `round9` / `invoice/*`, `round14-upay` / `invoice/*` |

### 6. כרטיס זר ודולר

| | |
|---|---|
| קבצים | `lib/payments/upay/upay_client.ts` (`upayPrice`, `UPAY_USD_AMOUNT`), `app/api/v1/payments/upay/create/route.ts`, `components/payments/UpayCheckout.tsx` |
| מה ממלאים | אם upay צריכים שדה נוסף לכרטיס זר (למשל `creditcardcompanytype`), מוסיפים אותו ב `buildCreatePaymentMsgs`. אם המטבע נקרא אחרת מ `USD` (בתיעוד: "USD"), משנים שם |
| משתני סביבה | `EN_SITE=on` (דולר נמכר רק באתר האנגלי), ו `UPAY`, `NEXT_PUBLIC_UPAY` |
| בדיקות | `round14-upay` / `usd/*`, `A/paid-usd-released`, ובשרת הבדיקה: `upay-demo-transaction.ts --usd` |
| גיבוי | PayPal הדולרי מסבב 13 (`PAYPAL_USD`) נשאר כמו שהוא |

## עמוד הניהול

`/internal/payments`: הזמנות, IPN שהגיעו, חשבוניות, וסטטוס (איזה מאמת פעיל ולמה, demo או חי, מה מוגדר). קריאה בלבד, מיילים מוסתרים חלקית, בלי מפתחות.

* זמין רק כש `PULSE_TOKEN` מוגדר וגם `UPAY` או `GREEN_INVOICE` דלוק. אחרת 404.
* כניסה: מקלידים את `PULSE_TOKEN` בטופס. השרת שם עוגייה httpOnly עם HMAC של המפתח (לא המפתח עצמו) ל 8 שעות. המפתח לא עובר בכתובת. מ curl: `Authorization: Bearer <המפתח>`.
* צריך את הטבלאות מסבב 9 (`20261118_upay_orders_and_invoices.sql`). בלי מסד העמוד אומר "not_configured".

## כל משתני הסביבה של upay

| משתנה | מתי |
|---|---|
| `UPAY` | `on` מפעיל את הנתיבים בשרת |
| `NEXT_PUBLIC_UPAY` | `on` מציג את הכפתור באשף (redeploy) |
| `UPAY_EMAIL`, `UPAY_API_KEY` | פרטי החשבון (בדיקה ב Preview, חי ב Production) |
| `UPAY_ENV` | `demo` או `live`. בלעדיו: `UPAY_LIVE` מסבב 9 |
| `UPAY_VERIFIER` | `none` (ברירת מחדל), `status_query`, `signed_ipn`, `ip_requery` |
| `UPAY_IPN_SECRET` | רק ל `signed_ipn` |
| `UPAY_IPN_IPS` | רשימת כתובות, מופרדות בפסיק. חובה ל `ip_requery` |
| `UPAY_IPN_VERIFY_URL` | רק ל `ip_requery` במצב postback. חייב להיות https ב upay.co.il |
| `EN_SITE` | `on` מאפשר 349$ דרך upay |
