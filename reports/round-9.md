# סבב 9: upay, תשלום בתוך העמוד שלנו, וחשבונית ירוקה

ענף: `round-9` (מתוך `round-8`). התחלה: 18.11.2026, 22:55. סיום: 23:08. קומיטים מקומיים בלבד, צור דוחף.

שני דגלים חדשים, כבויים: `UPAY` (בשרת, ואיתו `NEXT_PUBLIC_UPAY` לכפתור באשף) ו `GREEN_INVOICE`. PayPal נשאר כמו שהוא.

## השורה התחתונה

הקוד מוכן, אבל **הוא לא ישחרר אף דוח עד ש upay ייתנו לנו דרך לאמת עסקה.** בתיעוד שלהם אין שאילתת סטטוס ואין תיאור של ה IPN, והכלל של הסבב הוא שפרמטרים בכתובת החזרה לבדם לא משחררים דוח. לכן המאמת שבקוד עונה "לא ידוע", והזמנה נשארת בהמתנה. כשנקבל מ upay את שם הפעולה ואת התשובה שלה, ממלאים פונקציה אחת (`UpayVerifier` ב `lib/payments/upay/upay_settle.ts`) ומוסיפים תשובה מוקלטת לבדיקות.

## מה למדתי מהתיעוד

קראתי את כל 28 העמודים של `APIsignupUpayversion707.pdf` (בפועל כתוב בו "Version: 7.0.6", מ 08/05/2022).

| נושא | מה כתוב בתיעוד |
|---|---|
| כתובת | `https://app.upay.co.il/API6/clientsecure/json.php`, ב POST. JSON בשדה `msg`, או מערך של כמה בקשות בשדה `msgs` |
| כותרת | `refername` תמיד UPAY, `livesystem` 0 לבדיקה ו 1 לחי, `language` HE. או `sessionid` אחרי התחברות |
| בקשה | `mainaction`, `minoraction`, `encoding` json, `numbertemplate`, `parameters` |
| התחברות | `CONNECTION` / `LOGIN` עם `email` ו `passwordmd5`, או `key` במקום הסיסמה (מקבלים אותו ב `GETKEY`) |
| יצירת תשלום | `CASHIER` / `REDIRECTDEPOSITCREDITCARDTRANSFER`. ב `transfers`: `email`, `amount`, `numberpayments`, `comment`, `returnurl`, `currency` ("USD" לדולר), `commissionreduction`, `paymentdate`, `cellphonenotify`, `emailnotify`. ליד `transfers`: `key`, `cardreader`, `creditcardcompanytype`, `creditcardtype` |
| תשובה | `header.errorcode` (למשל 30001400 הוא הצלחה), `result.transactions[{ cashierid, totalamount, url }]` |
| הצלחה | בדוגמת ה PHP: קוד שמתחלק ב 100 בלי שארית. 20001000 ו 30001400 הם הצלחות |
| `returnurl` | צריך לבקש מ upay להפעיל את האפשרות. אחרי הצלחה **וגם** אחרי כישלון הלקוח חוזר לאותה כתובת |
| שרת בדיקה | `https://demo.upay.co.il/` |
| דף תשלום להטמעה | `redirectpage.php`, ובתיעוד יש "Button with iframe/redirect" |
| עסקה בלי הפניה | `DEPOSITCREDITCARDTRANSFER` עם מספר כרטיס. **לא בשימוש**: מספר הכרטיס לא עובר אצלנו |
| ביטול | `CHECKCANCELDEPOSITCREDITCARDTRANSFER` ואז `CANCELDEPOSITCREDITCARDTRANSFER` (זה תהליך של "ספקים") |

### מה חסר בתיעוד (לאימות מול upay)

