# CLAUDE.md: אקוויפי (Equify by SBC)

מסמך עבודה לכל סשן של Claude על הריפו הזה. לקרוא לפני כל סבב.

## מה המערכת

אקוויפי (equify.co.il) היא מערכת הערכות שווי בעברית לעסקים קטנים ובינוניים בישראל, של SBC.
המשתמש ממלא אשף, המנוע מחשב שווי (DCF, מכפילי EBITDA, מכפילי הכנסות), ומקבל דוח PDF מקצועי.
מחיר דוח: 999 ₪ (בדף הנחיתה מוצג כ"מחיר סבב" מול 1,990 ₪). אחראי: לירון. שותף: צור.

סטאק: Next.js 14 (App Router) + TypeScript, Supabase (Postgres), Vercel, Puppeteer עם @sparticuz/chromium ל PDF,
Resend למיילים, PayPal NCP לתשלום, Monday ללידים, Anthropic API לסיווג ענף.

## איפה כל דבר

| נושא | מיקום |
|---|---|
| אשף | `app/wizard/page.tsx`, `lib/wizard/`, `components/` |
| קריאה לשרת מהלקוח | `/api_client.ts` (חי, 83 מייבאים, למרות שהוא בשורש) |
| חישוב בשרת | `POST /api/v1/valuation/calculate` ← `lib/api/handlers/valuation_generate.ts` ← `lib/api/valuation_execution.ts` ← `lib/valuation/in_memory_engine.ts` (WACC) ← `lib/valuation/engine.ts` |
| ליבת המנוע (לקוח ותוצאות) | `lib/valuation/valuation_engine.ts` (דרך `lib/valuation.ts` ו `valuationEngine.ts`), `compute_final_enterprise_value.ts`, `canonical_valuation.ts`, `equity_bridge.ts` (DLOM) |
| משקלות לפי ענף | `lib/valuation/sector_methodology_matrix.ts`, `lib/constants/industry_config.ts` |
| DCF | `lib/valuation/scenario_matrix.ts`, `capm_wacc.ts`, `capex_fcf.ts`, תחזית ב `/valuation_forecast.ts` |
| EBITDA | `blended_ebitda.ts`, `normalized_ebitda.ts`, `multiples.ts`, `adaptive_calibration.ts` |
| שיטת נכסים | אין שיטה אמיתית. רק תווית nav ב `sub_sector_default_multiple.ts` |
| נתוני שוק | `lib/market-data/` (Damodaran, Yahoo, FMP), קרון יומי `/api/cron/refresh-market-data` |
| דוח PDF (לקוח) | `lib/pdf-template.ts` + `lib/pdf-template/equify-pdf-pages.ts`, דרך `/api/generate-pdf` ו `/api/generate-html` |
| דוח PDF (נתיב v1) | `lib/pdf/valuation_report_pdf.ts` + `lib/pdf/buildPdfHtml.ts` (בונה HTML שני, כפילות) |
| טקסט הדוח | תבניות קבועות בלבד: `lib/i18n/equify_report_copy.ts`, `lib/pdf-template/exec-summary-html.ts`, `lib/pdf/executive_bullets.ts` |
| שליחת דוח במייל | `/api/reports/deliver` ← `lib/reports/deliver_equify_report.ts` ← `send_customer_report.ts`, וגם העלאה למאנדיי |
| מיילים | `lib/gateway/email_gateway.ts` (Resend, גיבוי SendGrid), תבנית `lib/email/templates/marketingReport.ts` |
| תשלום | `lib/payments/` (PayPal NCP hosted buttons), webhook ב `app/api/v1/payments/paypal-webhook/route.ts`, קודי הנחה ב `app/api/v1/promo/` |
| לידים | `app/api/leads/route.ts` ← `lib/crm/` (Monday, בורד 18393484200), תור ניסיון חוזר וקרון `/api/cron/replay-pending-leads` |
| בריאות | `app/api/leads/health/route.ts` |
| אירועי מוצר | `lib/analytics/track_event.ts` לטבלת `events` בסופאבייס (אין GA ואין Vercel Analytics) |
| משפטי | `lib/legal/` (פרטיות, תנאים, הצהרת נגישות), עמודים ב `app/privacy`, `app/terms`, `app/accessibility` |
| מטא ו SEO | `app/site-metadata.ts`, `app/layout.tsx`, אימות Search Console ב `public/google14add48e078b922c.html` |
| מיגרציות | `supabase/migrations/` (הנוכחי). `migrations/` ו `schema.sql` ישנים |

