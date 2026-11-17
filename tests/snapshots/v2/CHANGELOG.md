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

## 2026-11-17

סיבה: round 3 part A: V2 private company layer (marketability discount on the DCF leg, R1 option B, R1 floor fade for finding 26 with the zero-leg weight moving to the revenue leg first). V1 unchanged.

תיקים חדשים: 0. שדות שהשתנו: 2131. מפת מתודולוגיה השתנתה: לא.

```
case                           | field           | before        | after         | diff   
-------------------------------|-----------------|---------------|---------------|--------
anchor-1-restaurant            | equity          | 1629970       | 1368130       | -16.06%
anchor-1-restaurant            | enterpriseValue | 2229970       | 1968130       | -11.74%
anchor-1-restaurant            | bearEquity      | 1191834.06    | 1000376.66    | -16.06%
anchor-1-restaurant            | bullEquity      | 2068105.94    | 1735883.34    | -16.06%
anchor-1-restaurant            | dcfEv           | 3759855.73    | 3011738.44    | -19.90%
anchor-2-saas                  | equity          | 31062740      | 46102250      | 48.42% 
anchor-2-saas                  | enterpriseValue | 28062740      | 43102250      | 53.59% 
anchor-2-saas                  | bearEquity      | 29198975.6    | 43336115      | 48.42% 
anchor-2-saas                  | bullEquity      | 32926504.4    | 48868385      | 48.42% 
anchor-2-saas                  | dcfEv           | 12219782.35   | 9775825.88    | -20.00%
anchor-2-saas                  | revenueEv       | 34852580      | 57385000      | 64.65% 
anchor-2-saas                  | revenueMultiple | 3.03          | 4.99          | 64.69% 
anchor-3-contractor            | equity          | 4770350       | 3977110       | -16.63%
anchor-3-contractor            | enterpriseValue | 9270350       | 8477110       | -8.56% 
anchor-3-contractor            | bearEquity      | 4109786.63    | 3426388.73    | -16.63%
anchor-3-contractor            | bullEquity      | 5430913.37    | 4527831.27    | -16.63%
anchor-3-contractor            | dcfEv           | 8755112.21    | 7063186.78    | -19.32%
anchor-4-accounting            | equity          | 3092100       | 2928910       | -5.28% 
anchor-4-accounting            | enterpriseValue | 2792100       | 2628910       | -5.84% 
anchor-4-accounting            | bearEquity      | 2659206       | 2518862.6     | -5.28% 
anchor-4-accounting            | bullEquity      | 3524994       | 3338957.4     | -5.28% 
anchor-4-accounting            | dcfEv           | 3272084.61    | 2619303.73    | -19.95%
anchor-5-young-factory         | enterpriseValue | 2365850       | 1329760       | -43.79%
anchor-5-young-factory         | revenueEv       | 6353600       | 2582560       | -59.35%
anchor-5-young-factory         | weightDcf       | 62.76         | 48.51         | -22.71%
anchor-5-young-factory         | weightRev       | 37.24         | 51.49         | 38.27% 
anchor-5-young-factory         | revenueMultiple | 0.53          | 0.22          | -58.49%
anchor-6-loss-factory          | equity          | 1194630       | 35810         | -97.00%
anchor-6-loss-factory          | enterpriseValue | 1994630       | 835810        | -58.10%
anchor-6-loss-factory          | bearEquity      | 910814.87     | 27302.41      | -97.00%
anchor-6-loss-factory          | bullEquity      | 1478445.13    | 44317.59      | -97.00%
anchor-6-loss-factory          | dcfEv           | 200293.26     | 160234.61     | -20.00%
anchor-6-loss-factory          | revenueEv       | 3642590       | 1407140       | -61.37%
anchor-6-loss-factory          | weightDcf       | 47.87         | 45.82         | -4.28% 
anchor-6-loss-factory          | weightRev       | 52.13         | 54.18         | 3.93%  
anchor-6-loss-factory          | revenueMultiple | 0.52          | 0.2           | -61.54%
anchor-7-thin-factory          | enterpriseValue | 1442340       | 1346720       | -6.63% 
anchor-7-thin-factory          | revenueEv       | 6377420       | 3294160       | -48.35%
anchor-7-thin-factory          | weightDcf       | 65.5          | 49.56         | -24.34%
anchor-7-thin-factory          | weightRev       | 20.13         | 36.06         | 79.14% 
anchor-7-thin-factory          | revenueMultiple | 0.53          | 0.27          | -49.06%
sub-hospitality-boutique_hotel | equity          | 8132340       | 7356880       | -9.54% 
sub-hospitality-boutique_hotel | enterpriseValue | 8672340       | 7896880       | -8.94% 
sub-hospitality-boutique_hotel | bearEquity      | 6045729.42    | 5469238.35    | -9.54% 
sub-hospitality-boutique_hotel | bullEquity      | 10218950.58   | 9244521.65    | -9.54% 
sub-hospitality-boutique_hotel | dcfEv           | 9192076.86    | 7367449.6     | -19.85%
sub-hospitality-hotel_chain    | equity          | 1241482180    | 1162343190    | -6.37% 
sub-hospitality-hotel_chain    | enterpriseValue | 1299982180    | 1220843190    | -6.09% 
sub-hospitality-hotel_chain    | bearEquity      | 922940425.02  | 864107060.96  | -6.37% 
sub-hospitality-hotel_chain    | bullEquity      | 1560023934.98 | 1460579319.04 | -6.37% 
sub-hospitality-hotel_chain    | dcfEv           | 1330067010.94 | 1197060309.85 | -10.00%
sub-hospitality-vacation       | equity          | 241973960     | 213849190     | -11.62%
sub-hospitality-vacation       | enterpriseValue | 254573960     | 226449190     | -11.05%
sub-hospitality-vacation       | bearEquity      | 179887841.39  | 158979376.01  | -11.62%
sub-hospitality-vacation       | bullEquity      | 304060078.61  | 268719003.99  | -11.62%
sub-hospitality-vacation       | dcfEv           | 286475896.48  | 239207373.56  | -16.50%
sub-hospitality-airbnb_mgmt    | equity          | 1226140       | 1097330       | -10.51%
sub-hospitality-airbnb_mgmt    | enterpriseValue | 1307140       | 1178330       | -9.85% 
sub-hospitality-airbnb_mgmt    | bearEquity      | 882820.8      | 790077.6      | -10.51%
sub-hospitality-airbnb_mgmt    | bullEquity      | 1569459.2     | 1404582.4     | -10.51%
sub-hospitality-airbnb_mgmt    | dcfEv           | 1612041.52    | 1289995.93    | -19.98%
sub-saas-b2b_saas              | equity          | 107163240     | 147489440     | 37.63% 
sub-saas-b2b_saas              | enterpriseValue | 110763240     | 151089440     | 36.41% 
sub-saas-b2b_saas              | bearEquity      | 100733445.6   | 138640073.6   | 37.63% 
sub-saas-b2b_saas              | bullEquity      | 113593034.4   | 156338806.4   | 37.63% 
sub-saas-b2b_saas              | dcfEv           | 42404833.63   | 33923866.9    | -20.00%
sub-saas-b2b_saas              | revenueEv       | 143126660     | 206560000     | 44.32% 
sub-saas-b2b_saas              | revenueMultiple | 3.58          | 5.16          | 44.13% 
sub-saas-b2c_saas              | equity          | 622016460     | 666065160     | 7.08%  
sub-saas-b2c_saas              | enterpriseValue | 639116460     | 683165160     | 6.89%  
sub-saas-b2c_saas              | bearEquity      | 584695472.4   | 626101250.4   | 7.08%  
sub-saas-b2c_saas              | bullEquity      | 659337447.6   | 706029069.6   | 7.08%  
sub-saas-b2c_saas              | dcfEv           | 236792485.13  | 189433988.11  | -20.00%
sub-saas-b2c_saas              | revenueEv       | 803445970     | 884830000     | 10.13% 
sub-saas-b2c_saas              | revenueMultiple | 4.23          | 4.66          | 10.17% 
sub-saas-devtools              | equity          | 30201110      | 43007460      | 42.40% 
sub-saas-devtools              | enterpriseValue | 31281110      | 44087460      | 40.94% 
sub-saas-devtools              | bearEquity      | 28389043.4    | 40427012.4    | 42.40% 
sub-saas-devtools              | bullEquity      | 32013176.6    | 45587907.6    | 42.40% 
sub-saas-devtools              | dcfEv           | 12208064.92   | 9766451.93    | -20.00%
sub-saas-devtools              | revenueEv       | 41551210      | 62568000      | 50.58% 
sub-saas-devtools              | revenueMultiple | 3.46          | 5.21          | 50.58% 
sub-saas-marketplace           | equity          | 165881220     | 168746590     | 1.73%  
sub-saas-marketplace           | enterpriseValue | 170831220     | 173696590     | 1.68%  
sub-saas-marketplace           | bearEquity      | 155928346.8   | 158621794.6   | 1.73%  
sub-saas-marketplace           | bullEquity      | 175834093.2   | 178871385.4   | 1.73%  
sub-saas-marketplace           | dcfEv           | 61133271.87   | 48906617.49   | -20.00%
sub-saas-marketplace           | revenueEv       | 225942520     | 236390000     | 4.62%  
sub-saas-marketplace           | revenueMultiple | 4.11          | 4.3           | 4.62%  
sub-fintech-payments           | equity          | 1866461750    | 5611456810    | 200.65%
sub-fintech-payments           | enterpriseValue | 1974461750    | 5719456810    | 189.67%
sub-fintech-payments           | bearEquity      | 1714429956.55 | 5154378146.2  | 200.65%
sub-fintech-payments           | bullEquity      | 2018493543.45 | 6068535473.8  | 200.65%
sub-fintech-payments           | dcfEv           | 2152558378.28 | 1722046702.62 | -20.00%
sub-fintech-payments           | revenueEv       | 1874282400    | 7968000000    | 325.12%
sub-fintech-payments           | revenueMultiple | 1.56          | 6.64          | 325.64%
sub-fintech-lending            | equity          | 52901150      | 63392100      | 19.83% 
sub-fintech-lending            | enterpriseValue | 54341150      | 64832100      | 19.31% 
sub-fintech-lending            | bearEquity      | 48592110.87   | 58228525.31   | 19.83% 
sub-fintech-lending            | bullEquity      | 57210189.13   | 68555674.69   | 19.83% 
sub-fintech-lending            | dcfEv           | 46930298.45   | 37544238.76   | -20.00%
sub-fintech-lending            | revenueEv       | 59281710      | 83024000      | 40.05% 
sub-fintech-lending            | revenueMultiple | 3.71          | 5.19          | 39.89% 
sub-fintech-insurtech          | equity          | 102559000     | 293534760     | 186.21%
sub-fintech-insurtech          | enterpriseValue | 109309000     | 300284760     | 174.71%
sub-fintech-insurtech          | bearEquity      | 94205103.27   | 269625019.55  | 186.21%
sub-fintech-insurtech          | bullEquity      | 110912896.73  | 317444500.45  | 186.21%
sub-fintech-insurtech          | dcfEv           | 147776085.1   | 118220868.08  | -20.00%
sub-fintech-insurtech          | revenueEv       | 82478070      | 427275000     | 418.05%
sub-fintech-insurtech          | revenueMultiple | 1.1           | 5.7           | 418.18%
sub-fintech-wealth             | equity          | 665986350     | 1356231320    | 103.64%
sub-fintech-wealth             | enterpriseValue | 692986350     | 1383231320    | 99.60% 
sub-fintech-wealth             | bearEquity      | 611738734.58  | 1245760114.3  | 103.64%
sub-fintech-wealth             | bullEquity      | 720233965.42  | 1466702525.7  | 103.64%
sub-fintech-wealth             | dcfEv           | 672219863.25  | 537775890.6   | -20.00%
sub-fintech-wealth             | revenueEv       | 704667500     | 1858800000    | 163.78%
sub-fintech-wealth             | revenueMultiple | 2.35          | 6.2           | 163.83%
sub-cyber-enterprise           | equity          | 52875640      | 117179470     | 121.61%
sub-cyber-enterprise           | enterpriseValue | 54855640      | 119159470     | 117.22%
sub-cyber-enterprise           | bearEquity      | 49645419.08   | 110020869.65  | 121.61%
sub-cyber-enterprise           | bullEquity      | 56105860.92   | 124338070.35  | 121.61%
sub-cyber-enterprise           | dcfEv           | 19829858.77   | 15863887.01   | -20.00%
sub-cyber-enterprise           | revenueEv       | 70033860      | 163922000     | 134.06%
sub-cyber-enterprise           | revenueMultiple | 3.18          | 7.45          | 134.28%
sub-cyber-cloud                | equity          | 248734980     | 556198650     | 123.61%
sub-cyber-cloud                | enterpriseValue | 257734980     | 565198650     | 119.29%
sub-cyber-cloud                | bearEquity      | 233539533.95  | 522219968.84  | 123.61%
sub-cyber-cloud                | bullEquity      | 263930426.05  | 590177331.16  | 123.61%
sub-cyber-cloud                | dcfEv           | 107136674.17  | 85709339.33   | -20.00%
sub-cyber-cloud                | revenueEv       | 330005360     | 795300000     | 141.00%
sub-cyber-cloud                | revenueMultiple | 3.3           | 7.95          | 140.91%
sub-cyber-ot                   | equity          | 13264180      | 25826830      | 94.71% 
sub-cyber-ot                   | enterpriseValue | 13804180      | 26366830      | 91.01% 
sub-cyber-ot                   | bearEquity      | 12453859.19   | 24249045.48   | 94.71% 
sub-cyber-ot                   | bullEquity      | 14074500.81   | 27404614.52   | 94.71% 
sub-cyber-ot                   | dcfEv           | 5386545.38    | 4309236.3     | -20.00%
sub-cyber-ot                   | revenueEv       | 18336760      | 38244000      | 108.56%
sub-cyber-ot                   | revenueMultiple | 3.06          | 6.37          | 108.17%
sub-cyber-services_cyber       | equity          | 3338360       | 15326940      | 359.12%
sub-cyber-services_cyber       | enterpriseValue | 3653360       | 15641940      | 328.15%
sub-cyber-services_cyber       | bearEquity      | 2870989.6     | 13181168.4    | 359.12%
sub-cyber-services_cyber       | bullEquity      | 3805730.4     | 17472711.6    | 359.12%
sub-cyber-services_cyber       | dcfEv           | 3370958.7     | 2696766.96    | -20.00%
sub-cyber-services_cyber       | revenueEv       | 3747490       | 19957000      | 432.54%
sub-cyber-services_cyber       | revenueMultiple | 1.07          | 5.7           | 432.71%
sub-health-medtech             | equity          | 152560780     | 138090670     | -9.48% 
sub-health-medtech             | enterpriseValue | 165160780     | 150690670     | -8.76% 
sub-health-medtech             | bearEquity      | 139616228.97  | 126373885.88  | -9.48% 
sub-health-medtech             | bullEquity      | 165505331.03  | 149807454.12  | -9.48% 
sub-health-medtech             | dcfEv           | 144701060.7   | 115760848.56  | -20.00%
sub-health-biotech             | equity          | 8584850       | 7767190       | -9.52% 
sub-health-biotech             | enterpriseValue | 9394850       | 8577190       | -8.70% 
sub-health-biotech             | bearEquity      | 7382971       | 6679783.4     | -9.52% 
sub-health-biotech             | bullEquity      | 9786729       | 8854596.6     | -9.52% 
sub-health-biotech             | dcfEv           | 7433217.84    | 5946574.27    | -20.00%
sub-health-digital_health      | equity          | 2193170       | 2080130       | -5.15% 
sub-health-digital_health      | enterpriseValue | 2391170       | 2278130       | -4.73% 
sub-health-digital_health      | bearEquity      | 1886126.2     | 1788911.8     | -5.15% 
sub-health-digital_health      | bullEquity      | 2500213.8     | 2371348.2     | -5.15% 
sub-health-digital_health      | dcfEv           | 1739171.49    | 1391337.19    | -20.00%
sub-health-services_health     | equity          | 202907250     | 185383990     | -8.64% 
sub-health-services_health     | enterpriseValue | 220007250     | 202483990     | -7.96% 
sub-health-services_health     | bearEquity      | 185690877.27  | 169654439.33  | -8.64% 
sub-health-services_health     | bullEquity      | 220123622.73  | 201113540.67  | -8.64% 
sub-health-services_health     | dcfEv           | 243378711.1   | 194702968.88  | -20.00%
sub-services-consulting        | equity          | 9575230       | 8992570       | -6.09% 
sub-services-consulting        | enterpriseValue | 10655230      | 10072570      | -5.47% 
sub-services-consulting        | bearEquity      | 8234697.8     | 7733610.2     | -6.09% 
sub-services-consulting        | bullEquity      | 10915762.2    | 10251529.8    | -6.09% 
sub-services-consulting        | dcfEv           | 11830791.97   | 9500125.95    | -19.70%
sub-services-legal             | equity          | 1101630       | 1038030       | -5.77% 
sub-services-legal             | enterpriseValue | 1236630       | 1173030       | -5.14% 
sub-services-legal             | bearEquity      | 910947.86     | 858356.44     | -5.77% 
sub-services-legal             | bullEquity      | 1292312.14    | 1217703.56    | -5.77% 
sub-services-legal             | dcfEv           | 1416083.9     | 1133398.15    | -19.96%
sub-services-accounting        | equity          | 244631370     | 226576260     | -7.38% 
sub-services-accounting        | enterpriseValue | 267131370     | 249076260     | -6.76% 
sub-services-accounting        | bearEquity      | 213911600.39  | 198123774.5   | -7.38% 
sub-services-accounting        | bullEquity      | 275351139.61  | 255028745.5   | -7.38% 
sub-services-accounting        | dcfEv           | 326235722.04  | 281378310.26  | -13.75%
sub-services-marketing         | equity          | 1905350       | 1773130       | -6.94% 
sub-services-marketing         | enterpriseValue | 2130350       | 1998130       | -6.21% 
sub-services-marketing         | bearEquity      | 1575551.24    | 1466217.32    | -6.94% 
sub-services-marketing         | bullEquity      | 2235148.76    | 2080042.68    | -6.94% 
sub-services-marketing         | dcfEv           | 2411514.16    | 1930718.52    | -19.94%
sub-industry-manufacturing     | equity          | 1019094510    | 944527700     | -7.32% 
sub-industry-manufacturing     | enterpriseValue | 1244094510    | 1169527700    | -5.99% 
sub-industry-manufacturing     | bearEquity      | 815893241.04  | 756194601.03  | -7.32% 
sub-industry-manufacturing     | bullEquity      | 1222295778.96 | 1132860798.97 | -7.32% 
sub-industry-manufacturing     | dcfEv           | 1100617187.57 | 990555468.82  | -10.00%
sub-industry-distribution      | equity          | 163069370     | 147249730     | -9.70% 
sub-industry-distribution      | enterpriseValue | 190069370     | 174249730     | -8.32% 
sub-industry-distribution      | bearEquity      | 130554325.92  | 117889026.26  | -9.70% 
sub-industry-distribution      | bullEquity      | 195584414.08  | 176610433.74  | -9.70% 
sub-industry-distribution      | dcfEv           | 203304639.82  | 177891559.84  | -12.50%
sub-industry-food_bev          | equity          | 8846460       | 8001550       | -9.55% 
sub-industry-food_bev          | enterpriseValue | 10826460      | 9981550       | -7.80% 
sub-industry-food_bev          | bearEquity      | 7082529.49    | 6406089.42    | -9.55% 
sub-industry-food_bev          | bullEquity      | 10610390.51   | 9597010.58    | -9.55% 
sub-industry-food_bev          | dcfEv           | 10771999.7    | 8676845.76    | -19.45%
... and 1931 more rows
```