1. **פורמט ה IPN**: אין. השדה `ipnurl` מופיע רק בדוגמה של Bit (`REDIRECTSETMYCREDITCARDDETAILS`, נספח I), בלי פורמט ובלי הסבר. לא ידוע אם הוא עובד ב `REDIRECTDEPOSITCREDITCARDTRANSFER`, ולכן הקוד לא שולח אותו.
2. **אימות IPN**: אין checksum ואין חתימה לסוחר. לספקים כתוב רק "validation algorithm, webservice or checksum", בלי פירוט.
3. **שאילתת סטטוס של עסקה**: אין. רשימת כל הפעולות (נספח A) והפרמטרים (נספח C) נמצאת רק בתוך המערכת שלהם, ב Developers console, אחרי התחברות.
4. **הפרמטרים שחוזרים ב `returnurl`**: לא מתוארים (חוץ מ `creditcardkey` בתהליך הטוקן).
5. **כרטיסי בדיקה**: אין.
6. **שדות חשבונית**: אין.
7. **רשימת כתובות IP** של השרתים ששולחים IPN: אין. בקוד יש אפשרות לרשימה (`UPAY_IPN_IPS`), ריקה כברירת מחדל.
8. **הנתיב בשרת הבדיקה**: כתוב רק `https://demo.upay.co.il/`. הקוד מניח שהנתיב הוא אותו `/API6/clientsecure/json.php`, ולא בדקתי את זה.
9. **מתי צריך `creditcardcompanytype` ו `creditcardtype`**: מופיעים בדוגמאות בלי הסבר. הקוד לא שולח אותם.
10. **הטמעה ב iframe**: בכותרות של `app.upay.co.il` ושל `demo.upay.co.il` אין `X-Frame-Options` ואין `frame-ancestors` (בדקתי היום). את דף התשלום עצמו, ואת דפי 3DS של חברות האשראי, אי אפשר לבדוק בלי עסקה. לכן הקוד מציג את הדף בחלון בתוך העמוד שלנו, ותמיד יש לידו קישור "הדף לא נטען? פתיחה בחלון הזה" (הפניה רגילה וחזרה לאתר).

## נעשה

1. **לקוח upay** (`lib/payments/upay/upay_client.ts`): `LOGIN` עם `key`, ואחריו `REDIRECTDEPOSITCREDITCARDTRANSFER`, בקריאה אחת (`msgs`). ההערה (`comment`) היא `equify order <מזהה>`. כתובת החזרה: `https://equify.co.il/payment/upay/return?order=<מזהה>&sig=<חתימה>`. דולר רק כשההזמנה בדולר (היום רק ₪ 999). תשובה עם קוד שגיאה, או `url` שלא ב upay.co.il, נדחית.
2. **הזמנות** (`upay_orders.ts`): השרת יוצר הזמנה עם מזהה לפני שהלקוח יוצא לתשלום. בכתובות שלנו המזהה חתום ב HMAC (עם `UPAY_API_KEY`), ובקשה בלי החתימה שלנו נדחית.
3. **שחרור הדוח** (`upay_settle.ts`), רק כשכל אלה מתקיימים: (א) המאמת, ששואל את upay, אומר ששולם; (ב) הסכום והמטבע שחוזרים מ upay שווים להזמנה, וגם מספר העסקה; (ג) הקריאה הזאת היא זו שתופסת את השחרור, בפעולה אטומית במסד. ככה IPN וחזרה לאתר ביחד משחררים פעם אחת, ו IPN שחוזר על עצמו לא עושה כלום. השחרור עובר **דרך אותו מנגנון של PayPal**: `claimPaypalCaptureAndMint` עם מזהה תפיסה `upay:<cashierid>` (ייחודי ב `stripe_transactions`). הוא יוצר את טוקן השליחה, ומשם הדוח יוצא בדיוק כמו אחרי PayPal: עמוד החזרה שם את הטוקן ב sessionStorage ועובר ל `/results`.
4. **נקודת IPN** `/api/v1/payments/upay-ipn` (GET ו POST): רושמת כל קריאה ב `upay_ipn_log` (כתובת IP, הפרמטרים, הגוף, והתוצאה). אחר כך חסימה לפי IP אם הוגדרה רשימה, בדיקת החתימה אם יש `order` בכתובת, או קריאת המזהה מה `comment`. בשום מקרה היא לא מאמינה לתוכן ה IPN: היא שואלת את upay.
5. **עמוד חזרה** `/payment/upay/return`: שואל את השרת כל 3 שניות, עד 2 דקות. כשהשרת אימת, הוא עובר לדוח (את כל החלון, גם מתוך ה iframe). אם התשלום נכשל או בוטל, הוא אומר את זה. העמוד לא נסרק (noindex, ו `/payment` חסום ב robots).
6. **באשף** (`components/payments/UpayCheckout.tsx`): עם `NEXT_PUBLIC_UPAY=on`, מתחת לכפתור PayPal מופיע "תשלום בכרטיס אשראי", שפותח את דף upay בחלון בתוך העמוד. **כשהדגל כבוי, שלב 4 זהה לגמרי** למה שהיה לפני הסבב: הבדיקה משווה את ה HTML לקובץ שנשמר לפני השינוי. הנתיבים מחזירים 404.
7. **חשבונית ירוקה** (`lib/invoices/green_invoice.ts`, דגל `GREEN_INVOICE`): לפני שכתבתי, קראתי את ה OpenAPI הרשמי של morning (developers.morning.co, גרסה 2.0.0). טוקן: `POST https://api.morning.co/idp/v1/oauth/token` עם `client_credentials`, ובבדיקה `api.sandbox.morning.dev`. מסמך: `POST /documents` מסוג 320 (חשבונית מס / קבלה), ובבדיקה `sandbox.d.greeninvoice.co.il`. אמצעי התשלום הוא 3 לכרטיס אשראי ו 5 ל PayPal, והמחיר כולל מע"מ (`vatType` 1). **חשבונית אחת להזמנה**: המפתח `upay:<הזמנה>` או `paypal:<capture>` נתפס בטבלה `invoice_documents` לפני הקריאה. החשבונית נוצרת אחרי תשלום מאומת ב upay, או ב PayPal (ב webhook הקיים, אחרי התפיסה, ורק עם הדגל). כשהדגל כבוי אין שום קריאה. כשל בחשבונית לא עוצר את הדוח, ונרשם בטבלה.
8. **מיגרציה** `supabase/migrations/20261118_upay_orders_and_invoices.sql` (up ו down): `upay_orders`, `upay_ipn_log` ו `invoice_documents`, כולן עם RLS של service_role בלבד. **לא הורצה.**
9. **בדיקות** (`tests/suites/round9.ts`, 27 בדיקות, תשובות מוקלטות בלבד ב `tests/fixtures/upay/`): הבקשה משתמשת רק בשמות מהתיעוד ובלי שדות כרטיס; תשובה טובה, קוד שגיאה וכתובת זרה; תשלום מוצלח, נכשל ובוטל; סכום, מטבע או עסקה שלא מתאימים; IPN עם חתימה מזויפת; IPN שטוען "שולם" בלי אימות; IPN וחזרה ביחד (שחרור אחד וחשבונית אחת); רישום של כל קריאה; רשימת IP; גוף החשבונית; דגל כבוי בלי קריאה; כשל של API החשבוניות; ושלב 4 זהה כשהדגל כבוי.
10. `npm test` ו `CREDIT_CHAPTER=on npm test` ירוקים, tsc ו next build ירוקים.