## דגלים (כולם כבויים כברירת מחדל)

| דגל | מה הוא מדליק | סבב |
|---|---|---|
| `METHOD_V2` | מתודולוגיה 2 במנוע ובדוח | 2 |
| `CREDIT_CHAPTER` (וגם `NEXT_PUBLIC_CREDIT_CHAPTER` לאשף) | שאלות אשראי באשף ופרק כושר האשראי בדוח | 4 |
| `PAYWALL_V2`, `PAYPAL_USD`, `LEAD_VALUE_FROM_REPORT` | ראו `reports/round-1.md` | 1 |
| `NEXT_PUBLIC_ANALYTICS` | Vercel Analytics ו Speed Insights (`components/analytics/SiteAnalytics.tsx`). נכנס בזמן בנייה | 6 |
| `NEXT_PUBLIC_GSC_VERIFICATION` | תגית אימות של Search Console, רק כשמוגדר | 6 |
| `EXCEL_APPENDIX` | נספח Excel מצורף למייל של הדוח (`lib/excel/`) | 7 |
| `OPUS_NARRATIVE` | תקציר, מסקנות ו "על מה השווי נשען" מ `claude-opus-5-5` (`lib/narrative/`), עם שומר מספרים. צריך את המיגרציה `20261118_report_narratives.sql` | 7 |

SEO: `app/robots.ts`, `app/sitemap.ts`, `lib/seo/` (דומיין canonical קבוע equify.co.il, metadata, JSON-LD), `public/llms.txt`.
כללי הכתיבה בדוח נבדקים ב `npm test` (סוויטה `round5`, `lib/report/report_text_rules.ts`).

## מודל שפה

שתי קריאות. הצעת ענף: `lib/wizard/sector_suggest_llm.ts` (Haiku, תמיד). ניתוח מילולי בדוח: `lib/narrative/opus_narrative.ts` (Opus 5.5, רק עם `OPUS_NARRATIVE=on`, ראו `reports/round-7.md`).
פרטי הצעת הענף:
מודל `claude-haiku-4-5-20251001` (אפשר לעקוף עם `ANTHROPIC_SECTOR_MODEL`), משימה: הצעת ענף ותת ענף מתוך תיאור חופשי של העסק בשלב 1 של האשף.
פרומפט מערכת של כ 4,300 תווים (50 תתי ענפים), עד 600 טוקנים פלט. עלות משוערת: פחות מחצי סנט לקריאה. מטמון 15 דקות, הגבלה של 10 קריאות לשעה לכל IP, ונפילה למילות מפתח אם אין מפתח או שיש שגיאה.
הדוח עצמו לא נכתב על ידי מודל. `lib/prompts/valuation.ts` קיים אבל לא בשימוש.

## קבצים מתים (לא לגעת בלי סבב ניקוי)

`/ValuationDashboard.tsx`, `/server_gateway.ts` (NestJS), `/israeli_payment_gateway.ts` (Grow/PayMe, לא מחובר), `/valuation_engine.py`, `pages/api/`, `lib/hooks/useValuation.ts`, `lib/pdf/ValuationReportDocument.tsx` (react-pdf), `lib/pdf/executive_summary.ts`, `lib/prompts/valuation.ts`, `lib/ml/training_pipeline.ts`, קבצי Capacitor ו `mobile/`.
`/ValuationWizard.tsx` מיובא רק בשביל טיפוס.

## בדיקות

