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

## 2026-11-18

סיבה: Round 4 part E (V2 only): finding 29, the backlog Ke reduction no longer offsets the concentration and founder premiums (sized on the IP and contracts part, times (1 - top customer) above 50%); finding 30, the multiple concentration penalty enters the EBITDA leg (not in the revenue strategy, not on a manual multiple). Median V2 change -1.8%. V1 unchanged (value-lock passes).

תיקים חדשים: 0. שדות שהשתנו: 1989. מפת מתודולוגיה השתנתה: לא.

```
case                                   | field            | before                                                       | after                                                        | diff    
---------------------------------------|------------------|--------------------------------------------------------------|--------------------------------------------------------------|---------
anchor-1-restaurant                    | equity           | 1368130                                                      | 1327250                                                      | -2.99%  
anchor-1-restaurant                    | enterpriseValue  | 1968130                                                      | 1927250                                                      | -2.08%  
anchor-1-restaurant                    | bearEquity       | 1000376.66                                                   | 970485.2                                                     | -2.99%  
anchor-1-restaurant                    | bullEquity       | 1735883.34                                                   | 1684014.8                                                    | -2.99%  
anchor-1-restaurant                    | ebitdaEv         | 1406190                                                      | 1343300                                                      | -4.47%  
anchor-1-restaurant                    | effectiveMult    | 2.47                                                         | 2.36                                                         | -4.45%  
anchor-1-restaurant                    | keyFindings      | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 615K ₪ · בסיס... | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 615K ₪ · בסיס... | text    
anchor-3-contractor                    | equity           | 3977110                                                      | 3412720                                                      | -14.19% 
anchor-3-contractor                    | enterpriseValue  | 8477110                                                      | 7912720                                                      | -6.66%  
anchor-3-contractor                    | bearEquity       | 3426388.73                                                   | 2940151.35                                                   | -14.19% 
anchor-3-contractor                    | bullEquity       | 4527831.27                                                   | 3885288.65                                                   | -14.19% 
anchor-3-contractor                    | dcfEv            | 7063186.78                                                   | 6333328.96                                                   | -10.33% 
anchor-3-contractor                    | ebitdaEv         | 8635200                                                      | 8304120                                                      | -3.83%  
anchor-3-contractor                    | waccPct          | 10.49                                                        | 11.57                                                        | 10.30%  
anchor-3-contractor                    | effectiveMult    | 4.11                                                         | 3.95                                                         | -3.89%  
anchor-3-contractor                    | terminalPvM      | 5.29                                                         | 4.46                                                         | -15.69% 
anchor-3-contractor                    | terminalSharePct | 60.41                                                        | 56.84                                                        | -5.91%  
anchor-3-contractor                    | keyFindings      | Quality C+ · WACC 10.5% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | Quality C+ · WACC 11.6% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | text    
anchor-4-accounting                    | equity           | 2928910                                                      | 2889820                                                      | -1.33%  
anchor-4-accounting                    | enterpriseValue  | 2628910                                                      | 2589820                                                      | -1.49%  
anchor-4-accounting                    | bearEquity       | 2518862.6                                                    | 2485245.2                                                    | -1.33%  
anchor-4-accounting                    | bullEquity       | 3338957.4                                                    | 3294394.8                                                    | -1.33%  
anchor-4-accounting                    | ebitdaEv         | 2632110                                                      | 2579990                                                      | -1.98%  
anchor-4-accounting                    | effectiveMult    | 5.5                                                          | 5.39                                                         | -2.00%  
anchor-4-accounting                    | keyFindings      | Quality B · WACC 14.8% · EBITDA מדווח 2026 500K ₪ · בסיס ... | Quality B · WACC 14.8% · EBITDA מדווח 2026 500K ₪ · בסיס ... | text    
anchor-5-young-factory                 | enterpriseValue  | 1329760                                                      | 1196780                                                      | -10.00% 
anchor-5-young-factory                 | revenueEv        | 2582560                                                      | 2324300                                                      | -10.00% 
anchor-5-young-factory                 | effectiveMult    | 4.49                                                         | 4.04                                                         | -10.02% 
anchor-5-young-factory                 | revenueMultiple  | 0.22                                                         | 0.19                                                         | -13.64% 
anchor-5-young-factory                 | keyFindings      | Quality B · WACC 17.3% · EBITDA מדווח 2026 200K ₪ · בסיס ... | Quality B · WACC 17.3% · EBITDA מדווח 2026 200K ₪ · בסיס ... | text    
anchor-6-loss-factory                  | equity           | 35810                                                        | 0                                                            | -100.00%
anchor-6-loss-factory                  | enterpriseValue  | 835810                                                       | 759570                                                       | -9.12%  
anchor-6-loss-factory                  | bearEquity       | 27302.41                                                     | 0                                                            | -100.00%
anchor-6-loss-factory                  | bullEquity       | 44317.59                                                     | 0                                                            | -100.00%
anchor-6-loss-factory                  | revenueEv        | 1407140                                                      | 1266430                                                      | -10.00% 
anchor-6-loss-factory                  | effectiveMult    | 4.41                                                         | 3.97                                                         | -9.98%  
anchor-6-loss-factory                  | revenueMultiple  | 0.2                                                          | 0.18                                                         | -10.00% 
anchor-6-loss-factory                  | keyFindings      | Quality C+ · WACC 18.6% · EBITDA מדווח 2026 -200K ₪ · בסי... | Quality C+ · WACC 18.6% · EBITDA מדווח 2026 -200K ₪ · בסי... | text    
anchor-7-thin-factory                  | enterpriseValue  | 1346720                                                      | 1212050                                                      | -10.00% 
anchor-7-thin-factory                  | ebitdaEv         | 1104210                                                      | 993790                                                       | -10.00% 
anchor-7-thin-factory                  | revenueEv        | 3294160                                                      | 2964750                                                      | -10.00% 
anchor-7-thin-factory                  | effectiveMult    | 4.51                                                         | 4.06                                                         | -9.98%  
anchor-7-thin-factory                  | revenueMultiple  | 0.27                                                         | 0.25                                                         | -7.41%  
anchor-7-thin-factory                  | keyFindings      | Quality B− · WACC 16.8% · EBITDA מדווח 2026 200K ₪ · בסיס... | Quality B− · WACC 16.8% · EBITDA מדווח 2026 200K ₪ · בסיס... | text    
sub-hospitality-boutique_hotel         | equity           | 7356880                                                      | 7143750                                                      | -2.90%  
sub-hospitality-boutique_hotel         | enterpriseValue  | 7896880                                                      | 7683750                                                      | -2.70%  
sub-hospitality-boutique_hotel         | bearEquity       | 5469238.35                                                   | 5310793.64                                                   | -2.90%  
sub-hospitality-boutique_hotel         | bullEquity       | 9244521.65                                                   | 8976706.36                                                   | -2.90%  
sub-hospitality-boutique_hotel         | ebitdaEv         | 8288190                                                      | 7917540                                                      | -4.47%  
sub-hospitality-boutique_hotel         | effectiveMult    | 6.74                                                         | 6.44                                                         | -4.45%  
sub-hospitality-boutique_hotel         | keyFindings      | Quality B− · WACC 12.5% · EBITDA מדווח 2026 1.3M ₪ · בסיס... | Quality B− · WACC 12.5% · EBITDA מדווח 2026 1.3M ₪ · בסיס... | text    
sub-hospitality-hotel_chain            | equity           | 1162343190                                                   | 1139598260                                                   | -1.96%  
sub-hospitality-hotel_chain            | enterpriseValue  | 1220843190                                                   | 1198098260                                                   | -1.86%  
sub-hospitality-hotel_chain            | bearEquity       | 864107060.96                                                 | 847198066.45                                                 | -1.96%  
sub-hospitality-hotel_chain            | bullEquity       | 1460579319.04                                                | 1431998453.55                                                | -1.96%  
sub-hospitality-hotel_chain            | ebitdaEv         | 1255783480                                                   | 1199623140                                                   | -4.47%  
sub-hospitality-hotel_chain            | effectiveMult    | 9.43                                                         | 9.01                                                         | -4.45%  
sub-hospitality-hotel_chain            | keyFindings      | Quality B− · WACC 9.8% · EBITDA מדווח 2026 143.0M ₪ · בסי... | Quality B− · WACC 9.8% · EBITDA מדווח 2026 143.0M ₪ · בסי... | text    
sub-hospitality-vacation               | equity           | 213849190                                                    | 210087190                                                    | -1.76%  
sub-hospitality-vacation               | enterpriseValue  | 226449190                                                    | 222687190                                                    | -1.66%  
sub-hospitality-vacation               | bearEquity       | 158979376.01                                                 | 156182636.81                                                 | -1.76%  
sub-hospitality-vacation               | bullEquity       | 268719003.99                                                 | 263991743.19                                                 | -1.76%  
sub-hospitality-vacation               | ebitdaEv         | 207705680                                                    | 198416800                                                    | -4.47%  
sub-hospitality-vacation               | effectiveMult    | 7.24                                                         | 6.92                                                         | -4.42%  
sub-hospitality-vacation               | keyFindings      | Quality B− · WACC 9.8% · EBITDA מדווח 2026 30.8M ₪ · בסיס... | Quality B− · WACC 9.8% · EBITDA מדווח 2026 30.8M ₪ · בסיס... | text    
sub-hospitality-airbnb_mgmt            | equity           | 1097330                                                      | 1067700                                                      | -2.70%  
sub-hospitality-airbnb_mgmt            | enterpriseValue  | 1178330                                                      | 1148700                                                      | -2.51%  
sub-hospitality-airbnb_mgmt            | bearEquity       | 790077.6                                                     | 768744                                                       | -2.70%  
sub-hospitality-airbnb_mgmt            | bullEquity       | 1404582.4                                                    | 1366656                                                      | -2.70%  
sub-hospitality-airbnb_mgmt            | ebitdaEv         | 1103880                                                      | 1054510                                                      | -4.47%  
sub-hospitality-airbnb_mgmt            | effectiveMult    | 5.99                                                         | 5.72                                                         | -4.51%  
sub-hospitality-airbnb_mgmt            | keyFindings      | Quality C+ · WACC 11.0% · EBITDA מדווח 2026 198K ₪ · בסיס... | Quality C+ · WACC 11.0% · EBITDA מדווח 2026 198K ₪ · בסיס... | text    
sub-health-medtech                     | equity           | 138090670                                                    | 135574500                                                    | -1.82%  
sub-health-medtech                     | enterpriseValue  | 150690670                                                    | 148174500                                                    | -1.67%  
sub-health-medtech                     | bearEquity       | 126373885.88                                                 | 124071209.09                                                 | -1.82%  
sub-health-medtech                     | bullEquity       | 149807454.12                                                 | 147077790.91                                                 | -1.82%  
sub-health-medtech                     | ebitdaEv         | 185620500                                                    | 180588160                                                    | -2.71%  
sub-health-medtech                     | effectiveMult    | 10.02                                                        | 9.75                                                         | -2.69%  
sub-health-medtech                     | keyFindings      | Quality A− · WACC 12.6% · EBITDA מדווח 2026 21.0M ₪ · בסי... | Quality A− · WACC 12.6% · EBITDA מדווח 2026 21.0M ₪ · בסי... | text    
sub-health-biotech                     | equity           | 7767190                                                      | 7623330                                                      | -1.85%  
sub-health-biotech                     | enterpriseValue  | 8577190                                                      | 8433330                                                      | -1.68%  
sub-health-biotech                     | bearEquity       | 6679783.4                                                    | 6556063.8                                                    | -1.85%  
sub-health-biotech                     | bullEquity       | 8854596.6                                                    | 8690596.2                                                    | -1.85%  
sub-health-biotech                     | ebitdaEv         | 11792390                                                     | 11472690                                                     | -2.71%  
sub-health-biotech                     | effectiveMult    | 9.9                                                          | 9.63                                                         | -2.73%  
sub-health-biotech                     | keyFindings      | Quality A− · WACC 15.3% · EBITDA מדווח 2026 1.4M ₪ · בסיס... | Quality A− · WACC 15.3% · EBITDA מדווח 2026 1.4M ₪ · בסיס... | text    
sub-health-digital_health              | equity           | 2080130                                                      | 2030620                                                      | -2.38%  
sub-health-digital_health              | enterpriseValue  | 2278130                                                      | 2228620                                                      | -2.17%  
sub-health-digital_health              | bearEquity       | 1788911.8                                                    | 1746333.2                                                    | -2.38%  
sub-health-digital_health              | bullEquity       | 2371348.2                                                    | 2314906.8                                                    | -2.38%  
sub-health-digital_health              | ebitdaEv         | 2705100                                                      | 2631760                                                      | -2.71%  
sub-health-digital_health              | effectiveMult    | 9.29                                                         | 9.04                                                         | -2.69%  
sub-health-digital_health              | keyFindings      | Quality B · WACC 16.0% · EBITDA מדווח 2026 330K ₪ · בסיס ... | Quality B · WACC 16.0% · EBITDA מדווח 2026 330K ₪ · בסיס ... | text    
sub-health-services_health             | equity           | 185383990                                                    | 181794750                                                    | -1.94%  
sub-health-services_health             | enterpriseValue  | 202483990                                                    | 198894750                                                    | -1.77%  
sub-health-services_health             | bearEquity       | 169654439.33                                                 | 166369740.91                                                 | -1.94%  
sub-health-services_health             | bullEquity       | 201113540.67                                                 | 197219759.09                                                 | -1.94%  
sub-health-services_health             | ebitdaEv         | 206860810                                                    | 201252630                                                    | -2.71%  
sub-health-services_health             | effectiveMult    | 8.23                                                         | 8                                                            | -2.79%  
sub-health-services_health             | keyFindings      | Quality A− · WACC 10.5% · EBITDA מדווח 2026 28.5M ₪ · בסי... | Quality A− · WACC 10.5% · EBITDA מדווח 2026 28.5M ₪ · בסי... | text    
sub-services-consulting                | equity           | 8992570                                                      | 8805910                                                      | -2.08%  
sub-services-consulting                | enterpriseValue  | 10072570                                                     | 9885910                                                      | -1.85%  
sub-services-consulting                | bearEquity       | 7733610.2                                                    | 7573082.6                                                    | -2.08%  
sub-services-consulting                | bullEquity       | 10251529.8                                                   | 10038737.4                                                   | -2.08%  
sub-services-consulting                | ebitdaEv         | 10263380                                                     | 10014510                                                     | -2.42%  
sub-services-consulting                | effectiveMult    | 6.18                                                         | 6.03                                                         | -2.43%  
sub-services-consulting                | keyFindings      | Quality B · WACC 14.2% · EBITDA מדווח 2026 1.8M ₪ · בסיס ... | Quality B · WACC 14.2% · EBITDA מדווח 2026 1.8M ₪ · בסיס ... | text    
sub-services-legal                     | equity           | 1038030                                                      | 1015770                                                      | -2.14%  
sub-services-legal                     | enterpriseValue  | 1173030                                                      | 1150770                                                      | -1.90%  
sub-services-legal                     | bearEquity       | 858356.44                                                    | 839949.45                                                    | -2.14%  
sub-services-legal                     | bullEquity       | 1217703.56                                                   | 1191590.55                                                   | -2.14%  
sub-services-legal                     | ebitdaEv         | 1184530                                                      | 1155810                                                      | -2.42%  
sub-services-legal                     | effectiveMult    | 5.71                                                         | 5.57                                                         | -2.45%  
sub-services-legal                     | keyFindings      | Quality B− · WACC 14.8% · EBITDA מדווח 2026 225K ₪ · בסיס... | Quality B− · WACC 14.8% · EBITDA מדווח 2026 225K ₪ · בסיס... | text    
sub-services-accounting                | equity           | 226576260                                                    | 223282770                                                    | -1.45%  
sub-services-accounting                | enterpriseValue  | 249076260                                                    | 245782770                                                    | -1.32%  
sub-services-accounting                | bearEquity       | 198123774.5                                                  | 195243867                                                    | -1.45%  
sub-services-accounting                | bullEquity       | 255028745.5                                                  | 251321673                                                    | -1.45%  
sub-services-accounting                | ebitdaEv         | 227316300                                                    | 221804180                                                    | -2.42%  
sub-services-accounting                | effectiveMult    | 6.57                                                         | 6.41                                                         | -2.44%  
sub-services-accounting                | keyFindings      | Quality B · WACC 11.1% · EBITDA מדווח 2026 37.5M ₪ · בסיס... | Quality B · WACC 11.1% · EBITDA מדווח 2026 37.5M ₪ · בסיס... | text    
sub-services-marketing                 | equity           | 1773130                                                      | 1737550                                                      | -2.01%  
sub-services-marketing                 | enterpriseValue  | 1998130                                                      | 1962550                                                      | -1.78%  
sub-services-marketing                 | bearEquity       | 1466217.32                                                   | 1436795.89                                                   | -2.01%  
sub-services-marketing                 | bullEquity       | 2080042.68                                                   | 2038304.11                                                   | -2.01%  
sub-services-marketing                 | ebitdaEv         | 2023700                                                      | 1974630                                                      | -2.42%  
sub-services-marketing                 | effectiveMult    | 5.85                                                         | 5.71                                                         | -2.39%  
sub-services-marketing                 | keyFindings      | Quality B− · WACC 14.5% · EBITDA מדווח 2026 375K ₪ · בסיס... | Quality B− · WACC 14.5% · EBITDA מדווח 2026 375K ₪ · בסיס... | text    
sub-industry-manufacturing             | equity           | 944527700                                                    | 928924480                                                    | -1.65%  
sub-industry-manufacturing             | enterpriseValue  | 1169527700                                                   | 1153924480                                                   | -1.33%  
sub-industry-manufacturing             | bearEquity       | 756194601.03                                                 | 743702568.53                                                 | -1.65%  
sub-industry-manufacturing             | bullEquity       | 1132860798.97                                                | 1114146391.47                                                | -1.65%  
sub-industry-manufacturing             | ebitdaEv         | 1545508110                                                   | 1497126060                                                   | -3.13%  
sub-industry-manufacturing             | effectiveMult    | 5.58                                                         | 5.41                                                         | -3.05%  
sub-industry-manufacturing             | keyFindings      | Quality B− · WACC 13.0% · EBITDA מדווח 2026 300.0M ₪ · בס... | Quality B− · WACC 13.0% · EBITDA מדווח 2026 300.0M ₪ · בס... | text    
sub-industry-distribution              | equity           | 147249730                                                    | 145261480                                                    | -1.35%  
sub-industry-distribution              | enterpriseValue  | 174249730                                                    | 172261480                                                    | -1.14%  
sub-industry-distribution              | bearEquity       | 117889026.26                                                 | 116297221.26                                                 | -1.35%  
sub-industry-distribution              | bullEquity       | 176610433.74                                                 | 174225738.74                                                 | -1.35%  
sub-industry-distribution              | ebitdaEv         | 168244330                                                    | 162977450                                                    | -3.13%  
sub-industry-distribution              | effectiveMult    | 5.06                                                         | 4.9                                                          | -3.16%  
sub-industry-distribution              | keyFindings      | Quality B− · WACC 9.4% · EBITDA מדווח 2026 36.0M ₪ · בסיס... | Quality B− · WACC 9.4% · EBITDA מדווח 2026 36.0M ₪ · בסיס... | text    
sub-industry-food_bev                  | equity           | 8001550                                                      | 7798610                                                      | -2.54%  
sub-industry-food_bev                  | enterpriseValue  | 9981550                                                      | 9778610                                                      | -2.03%  
sub-industry-food_bev                  | bearEquity       | 6406089.42                                                   | 6243614.43                                                   | -2.54%  
sub-industry-food_bev                  | bullEquity       | 9597010.58                                                   | 9353605.57                                                   | -2.54%  
sub-industry-food_bev                  | ebitdaEv         | 10863270                                                     | 10523190                                                     | -3.13%  
sub-industry-food_bev                  | effectiveMult    | 4.46                                                         | 4.32                                                         | -3.14%  
sub-industry-food_bev                  | keyFindings      | Quality B− · WACC 12.0% · EBITDA מדווח 2026 2.6M ₪ · בסיס... | Quality B− · WACC 12.0% · EBITDA מדווח 2026 2.6M ₪ · בסיס... | text    
sub-industry-traditional               | equity           | 35569410                                                     | 34936460                                                     | -1.78%  
sub-industry-traditional               | enterpriseValue  | 44569410                                                     | 43936460                                                     | -1.42%  
sub-industry-traditional               | bearEquity       | 28477085.22                                                  | 27970341.61                                                  | -1.78%  
sub-industry-traditional               | bullEquity       | 42661734.78                                                  | 41902578.39                                                  | -1.78%  
sub-industry-traditional               | ebitdaEv         | 48060310                                                     | 46555790                                                     | -3.13%  
sub-industry-traditional               | effectiveMult    | 4.34                                                         | 4.2                                                          | -3.23%  
sub-industry-traditional               | keyFindings      | Quality B− · WACC 11.6% · EBITDA מדווח 2026 12.0M ₪ · בסי... | Quality B− · WACC 11.6% · EBITDA מדווח 2026 12.0M ₪ · בסי... | text    
sub-retail_unified-retail-supermarkets | equity           | 1685054680                                                   | 1660269860                                                   | -1.47%  
sub-retail_unified-retail-supermarkets | enterpriseValue  | 2135054680                                                   | 2110269860                                                   | -1.16%  
sub-retail_unified-retail-supermarkets | bearEquity       | 1326475044.1                                                 | 1306964433.79                                                | -1.47%  
sub-retail_unified-retail-supermarkets | bullEquity       | 2043634315.9                                                 | 2013575286.21                                                | -1.47%  
sub-retail_unified-retail-supermarkets | ebitdaEv         | 1467642890                                                   | 1416802250                                                   | -3.46%  
sub-retail_unified-retail-supermarkets | effectiveMult    | 4.05                                                         | 3.91                                                         | -3.46%  
sub-retail_unified-retail-supermarkets | keyFindings      | Quality C+ · WACC 9.9% · EBITDA מדווח 2026 400.0M ₪ · בסי... | Quality C+ · WACC 9.9% · EBITDA מדווח 2026 400.0M ₪ · בסי... | text    
sub-retail_unified-d2c                 | equity           | 7044500                                                      | 6819860                                                      | -3.19%  
sub-retail_unified-d2c                 | enterpriseValue  | 9744500                                                      | 9519860                                                      | -2.31%  
sub-retail_unified-d2c                 | bearEquity       | 5545430.4                                                    | 5368593.79                                                   | -3.19%  
sub-retail_unified-d2c                 | bullEquity       | 8543569.6                                                    | 8271126.21                                                   | -3.19%  
sub-retail_unified-d2c                 | ebitdaEv         | 9786570                                                      | 9447550                                                      | -3.46%  
sub-retail_unified-d2c                 | effectiveMult    | 4.5                                                          | 4.35                                                         | -3.33%  
sub-retail_unified-d2c                 | keyFindings      | Quality C+ · WACC 14.7% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | Quality C+ · WACC 14.7% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | text    
sub-retail_unified-retail-fashion      | equity           | 531100                                                       | 514370                                                       | -3.15%  
sub-retail_unified-retail-fashion      | enterpriseValue  | 891100                                                       | 874370                                                       | -1.88%  
sub-retail_unified-retail-fashion      | bearEquity       | 390323.09                                                    | 378027.66                                                    | -3.15%  
sub-retail_unified-retail-fashion      | bullEquity       | 671876.91                                                    | 650712.34                                                    | -3.15%  
sub-retail_unified-retail-fashion      | ebitdaEv         | 715210                                                       | 690430                                                       | -3.46%  
sub-retail_unified-retail-fashion      | effectiveMult    | 2.47                                                         | 2.38                                                         | -3.64%  
sub-retail_unified-retail-fashion      | keyFindings      | Quality C+ · WACC 15.0% · EBITDA מדווח 2026 320K ₪ · בסיס... | Quality C+ · WACC 15.0% · EBITDA מדווח 2026 320K ₪ · בסיס... | text    
sub-retail_unified-specialty           | equity           | 152860                                                       | 147890                                                       | -3.25%  
sub-retail_unified-specialty           | enterpriseValue  | 224860                                                       | 219890                                                       | -2.21%  
sub-retail_unified-specialty           | bearEquity       | 112341.91                                                    | 108689.29                                                    | -3.25%  
sub-retail_unified-specialty           | bullEquity       | 193378.09                                                    | 187090.71                                                    | -3.25%  
sub-retail_unified-specialty           | ebitdaEv         | 212290                                                       | 204930                                                       | -3.47%  
sub-retail_unified-specialty           | effectiveMult    | 3.66                                                         | 3.54                                                         | -3.28%  
sub-retail_unified-specialty           | keyFindings      | Quality C+ · WACC 15.0% · EBITDA מדווח 2026 64K ₪ · בסיס ... | Quality C+ · WACC 15.0% · EBITDA מדווח 2026 64K ₪ · בסיס ... | text    
sub-food_service-restaurant            | equity           | 113392480                                                    | 111855570                                                    | -1.36%  
sub-food_service-restaurant            | enterpriseValue  | 130492480                                                    | 128955570                                                    | -1.18%  
sub-food_service-restaurant            | bearEquity       | 89378014.42                                                  | 88166594.01                                                  | -1.36%  
sub-food_service-restaurant            | bullEquity       | 137406945.58                                                 | 135544545.99                                                 | -1.36%  
sub-food_service-restaurant            | ebitdaEv         | 70494600                                                     | 67341980                                                     | -4.47%  
sub-food_service-restaurant            | effectiveMult    | 2.88                                                         | 2.75                                                         | -4.51%  
sub-food_service-restaurant            | keyFindings      | Quality B− · WACC 10.2% · EBITDA מדווח 2026 26.6M ₪ · בסי... | Quality B− · WACC 10.2% · EBITDA מדווח 2026 26.6M ₪ · בסי... | text    
sub-food_service-cafe                  | equity           | 228900                                                       | 222570                                                       | -2.77%  
sub-food_service-cafe                  | enterpriseValue  | 282900                                                       | 276570                                                       | -2.24%  
sub-food_service-cafe                  | bearEquity       | 167371.68                                                    | 162743.18                                                    | -2.77%  
sub-food_service-cafe                  | bullEquity       | 290428.32                                                    | 282396.82                                                    | -2.77%  
sub-food_service-cafe                  | ebitdaEv         | 217870                                                       | 208120                                                       | -4.48%  
sub-food_service-cafe                  | effectiveMult    | 2.82                                                         | 2.69                                                         | -4.61%  
sub-food_service-cafe                  | keyFindings      | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 84K ₪ · בסיס ... | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 84K ₪ · בסיס ... | text    
sub-food_service-catering              | equity           | 740170                                                       | 718780                                                       | -2.89%  
sub-food_service-catering              | enterpriseValue  | 902170                                                       | 880780                                                       | -2.37%  
... and 1789 more rows
```