## נעשה חלקית

* **אימות עסקה**: המבנה מוכן, אבל אין מאמת אמיתי (ראו "השורה התחתונה").
* **ה IPN**: הנקודה קיימת ורושמת הכול, אבל לא ידוע איך upay קוראים לה ומה הם שולחים.
* **שם הלקוח בחשבונית**: היום רק המייל (השם לא נשמר בהזמנה). אפשר להוסיף כשמחליטים מה מופיע בחשבונית.
* **מע"מ**: הנחתי ש 999 כולל מע"מ. לאישור רואה החשבון.
* **המעבר מעמוד החזרה לדוח לא נבדק מקצה לקצה.** עמוד החזרה שם את הטוקן כמו בנתיב של קוד ההנחה, ונתיב התוצאות הקיים צריך למסור את הדוח. לבדוק בסביבת Preview עם עסקת בדיקה.
* **אם השחרור נכשל אחרי שנתפס** (למשל המסד לא ענה), ההזמנה מסומנת כמשוחררת בלי טוקן ונרשמת שגיאה. זה בכוונה, כדי שלא יהיה שחרור כפול, אבל צריך טיפול ידני. לטפל בזה לפני שמדליקים.

## לא נעשה

* אין חיבור לשרת הבדיקה של upay ואין עסקת בדיקה (אין חשבון בדיקה).
* אין חיבור ל sandbox של חשבונית ירוקה (אין מפתחות).
* אין תשלום בדולר באשף (המחיר בדולר לא מוגדר באתר).

## משתני סביבה: איפה צור מדביק כל אחד

ב Vercel: הפרויקט, Settings, Environment Variables. קודם בסביבת **Preview** בלבד, לבדיקות. ל Production רק אחרי שעסקת בדיקה עברה.

