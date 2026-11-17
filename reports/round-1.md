# סבב 1: רשת ביטחון, "מה אם" למתודולוגיה ותיקונים דחופים

ענף: `round-1` (מתוך `claude/round-g-onboarding`). תאריך: 17.11.2026 בלילה. קומיטים מקומיים בלבד, צור דוחף.

## סיכום ב 10 שורות

1. נבנתה רשת ביטחון: `npm test` מריץ 385 תיקים בדויים דרך הנתיב של הלקוח (`mapWizardToValuationData`), ומשחזר בדיוק את 7 תיקי העוגן מ 16.11 (שווי לבעלים זהה לשקל).
2. כל שינוי במספר בדוח, בכל ענף, תת ענף, שלב חיים, מטרה וגודל, נתפס ב snapshot ומודפס כטבלת לפני ואחרי. עדכון רק עם סיבה (`npm run snapshot:update -- --reason "..."`).
3. מפת מתודולוגיה לכל 50 תתי הענפים נקראת מהקוד, ננעלת בבדיקה, ונכתבה ל `reports/methodology-map.md` עם 14 חריגות לעיון.
4. בדיקות נכונות עצמאיות על 14 תיקי זהב מצאו 8 סוגי טעויות חדשים (ממצאים 15 עד 25). כל מה שנכשל היום מסומן KNOWN_WRONG עם מספר ממצא, ולא מפיל את `npm test`.
5. דוח לחברה בהפסד נבנה עכשיו. הפער היה בתצוגה בלבד (רגל EBITDA שלילית שהמנוע מאפס), ולכן אף מספר בשווי לא זז.
6. החיבור למסד: הסיבה ל SELF_SIGNED_CERT_IN_CHAIN שוחזרה ותוקנה (CA של Supabase בקוד, verify-full). בדיקת הבריאות מחזירה 503 כשהמסד לא עונה.
7. שער מטבע בשרת לא תלוי יותר ב localhost, והדוח כותב "שער גיבוי" עם תאריך הגיבוי כשאין שער חי.
8. שלושה דגלים חדשים, כולם כבויים: PAYWALL_V2, PAYPAL_USD, LEAD_VALUE_FROM_REPORT. כל אחד עם בדיקות.
9. ניתוח "מה אם" ב `reports/round-1-what-if.md`. ההמלצה: T1+W1+R1.
10. לא בטוח: SELECT 1 מקומי לא הצליח בגלל פרטי התחברות מקומיים (TLS עבר), וערכי D/E ענפיים ב W1 מסומנים "חסר מקור". tsc, npm test ו next build ירוקים.

## אימות 14 הממצאים מ 16.11

