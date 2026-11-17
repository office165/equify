# שינויים ב snapshot של מתודולוגיה 2

כל עדכון של tests/snapshots/v2 נרשם כאן עם סיבה. נוצר עם METHOD_V2=on.

## 2026-11-17

סיבה: סבב 2ב: snapshot ראשון של מתודולוגיה 2 (T1, W1, R1 מותאם למרווח, מקדם גודל רציף, שורת mature, העברת משקל מרגל אפס, בלי enforceCapexMonotonicity)

תיקים חדשים: 385. שדות שהשתנו: 0. מפת מתודולוגיה השתנתה: לא.

## 2026-11-17

סיבה: סבב 2ב: העברת המשקל מרגל EBITDA אפס נעשית רציפה (הכל כשהבסיס אפס או שלילי, כלום ממרווח בסיס 5%), כדי שלא תהיה קפיצה במעבר EBITDA דרך אפס (TEST 11 בסקריפט המנוע: 32%)

תיקים חדשים: 0. שדות שהשתנו: 11. מפת מתודולוגיה השתנתה: לא.

```
case                  | field           | before    | after   | diff   
----------------------|-----------------|-----------|---------|--------
anchor-7-thin-factory | enterpriseValue | 1360070   | 1442340 | 6.05%  
anchor-7-thin-factory | weightDcf       | 49.56     | 65.5    | 32.16% 
anchor-7-thin-factory | weightEbitda    | 35.21     | 14.38   | -59.16%
anchor-7-thin-factory | weightRev       | 15.23     | 20.13   | 32.17% 
edge-thin-margin      | equity          | 1256730   | 2489900 | 98.13% 
edge-thin-margin      | enterpriseValue | 4256730   | 5489900 | 28.97% 
edge-thin-margin      | bearEquity      | 1080787.8 | 2141314 | 98.13% 
edge-thin-margin      | bullEquity      | 1432672.2 | 2838486 | 98.13% 
edge-thin-margin      | weightDcf       | 33.71     | 51.37   | 52.39% 
edge-thin-margin      | weightEbitda    | 41.05     | 10.17   | -75.23%
edge-thin-margin      | weightRev       | 25.24     | 38.46   | 52.38% 
```

