# נתוני Damodaran (סבב 2, חלק א)

הקובץ המעובד היחיד שנכנס לגיט: `lib/market-data/damodaran_2026.ts`. הקבצים שהורדו לא נכנסים לגיט.

## איך מעדכנים

1. מורידים לתיקייה ריקה (למשל `tmp/damodaran-raw`, שמחוץ לגיט) מ `https://pages.stern.nyu.edu/~adamodar/pc/datasets/`:
   `betaGlobal.xls`, `betaemerg.xls`, `vebitdaGlobal.xls`, `vebitdaemerg.xls`, `psGlobal.xls`, `psemerg.xls`, `histimpl.xls`, וקובץ ה CRP העדכני (`ctrypremJuly26.xlsx` בסבב 2).
2. ממירים כל קובץ ל JSON (ספרייה סטנדרטית בלבד, בלי התקנות):
   `python3 -I scripts/damodaran/xls_dump.py tmp/damodaran-raw/betaGlobal.xls > tmp/betaGlobal.json` (וכן הלאה; ל CRP: `tmp/ctryprem.json`).
3. מייצרים את הקובץ: `python3 -I scripts/damodaran/build_damodaran_ts.py tmp lib/market-data/damodaran_2026.ts`.
4. מעדכנים ב build_damodaran_ts.py את תאריך ההורדה, ואת הריבית חסרת הסיכון מבנק ישראל (סדרה `ZC_TSB_ZND_10Y_MA`).
5. `npm test` (הסוויטה damodaran בודקת מיפוי, טווחים ומקור לכל ערך).

המיפוי של 50 תתי הענפים לענפי Damodaran, עם נימוק בשורה, נמצא בסקריפט (MAP) ונכתב לקובץ המעובד.