| # | מצב | איפה ומה |
|---|---|---|
| 1 | מאומת, עם דיוק | `lib/pdf-template/report-financial-core.ts` (`resolveEbitdaMultipleEvAbs`) הציג בסיס שלילי כפול מכפיל, והמנוע מאפס את הרגל (`valuation_engine.ts:397`). מפעל צעיר: 7,955,280 מול 7,898,287. "רווח דק" (עוגן 7) דווקא נבנה; נכשל רק כשהבסיס המנורמל שלילי. הטוקן נצרך לפני הבנייה (`app/api/reports/deliver/route.ts:87`). תוקן (סעיף ג3). |
| 2 | מאומת | `map-from-wizard.ts:190` מוסיף CRP 1.6 לגרף בלבד. הגרף הוא Ke ועוד CRP, בלי Kd ומשקלות. במסעדת הזהב: 18.5% בגרף מול 13.4% בטבלה. |
| 3 | מאומת | `scenario_matrix.ts:61` ו `:151` (תקרה 0.42). מסעדת העוגן: 0.71M בדוח מול כ 2.55M לפי Gordon. `terminalValuePct` מחזיר תמיד 57 (`lib/valuation.ts:440`, בשימוש ב `ResultsScreen.tsx:44`). בנוסף: תקרת הנתח של 36% (`:269`) לא נכנסת לפעולה אף פעם, כי 0.42 מגביל ל 29.6%. |
| 4 | מאומת, שורה שונה | `scenario_matrix.ts:85` (לא 82). SaaS עם CAPEX 3 מקבל 3.55%. |
| 5 | מאומת, שורות שונות | `valuation_engine.ts:413`. `normalize_multiple.ts` הוא 113 שורות: הגבולות ב `:8` עד `:23`, הפונקציה ב `:69`. מפעל מפסיד 6.83M מול רווחי 2.65M. |
| 6 | מאומת | `map-from-wizard.ts:340` עד `:341`. נכשל ב 13 מתוך 14 תיקי הזהב. |
| 7 | שונה חלקית | חציון EBITDA הוא אמצע טווח הקונפיג של הענף, לא נגזר מהחברה. חציון ההכנסות (`revMultDisplay * 0.95`) וטווחי השוק של הכנסות ומרווח כן נגזרים מהחברה (`map-from-wizard.ts:645` עד `:673`). "12 עסקאות M&A" מאומת (`equify_report_copy.ts:204`, `:219`). |
| 8 | מאומת בקוד | `fxService.ts:85` (localhost) ו `:76` ("live"). לא בדקתי את משתני ורסל. תוקן (סעיף ג2). |
| 9 | מאומת | deliver: צריכה ב `:87` ובנייה ב `:94`. dispatch: כישלון במייל נבלע ב `valuation_dispatch.ts:85` עד `:98`, והנתיב מחזיר 202 (`dispatch/route.ts:137`). תוקן מאחורי PAYWALL_V2. |
| 10 | מאומת | `generate-pdf` ו `generate-html` בלי בדיקת תשלום. `/api/v1/reports/valuation/pdf` פתוח. תוקן מאחורי PAYWALL_V2. |
| 11 | מאומת, נתיב שונה | `lib/gateway/paypal_gateway.ts:239` (לא lib/payments). המטבע נקרא ב `:240` ולא בשימוש. בנוסף: סכום חסר נחשב כ 999 (`paypal-webhook/route.ts:106`). תוקן מאחורי PAYPAL_USD. |
| 12 | מאומת ושוחזר | שוחזר מקומית: `sslmode=require` ב URL גובר על `rejectUnauthorized:false` (pg 8.21, pg-connection-string 2.13) ונותן SELF_SIGNED_CERT_IN_CHAIN. לידים נופלים לקובץ `.data/valubot_leads.json` (`valubot_leads_repository.ts:78`), שבוורסל לא נשמר. health החזיר 200 כי רק בדיקת הסכמה קבעה סטטוס. הלוג הזמני ב `supabase_pooler.ts:156`. תוקן (סעיף ג1). |
| 13 | מאומת | ציון האיכות 78 מגיע מ `forecast_sample.ts:90` דרך `valuation_forecast.ts:139` (`...sample.meta`), ולכן תמיד 78. השווי מ `forecast_matrix_json`. תוקן מאחורי LEAD_VALUE_FROM_REPORT. לא שחזרתי את "פי 3" בארבעה תיקים. |
| 14 | מאומת, עם תוספת | deliver ו dispatch חסרים ב `outputFileTracingIncludes`. נוסף: הם צריכים גם את Chromium, לא רק את התבנית. `generate-html` כבר כלל את התבנית. תוקן (סעיף ג4). |

## ממצאים חדשים מהסבב

