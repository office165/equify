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

## 2026-11-17

סיבה: סבב 2ב: טבלת ה DCF ב V2 נבנית מהתחזית שהמנוע העריך (ממצא 28), ולכן fcffM ו terminalPvM השתנו ב 6 תיקים; ערכי השווי לא זזו

תיקים חדשים: 0. שדות שהשתנו: 46. מפת מתודולוגיה השתנתה: לא.

```
case                   | field            | before                                                       | after                                                        | diff    
-----------------------|------------------|--------------------------------------------------------------|--------------------------------------------------------------|---------
anchor-5-young-factory | fcffM[0]         | 0.44                                                         | 0                                                            | -100.00%
anchor-5-young-factory | fcffM[1]         | 0.46                                                         | 0                                                            | -100.00%
anchor-5-young-factory | fcffM[2]         | 0.48                                                         | 0                                                            | -100.00%
anchor-5-young-factory | fcffM[3]         | 0.49                                                         | 0                                                            | -100.00%
anchor-5-young-factory | fcffM[4]         | 0.51                                                         | 0                                                            | -100.00%
anchor-5-young-factory | terminalPvM      | 5.99                                                         | 0                                                            | -100.00%
anchor-5-young-factory | terminalSharePct | 78.77                                                        | 0                                                            | -100.00%
anchor-5-young-factory | keyFindings      | Quality B · WACC 17.3% · EBITDA מדווח 2026 200K ₪ · בסיס ... | Quality B · WACC 17.3% · EBITDA מדווח 2026 200K ₪ · בסיס ... | text    
anchor-6-loss-factory  | fcffM[0]         | 0.47                                                         | 0.06                                                         | -87.23% 
anchor-6-loss-factory  | fcffM[1]         | 0.49                                                         | 0.06                                                         | -87.76% 
anchor-6-loss-factory  | fcffM[2]         | 0.51                                                         | 0.06                                                         | -88.24% 
anchor-6-loss-factory  | fcffM[3]         | 0.52                                                         | 0.06                                                         | -88.46% 
anchor-6-loss-factory  | fcffM[4]         | 0.53                                                         | 0.06                                                         | -88.68% 
anchor-6-loss-factory  | terminalPvM      | 2.98                                                         | 0                                                            | -100.00%
anchor-6-loss-factory  | terminalSharePct | 63.98                                                        | 0                                                            | -100.00%
anchor-6-loss-factory  | keyFindings      | Quality C+ · WACC 18.6% · EBITDA מדווח 2026 -200K ₪ · בסי... | Quality C+ · WACC 18.6% · EBITDA מדווח 2026 -200K ₪ · בסי... | text    
edge-loss-all-years    | fcffM[0]         | 1.28                                                         | 0.16                                                         | -87.50% 
edge-loss-all-years    | fcffM[1]         | 1.33                                                         | 0.17                                                         | -87.22% 
edge-loss-all-years    | fcffM[2]         | 1.38                                                         | 0.17                                                         | -87.68% 
edge-loss-all-years    | fcffM[3]         | 1.41                                                         | 0.18                                                         | -87.23% 
edge-loss-all-years    | fcffM[4]         | 1.45                                                         | 0.18                                                         | -87.59% 
edge-loss-all-years    | terminalPvM      | 14.63                                                        | 0                                                            | -100.00%
edge-loss-all-years    | terminalSharePct | 74.37                                                        | 0                                                            | -100.00%
edge-loss-all-years    | keyFindings      | Quality B+ · WACC 13.4% · EBITDA מדווח 2026 -500K ₪ · בסי... | Quality B+ · WACC 13.4% · EBITDA מדווח 2026 -500K ₪ · בסי... | text    
edge-neg-to-pos        | fcffM[0]         | 2.48                                                         | 0.48                                                         | -80.65% 
edge-neg-to-pos        | fcffM[1]         | 2.56                                                         | 0.5                                                          | -80.47% 
edge-neg-to-pos        | fcffM[2]         | 2.62                                                         | 0.51                                                         | -80.53% 
edge-neg-to-pos        | fcffM[3]         | 2.67                                                         | 0.52                                                         | -80.52% 
edge-neg-to-pos        | fcffM[4]         | 2.75                                                         | 0.53                                                         | -80.73% 
edge-neg-to-pos        | terminalPvM      | 13.1                                                         | 0.84                                                         | -93.59% 
edge-neg-to-pos        | terminalSharePct | 60.01                                                        | 33.19                                                        | -44.69% 
edge-neg-to-pos        | keyFindings      | Quality B+ · WACC 18.5% · EBITDA מדווח 2026 900K ₪ · בסיס... | Quality B+ · WACC 18.5% · EBITDA מדווח 2026 900K ₪ · בסיס... | text    
edge-usd               | fcffM[0]         | 0.98                                                         | 0.97                                                         | -1.02%  
edge-usd               | fcffM[1]         | 1.01                                                         | 1                                                            | -0.99%  
edge-usd               | fcffM[3]         | 1.05                                                         | 1.04                                                         | -0.95%  
edge-usd               | terminalPvM      | 2.65                                                         | 3.53                                                         | 33.21%  
edge-usd               | terminalSharePct | 42.8                                                         | 50.02                                                        | 16.87%  
edge-usd               | keyFindings      | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 $1.4M · בסיס ... | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 $1.4M · בסיס ... | text    
edge-eur               | fcffM[0]         | 0                                                            | 0.43                                                         | inf     
edge-eur               | fcffM[1]         | 0                                                            | 0.45                                                         | inf     
edge-eur               | fcffM[2]         | 0                                                            | 0.46                                                         | inf     
edge-eur               | fcffM[3]         | 0                                                            | 0.47                                                         | inf     
edge-eur               | fcffM[4]         | 0                                                            | 0.48                                                         | inf     
edge-eur               | terminalPvM      | 0                                                            | 3.31                                                         | inf     
edge-eur               | terminalSharePct | 0                                                            | 65.52                                                        | inf     
edge-eur               | keyFindings      | Quality B · WACC 11.7% · EBITDA מדווח 2026 €1.1M · בסיס מ... | Quality B · WACC 11.7% · EBITDA מדווח 2026 €1.1M · בסיס מ... | text    
```