`npm test` (מאז סבב 1): runner אחד ב `tests/run.ts`. כולל snapshot של 385 תיקים דרך נתיב הדוח, מפת מתודולוגיה נעולה, בדיקות נכונות עם KNOWN_WRONG (`tests/known-wrong.ts`), בדיקת בנייה, ואת הסקריפטים הבטוחים ב scripts/. עדכון snapshot רק ב `npm run snapshot:update -- --reason "..."`.
סקריפטים בודדים: `npx tsx scripts/<name>.ts`.
בטוחות להרצה: `test-valuation-engine`, `test-canonical-reconciliation`, `test-report-financial-coherence`, `test-scale-modifier-pipeline`, `test-currency-normalize`, `test-verdict-sanity`, `test-customer-report-email`, `test-paypal-payment-path`, `test-promo-validate-mint`, `test-legal-close-nav`.
לא להריץ בלי אישור (נוגעות במאנדיי האמיתי או בפרודקשן): `test-monday-lead`, `test-monday-leads-e2e`, `test-production-lead`.
דורשות כרום: `test-maximal-pdf`, `test-sample-report-pdf`, `test-legal-close-puppeteer`.
pre-commit (`.githooks/pre-commit`): `npm test` ואז `scripts/guard-no-manual-currency-sign.sh`.
build: `npm run build` (tsc ואז next build). next build צריך גישה ל Google Fonts.

## הכללים

1. פרודקשן לקריאה בלבד. אין כתיבה למסד, לוורסל, למאנדיי או ל Resend מתוך סשן.
2. שינויי מסד רק כקובצי SQL ב `supabase/migrations/`, כל אחד עם הדלקה (up) וכיבוי (down). לירון או צור מריצים ידנית ב SQL Editor, ואז בודקים את `/api/leads/health`.
3. כל יכולת חדשה מול לקוח כבויה עד SQL (דגל בטבלה) או משתנה סביבה.
4. אין מפתחות בקוד ובצ'אט. רק שמות משתנים. `.env*` מחוץ לגיט.
5. מיילים שיווקיים רק עם הסכמה מפורשת (סעיף 30א לחוק התקשורת).
6. בלי הבטחות לתוצאה בטקסטים (שווי הוא אינדיקציה), ובלי אנשים ופנים בתמונות.
7. לא לשנות טקסט משפטי בלי אישור לירון.
8. קומיטים מקומיים בלבד. לירון או צור דוחפים.
9. כתיבה בעברית: בלי קו מפריד ארוך, בלי נקודה אמצעית, בלי מקף צמוד (כותבים "ב Vercel", לא עם מקף).
10. בדיקות עוברות ו build ירוק לפני קומיט.

## איך עובדים

סבב אחד לכל שיחה. Opus 5.5, מאמץ Medium (High לבניות גדולות).
לפני סבב: הסבר קצר ואישור. בסוף: דוח בעברית עם "נעשה, נעשה חלקית, לא נעשה", ועדכון `reports/status.md`.

## מפת הסבבים

| סבב | תוכן | מצב |
|---|---|---|
| ג | היכרות: קריאת ריפו, בדיקת מצב חי, CLAUDE.md, status.md | נעשה (17.10.2026) |
| ד1 | Opus 5.5 לכתיבה וניתוח (ניתוח מילולי חדש בדוח), Haiku נשאר למיון ענף, השוואה על 5 תיקים | ממתין לאישור |
| ד2 | איכות הדוח: בדיקה כמו Big 4, תיקון אי עקביות, כל תיקון במנוע עם בדיקה | ממתין |
| ד3 | אתר: אנליטיקס, Search Console, sitemap ו robots, טופס לידים ל SBC, מהירות בטלפון, SEO ו GEO, אנגלית ותשתית לשפות נוספות, כבוי עד החלטה | ממתין |
| ד3ב | הדוח בשפות נוספות (אנגלית קיימת חלקית ב `lib/i18n`), כבוי עד החלטה | ממתין |
| ד4 | סליקה: חיבור upay (כולל כרטיס זר), כבוי עד אישור לירון. אם לא אפשרי, נשאר PayPal | ממתין |
| ד5 | משפטי: רשימת חוסרים לפי תיקון 13 ונגישות | ממתין |
| ד6 | דופק לחדר הבקרה של SBC: endpoint שמראה שאקוויפי חי | ממתין |
| ה | סוכני גיוס, דוח שווי בתוך תיק אשראי של SBC, אסטרטגיית שיווק ומכירה | אחר כך |