| # | ממצא | איפה |
|---|---|---|
| 15 | הדוח מצהיר על שני בסיסי EBITDA: עמוד 3 כותב שקלול 30/50/20 (קודמת, נוכחית, תחזית) והוא בסיס ה DCF. עמוד 2 כותב EBITDA מנורמלת 30/30/40 על 2024 עד 2026, והיא בסיס המכפיל. מסעדת הזהב: 3.58M מול 3.34M. | `blended_ebitda.ts`, `normalized_ebitda.ts` |
| 16 | טבלת ה DCF בעמוד 4 לא מסתכמת לשווי ה DCF. `enforceCapexMonotonicity` משנה את השווי אחרי הטבלה. ייצור: טבלה 13.2M מול DCF של 21.4M. 8 מתוך 14 תיקי זהב. | `capex_fcf.ts`, `scenario_matrix.ts:300` |
| 17 | נרמול המרווח (תקרת מרווח ענפית) חל על חלק משדות ה EBITDA ולא על אחרים. בסולארי ובנדל"ן מניב התחזית מחושבת מהמרווח הגולמי, והבסיס הנוכחי מנורמל. | `adaptive_calibration.ts` |
| 18 | משקלות ה WACC מחושבים מהון משוער לפני ההערכה, לא מהשווי בדוח. בחברה ממונפת וקטנה חוב גבוה מוריד את ה WACC: מפעל צעיר בהפסד מקבל 9.4%. | `capm_wacc.ts` (`resolveEquityProxyK`) |
| 19 | המשקלות בדוח מעוגלים לאחוז שלם (22.5% מוצג כ 23%). זה גם חסם את דוח משרד עורכי הדין (4 תיקים). החסימה תוקנה בבדיקת העקביות; העיגול בתצוגה נשאר. | `map-from-wizard.ts` (`buildModelBlendRows`) |
| 20 | הסיבה שבדיקת test-scale-modifier-pipeline נכשלת: `blendTargets` מחושב רק בין השורות seed/early ל growth (0.3 עד 0.5), והשורה mature (0.65) לא נכנסת לחישוב. לכן אין חברה שמגיעה ל DCF של 60%. לא שונתה התנהגות. | `scale_modifier_pipeline.ts:156` |
| 21 | קפיצה של 2% עד 4% בשווי במעבר של 2% בהכנסות ב 5M, 20M ו 120M. הסיבה: מקדם גודל במדרגות (0.88, 0.92, 0.96, 1.0) במכפיל, למרות שההערה ב scale_modifier_pipeline מבטיחה מעבר רציף. השווי עדיין עולה באופן מונוטוני בכל הסולם. | `normalize_multiple.ts:43` |
| 22 | במשטר רווח דק נשאר משקל לרגל EBITDA גם כשהרגל אפס (מפעל צעיר: 23% משקל על 0). | `resolve_display_weights.ts`, `valuation_engine.ts:397` |
| 23 | ב .env.local הפולר נבנה על shard ברירת המחדל aws-0, והפרויקט לא קיים שם. ב aws-1 הוא קיים, אבל הסיסמה המקומית נדחית. בוורסל POSTGRES_URL נלקח כמו שהוא, אז זה משפיע רק מקומית, או אם בוורסל עובדים דרך DATABASE_URL. | `supabase_pooler.ts` |
| 24 | `getJwtSecret` חוזר לערך קבוע בקוד כשאין JWT_SECRET. כל טוקן (dispatch, גישה לדוח) ניתן לזיוף אם המשתנה חסר בסביבה. | `lib/config/deployment_env.ts:9` |
| 25 | בתיק עם חוב גבוה מה EV, ה WACC נחתך ל 6% (הרצפה), והשווי לבעלים יוצא 0. | `capm_wacc.ts`, תיק `edge-debt-over-ev` |

## נעשה, נעשה חלקית, לא נעשה

**נעשה**

1. צעד 0: קומיט נפרד ל .gitignore (`acd7a9f`).
2. חלק א מלא: runner אחד, snapshot של 385 תיקים (7 עוגן, 50 תת ענף, 10 קצה, 39 בסולם הגודל ומתוכם 18 נקודות סביב גבולות השכבות, 200 שלבי חיים, 65 מטרות, 14 זהב), מפת מתודולוגיה נעולה, בדיקות נכונות עם KNOWN_WRONG, בדיקת בנייה על כל התיקים, ו pre-commit שמריץ את `npm test`. זמן ריצה כ 3 עד 4 שניות.
3. חלק ב: סקריפט, דוח עם טבלאות, סיכום לפי ענף, תיקי עוגן, המלצה וסעיף החלטות ריק.
4. חלק ג סעיפים 1 עד 7, וסעיף 8 (למטה).

**נעשה חלקית**