| משתנה | ערך | סביבה |
|---|---|---|
| `UPAY_EMAIL` | המייל של חשבון הסוחר ב upay | Preview, ואחר כך Production |
| `UPAY_API_KEY` | ה `key` שמקבלים מ `GETKEY` (או מ upay). משמש גם לחתימה על ההזמנות | Preview, ואחר כך Production |
| `UPAY_LIVE` | `0` לבדיקה, `1` לחי | Preview `0`, Production `1` |
| `UPAY` | `on` כדי להפעיל את הנתיבים בשרת | Preview בלבד עד שיש מאמת |
| `NEXT_PUBLIC_UPAY` | `on` כדי להציג את הכפתור באשף. נכנס בזמן הבנייה, אז צריך redeploy | Preview בלבד עד שיש מאמת |
| `UPAY_IPN_IPS` | אופציונלי: כתובות IP של upay, מופרדות בפסיק | אם upay ייתנו רשימה |
| `GREEN_INVOICE` | `on` | Preview, ואחר כך Production |
| `GREEN_INVOICE_API_ID` | Client ID של מפתח ה API ב morning (app.greeninvoice.co.il, הגדרות, מפתחות API) | Preview עם מפתח sandbox |
| `GREEN_INVOICE_API_SECRET` | Client Secret של אותו מפתח | Preview עם מפתח sandbox |
| `GREEN_INVOICE_LIVE` | `1` לייצור, כל ערך אחר ל sandbox | Preview ריק, Production `1` |

ובמסד: להריץ ב SQL Editor את `supabase/migrations/20261118_upay_orders_and_invoices.sql` לפני שמדליקים, ואחר כך לבדוק את `/api/leads/health`.

## מה לבקש מ upay

1. חשבון בדיקה (בשרת הבדיקה או עם `livesystem` 0), ואת ה `key` שלו.
2. להפעיל את `returnurl` ב `REDIRECTDEPOSITCREDITCARDTRANSFER` (בתיעוד כתוב שצריך לבקש את זה).
3. את שם הפעולה (`mainaction` ו `minoraction`) לשאילתת סטטוס של עסקה לפי `cashierid`, את הפרמטרים שלה ואת התשובה (סטטוס, סכום, מטבע, 4 ספרות אחרונות).
4. האם יש IPN לתשלום הזה: איך מגדירים את הכתובת (`ipnurl` בבקשה, או בהגדרות החשבון), מה הוא שולח (GET או POST, ואילו שדות), ואיך מאמתים אותו (חתימה, checksum או רשימת IP).
5. אילו פרמטרים מצורפים ל `returnurl` בהצלחה ובכישלון.
6. כרטיסי בדיקה.
7. האם מותר להציג את דף התשלום ב iframe, כולל דפי 3DS.
8. האם צריך את `creditcardcompanytype` ו `creditcardtype` בבקשה, ואילו ערכים.
9. אם יש: רשימת כל הפעולות ורשימת קודי השגיאה (נספחים A, B ו C שבתוך המערכת).

### הודעה מוכנה ל upay

> שלום,
>
> אנחנו ב SBC מחברים את אתר equify.co.il לתשלום בכרטיס אשראי דרך upay, לפי מסמך ה API (גרסה 7.0.6). אנחנו משתמשים ב `CONNECTION / LOGIN` עם key וב `CASHIER / REDIRECTDEPOSITCREDITCARDTRANSFER`, והלקוח מקליד את הכרטיס רק בדף שלכם.
>
> כדי לסיים נבקש:
> 1. חשבון בדיקה וה key שלו.
> 2. להפעיל את returnurl בחשבון שלנו.
> 3. את שם הפעולה לשאילתת סטטוס של עסקה לפי cashierid, עם דוגמת בקשה ותשובה (סטטוס, סכום, מטבע).
> 4. פרטי ה IPN לתשלום הזה: איך מגדירים כתובת, מה נשלח (GET או POST, שדות), ואיך מאמתים אותו (חתימה, checksum או כתובות IP).
> 5. אילו פרמטרים מצורפים ל returnurl בהצלחה ובכישלון.
> 6. כרטיסי בדיקה.
> 7. האם מותר להציג את דף התשלום (כולל 3DS) בתוך iframe באתר שלנו.
> 8. האם נדרשים creditcardcompanytype ו creditcardtype, ובאילו ערכים.
> 9. רשימת הפעולות וקודי השגיאה (נספחים A עד C).
>
> תודה,
> צוות equify BY SBC

## דגלים חדשים

| דגל | מה הוא מדליק |
|---|---|
| `UPAY` | הנתיבים בשרת: יצירת תשלום, IPN וסטטוס |
| `NEXT_PUBLIC_UPAY` | הכפתור "תשלום בכרטיס אשראי" באשף |
| `GREEN_INVOICE` | חשבונית מס / קבלה בחשבונית ירוקה אחרי תשלום מאומת (upay או PayPal) |

## הצעד הבא

לשלוח את ההודעה ל upay. כשהם עונים: לממש את `UpayVerifier` עם השאילתה שלהם, להוסיף תשובה מוקלטת לבדיקות, ולבדוק עסקה בשרת הבדיקה.
