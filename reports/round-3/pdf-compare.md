# סבב 3: PDF אחרי הסבב, ובדיקת פריסה

נוצר על ידי `npx tsx scripts/round-3/render-after.ts` (PNG via PDFKit (swiftc)). פיקסל שונה: ערוץ שזז ביותר מ 24, כמו בסבב 2. הערכים הם אחוז הפיקסלים שהשתנו בעמוד.

## בדיקת פריסה (17 הפקות)

| קובץ | מתודולוגיה | עמודים | תוצאה |
|---|---|---|---|
| anchor-1-restaurant | V1 | 8 | עובר |
| anchor-2-saas | V1 | 8 | עובר |
| anchor-3-contractor | V1 | 8 | עובר |
| anchor-4-accounting | V1 | 8 | עובר |
| anchor-5-young-factory | V1 | 8 | עובר |
| anchor-6-loss-factory | V1 | 8 | עובר |
| anchor-7-thin-factory | V1 | 8 | עובר |
| golden-restaurant | V1 | 8 | עובר |
| golden-boutique-hotel | V1 | 8 | עובר |
| golden-b2b-saas | V1 | 8 | עובר |
| golden-manufacturing | V1 | 8 | עובר |
| golden-income-re | V1 | 8 | עובר |
| golden-large-industrial | V1 | 8 | עובר |
| anchor-1-restaurant-v2 | V2 | 8 | עובר |
| anchor-2-saas-v2 | V2 | 8 | עובר |
| anchor-5-young-factory-v2 | V2 | 8 | עובר |
| golden-large-industrial-v2 | V2 | 8 | עובר |

## V1 מול סבב 2 (`reports/round-2/pdf-after/<id>`)

V1 לא אמור לזוז. קובצי ה V1 של הסבב הזה לא נשמרים, כי הם זהים לסבב 2.

| תיק | ע' 1 | ע' 2 | ע' 3 | ע' 4 | ע' 5 | ע' 6 | ע' 7 | ע' 8 |
|---|---|---|---|---|---|---|---|---|
| anchor-1-restaurant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anchor-2-saas | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anchor-3-contractor | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anchor-4-accounting | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anchor-5-young-factory | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anchor-6-loss-factory | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anchor-7-thin-factory | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| golden-restaurant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| golden-boutique-hotel | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| golden-b2b-saas | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| golden-manufacturing | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| golden-income-re | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| golden-large-industrial | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## V2 מול V2 של סבב 2 (`reports/round-2/pdf-after/<id>-v2`)

הקבצים ב `reports/round-3/pdf-after/`.

| תיק | ע' 1 | ע' 2 | ע' 3 | ע' 4 | ע' 5 | ע' 6 | ע' 7 | ע' 8 |
|---|---|---|---|---|---|---|---|---|
| anchor-1-restaurant-v2 | 0.10 | 0.15 | 0 | 0.20 | 0.03 | 0.04 | 0.24 | 0.12 |
| anchor-2-saas-v2 | 0.21 | 0.17 | 0 | 0.20 | 0.13 | 0.08 | 0.54 | 0.31 |
| anchor-5-young-factory-v2 | 0 | 0.29 | 0 | 0.20 | 0.06 | 0 | 0 | 0.58 |
| golden-large-industrial-v2 | 0.11 | 0.20 | 0 | 0.20 | 0.02 | 0.10 | 0.67 | 0.21 |