1. ג1 ד (SELECT 1 מקומי): ה TLS עבר אימות מלא מול הפולר (בלי SELF_SIGNED). השאילתה עצמה לא הצליחה בגלל פרטי התחברות מקומיים (ממצא 23). אחרי דיפלוי צריך לבדוק את `/api/leads/health`.
2. ג1 א: ה CA נלקח משרשרת התעודות שהשרת עצמו הציג (Supabase Root 2021 CA, טביעת אצבע בקובץ `lib/database/supabase_root_ca.ts`). כדאי להשוות לקובץ שמורידים מלוח הבקרה של Supabase. אם יש בעיה, יש מתג חירום `PG_SSL_ALLOW_UNVERIFIED=true`.
3. ג5 ג: הלקוח שולח את טוקן הגישה ל generate-pdf ו generate-html (`equify-report-export.ts`), והוא נשמר אחרי deliver. בפרומו הטוקן חוזר בתשובה, אבל צד הלקוח של הפרומו לא שומר אותו. זה לא חוסם, כי גם בפרומו deliver רץ ומנפיק טוקן. לבדוק בדפדפן לפני הדלקה: אם תצוגת הדוח לפני תשלום משתמשת ב generate-html, היא תיחסם כשהדגל דולק.
4. ממצא 13: לא שחזרתי את הפער של פי 3 בארבעה תיקים. הבדיקה מוודאת שהמספר שנשלח עם הדגל שווה למספר בדוח.

**לא נעשה**

1. לא נמחק קוד מת ולא נגעתי בנתיבים הישנים (לפי ההנחיה). רשימה למחיקה בסוף.
2. הקבצים `claude/round-1-understanding.md` ושאר הקבצים מהפרויקט לא נמצאים בריפו, ולכן עבדתי לפי ההנחיה בצ'אט בלבד.
3. בדיקות PDF עם כרום לא הורצו (0 מתוך 3 ההרצות שהותרו). הכול נבדק דרך ה HTML.

## תוצאות הבדיקות לפני ואחרי

| בדיקה | לפני | אחרי |
|---|---|---|
| test-valuation-engine | עובר | עובר |
| test-canonical-reconciliation | עובר | עובר |
| test-report-financial-coherence | עובר | עובר |
| test-scale-modifier-pipeline | נכשל | נכשל, מסומן "ידוע כנכשל" (ממצא 20) |
| test-currency-normalize | עובר | עובר |
| test-verdict-sanity | עובר | עובר |
| test-customer-report-email | עובר | עובר |
| test-paypal-payment-path | עובר | עובר |
| test-promo-validate-mint | עובר | עובר |
| test-legal-close-nav | עובר | עובר |
| npm test (חדש) | לא היה | 0 כשלונות. snapshot 385 תיקים (392 בדיקות), מפה 51, נכונות 331 ועוד 125 KNOWN_WRONG, בנייה 385, סולם 36 ועוד 9 KNOWN_WRONG, תיקוני הסבב 70 |
| tsc --noEmit | נקי | נקי (גם `npm run typecheck:tests`) |
| next build | לא אומת | ירוק (Google Fonts נטען הפעם) |

## טבלת בנייה (buildPdfHtml על כל התיקים)

לפני: 378 מתוך 385 נבנו. אחרי: 385 מתוך 385. הטבלה המלאה מתעדכנת ב `tests/snapshots/build-results.md` (`WRITE_BUILD_TABLE=1 npm test`).

| תיק | לפני | אחרי | סיבה |
|---|---|---|---|
| anchor-5-young-factory | נכשל: Blended EV 7955280 ≠ weighted model sum 7898287 | נבנה | ממצא 1 |
| anchor-6-loss-factory | נכשל: 7626130 מול 7569359 | נבנה | ממצא 1 |
| edge-loss-all-years | נכשל: 20790050 מול 20559163 | נבנה | ממצא 1 |
| sub-services-legal | נכשל: שורת DCF, 212810 מול 217539 | נבנה | ממצא 19 |
| lc-services-legal-early, growth, mature | נכשל, אותה סיבה | נבנה | ממצא 19 |
| כל שאר התיקים | נבנה | נבנה | |

## בדיקות "ידוע כשגוי" (KNOWN_WRONG)