## 2026-11-18

סיבה: Round 5 (display only): writing rules in report text. keyFindings and ebitdaBlendedNote use commas instead of middle dots and "מה DCF" instead of "מ-DCF". No number changed in any case. Value-lock passes.

תיקים חדשים: 0. שדות שהשתנו: 770. מפת מתודולוגיה השתנתה: לא.

```
case                                        | field             | before                                                       | after                                                        | diff
--------------------------------------------|-------------------|--------------------------------------------------------------|--------------------------------------------------------------|-----
anchor-1-restaurant                         | keyFindings       | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 615K ₪ · בסיס... | Quality C+, WACC 13.5%, EBITDA מדווח 2026 615K ₪, בסיס מכ... | text
anchor-1-restaurant                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 560K ₪ · נוכחי 615K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 560K ₪, נוכחי 615K ₪, תחזית (+6.0%) 6... | text
anchor-2-saas                               | keyFindings       | Quality A · WACC 16.4% · EBITDA מדווח 2026 2.3M ₪ · בסיס ... | Quality A, WACC 16.4%, EBITDA מדווח 2026 2.3M ₪, בסיס מכפ... | text
anchor-2-saas                               | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.3M ₪ · נוכחי 2.3M ₪ · תחזית (+30.0... | שקלול 30/50/20, עבר 1.3M ₪, נוכחי 2.3M ₪, תחזית (+30.0%) ... | text
anchor-3-contractor                         | keyFindings       | Quality C+ · WACC 11.6% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | Quality C+, WACC 11.6%, EBITDA מדווח 2026 2.4M ₪, בסיס מכ... | text
anchor-3-contractor                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.1M ₪ · נוכחי 2.4M ₪ · תחזית (+8.0%... | שקלול 30/50/20, עבר 2.1M ₪, נוכחי 2.4M ₪, תחזית (+8.0%) 2... | text
anchor-4-accounting                         | keyFindings       | Quality B · WACC 14.8% · EBITDA מדווח 2026 500K ₪ · בסיס ... | Quality B, WACC 14.8%, EBITDA מדווח 2026 500K ₪, בסיס מכפ... | text
anchor-4-accounting                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 480K ₪ · נוכחי 500K ₪ · תחזית (+4.0%... | שקלול 30/50/20, עבר 480K ₪, נוכחי 500K ₪, תחזית (+4.0%) 5... | text
anchor-5-young-factory                      | keyFindings       | Quality B · WACC 17.3% · EBITDA מדווח 2026 200K ₪ · בסיס ... | Quality B, WACC 17.3%, EBITDA מדווח 2026 200K ₪, בסיס מכפ... | text
anchor-5-young-factory                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר -150K ₪ · נוכחי 200K ₪ · תחזית (+15.... | שקלול 30/50/20, עבר -150K ₪, נוכחי 200K ₪, תחזית (+15.0%)... | text
anchor-6-loss-factory                       | keyFindings       | Quality C+ · WACC 18.6% · EBITDA מדווח 2026 -200K ₪ · בסי... | Quality C+, WACC 18.6%, EBITDA מדווח 2026 -200K ₪, בסיס מ... | text
anchor-6-loss-factory                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר -300K ₪ · נוכחי -200K ₪ · תחזית (+15... | שקלול 30/50/20, עבר -300K ₪, נוכחי -200K ₪, תחזית (+15.0%... | text
anchor-7-thin-factory                       | keyFindings       | Quality B− · WACC 16.8% · EBITDA מדווח 2026 200K ₪ · בסיס... | Quality B−, WACC 16.8%, EBITDA מדווח 2026 200K ₪, בסיס מכ... | text
anchor-7-thin-factory                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 250K ₪ · נוכחי 200K ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 250K ₪, נוכחי 200K ₪, תחזית (+5.0%) 2... | text
sub-hospitality-boutique_hotel              | keyFindings       | Quality B− · WACC 12.5% · EBITDA מדווח 2026 1.3M ₪ · בסיס... | Quality B−, WACC 12.5%, EBITDA מדווח 2026 1.3M ₪, בסיס מכ... | text
sub-hospitality-boutique_hotel              | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.2M ₪ · נוכחי 1.3M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.2M ₪, נוכחי 1.3M ₪, תחזית (+6.0%) 1... | text
sub-hospitality-hotel_chain                 | keyFindings       | Quality B− · WACC 9.8% · EBITDA מדווח 2026 143.0M ₪ · בסי... | Quality B−, WACC 9.8%, EBITDA מדווח 2026 143.0M ₪, בסיס מ... | text
sub-hospitality-hotel_chain                 | ebitdaBlendedNote | שקלול 30/50/20 · עבר 131.8M ₪ · נוכחי 143.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 131.8M ₪, נוכחי 143.0M ₪, תחזית (+6.0... | text
sub-hospitality-vacation                    | keyFindings       | Quality B− · WACC 9.8% · EBITDA מדווח 2026 30.8M ₪ · בסיס... | Quality B−, WACC 9.8%, EBITDA מדווח 2026 30.8M ₪, בסיס מכ... | text
sub-hospitality-vacation                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 28.4M ₪ · נוכחי 30.8M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 28.4M ₪, נוכחי 30.8M ₪, תחזית (+6.0%)... | text
sub-hospitality-airbnb_mgmt                 | keyFindings       | Quality C+ · WACC 11.0% · EBITDA מדווח 2026 198K ₪ · בסיס... | Quality C+, WACC 11.0%, EBITDA מדווח 2026 198K ₪, בסיס מכ... | text
sub-hospitality-airbnb_mgmt                 | ebitdaBlendedNote | שקלול 30/50/20 · עבר 183K ₪ · נוכחי 198K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 183K ₪, נוכחי 198K ₪, תחזית (+6.0%) 2... | text
sub-saas-b2b_saas                           | keyFindings       | Quality A · WACC 15.8% · EBITDA מדווח 2026 7.2M ₪ · בסיס ... | Quality A, WACC 15.8%, EBITDA מדווח 2026 7.2M ₪, בסיס מכפ... | text
sub-saas-b2b_saas                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 5.6M ₪ · נוכחי 7.2M ₪ · תחזית (+25.0... | שקלול 30/50/20, עבר 5.6M ₪, נוכחי 7.2M ₪, תחזית (+25.0%) ... | text
sub-saas-b2c_saas                           | keyFindings       | Quality A · WACC 13.6% · EBITDA מדווח 2026 34.2M ₪ · בסיס... | Quality A, WACC 13.6%, EBITDA מדווח 2026 34.2M ₪, בסיס מכ... | text
sub-saas-b2c_saas                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 26.6M ₪ · נוכחי 34.2M ₪ · תחזית (+25... | שקלול 30/50/20, עבר 26.6M ₪, נוכחי 34.2M ₪, תחזית (+25.0%... | text
sub-saas-devtools                           | keyFindings       | Quality A · WACC 16.4% · EBITDA מדווח 2026 2.2M ₪ · בסיס ... | Quality A, WACC 16.4%, EBITDA מדווח 2026 2.2M ₪, בסיס מכפ... | text
sub-saas-devtools                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.7M ₪ · נוכחי 2.2M ₪ · תחזית (+25.0... | שקלול 30/50/20, עבר 1.7M ₪, נוכחי 2.2M ₪, תחזית (+25.0%) ... | text
sub-saas-marketplace                        | keyFindings       | Quality A · WACC 15.1% · EBITDA מדווח 2026 9.9M ₪ · בסיס ... | Quality A, WACC 15.1%, EBITDA מדווח 2026 9.9M ₪, בסיס מכפ... | text
sub-saas-marketplace                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 7.7M ₪ · נוכחי 9.9M ₪ · תחזית (+25.0... | שקלול 30/50/20, עבר 7.7M ₪, נוכחי 9.9M ₪, תחזית (+25.0%) ... | text
sub-fintech-payments                        | keyFindings       | Quality A− · WACC 11.0% · EBITDA מדווח 2026 240.0M ₪ · בס... | Quality A−, WACC 11.0%, EBITDA מדווח 2026 240.0M ₪, בסיס ... | text
sub-fintech-payments                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 198.3M ₪ · נוכחי 240.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 198.3M ₪, נוכחי 240.0M ₪, תחזית (+18.... | text
sub-fintech-lending                         | keyFindings       | Quality A− · WACC 7.6% · EBITDA מדווח 2026 3.2M ₪ · בסיס ... | Quality A−, WACC 7.6%, EBITDA מדווח 2026 3.2M ₪, בסיס מכפ... | text
sub-fintech-lending                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.6M ₪ · נוכחי 3.2M ₪ · תחזית (+18.0... | שקלול 30/50/20, עבר 2.6M ₪, נוכחי 3.2M ₪, תחזית (+18.0%) ... | text
sub-fintech-insurtech                       | keyFindings       | Quality A− · WACC 10.2% · EBITDA מדווח 2026 15.0M ₪ · בסי... | Quality A−, WACC 10.2%, EBITDA מדווח 2026 15.0M ₪, בסיס מ... | text
sub-fintech-insurtech                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 12.4M ₪ · נוכחי 15.0M ₪ · תחזית (+18... | שקלול 30/50/20, עבר 12.4M ₪, נוכחי 15.0M ₪, תחזית (+18.0%... | text
sub-fintech-wealth                          | keyFindings       | Quality A− · WACC 9.2% · EBITDA מדווח 2026 60.0M ₪ · בסיס... | Quality A−, WACC 9.2%, EBITDA מדווח 2026 60.0M ₪, בסיס מכ... | text
sub-fintech-wealth                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 49.6M ₪ · נוכחי 60.0M ₪ · תחזית (+18... | שקלול 30/50/20, עבר 49.6M ₪, נוכחי 60.0M ₪, תחזית (+18.0%... | text
sub-cyber-enterprise                        | keyFindings       | Quality A · WACC 16.3% · EBITDA מדווח 2026 3.5M ₪ · בסיס ... | Quality A, WACC 16.3%, EBITDA מדווח 2026 3.5M ₪, בסיס מכפ... | text
sub-cyber-enterprise                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.5M ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.5M ₪, תחזית (+22.0%) ... | text
sub-cyber-cloud                             | keyFindings       | Quality A · WACC 13.9% · EBITDA מדווח 2026 16.0M ₪ · בסיס... | Quality A, WACC 13.9%, EBITDA מדווח 2026 16.0M ₪, בסיס מכ... | text
sub-cyber-cloud                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר 12.7M ₪ · נוכחי 16.0M ₪ · תחזית (+22... | שקלול 30/50/20, עבר 12.7M ₪, נוכחי 16.0M ₪, תחזית (+22.0%... | text
sub-cyber-ot                                | keyFindings       | Quality A · WACC 16.4% · EBITDA מדווח 2026 960K ₪ · בסיס ... | Quality A, WACC 16.4%, EBITDA מדווח 2026 960K ₪, בסיס מכפ... | text
sub-cyber-ot                                | ebitdaBlendedNote | שקלול 30/50/20 · עבר 762K ₪ · נוכחי 960K ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 762K ₪, נוכחי 960K ₪, תחזית (+22.0%) ... | text
sub-cyber-services_cyber                    | keyFindings       | Quality B+ · WACC 15.3% · EBITDA מדווח 2026 560K ₪ · בסיס... | Quality B+, WACC 15.3%, EBITDA מדווח 2026 560K ₪, בסיס מכ... | text
sub-cyber-services_cyber                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 445K ₪ · נוכחי 560K ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 445K ₪, נוכחי 560K ₪, תחזית (+22.0%) ... | text
sub-health-medtech                          | keyFindings       | Quality A− · WACC 12.6% · EBITDA מדווח 2026 21.0M ₪ · בסי... | Quality A−, WACC 12.6%, EBITDA מדווח 2026 21.0M ₪, בסיס מ... | text
sub-health-medtech                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 18.1M ₪ · נוכחי 21.0M ₪ · תחזית (+12... | שקלול 30/50/20, עבר 18.1M ₪, נוכחי 21.0M ₪, תחזית (+12.0%... | text
sub-health-biotech                          | keyFindings       | Quality A− · WACC 15.3% · EBITDA מדווח 2026 1.4M ₪ · בסיס... | Quality A−, WACC 15.3%, EBITDA מדווח 2026 1.4M ₪, בסיס מכ... | text
sub-health-biotech                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.2M ₪ · נוכחי 1.4M ₪ · תחזית (+12.0... | שקלול 30/50/20, עבר 1.2M ₪, נוכחי 1.4M ₪, תחזית (+12.0%) ... | text
sub-health-digital_health                   | keyFindings       | Quality B · WACC 16.0% · EBITDA מדווח 2026 330K ₪ · בסיס ... | Quality B, WACC 16.0%, EBITDA מדווח 2026 330K ₪, בסיס מכפ... | text
sub-health-digital_health                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 285K ₪ · נוכחי 330K ₪ · תחזית (+12.0... | שקלול 30/50/20, עבר 285K ₪, נוכחי 330K ₪, תחזית (+12.0%) ... | text
sub-health-services_health                  | keyFindings       | Quality A− · WACC 10.5% · EBITDA מדווח 2026 28.5M ₪ · בסי... | Quality A−, WACC 10.5%, EBITDA מדווח 2026 28.5M ₪, בסיס מ... | text
sub-health-services_health                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 24.6M ₪ · נוכחי 28.5M ₪ · תחזית (+12... | שקלול 30/50/20, עבר 24.6M ₪, נוכחי 28.5M ₪, תחזית (+12.0%... | text
sub-services-consulting                     | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 1.8M ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 1.8M ₪, בסיס מכפ... | text
sub-services-consulting                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.6M ₪ · נוכחי 1.8M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.6M ₪, נוכחי 1.8M ₪, תחזית (+6.0%) 1... | text
sub-services-legal                          | keyFindings       | Quality B− · WACC 14.8% · EBITDA מדווח 2026 225K ₪ · בסיס... | Quality B−, WACC 14.8%, EBITDA מדווח 2026 225K ₪, בסיס מכ... | text
sub-services-legal                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 205K ₪ · נוכחי 225K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 205K ₪, נוכחי 225K ₪, תחזית (+6.0%) 2... | text
sub-services-accounting                     | keyFindings       | Quality B · WACC 11.1% · EBITDA מדווח 2026 37.5M ₪ · בסיס... | Quality B, WACC 11.1%, EBITDA מדווח 2026 37.5M ₪, בסיס מכ... | text
sub-services-accounting                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 34.2M ₪ · נוכחי 37.5M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 34.2M ₪, נוכחי 37.5M ₪, תחזית (+6.0%)... | text
sub-services-marketing                      | keyFindings       | Quality B− · WACC 14.5% · EBITDA מדווח 2026 375K ₪ · בסיס... | Quality B−, WACC 14.5%, EBITDA מדווח 2026 375K ₪, בסיס מכ... | text
sub-services-marketing                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 342K ₪ · נוכחי 375K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 342K ₪, נוכחי 375K ₪, תחזית (+6.0%) 3... | text
sub-industry-manufacturing                  | keyFindings       | Quality B− · WACC 13.0% · EBITDA מדווח 2026 300.0M ₪ · בס... | Quality B−, WACC 13.0%, EBITDA מדווח 2026 300.0M ₪, בסיס ... | text
sub-industry-manufacturing                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 273.8M ₪ · נוכחי 300.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 273.8M ₪, נוכחי 300.0M ₪, תחזית (+5.0... | text
sub-industry-distribution                   | keyFindings       | Quality B− · WACC 9.4% · EBITDA מדווח 2026 36.0M ₪ · בסיס... | Quality B−, WACC 9.4%, EBITDA מדווח 2026 36.0M ₪, בסיס מכ... | text
sub-industry-distribution                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 32.9M ₪ · נוכחי 36.0M ₪ · תחזית (+5.... | שקלול 30/50/20, עבר 32.9M ₪, נוכחי 36.0M ₪, תחזית (+5.0%)... | text
sub-industry-food_bev                       | keyFindings       | Quality B− · WACC 12.0% · EBITDA מדווח 2026 2.6M ₪ · בסיס... | Quality B−, WACC 12.0%, EBITDA מדווח 2026 2.6M ₪, בסיס מכ... | text
sub-industry-food_bev                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.4M ₪ · נוכחי 2.6M ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 2.4M ₪, נוכחי 2.6M ₪, תחזית (+5.0%) 2... | text
sub-industry-traditional                    | keyFindings       | Quality B− · WACC 11.6% · EBITDA מדווח 2026 12.0M ₪ · בסי... | Quality B−, WACC 11.6%, EBITDA מדווח 2026 12.0M ₪, בסיס מ... | text
sub-industry-traditional                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 11.0M ₪ · נוכחי 12.0M ₪ · תחזית (+5.... | שקלול 30/50/20, עבר 11.0M ₪, נוכחי 12.0M ₪, תחזית (+5.0%)... | text
sub-retail_unified-retail-supermarkets      | keyFindings       | Quality C+ · WACC 9.9% · EBITDA מדווח 2026 400.0M ₪ · בסי... | Quality C+, WACC 9.9%, EBITDA מדווח 2026 400.0M ₪, בסיס מ... | text
sub-retail_unified-retail-supermarkets      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 357.1M ₪ · נוכחי 400.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 357.1M ₪, נוכחי 400.0M ₪, תחזית (+5.0... | text
sub-retail_unified-d2c                      | keyFindings       | Quality C+ · WACC 14.7% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | Quality C+, WACC 14.7%, EBITDA מדווח 2026 2.4M ₪, בסיס מכ... | text
sub-retail_unified-d2c                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.1M ₪ · נוכחי 2.4M ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 2.1M ₪, נוכחי 2.4M ₪, תחזית (+5.0%) 2... | text
sub-retail_unified-retail-fashion           | keyFindings       | Quality C+ · WACC 15.0% · EBITDA מדווח 2026 320K ₪ · בסיס... | Quality C+, WACC 15.0%, EBITDA מדווח 2026 320K ₪, בסיס מכ... | text
sub-retail_unified-retail-fashion           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 286K ₪ · נוכחי 320K ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 286K ₪, נוכחי 320K ₪, תחזית (+5.0%) 3... | text
sub-retail_unified-marketplace              | keyFindings       | Quality C+ · WACC 16.9% · EBITDA מדווח 2026 720K ₪ · בסיס... | Quality C+, WACC 16.9%, EBITDA מדווח 2026 720K ₪, בסיס מכ... | text
sub-retail_unified-marketplace              | ebitdaBlendedNote | שקלול 30/50/20 · עבר 643K ₪ · נוכחי 720K ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 643K ₪, נוכחי 720K ₪, תחזית (+5.0%) 7... | text
sub-retail_unified-specialty                | keyFindings       | Quality C+ · WACC 15.0% · EBITDA מדווח 2026 64K ₪ · בסיס ... | Quality C+, WACC 15.0%, EBITDA מדווח 2026 64K ₪, בסיס מכפ... | text
sub-retail_unified-specialty                | ebitdaBlendedNote | שקלול 30/50/20 · עבר 57K ₪ · נוכחי 64K ₪ · תחזית (+5.0%) ... | שקלול 30/50/20, עבר 57K ₪, נוכחי 64K ₪, תחזית (+5.0%) 67K... | text
sub-food_service-restaurant                 | keyFindings       | Quality B− · WACC 10.2% · EBITDA מדווח 2026 26.6M ₪ · בסי... | Quality B−, WACC 10.2%, EBITDA מדווח 2026 26.6M ₪, בסיס מ... | text
sub-food_service-restaurant                 | ebitdaBlendedNote | שקלול 30/50/20 · עבר 24.2M ₪ · נוכחי 26.6M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 24.2M ₪, נוכחי 26.6M ₪, תחזית (+6.0%)... | text
sub-food_service-cafe                       | keyFindings       | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 84K ₪ · בסיס ... | Quality C+, WACC 13.5%, EBITDA מדווח 2026 84K ₪, בסיס מכפ... | text
sub-food_service-cafe                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 76K ₪ · נוכחי 84K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 76K ₪, נוכחי 84K ₪, תחזית (+6.0%) 89K... | text
sub-food_service-catering                   | keyFindings       | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 252K ₪ · בסיס... | Quality C+, WACC 13.5%, EBITDA מדווח 2026 252K ₪, בסיס מכ... | text
sub-food_service-catering                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 229K ₪ · נוכחי 252K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 229K ₪, נוכחי 252K ₪, תחזית (+6.0%) 2... | text
sub-food_service-franchise                  | keyFindings       | Quality B− · WACC 10.2% · EBITDA מדווח 2026 35.0M ₪ · בסי... | Quality B−, WACC 10.2%, EBITDA מדווח 2026 35.0M ₪, בסיס מ... | text
sub-food_service-franchise                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 31.8M ₪ · נוכחי 35.0M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 31.8M ₪, נוכחי 35.0M ₪, תחזית (+6.0%)... | text
sub-food_service-delivery                   | keyFindings       | Quality C+ · WACC 13.5% · EBITDA מדווח 2026 448K ₪ · בסיס... | Quality C+, WACC 13.5%, EBITDA מדווח 2026 448K ₪, בסיס מכ... | text
sub-food_service-delivery                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 408K ₪ · נוכחי 448K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 408K ₪, נוכחי 448K ₪, תחזית (+6.0%) 4... | text
sub-energy-solar                            | keyFindings       | Quality B+ · WACC 9.9% · EBITDA מדווח 2026 26.3M ₪ · בסיס... | Quality B+, WACC 9.9%, EBITDA מדווח 2026 26.3M ₪, בסיס מכ... | text
sub-energy-solar                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 17.6M ₪ · נוכחי 19.4M ₪ · תחזית (+10... | שקלול 30/50/20, עבר 17.6M ₪, נוכחי 19.4M ₪, תחזית (+10.0%... | text
sub-energy-storage                          | keyFindings       | Quality B+ · WACC 9.4% · EBITDA מדווח 2026 105.0M ₪ · בסי... | Quality B+, WACC 9.4%, EBITDA מדווח 2026 105.0M ₪, בסיס מ... | text
sub-energy-storage                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 70.2M ₪ · נוכחי 77.7M ₪ · תחזית (+10... | שקלול 30/50/20, עבר 70.2M ₪, נוכחי 77.7M ₪, תחזית (+10.0%... | text
sub-energy-wind                             | keyFindings       | Quality B+ · WACC 10.9% · EBITDA מדווח 2026 7.7M ₪ · בסיס... | Quality B+, WACC 10.9%, EBITDA מדווח 2026 7.7M ₪, בסיס מכ... | text
sub-energy-wind                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר 5.2M ₪ · נוכחי 5.7M ₪ · תחזית (+10.0... | שקלול 30/50/20, עבר 5.2M ₪, נוכחי 5.7M ₪, תחזית (+10.0%) ... | text
sub-energy-services_energy                  | keyFindings       | Quality B+ · WACC 10.1% · EBITDA מדווח 2026 35.0M ₪ · בסי... | Quality B+, WACC 10.1%, EBITDA מדווח 2026 35.0M ₪, בסיס מ... | text
sub-energy-services_energy                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 23.4M ₪ · נוכחי 25.9M ₪ · תחזית (+10... | שקלול 30/50/20, עבר 23.4M ₪, נוכחי 25.9M ₪, תחזית (+10.0%... | text
sub-defense_aerospace-defense_manufacturing | keyFindings       | Quality B+ · WACC 11.9% · EBITDA מדווח 2026 252.0M ₪ · בס... | Quality B+, WACC 11.9%, EBITDA מדווח 2026 252.0M ₪, בסיס ... | text
sub-defense_aerospace-defense_manufacturing | ebitdaBlendedNote | שקלול 30/50/20 · עבר 222.9M ₪ · נוכחי 252.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 222.9M ₪, נוכחי 252.0M ₪, תחזית (+9.0... | text
sub-defense_aerospace-aviation_space        | keyFindings       | Quality B+ · WACC 15.0% · EBITDA מדווח 2026 4.2M ₪ · בסיס... | Quality B+, WACC 15.0%, EBITDA מדווח 2026 4.2M ₪, בסיס מכ... | text
sub-defense_aerospace-aviation_space        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 3.7M ₪ · נוכחי 4.2M ₪ · תחזית (+9.0%... | שקלול 30/50/20, עבר 3.7M ₪, נוכחי 4.2M ₪, תחזית (+9.0%) 4... | text
sub-defense_aerospace-defense_tech          | keyFindings       | Quality B+ · WACC 11.9% · EBITDA מדווח 2026 19.6M ₪ · בסי... | Quality B+, WACC 11.9%, EBITDA מדווח 2026 19.6M ₪, בסיס מ... | text
sub-defense_aerospace-defense_tech          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 17.3M ₪ · נוכחי 19.6M ₪ · תחזית (+9.... | שקלול 30/50/20, עבר 17.3M ₪, נוכחי 19.6M ₪, תחזית (+9.0%)... | text
sub-real_estate-re_development              | keyFindings       | Quality B · WACC 8.8% · EBITDA מדווח 2026 1.6M ₪ · בסיס מ... | Quality B, WACC 8.8%, EBITDA מדווח 2026 1.6M ₪, בסיס מכפי... | text
sub-real_estate-re_development              | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.5M ₪ · נוכחי 1.6M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.5M ₪, נוכחי 1.6M ₪, תחזית (+6.0%) 1... | text
sub-real_estate-re_income                   | keyFindings       | Quality B · WACC 9.6% · EBITDA מדווח 2026 7.2M ₪ · בסיס מ... | Quality B, WACC 9.6%, EBITDA מדווח 2026 7.2M ₪, בסיס מכפי... | text
sub-real_estate-re_income                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.6M ₪ · נוכחי 7.2M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.6M ₪, נוכחי 7.2M ₪, תחזית (+6.0%) 7... | text
sub-real_estate-construction_contracting    | keyFindings       | Quality B · WACC 9.5% · EBITDA מדווח 2026 34.2M ₪ · בסיס ... | Quality B, WACC 9.5%, EBITDA מדווח 2026 34.2M ₪, בסיס מכפ... | text
sub-real_estate-construction_contracting    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 31.4M ₪ · נוכחי 34.2M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 31.4M ₪, נוכחי 34.2M ₪, תחזית (+6.0%)... | text
sub-real_estate-proptech                    | keyFindings       | Quality B · WACC 10.5% · EBITDA מדווח 2026 2.2M ₪ · בסיס ... | Quality B, WACC 10.5%, EBITDA מדווח 2026 2.2M ₪, בסיס מכפ... | text
sub-real_estate-proptech                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.0M ₪ · נוכחי 2.2M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.0M ₪, נוכחי 2.2M ₪, תחזית (+6.0%) 2... | text
sub-other-general                           | keyFindings       | Quality B− · WACC 13.4% · EBITDA מדווח 2026 6.6M ₪ · בסיס... | Quality B−, WACC 13.4%, EBITDA מדווח 2026 6.6M ₪, בסיס מכ... | text
sub-other-general                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.0M ₪ · נוכחי 6.6M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.0M ₪, נוכחי 6.6M ₪, תחזית (+6.0%) 7... | text
edge-loss-all-years                         | keyFindings       | Quality B+ · WACC 13.4% · EBITDA מדווח 2026 -500K ₪ · בסי... | Quality B+, WACC 13.4%, EBITDA מדווח 2026 -500K ₪, בסיס מ... | text
edge-loss-all-years                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר -700K ₪ · נוכחי -500K ₪ · תחזית (+12... | שקלול 30/50/20, עבר -700K ₪, נוכחי -500K ₪, תחזית (+12.0%... | text
edge-thin-margin                            | keyFindings       | Quality B · WACC 15.2% · EBITDA מדווח 2026 400K ₪ · בסיס ... | Quality B, WACC 15.2%, EBITDA מדווח 2026 400K ₪, בסיס מכפ... | text
edge-thin-margin                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 420K ₪ · נוכחי 400K ₪ · תחזית (+4.0%... | שקלול 30/50/20, עבר 420K ₪, נוכחי 400K ₪, תחזית (+4.0%) 4... | text
edge-neg-to-pos                             | keyFindings       | Quality B+ · WACC 18.5% · EBITDA מדווח 2026 900K ₪ · בסיס... | Quality B+, WACC 18.5%, EBITDA מדווח 2026 900K ₪, בסיס מכ... | text
edge-neg-to-pos                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר -200K ₪ · נוכחי 900K ₪ · תחזית (+30.... | שקלול 30/50/20, עבר -200K ₪, נוכחי 900K ₪, תחזית (+30.0%)... | text
edge-big-backlog                            | keyFindings       | Quality B+ · WACC 14.3% · EBITDA מדווח 2026 7.3M ₪ · בסיס... | Quality B+, WACC 14.3%, EBITDA מדווח 2026 7.3M ₪, בסיס מכ... | text
edge-big-backlog                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.1M ₪ · נוכחי 7.3M ₪ · תחזית (+12.0... | שקלול 30/50/20, עבר 6.1M ₪, נוכחי 7.3M ₪, תחזית (+12.0%) ... | text
edge-net-cash                               | keyFindings       | Quality B+ · WACC 16.5% · EBITDA מדווח 2026 5.0M ₪ · בסיס... | Quality B+, WACC 16.5%, EBITDA מדווח 2026 5.0M ₪, בסיס מכ... | text
edge-net-cash                               | ebitdaBlendedNote | שקלול 30/50/20 · עבר 3.5M ₪ · נוכחי 5.0M ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 3.5M ₪, נוכחי 5.0M ₪, תחזית (+22.0%) ... | text
edge-debt-over-ev                           | keyFindings       | Quality B · WACC 12.3% · EBITDA מדווח 2026 1.6M ₪ · בסיס ... | Quality B, WACC 12.3%, EBITDA מדווח 2026 1.6M ₪, בסיס מכפ... | text
edge-debt-over-ev                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.6M ₪ · נוכחי 1.6M ₪ · תחזית (+3.0%... | שקלול 30/50/20, עבר 1.6M ₪, נוכחי 1.6M ₪, תחזית (+3.0%) 1... | text
edge-usd                                    | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 $1.4M · בסיס ... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 $1.4M, בסיס מכפ... | text
edge-usd                                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר $780K · נוכחי $1.4M · תחזית (+28.0%)... | שקלול 30/50/20, עבר $780K, נוכחי $1.4M, תחזית (+28.0%) $1... | text
edge-eur                                    | keyFindings       | Quality B · WACC 11.7% · EBITDA מדווח 2026 €1.1M · בסיס מ... | Quality B, WACC 11.7%, EBITDA מדווח 2026 €1.1M, בסיס מכפי... | text
edge-eur                                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר €1.1M · נוכחי €1.1M · תחזית (+5.0%) ... | שקלול 30/50/20, עבר €1.1M, נוכחי €1.1M, תחזית (+5.0%) €1.... | text
edge-manual-multiple                        | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 3.0M ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 3.0M ₪, בסיס מכפ... | text
edge-manual-multiple                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
edge-no-owner-no-history                    | keyFindings       | Quality B− · WACC 14.7% · EBITDA מדווח 2026 800K ₪ · בסיס... | Quality B−, WACC 14.7%, EBITDA מדווח 2026 800K ₪, בסיס מכ... | text
edge-no-owner-no-history                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר — · נוכחי 800K ₪ · תחזית (+10.0%) 88... | שקלול 30/50/20, עבר אין נתון, נוכחי 800K ₪, תחזית (+10.0%... | text
ladder-services-300                         | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 45K ₪ · בסיס מ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 45K ₪, בסיס מכפי... | text
ladder-services-300                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 41K ₪ · נוכחי 45K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 41K ₪, נוכחי 45K ₪, תחזית (+6.0%) 48K... | text
ladder-services-2000                        | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 300K ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 300K ₪, בסיס מכפ... | text
ladder-services-2000                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 274K ₪ · נוכחי 300K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 274K ₪, נוכחי 300K ₪, תחזית (+6.0%) 3... | text
ladder-services-4950                        | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 743K ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 743K ₪, בסיס מכפ... | text
ladder-services-4950                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 677K ₪ · נוכחי 743K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 677K ₪, נוכחי 743K ₪, תחזית (+6.0%) 7... | text
ladder-services-5050                        | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 758K ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 758K ₪, בסיס מכפ... | text
ladder-services-5050                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 691K ₪ · נוכחי 758K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 691K ₪, נוכחי 758K ₪, תחזית (+6.0%) 8... | text
ladder-services-10000                       | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 1.5M ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 1.5M ₪, בסיס מכפ... | text
ladder-services-10000                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.4M ₪ · נוכחי 1.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.4M ₪, נוכחי 1.5M ₪, תחזית (+6.0%) 1... | text
ladder-services-19800                       | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 3.0M ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 3.0M ₪, בסיס מכפ... | text
ladder-services-19800                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-services-20200                       | keyFindings       | Quality B · WACC 14.2% · EBITDA מדווח 2026 3.0M ₪ · בסיס ... | Quality B, WACC 14.2%, EBITDA מדווח 2026 3.0M ₪, בסיס מכפ... | text
ladder-services-20200                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-services-50000                       | keyFindings       | Quality B · WACC 13.4% · EBITDA מדווח 2026 7.5M ₪ · בסיס ... | Quality B, WACC 13.4%, EBITDA מדווח 2026 7.5M ₪, בסיס מכפ... | text
ladder-services-50000                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.8M ₪ · נוכחי 7.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.8M ₪, נוכחי 7.5M ₪, תחזית (+6.0%) 8... | text
ladder-services-118800                      | keyFindings       | Quality B · WACC 11.1% · EBITDA מדווח 2026 17.8M ₪ · בסיס... | Quality B, WACC 11.1%, EBITDA מדווח 2026 17.8M ₪, בסיס מכ... | text
ladder-services-118800                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.3M ₪ · נוכחי 17.8M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.3M ₪, נוכחי 17.8M ₪, תחזית (+6.0%)... | text
ladder-services-121200                      | keyFindings       | Quality B · WACC 11.1% · EBITDA מדווח 2026 18.2M ₪ · בסיס... | Quality B, WACC 11.1%, EBITDA מדווח 2026 18.2M ₪, בסיס מכ... | text
ladder-services-121200                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.6M ₪ · נוכחי 18.2M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.6M ₪, נוכחי 18.2M ₪, תחזית (+6.0%)... | text
ladder-services-200000                      | keyFindings       | Quality B · WACC 11.1% · EBITDA מדווח 2026 30.0M ₪ · בסיס... | Quality B, WACC 11.1%, EBITDA מדווח 2026 30.0M ₪, בסיס מכ... | text
ladder-services-200000                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 27.4M ₪ · נוכחי 30.0M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 27.4M ₪, נוכחי 30.0M ₪, תחזית (+6.0%)... | text
ladder-services-1000000                     | keyFindings       | Quality B · WACC 11.1% · EBITDA מדווח 2026 150.0M ₪ · בסי... | Quality B, WACC 11.1%, EBITDA מדווח 2026 150.0M ₪, בסיס מ... | text
ladder-services-1000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 136.8M ₪ · נוכחי 150.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 136.8M ₪, נוכחי 150.0M ₪, תחזית (+6.0... | text
ladder-services-5000000                     | keyFindings       | Quality B · WACC 11.1% · EBITDA מדווח 2026 750.0M ₪ · בסי... | Quality B, WACC 11.1%, EBITDA מדווח 2026 750.0M ₪, בסיס מ... | text
ladder-services-5000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 684.0M ₪ · נוכחי 750.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 684.0M ₪, נוכחי 750.0M ₪, תחזית (+6.0... | text
ladder-industry-300                         | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 45K ₪ · בסיס ... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 45K ₪, בסיס מכפ... | text
ladder-industry-300                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 41K ₪ · נוכחי 45K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 41K ₪, נוכחי 45K ₪, תחזית (+6.0%) 48K... | text
ladder-industry-2000                        | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 300K ₪ · בסיס... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 300K ₪, בסיס מכ... | text
ladder-industry-2000                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 274K ₪ · נוכחי 300K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 274K ₪, נוכחי 300K ₪, תחזית (+6.0%) 3... | text
ladder-industry-4950                        | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 743K ₪ · בסיס... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 743K ₪, בסיס מכ... | text
ladder-industry-4950                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 677K ₪ · נוכחי 743K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 677K ₪, נוכחי 743K ₪, תחזית (+6.0%) 7... | text
ladder-industry-5050                        | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 758K ₪ · בסיס... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 758K ₪, בסיס מכ... | text
ladder-industry-5050                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 691K ₪ · נוכחי 758K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 691K ₪, נוכחי 758K ₪, תחזית (+6.0%) 8... | text
ladder-industry-10000                       | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 1.5M ₪ · בסיס... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 1.5M ₪, בסיס מכ... | text
ladder-industry-10000                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.4M ₪ · נוכחי 1.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.4M ₪, נוכחי 1.5M ₪, תחזית (+6.0%) 1... | text
ladder-industry-19800                       | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-industry-19800                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-industry-20200                       | keyFindings       | Quality B− · WACC 16.3% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B−, WACC 16.3%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-industry-20200                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-industry-50000                       | keyFindings       | Quality B− · WACC 15.5% · EBITDA מדווח 2026 7.5M ₪ · בסיס... | Quality B−, WACC 15.5%, EBITDA מדווח 2026 7.5M ₪, בסיס מכ... | text
ladder-industry-50000                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.8M ₪ · נוכחי 7.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.8M ₪, נוכחי 7.5M ₪, תחזית (+6.0%) 8... | text
ladder-industry-118800                      | keyFindings       | Quality B− · WACC 13.0% · EBITDA מדווח 2026 17.8M ₪ · בסי... | Quality B−, WACC 13.0%, EBITDA מדווח 2026 17.8M ₪, בסיס מ... | text
ladder-industry-118800                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.3M ₪ · נוכחי 17.8M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.3M ₪, נוכחי 17.8M ₪, תחזית (+6.0%)... | text
ladder-industry-121200                      | keyFindings       | Quality B− · WACC 13.0% · EBITDA מדווח 2026 18.2M ₪ · בסי... | Quality B−, WACC 13.0%, EBITDA מדווח 2026 18.2M ₪, בסיס מ... | text
ladder-industry-121200                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.6M ₪ · נוכחי 18.2M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.6M ₪, נוכחי 18.2M ₪, תחזית (+6.0%)... | text
ladder-industry-200000                      | keyFindings       | Quality B− · WACC 13.0% · EBITDA מדווח 2026 30.0M ₪ · בסי... | Quality B−, WACC 13.0%, EBITDA מדווח 2026 30.0M ₪, בסיס מ... | text
ladder-industry-200000                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 27.4M ₪ · נוכחי 30.0M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 27.4M ₪, נוכחי 30.0M ₪, תחזית (+6.0%)... | text
ladder-industry-1000000                     | keyFindings       | Quality B− · WACC 13.0% · EBITDA מדווח 2026 150.0M ₪ · בס... | Quality B−, WACC 13.0%, EBITDA מדווח 2026 150.0M ₪, בסיס ... | text
ladder-industry-1000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 136.8M ₪ · נוכחי 150.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 136.8M ₪, נוכחי 150.0M ₪, תחזית (+6.0... | text
ladder-industry-5000000                     | keyFindings       | Quality B− · WACC 13.0% · EBITDA מדווח 2026 750.0M ₪ · בס... | Quality B−, WACC 13.0%, EBITDA מדווח 2026 750.0M ₪, בסיס ... | text
ladder-industry-5000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 684.0M ₪ · נוכחי 750.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 684.0M ₪, נוכחי 750.0M ₪, תחזית (+6.0... | text
ladder-saas-300                             | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 45K ₪ · בסיס ... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 45K ₪, בסיס מכפ... | text
ladder-saas-300                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר 41K ₪ · נוכחי 45K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 41K ₪, נוכחי 45K ₪, תחזית (+6.0%) 48K... | text
ladder-saas-2000                            | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 300K ₪ · בסיס... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 300K ₪, בסיס מכ... | text
ladder-saas-2000                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 274K ₪ · נוכחי 300K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 274K ₪, נוכחי 300K ₪, תחזית (+6.0%) 3... | text
ladder-saas-4950                            | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 743K ₪ · בסיס... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 743K ₪, בסיס מכ... | text
ladder-saas-4950                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 677K ₪ · נוכחי 743K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 677K ₪, נוכחי 743K ₪, תחזית (+6.0%) 7... | text
ladder-saas-5050                            | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 758K ₪ · בסיס... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 758K ₪, בסיס מכ... | text
ladder-saas-5050                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 691K ₪ · נוכחי 758K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 691K ₪, נוכחי 758K ₪, תחזית (+6.0%) 8... | text
ladder-saas-10000                           | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 1.5M ₪ · בסיס... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 1.5M ₪, בסיס מכ... | text
ladder-saas-10000                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.4M ₪ · נוכחי 1.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.4M ₪, נוכחי 1.5M ₪, תחזית (+6.0%) 1... | text
ladder-saas-19800                           | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-saas-19800                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-saas-20200                           | keyFindings       | Quality B+ · WACC 16.8% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B+, WACC 16.8%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-saas-20200                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
... and 570 more rows
```