מוגדרות ב `tests/known-wrong.ts`. כשמתקנים ממצא, הבדיקה מתחילה לעבור, ו `npm test` נכשל עד שמורידים את הסימון.

| בדיקה | ממצא | תיקים |
|---|---|---|
| correctness/wacc-chart-equals-effective | 2 | 14 מתוך 14 |
| correctness/html-wacc-single-value | 2 | 14 מתוך 14 |
| correctness/terminal-gordon | 3 | 14 מתוך 14 |
| correctness/sensitivity-growth-rows-unique | 6 | 4 |
| correctness/sensitivity-growth-rows-sorted | 6 | 11 |
| correctness/sensitivity-growth-steps-uniform | 6 | 13 |
| correctness/sensitivity-wacc-steps-uniform | 6 | 14 |
| correctness/ebitda-single-declared-base | 15 | 14 |
| correctness/dcf-table-sums-to-dcf-ev | 16 | 8 |
| correctness/ebitda-projected-equals-growth | 17 | 2 |
| correctness/ebitda-normalized-30-30-40-is-multiple-base | 17 | 2 |
| correctness/wacc-equals-weights-from-report-equity | 18 | 9 |
| correctness/display-contribution-equals-ev-times-shown-weight | 19 | 6 |
| scale-ladder/no-boundary-jump | 21 | 9 מתוך 9 |
| scripts/test-scale-modifier-pipeline | 20 | |

ממצאים 4, 5 ו 7 לא מקבלים בדיקה שנכשלת, כי הם החלטת מתודולוגיה ולא טעות חישוב. הם נמדדים בחלק ב ובמפת המתודולוגיה.

## "מה אם"

הדוח: [reports/round-1-what-if.md](round-1-what-if.md).

ההמלצה במשפט: T1+W1+R1 (Gordon בלי תקרה, WACC עם CRP ומשקלות ענפיים, מכפיל הכנסות בטווח EV/Sales נפרד), כי הוא משנה את ארבעת תיקי העוגן הרווחיים בחציון של 6.7% בלבד, מתקן את ממצאים 2, 3 ו 5, ומעלה את רמת השווי הכללית בחציון של 16%, בעיקר באנרגיה ובמלונאות.

## חלק ג סעיף 3: לפני ואחרי

הפער היה בתצוגה (אפשרות א). השווי לא השתנה, וה snapshot זהה.

| תיק | שווי לבעלים לפני | אחרי | EV | סכום הרגליים לפני | אחרי | PDF לפני | אחרי |
|---|---|---|---|---|---|---|---|
| מפעל צעיר (עוגן 5) | 5,455,280 | 5,455,280 | 7,955,280 | 7,898,287 | 7,955,280 | נכשל | נבנה |
| מפעל בהפסד (עוגן 6) | 6,826,130 | 6,826,130 | 7,626,130 | 7,569,359 | 7,626,130 | נכשל | נבנה |
| הפסד בכל השנים (קצה) | 18,890,050 | 18,890,050 | 20,790,050 | 20,559,163 | 20,790,050 | נכשל | נבנה |

בנוסף, `assertValuationDataCoherence` עובד בשתי מדרגות: פער מעל 0.5% חוסם, הנתיבים מחזירים 422 עם הודעה מסודרת ללקוח ("הדוח שלך דורש בדיקה ידנית של הצוות שלנו...") ונשלחת התראה ל office. פער מתחת ל 0.5% (ומעל רעש עיגול) בונה את הדוח, רושם אזהרה ושולח התראה.

## משתני סביבה ודגלים לצור

שמות בלבד. כל הדגלים כבויים עד שמגדירים `on`.

**לפני הדלקה של כל דבר**

1. `JWT_SECRET`: חייב להיות מוגדר בוורסל (ממצא 24). בלעדיו אפשר לזייף טוקנים.
2. `OFFICE_ALERT_EMAIL` (לא חובה, ברירת מחדל office@sbc-il.co.il) ו `RESEND_API_KEY` (כבר קיים), כדי שהתראות יגיעו.
3. לא להגדיר `NEXT_PUBLIC_APP_URL` בשביל שער המטבע. כבר לא צריך אותו.

**מה פועל מיד אחרי דיפלוי (בלי דגל)**: SSL למסד, health 503, שער מטבע בשרת, דוח לחברה בהפסד, tracing של deliver ו dispatch.

1. אחרי הדיפלוי: לפתוח `/api/leads/health` ולוודא `dbOk: true`. אם TLS נכשל, מתג חירום זמני: `PG_SSL_ALLOW_UNVERIFIED=true` (ולדווח).
2. אם בוורסל עובדים דרך DATABASE_URL ולא POSTGRES_URL: להגדיר `SUPABASE_POOLER_SHARD` (כנראה `aws-1`, ממצא 23).

**סדר הדלקת הדגלים**

1. `LEAD_VALUE_FROM_REPORT=on`: הכי בטוח, משנה רק מספרים במאנדיי. לבדוק ליד אחד מול הדוח.
2. `PAYPAL_USD=on`: אחרי שמחליטים על כפתור בדולרים. לפני כן אפשר להגדיר `PAYPAL_MIN_AMOUNT_USD` (ברירת מחדל 299) ו `PAYPAL_MIN_AMOUNT_ILS` (ברירת מחדל 999).
3. `PAYWALL_V2=on`: אחרון. לפני כן לבדוק בדפדפן תשלום מלא, קוד הנחה, הורדת PDF ו HTML, ושתצוגת הדוח לפני תשלום לא נחסמת.

## רשימת הקומיטים

| קומיט | תוכן |
|---|---|
| acd7a9f | chore: ignore sbc_sync |
| f1756e6 | חלק א: רשת ביטחון |
| 3e22de4 | ג1: SSL למסד, health 503, הסרת הלוג הזמני |
| 0532b71 | ג3: דוח לחברה בהפסד, עקביות בשתי מדרגות, הודעה ללקוח והתראה |
| 18eff95 | ג2: שער מטבע בשרת, ובדיקות לג1 עד ג3 |
| 5083f65 | חלק ב: ניתוח "מה אם" |
| 6992062 | ג4: tracing ל deliver ו dispatch |
| 7c8161b | ג5 עד ג7: שלושת הדגלים |
| 5c8b713 | תיקון טיפוסים בבדיקות |
| (אחרון) | דוחות הסבב |

## מה כדאי לסבב 2

1. ליישם את ההחלטה על המתודולוגיה (חלק ב), כולל מקור אמיתי ל D/E ול CRP, ואז לכייל מחדש מול אומוייז ודני. רשת הביטחון תראה בדיוק מה זז.
2. לתקן את הגרף של ה WACC (ממצא 2) ואת טבלאות הרגישות כהרצה אמיתית של המנוע (ממצא 6). שתי הבדיקות כבר קיימות ומחכות.
3. בסיס EBITDA אחד מוצהר (ממצא 15), וטבלת DCF שמסתכמת לשווי (ממצא 16).
4. להחליף את "12 עסקאות M&A" ואת "חציון השוק" בנתונים עם מקור, או להוריד אותם (ממצא 7).
5. מקדם גודל רציף במקום מדרגות (ממצא 21), וטיפול בבדיקת scale modifier (ממצא 20).
6. ניקוי קוד מת, אחרי אישור. מועמדים: `lib/pdf/valuation_report_pdf.ts` ו `lib/pdf/buildPdfHtml.ts` (אחרי ש PAYWALL_V2 סוגר את הנתיב), `ValuationDashboard.tsx`, `server_gateway.ts`, `israeli_payment_gateway.ts`, `valuation_engine.py`, `pages/api/`, `lib/hooks/useValuation.ts`, `lib/pdf/ValuationReportDocument.tsx`, `lib/pdf/executive_summary.ts`, `lib/prompts/valuation.ts`, `lib/ml/training_pipeline.ts`, `canonical_valuation.ts` (אחרי בדיקה שאין שימוש), ו `terminalValuePct` ב `lib/valuation.ts`.
7. להשאיר את `JWT_SECRET` בלי ערך ברירת מחדל בקוד (ממצא 24).
