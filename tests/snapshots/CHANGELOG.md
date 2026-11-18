# שינויים ב snapshot

כל עדכון של tests/snapshots נרשם כאן עם סיבה.

## 2026-11-17

סיבה: בסיס ראשון של רשת הביטחון (סבב 1, לפני כל תיקון)

תיקים חדשים: 371. שדות שהשתנו: 0. מפת מתודולוגיה השתנתה: כן.

## 2026-11-17

סיבה: הוספת 14 תיקי הזהב לסט ה snapshot

תיקים חדשים: 14. שדות שהשתנו: 0. מפת מתודולוגיה השתנתה: לא.

## 2026-11-17

סיבה: סבב 2 חלק ב2 (ממצא 16): טבלת ה DCF מציגה את ה FCFF והערך הטרמינלי אחרי enforceCapexMonotonicity, כך שהיא מסתכמת לשווי ה DCF. שדות תצוגה בלבד; שווי לבעלים, EV, דוב, שור, הרגליים וה WACC זהים (tests/snapshots/value-lock.json).

תיקים חדשים: 0. שדות שהשתנו: 1228. מפת מתודולוגיה השתנתה: לא.

```
case                           | field       | before | after  | diff   
-------------------------------|-------------|--------|--------|--------
anchor-2-saas                  | fcffM[0]    | 1.63   | 1.54   | -5.52% 
anchor-2-saas                  | fcffM[1]    | 1.68   | 1.59   | -5.36% 
anchor-2-saas                  | fcffM[2]    | 1.72   | 1.62   | -5.81% 
anchor-2-saas                  | fcffM[3]    | 1.75   | 1.65   | -5.71% 
anchor-2-saas                  | fcffM[4]    | 1.81   | 1.71   | -5.52% 
anchor-2-saas                  | terminalPvM | 2.55   | 2.4    | -5.88% 
anchor-3-contractor            | fcffM[0]    | 0.83   | 1.42   | 71.08% 
anchor-3-contractor            | fcffM[1]    | 0.86   | 1.48   | 72.09% 
anchor-3-contractor            | fcffM[2]    | 0.89   | 1.52   | 70.79% 
anchor-3-contractor            | fcffM[3]    | 0.91   | 1.55   | 70.33% 
anchor-3-contractor            | fcffM[4]    | 0.94   | 1.6    | 70.21% 
anchor-3-contractor            | terminalPvM | 1.45   | 2.48   | 71.03% 
anchor-4-accounting            | fcffM[0]    | 0.4    | 0.39   | -2.50% 
anchor-4-accounting            | fcffM[1]    | 0.41   | 0.4    | -2.44% 
anchor-4-accounting            | fcffM[2]    | 0.42   | 0.41   | -2.38% 
anchor-4-accounting            | fcffM[3]    | 0.42   | 0.41   | -2.38% 
anchor-5-young-factory         | fcffM[0]    | 0.44   | 0.7    | 59.09% 
anchor-5-young-factory         | fcffM[1]    | 0.46   | 0.73   | 58.70% 
anchor-5-young-factory         | fcffM[2]    | 0.48   | 0.76   | 58.33% 
anchor-5-young-factory         | fcffM[3]    | 0.49   | 0.79   | 61.22% 
anchor-5-young-factory         | fcffM[4]    | 0.51   | 0.81   | 58.82% 
anchor-5-young-factory         | terminalPvM | 0.8    | 1.27   | 58.75% 
anchor-6-loss-factory          | fcffM[0]    | 0.47   | 0.53   | 12.77% 
anchor-6-loss-factory          | fcffM[1]    | 0.49   | 0.55   | 12.24% 
anchor-6-loss-factory          | fcffM[2]    | 0.51   | 0.57   | 11.76% 
anchor-6-loss-factory          | fcffM[3]    | 0.52   | 0.58   | 11.54% 
anchor-6-loss-factory          | fcffM[4]    | 0.53   | 0.6    | 13.21% 
anchor-6-loss-factory          | terminalPvM | 0.73   | 0.83   | 13.70% 
sub-hospitality-boutique_hotel | fcffM[0]    | 0.92   | 0.84   | -8.70% 
sub-hospitality-boutique_hotel | fcffM[1]    | 0.96   | 0.87   | -9.37% 
sub-hospitality-boutique_hotel | fcffM[2]    | 0.99   | 0.9    | -9.09% 
sub-hospitality-boutique_hotel | fcffM[3]    | 1.01   | 0.92   | -8.91% 
sub-hospitality-boutique_hotel | fcffM[4]    | 1.04   | 0.95   | -8.65% 
sub-hospitality-boutique_hotel | terminalPvM | 1.48   | 1.35   | -8.78% 
sub-hospitality-hotel_chain    | fcffM[0]    | 99.43  | 90.57  | -8.91% 
sub-hospitality-hotel_chain    | fcffM[1]    | 103.54 | 94.31  | -8.91% 
sub-hospitality-hotel_chain    | fcffM[2]    | 106.78 | 97.26  | -8.92% 
sub-hospitality-hotel_chain    | fcffM[3]    | 109.04 | 99.32  | -8.91% 
sub-hospitality-hotel_chain    | fcffM[4]    | 112.64 | 102.6  | -8.91% 
sub-hospitality-hotel_chain    | terminalPvM | 172.1  | 156.76 | -8.91% 
sub-hospitality-vacation       | fcffM[0]    | 21.41  | 19.51  | -8.87% 
sub-hospitality-vacation       | fcffM[1]    | 22.3   | 20.31  | -8.92% 
sub-hospitality-vacation       | fcffM[2]    | 23     | 20.95  | -8.91% 
sub-hospitality-vacation       | fcffM[3]    | 23.49  | 21.39  | -8.94% 
sub-hospitality-vacation       | fcffM[4]    | 24.26  | 22.1   | -8.90% 
sub-hospitality-vacation       | terminalPvM | 37.09  | 33.78  | -8.92% 
sub-hospitality-airbnb_mgmt    | fcffM[0]    | 0.14   | 0.13   | -7.14% 
sub-hospitality-airbnb_mgmt    | fcffM[1]    | 0.14   | 0.13   | -7.14% 
sub-hospitality-airbnb_mgmt    | fcffM[2]    | 0.15   | 0.13   | -13.33%
sub-hospitality-airbnb_mgmt    | fcffM[3]    | 0.15   | 0.14   | -6.67% 
sub-hospitality-airbnb_mgmt    | fcffM[4]    | 0.16   | 0.14   | -12.50%
sub-hospitality-airbnb_mgmt    | terminalPvM | 0.22   | 0.2    | -9.09% 
sub-saas-b2b_saas              | fcffM[0]    | 5.46   | 5.15   | -5.68% 
sub-saas-b2b_saas              | fcffM[1]    | 5.63   | 5.31   | -5.68% 
sub-saas-b2b_saas              | fcffM[2]    | 5.77   | 5.44   | -5.72% 
sub-saas-b2b_saas              | fcffM[3]    | 5.87   | 5.53   | -5.79% 
sub-saas-b2b_saas              | fcffM[4]    | 6.06   | 5.71   | -5.78% 
sub-saas-b2b_saas              | terminalPvM | 8.76   | 8.26   | -5.71% 
sub-saas-b2c_saas              | fcffM[0]    | 25.94  | 24.45  | -5.74% 
sub-saas-b2c_saas              | fcffM[1]    | 26.77  | 25.23  | -5.75% 
sub-saas-b2c_saas              | fcffM[2]    | 27.41  | 25.84  | -5.73% 
sub-saas-b2c_saas              | fcffM[3]    | 27.86  | 26.26  | -5.74% 
sub-saas-b2c_saas              | fcffM[4]    | 28.78  | 27.13  | -5.73% 
sub-saas-b2c_saas              | terminalPvM | 43.18  | 40.7   | -5.74% 
sub-saas-devtools              | fcffM[0]    | 1.64   | 1.54   | -6.10% 
sub-saas-devtools              | fcffM[1]    | 1.69   | 1.59   | -5.92% 
sub-saas-devtools              | fcffM[2]    | 1.73   | 1.63   | -5.78% 
sub-saas-devtools              | fcffM[3]    | 1.76   | 1.66   | -5.68% 
sub-saas-devtools              | fcffM[4]    | 1.82   | 1.71   | -6.04% 
sub-saas-devtools              | terminalPvM | 2.6    | 2.45   | -5.77% 
sub-saas-marketplace           | fcffM[0]    | 7.51   | 7.08   | -5.73% 
sub-saas-marketplace           | fcffM[1]    | 7.75   | 7.3    | -5.81% 
sub-saas-marketplace           | fcffM[2]    | 7.93   | 7.48   | -5.67% 
sub-saas-marketplace           | fcffM[3]    | 8.06   | 7.6    | -5.71% 
sub-saas-marketplace           | fcffM[4]    | 8.33   | 7.85   | -5.76% 
sub-saas-marketplace           | terminalPvM | 12.15  | 11.45  | -5.76% 
sub-fintech-payments           | fcffM[0]    | 183.3  | 172.74 | -5.76% 
sub-fintech-payments           | fcffM[1]    | 189.16 | 178.26 | -5.76% 
sub-fintech-payments           | fcffM[2]    | 193.72 | 182.56 | -5.76% 
sub-fintech-payments           | fcffM[3]    | 196.89 | 185.54 | -5.76% 
sub-fintech-payments           | fcffM[4]    | 203.39 | 191.66 | -5.77% 
sub-fintech-payments           | terminalPvM | 307.28 | 289.57 | -5.76% 
sub-fintech-lending            | fcffM[0]    | 2.44   | 2.3    | -5.74% 
sub-fintech-lending            | fcffM[1]    | 2.52   | 2.38   | -5.56% 
sub-fintech-lending            | fcffM[2]    | 2.58   | 2.43   | -5.81% 
sub-fintech-lending            | fcffM[3]    | 2.63   | 2.47   | -6.08% 
sub-fintech-lending            | fcffM[4]    | 2.71   | 2.56   | -5.54% 
sub-fintech-lending            | terminalPvM | 3.9    | 3.68   | -5.64% 
sub-fintech-insurtech          | fcffM[0]    | 11.46  | 10.8   | -5.76% 
sub-fintech-insurtech          | fcffM[1]    | 11.82  | 11.14  | -5.75% 
sub-fintech-insurtech          | fcffM[2]    | 12.11  | 11.41  | -5.78% 
sub-fintech-insurtech          | fcffM[3]    | 12.31  | 11.6   | -5.77% 
sub-fintech-insurtech          | fcffM[4]    | 12.71  | 11.98  | -5.74% 
sub-fintech-insurtech          | terminalPvM | 18.87  | 17.78  | -5.78% 
sub-fintech-wealth             | fcffM[0]    | 45.83  | 43.18  | -5.78% 
sub-fintech-wealth             | fcffM[1]    | 47.29  | 44.56  | -5.77% 
sub-fintech-wealth             | fcffM[2]    | 48.43  | 45.64  | -5.76% 
sub-fintech-wealth             | fcffM[3]    | 49.22  | 46.38  | -5.77% 
sub-fintech-wealth             | fcffM[4]    | 50.85  | 47.92  | -5.76% 
sub-fintech-wealth             | terminalPvM | 76.82  | 72.39  | -5.77% 
sub-cyber-enterprise           | fcffM[0]    | 2.68   | 2.53   | -5.60% 
sub-cyber-enterprise           | fcffM[1]    | 2.76   | 2.61   | -5.43% 
sub-cyber-enterprise           | fcffM[2]    | 2.83   | 2.67   | -5.65% 
sub-cyber-enterprise           | fcffM[3]    | 2.88   | 2.71   | -5.90% 
sub-cyber-enterprise           | fcffM[4]    | 2.97   | 2.8    | -5.72% 
sub-cyber-enterprise           | terminalPvM | 4.27   | 4.03   | -5.62% 
sub-cyber-cloud                | fcffM[0]    | 12.18  | 11.48  | -5.75% 
sub-cyber-cloud                | fcffM[1]    | 12.57  | 11.84  | -5.81% 
sub-cyber-cloud                | fcffM[2]    | 12.87  | 12.13  | -5.75% 
sub-cyber-cloud                | fcffM[3]    | 13.08  | 12.33  | -5.73% 
sub-cyber-cloud                | fcffM[4]    | 13.51  | 12.73  | -5.77% 
sub-cyber-cloud                | terminalPvM | 20.28  | 19.11  | -5.77% 
sub-cyber-ot                   | fcffM[0]    | 0.73   | 0.69   | -5.48% 
sub-cyber-ot                   | fcffM[1]    | 0.75   | 0.71   | -5.33% 
sub-cyber-ot                   | fcffM[2]    | 0.77   | 0.73   | -5.19% 
sub-cyber-ot                   | fcffM[3]    | 0.78   | 0.74   | -5.13% 
sub-cyber-ot                   | fcffM[4]    | 0.81   | 0.76   | -6.17% 
sub-cyber-ot                   | terminalPvM | 1.16   | 1.1    | -5.17% 
sub-cyber-services_cyber       | fcffM[0]    | 0.43   | 0.4    | -6.98% 
sub-cyber-services_cyber       | fcffM[1]    | 0.44   | 0.41   | -6.82% 
sub-cyber-services_cyber       | fcffM[2]    | 0.45   | 0.42   | -6.67% 
sub-cyber-services_cyber       | fcffM[3]    | 0.46   | 0.43   | -6.52% 
sub-cyber-services_cyber       | fcffM[4]    | 0.47   | 0.45   | -4.26% 
sub-cyber-services_cyber       | terminalPvM | 0.67   | 0.63   | -5.97% 
sub-services-consulting        | fcffM[0]    | 1.43   | 1.41   | -1.40% 
sub-services-consulting        | fcffM[1]    | 1.47   | 1.45   | -1.36% 
sub-services-consulting        | fcffM[2]    | 1.5    | 1.48   | -1.33% 
sub-services-consulting        | fcffM[3]    | 1.52   | 1.49   | -1.97% 
sub-services-consulting        | fcffM[4]    | 1.57   | 1.54   | -1.91% 
sub-services-consulting        | terminalPvM | 2.3    | 2.26   | -1.74% 
sub-services-legal             | fcffM[2]    | 0.19   | 0.18   | -5.26% 
sub-services-legal             | fcffM[4]    | 0.2    | 0.19   | -5.00% 
sub-services-accounting        | fcffM[0]    | 29.84  | 29.39  | -1.51% 
sub-services-accounting        | fcffM[1]    | 30.61  | 30.15  | -1.50% 
sub-services-accounting        | fcffM[2]    | 31.2   | 30.73  | -1.51% 
sub-services-accounting        | fcffM[3]    | 31.61  | 31.13  | -1.52% 
sub-services-accounting        | fcffM[4]    | 32.65  | 32.16  | -1.50% 
sub-services-accounting        | terminalPvM | 50.97  | 50.2   | -1.51% 
sub-services-marketing         | fcffM[0]    | 0.3    | 0.29   | -3.33% 
sub-services-marketing         | fcffM[1]    | 0.31   | 0.3    | -3.23% 
sub-services-marketing         | fcffM[3]    | 0.32   | 0.31   | -3.13% 
sub-services-marketing         | fcffM[4]    | 0.33   | 0.32   | -3.03% 
sub-industry-manufacturing     | fcffM[0]    | 89.09  | 144.33 | 62.00% 
sub-industry-manufacturing     | fcffM[1]    | 93.06  | 150.75 | 61.99% 
sub-industry-manufacturing     | fcffM[2]    | 96.19  | 155.83 | 62.00% 
sub-industry-manufacturing     | fcffM[3]    | 98.38  | 159.38 | 62.00% 
sub-industry-manufacturing     | fcffM[4]    | 101.62 | 164.64 | 62.02% 
sub-industry-manufacturing     | terminalPvM | 154.3  | 249.97 | 62.00% 
sub-industry-distribution      | fcffM[0]    | 10.69  | 17.32  | 62.02% 
sub-industry-distribution      | fcffM[1]    | 11.17  | 18.09  | 61.95% 
sub-industry-distribution      | fcffM[2]    | 11.54  | 18.7   | 62.05% 
sub-industry-distribution      | fcffM[3]    | 11.81  | 19.13  | 61.98% 
sub-industry-distribution      | fcffM[4]    | 12.19  | 19.76  | 62.10% 
sub-industry-distribution      | terminalPvM | 18.52  | 30     | 61.99% 
sub-industry-food_bev          | fcffM[0]    | 0.78   | 1.27   | 62.82% 
sub-industry-food_bev          | fcffM[1]    | 0.82   | 1.33   | 62.20% 
sub-industry-food_bev          | fcffM[2]    | 0.85   | 1.37   | 61.18% 
sub-industry-food_bev          | fcffM[3]    | 0.87   | 1.4    | 60.92% 
sub-industry-food_bev          | fcffM[4]    | 0.89   | 1.45   | 62.92% 
sub-industry-food_bev          | terminalPvM | 1.28   | 2.07   | 61.72% 
sub-industry-traditional       | fcffM[0]    | 3.56   | 5.77   | 62.08% 
sub-industry-traditional       | fcffM[1]    | 3.72   | 6.03   | 62.10% 
sub-industry-traditional       | fcffM[2]    | 3.85   | 6.23   | 61.82% 
sub-industry-traditional       | fcffM[3]    | 3.94   | 6.38   | 61.93% 
sub-industry-traditional       | fcffM[4]    | 4.06   | 6.59   | 62.32% 
sub-industry-traditional       | terminalPvM | 6.09   | 9.87   | 62.07% 
sub-real_estate-proptech       | fcffM[0]    | 1.65   | 1.53   | -7.27% 
sub-real_estate-proptech       | fcffM[1]    | 1.71   | 1.59   | -7.02% 
sub-real_estate-proptech       | fcffM[2]    | 1.76   | 1.64   | -6.82% 
sub-real_estate-proptech       | fcffM[3]    | 1.79   | 1.67   | -6.70% 
sub-real_estate-proptech       | fcffM[4]    | 1.85   | 1.72   | -7.03% 
sub-real_estate-proptech       | terminalPvM | 2.69   | 2.5    | -7.06% 
edge-loss-all-years            | fcffM[0]    | 1.28   | 1.45   | 13.28% 
edge-loss-all-years            | fcffM[1]    | 1.33   | 1.5    | 12.78% 
edge-loss-all-years            | fcffM[2]    | 1.38   | 1.55   | 12.32% 
edge-loss-all-years            | fcffM[3]    | 1.41   | 1.58   | 12.06% 
edge-loss-all-years            | fcffM[4]    | 1.45   | 1.63   | 12.41% 
edge-loss-all-years            | terminalPvM | 2      | 2.25   | 12.50% 
edge-thin-margin               | fcffM[0]    | 0.6    | 0.79   | 31.67% 
edge-thin-margin               | fcffM[1]    | 0.62   | 0.81   | 30.65% 
edge-thin-margin               | fcffM[2]    | 0.64   | 0.83   | 29.69% 
edge-thin-margin               | fcffM[3]    | 0.65   | 0.85   | 30.77% 
edge-thin-margin               | fcffM[4]    | 0.67   | 0.87   | 29.85% 
edge-thin-margin               | terminalPvM | 1.03   | 1.35   | 31.07% 
edge-neg-to-pos                | fcffM[0]    | 2.48   | 2.34   | -5.65% 
edge-neg-to-pos                | fcffM[1]    | 2.56   | 2.41   | -5.86% 
edge-neg-to-pos                | fcffM[2]    | 2.62   | 2.47   | -5.73% 
edge-neg-to-pos                | fcffM[3]    | 2.67   | 2.51   | -5.99% 
edge-neg-to-pos                | fcffM[4]    | 2.75   | 2.59   | -5.82% 
edge-neg-to-pos                | terminalPvM | 3.71   | 3.5    | -5.66% 
edge-net-cash                  | fcffM[0]    | 3.7    | 3.49   | -5.68% 
edge-net-cash                  | fcffM[1]    | 3.81   | 3.6    | -5.51% 
edge-net-cash                  | fcffM[2]    | 3.91   | 3.68   | -5.88% 
edge-net-cash                  | fcffM[3]    | 3.97   | 3.74   | -5.79% 
edge-net-cash                  | fcffM[4]    | 4.1    | 3.87   | -5.61% 
edge-net-cash                  | terminalPvM | 5.77   | 5.44   | -5.72% 
edge-usd                       | fcffM[0]    | 0.98   | 0.92   | -6.12% 
edge-usd                       | fcffM[1]    | 1.01   | 0.95   | -5.94% 
edge-usd                       | fcffM[2]    | 1.03   | 0.97   | -5.83% 
edge-usd                       | fcffM[3]    | 1.05   | 0.99   | -5.71% 
... and 1028 more rows
```

## 2026-11-17

סיבה: סבב 2ב, ממצא 28: טבלת ה DCF בעמוד 4 היא התחזית שהמנוע העריך (בהמרת מטבע), ולכן מסתכמת לרגל ה DCF בכל 385 התיקים. השתנו רק שדות תצוגה ב 7 תיקים; השווי, ה EV, הרגליים וה WACC לא זזו (value-lock עובר)

תיקים חדשים: 0. שדות שהשתנו: 43. מפת מתודולוגיה השתנתה: לא.

```
case                   | field            | before                                                       | after                                                        | diff   
-----------------------|------------------|--------------------------------------------------------------|--------------------------------------------------------------|--------
anchor-5-young-factory | fcffM[0]         | 0.7                                                          | 0.36                                                         | -48.57%
anchor-5-young-factory | fcffM[1]         | 0.73                                                         | 0.37                                                         | -49.32%
anchor-5-young-factory | fcffM[2]         | 0.76                                                         | 0.38                                                         | -50.00%
anchor-5-young-factory | fcffM[3]         | 0.79                                                         | 0.38                                                         | -51.90%
anchor-5-young-factory | fcffM[4]         | 0.81                                                         | 0.4                                                          | -50.62%
anchor-5-young-factory | terminalPvM      | 1.27                                                         | 0.64                                                         | -49.61%
anchor-6-loss-factory  | fcffM[0]         | 0.53                                                         | 0.27                                                         | -49.06%
anchor-6-loss-factory  | fcffM[1]         | 0.55                                                         | 0.28                                                         | -49.09%
anchor-6-loss-factory  | fcffM[2]         | 0.57                                                         | 0.29                                                         | -49.12%
anchor-6-loss-factory  | fcffM[3]         | 0.58                                                         | 0.29                                                         | -50.00%
anchor-6-loss-factory  | fcffM[4]         | 0.6                                                          | 0.3                                                          | -50.00%
anchor-6-loss-factory  | terminalPvM      | 0.83                                                         | 0.41                                                         | -50.60%
anchor-7-thin-factory  | fcffM[0]         | 0                                                            | 0.37                                                         | inf    
anchor-7-thin-factory  | fcffM[1]         | 0                                                            | 0.38                                                         | inf    
anchor-7-thin-factory  | fcffM[2]         | 0                                                            | 0.39                                                         | inf    
anchor-7-thin-factory  | fcffM[3]         | 0                                                            | 0.39                                                         | inf    
anchor-7-thin-factory  | fcffM[4]         | 0                                                            | 0.41                                                         | inf    
anchor-7-thin-factory  | terminalPvM      | 0                                                            | 0.66                                                         | inf    
anchor-7-thin-factory  | terminalSharePct | 0                                                            | 29.58                                                        | inf    
anchor-7-thin-factory  | keyFindings      | Quality B− · WACC 9.2% · EBITDA מדווח 2026 200K ₪ · בסיס ... | Quality B− · WACC 9.2% · EBITDA מדווח 2026 200K ₪ · בסיס ... | text   
edge-loss-all-years    | fcffM[0]         | 1.45                                                         | 0.73                                                         | -49.66%
edge-loss-all-years    | fcffM[1]         | 1.5                                                          | 0.76                                                         | -49.33%
edge-loss-all-years    | fcffM[2]         | 1.55                                                         | 0.78                                                         | -49.68%
edge-loss-all-years    | fcffM[3]         | 1.58                                                         | 0.8                                                          | -49.37%
edge-loss-all-years    | fcffM[4]         | 1.63                                                         | 0.82                                                         | -49.69%
edge-loss-all-years    | terminalPvM      | 2.25                                                         | 1.14                                                         | -49.33%
edge-neg-to-pos        | fcffM[0]         | 2.34                                                         | 0.45                                                         | -80.77%
edge-neg-to-pos        | fcffM[1]         | 2.41                                                         | 0.47                                                         | -80.50%
edge-neg-to-pos        | fcffM[2]         | 2.47                                                         | 0.48                                                         | -80.57%
edge-neg-to-pos        | fcffM[3]         | 2.51                                                         | 0.49                                                         | -80.48%
edge-neg-to-pos        | fcffM[4]         | 2.59                                                         | 0.5                                                          | -80.69%
edge-neg-to-pos        | terminalPvM      | 3.5                                                          | 0.68                                                         | -80.57%
edge-usd               | fcffM[0]         | 0.92                                                         | 0.91                                                         | -1.09% 
edge-usd               | fcffM[1]         | 0.95                                                         | 0.94                                                         | -1.05% 
edge-usd               | fcffM[3]         | 0.99                                                         | 0.98                                                         | -1.01% 
edge-eur               | fcffM[0]         | 0                                                            | 0.61                                                         | inf    
edge-eur               | fcffM[1]         | 0                                                            | 0.64                                                         | inf    
edge-eur               | fcffM[2]         | 0                                                            | 0.66                                                         | inf    
edge-eur               | fcffM[3]         | 0                                                            | 0.67                                                         | inf    
edge-eur               | fcffM[4]         | 0                                                            | 0.69                                                         | inf    
edge-eur               | terminalPvM      | 0                                                            | 1.01                                                         | inf    
edge-eur               | terminalSharePct | 0                                                            | 29.58                                                        | inf    
edge-eur               | keyFindings      | Quality B · WACC 13.6% · EBITDA מדווח 2026 €1.1M · בסיס מ... | Quality B · WACC 13.6% · EBITDA מדווח 2026 €1.1M · בסיס מ... | text   
```

## 2026-11-18

סיבה: Round 4 part D (V1, display only): page 5 labels the raw Damodaran range as public companies and shows the range after this company's private company factors (marketability x size) next to it; the position text names both. No snapshot field covers page 5 text, so no field changed. Value-lock passes.

תיקים חדשים: 0. שדות שהשתנו: 0. מפת מתודולוגיה השתנתה: לא.

## 2026-11-18

סיבה: Round 5 (display only): writing rules in report text. keyFindings and ebitdaBlendedNote use commas instead of middle dots and "מה DCF" instead of "מ-DCF". No number changed in any case. Value-lock passes.

תיקים חדשים: 0. שדות שהשתנו: 770. מפת מתודולוגיה השתנתה: לא.

```
case                                        | field             | before                                                       | after                                                        | diff
--------------------------------------------|-------------------|--------------------------------------------------------------|--------------------------------------------------------------|-----
anchor-1-restaurant                         | keyFindings       | Quality C+ · WACC 13.6% · EBITDA מדווח 2026 615K ₪ · בסיס... | Quality C+, WACC 13.6%, EBITDA מדווח 2026 615K ₪, בסיס מכ... | text
anchor-1-restaurant                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 560K ₪ · נוכחי 615K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 560K ₪, נוכחי 615K ₪, תחזית (+6.0%) 6... | text
anchor-2-saas                               | keyFindings       | Quality A · WACC 15.6% · EBITDA מדווח 2026 2.3M ₪ · בסיס ... | Quality A, WACC 15.6%, EBITDA מדווח 2026 2.3M ₪, בסיס מכפ... | text
anchor-2-saas                               | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.3M ₪ · נוכחי 2.3M ₪ · תחזית (+30.0... | שקלול 30/50/20, עבר 1.3M ₪, נוכחי 2.3M ₪, תחזית (+30.0%) ... | text
anchor-3-contractor                         | keyFindings       | Quality C+ · WACC 10.6% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | Quality C+, WACC 10.6%, EBITDA מדווח 2026 2.4M ₪, בסיס מכ... | text
anchor-3-contractor                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.1M ₪ · נוכחי 2.4M ₪ · תחזית (+8.0%... | שקלול 30/50/20, עבר 2.1M ₪, נוכחי 2.4M ₪, תחזית (+8.0%) 2... | text
anchor-4-accounting                         | keyFindings       | Quality B · WACC 15.7% · EBITDA מדווח 2026 500K ₪ · בסיס ... | Quality B, WACC 15.7%, EBITDA מדווח 2026 500K ₪, בסיס מכפ... | text
anchor-4-accounting                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 480K ₪ · נוכחי 500K ₪ · תחזית (+4.0%... | שקלול 30/50/20, עבר 480K ₪, נוכחי 500K ₪, תחזית (+4.0%) 5... | text
anchor-5-young-factory                      | keyFindings       | Quality B · WACC 9.4% · EBITDA מדווח 2026 200K ₪ · בסיס מ... | Quality B, WACC 9.4%, EBITDA מדווח 2026 200K ₪, בסיס מכפי... | text
anchor-5-young-factory                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר -150K ₪ · נוכחי 200K ₪ · תחזית (+15.... | שקלול 30/50/20, עבר -150K ₪, נוכחי 200K ₪, תחזית (+15.0%)... | text
anchor-6-loss-factory                       | keyFindings       | Quality C+ · WACC 16.5% · EBITDA מדווח 2026 -200K ₪ · בסי... | Quality C+, WACC 16.5%, EBITDA מדווח 2026 -200K ₪, בסיס מ... | text
anchor-6-loss-factory                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר -300K ₪ · נוכחי -200K ₪ · תחזית (+15... | שקלול 30/50/20, עבר -300K ₪, נוכחי -200K ₪, תחזית (+15.0%... | text
anchor-7-thin-factory                       | keyFindings       | Quality B− · WACC 9.2% · EBITDA מדווח 2026 200K ₪ · בסיס ... | Quality B−, WACC 9.2%, EBITDA מדווח 2026 200K ₪, בסיס מכפ... | text
anchor-7-thin-factory                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 250K ₪ · נוכחי 200K ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 250K ₪, נוכחי 200K ₪, תחזית (+5.0%) 2... | text
sub-hospitality-boutique_hotel              | keyFindings       | Quality B− · WACC 14.6% · EBITDA מדווח 2026 1.3M ₪ · בסיס... | Quality B−, WACC 14.6%, EBITDA מדווח 2026 1.3M ₪, בסיס מכ... | text
sub-hospitality-boutique_hotel              | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.2M ₪ · נוכחי 1.3M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.2M ₪, נוכחי 1.3M ₪, תחזית (+6.0%) 1... | text
sub-hospitality-hotel_chain                 | keyFindings       | Quality B− · WACC 11.2% · EBITDA מדווח 2026 143.0M ₪ · בס... | Quality B−, WACC 11.2%, EBITDA מדווח 2026 143.0M ₪, בסיס ... | text
sub-hospitality-hotel_chain                 | ebitdaBlendedNote | שקלול 30/50/20 · עבר 131.8M ₪ · נוכחי 143.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 131.8M ₪, נוכחי 143.0M ₪, תחזית (+6.0... | text
sub-hospitality-vacation                    | keyFindings       | Quality B− · WACC 11.1% · EBITDA מדווח 2026 30.8M ₪ · בסי... | Quality B−, WACC 11.1%, EBITDA מדווח 2026 30.8M ₪, בסיס מ... | text
sub-hospitality-vacation                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 28.4M ₪ · נוכחי 30.8M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 28.4M ₪, נוכחי 30.8M ₪, תחזית (+6.0%)... | text
sub-hospitality-airbnb_mgmt                 | keyFindings       | Quality C+ · WACC 15.1% · EBITDA מדווח 2026 198K ₪ · בסיס... | Quality C+, WACC 15.1%, EBITDA מדווח 2026 198K ₪, בסיס מכ... | text
sub-hospitality-airbnb_mgmt                 | ebitdaBlendedNote | שקלול 30/50/20 · עבר 183K ₪ · נוכחי 198K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 183K ₪, נוכחי 198K ₪, תחזית (+6.0%) 2... | text
sub-saas-b2b_saas                           | keyFindings       | Quality A · WACC 14.3% · EBITDA מדווח 2026 7.2M ₪ · בסיס ... | Quality A, WACC 14.3%, EBITDA מדווח 2026 7.2M ₪, בסיס מכפ... | text
sub-saas-b2b_saas                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 5.6M ₪ · נוכחי 7.2M ₪ · תחזית (+25.0... | שקלול 30/50/20, עבר 5.6M ₪, נוכחי 7.2M ₪, תחזית (+25.0%) ... | text
sub-saas-b2c_saas                           | keyFindings       | Quality A · WACC 12.4% · EBITDA מדווח 2026 34.2M ₪ · בסיס... | Quality A, WACC 12.4%, EBITDA מדווח 2026 34.2M ₪, בסיס מכ... | text
sub-saas-b2c_saas                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 26.6M ₪ · נוכחי 34.2M ₪ · תחזית (+25... | שקלול 30/50/20, עבר 26.6M ₪, נוכחי 34.2M ₪, תחזית (+25.0%... | text
sub-saas-devtools                           | keyFindings       | Quality A · WACC 14.8% · EBITDA מדווח 2026 2.2M ₪ · בסיס ... | Quality A, WACC 14.8%, EBITDA מדווח 2026 2.2M ₪, בסיס מכפ... | text
sub-saas-devtools                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.7M ₪ · נוכחי 2.2M ₪ · תחזית (+25.0... | שקלול 30/50/20, עבר 1.7M ₪, נוכחי 2.2M ₪, תחזית (+25.0%) ... | text
sub-saas-marketplace                        | keyFindings       | Quality A · WACC 13.8% · EBITDA מדווח 2026 9.9M ₪ · בסיס ... | Quality A, WACC 13.8%, EBITDA מדווח 2026 9.9M ₪, בסיס מכפ... | text
sub-saas-marketplace                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 7.7M ₪ · נוכחי 9.9M ₪ · תחזית (+25.0... | שקלול 30/50/20, עבר 7.7M ₪, נוכחי 9.9M ₪, תחזית (+25.0%) ... | text
sub-fintech-payments                        | keyFindings       | Quality A− · WACC 12.1% · EBITDA מדווח 2026 240.0M ₪ · בס... | Quality A−, WACC 12.1%, EBITDA מדווח 2026 240.0M ₪, בסיס ... | text
sub-fintech-payments                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 198.3M ₪ · נוכחי 240.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 198.3M ₪, נוכחי 240.0M ₪, תחזית (+18.... | text
sub-fintech-lending                         | keyFindings       | Quality A− · WACC 14.5% · EBITDA מדווח 2026 3.2M ₪ · בסיס... | Quality A−, WACC 14.5%, EBITDA מדווח 2026 3.2M ₪, בסיס מכ... | text
sub-fintech-lending                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.6M ₪ · נוכחי 3.2M ₪ · תחזית (+18.0... | שקלול 30/50/20, עבר 2.6M ₪, נוכחי 3.2M ₪, תחזית (+18.0%) ... | text
sub-fintech-insurtech                       | keyFindings       | Quality A− · WACC 13.0% · EBITDA מדווח 2026 15.0M ₪ · בסי... | Quality A−, WACC 13.0%, EBITDA מדווח 2026 15.0M ₪, בסיס מ... | text
sub-fintech-insurtech                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 12.4M ₪ · נוכחי 15.0M ₪ · תחזית (+18... | שקלול 30/50/20, עבר 12.4M ₪, נוכחי 15.0M ₪, תחזית (+18.0%... | text
sub-fintech-wealth                          | keyFindings       | Quality A− · WACC 12.1% · EBITDA מדווח 2026 60.0M ₪ · בסי... | Quality A−, WACC 12.1%, EBITDA מדווח 2026 60.0M ₪, בסיס מ... | text
sub-fintech-wealth                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 49.6M ₪ · נוכחי 60.0M ₪ · תחזית (+18... | שקלול 30/50/20, עבר 49.6M ₪, נוכחי 60.0M ₪, תחזית (+18.0%... | text
sub-cyber-enterprise                        | keyFindings       | Quality A · WACC 14.6% · EBITDA מדווח 2026 3.5M ₪ · בסיס ... | Quality A, WACC 14.6%, EBITDA מדווח 2026 3.5M ₪, בסיס מכפ... | text
sub-cyber-enterprise                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.5M ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.5M ₪, תחזית (+22.0%) ... | text
sub-cyber-cloud                             | keyFindings       | Quality A · WACC 12.4% · EBITDA מדווח 2026 16.0M ₪ · בסיס... | Quality A, WACC 12.4%, EBITDA מדווח 2026 16.0M ₪, בסיס מכ... | text
sub-cyber-cloud                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר 12.7M ₪ · נוכחי 16.0M ₪ · תחזית (+22... | שקלול 30/50/20, עבר 12.7M ₪, נוכחי 16.0M ₪, תחזית (+22.0%... | text
sub-cyber-ot                                | keyFindings       | Quality A · WACC 14.6% · EBITDA מדווח 2026 960K ₪ · בסיס ... | Quality A, WACC 14.6%, EBITDA מדווח 2026 960K ₪, בסיס מכפ... | text
sub-cyber-ot                                | ebitdaBlendedNote | שקלול 30/50/20 · עבר 762K ₪ · נוכחי 960K ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 762K ₪, נוכחי 960K ₪, תחזית (+22.0%) ... | text
sub-cyber-services_cyber                    | keyFindings       | Quality B+ · WACC 15.2% · EBITDA מדווח 2026 560K ₪ · בסיס... | Quality B+, WACC 15.2%, EBITDA מדווח 2026 560K ₪, בסיס מכ... | text
sub-cyber-services_cyber                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 445K ₪ · נוכחי 560K ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 445K ₪, נוכחי 560K ₪, תחזית (+22.0%) ... | text
sub-health-medtech                          | keyFindings       | Quality A− · WACC 11.5% · EBITDA מדווח 2026 21.0M ₪ · בסי... | Quality A−, WACC 11.5%, EBITDA מדווח 2026 21.0M ₪, בסיס מ... | text
sub-health-medtech                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 18.1M ₪ · נוכחי 21.0M ₪ · תחזית (+12... | שקלול 30/50/20, עבר 18.1M ₪, נוכחי 21.0M ₪, תחזית (+12.0%... | text
sub-health-biotech                          | keyFindings       | Quality A− · WACC 13.8% · EBITDA מדווח 2026 1.4M ₪ · בסיס... | Quality A−, WACC 13.8%, EBITDA מדווח 2026 1.4M ₪, בסיס מכ... | text
sub-health-biotech                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.2M ₪ · נוכחי 1.4M ₪ · תחזית (+12.0... | שקלול 30/50/20, עבר 1.2M ₪, נוכחי 1.4M ₪, תחזית (+12.0%) ... | text
sub-health-digital_health                   | keyFindings       | Quality B · WACC 14.3% · EBITDA מדווח 2026 330K ₪ · בסיס ... | Quality B, WACC 14.3%, EBITDA מדווח 2026 330K ₪, בסיס מכפ... | text
sub-health-digital_health                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 285K ₪ · נוכחי 330K ₪ · תחזית (+12.0... | שקלול 30/50/20, עבר 285K ₪, נוכחי 330K ₪, תחזית (+12.0%) ... | text
sub-health-services_health                  | keyFindings       | Quality A− · WACC 11.5% · EBITDA מדווח 2026 28.5M ₪ · בסי... | Quality A−, WACC 11.5%, EBITDA מדווח 2026 28.5M ₪, בסיס מ... | text
sub-health-services_health                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 24.6M ₪ · נוכחי 28.5M ₪ · תחזית (+12... | שקלול 30/50/20, עבר 24.6M ₪, נוכחי 28.5M ₪, תחזית (+12.0%... | text
sub-services-consulting                     | keyFindings       | Quality B · WACC 13.9% · EBITDA מדווח 2026 1.8M ₪ · בסיס ... | Quality B, WACC 13.9%, EBITDA מדווח 2026 1.8M ₪, בסיס מכפ... | text
sub-services-consulting                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.6M ₪ · נוכחי 1.8M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.6M ₪, נוכחי 1.8M ₪, תחזית (+6.0%) 1... | text
sub-services-legal                          | keyFindings       | Quality B− · WACC 14.4% · EBITDA מדווח 2026 225K ₪ · בסיס... | Quality B−, WACC 14.4%, EBITDA מדווח 2026 225K ₪, בסיס מכ... | text
sub-services-legal                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 205K ₪ · נוכחי 225K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 205K ₪, נוכחי 225K ₪, תחזית (+6.0%) 2... | text
sub-services-accounting                     | keyFindings       | Quality B · WACC 10.8% · EBITDA מדווח 2026 37.5M ₪ · בסיס... | Quality B, WACC 10.8%, EBITDA מדווח 2026 37.5M ₪, בסיס מכ... | text
sub-services-accounting                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 34.2M ₪ · נוכחי 37.5M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 34.2M ₪, נוכחי 37.5M ₪, תחזית (+6.0%)... | text
sub-services-marketing                      | keyFindings       | Quality B− · WACC 14.4% · EBITDA מדווח 2026 375K ₪ · בסיס... | Quality B−, WACC 14.4%, EBITDA מדווח 2026 375K ₪, בסיס מכ... | text
sub-services-marketing                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 342K ₪ · נוכחי 375K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 342K ₪, נוכחי 375K ₪, תחזית (+6.0%) 3... | text
sub-industry-manufacturing                  | keyFindings       | Quality B− · WACC 11.3% · EBITDA מדווח 2026 300.0M ₪ · בס... | Quality B−, WACC 11.3%, EBITDA מדווח 2026 300.0M ₪, בסיס ... | text
sub-industry-manufacturing                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 273.8M ₪ · נוכחי 300.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 273.8M ₪, נוכחי 300.0M ₪, תחזית (+5.0... | text
sub-industry-distribution                   | keyFindings       | Quality B− · WACC 11.3% · EBITDA מדווח 2026 36.0M ₪ · בסי... | Quality B−, WACC 11.3%, EBITDA מדווח 2026 36.0M ₪, בסיס מ... | text
sub-industry-distribution                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 32.9M ₪ · נוכחי 36.0M ₪ · תחזית (+5.... | שקלול 30/50/20, עבר 32.9M ₪, נוכחי 36.0M ₪, תחזית (+5.0%)... | text
sub-industry-food_bev                       | keyFindings       | Quality B− · WACC 14.3% · EBITDA מדווח 2026 2.6M ₪ · בסיס... | Quality B−, WACC 14.3%, EBITDA מדווח 2026 2.6M ₪, בסיס מכ... | text
sub-industry-food_bev                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.4M ₪ · נוכחי 2.6M ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 2.4M ₪, נוכחי 2.6M ₪, תחזית (+5.0%) 2... | text
sub-industry-traditional                    | keyFindings       | Quality B− · WACC 12.0% · EBITDA מדווח 2026 12.0M ₪ · בסי... | Quality B−, WACC 12.0%, EBITDA מדווח 2026 12.0M ₪, בסיס מ... | text
sub-industry-traditional                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 11.0M ₪ · נוכחי 12.0M ₪ · תחזית (+5.... | שקלול 30/50/20, עבר 11.0M ₪, נוכחי 12.0M ₪, תחזית (+5.0%)... | text
sub-retail_unified-retail-supermarkets      | keyFindings       | Quality C+ · WACC 11.1% · EBITDA מדווח 2026 400.0M ₪ · בס... | Quality C+, WACC 11.1%, EBITDA מדווח 2026 400.0M ₪, בסיס ... | text
sub-retail_unified-retail-supermarkets      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 357.1M ₪ · נוכחי 400.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 357.1M ₪, נוכחי 400.0M ₪, תחזית (+5.0... | text
sub-retail_unified-d2c                      | keyFindings       | Quality C+ · WACC 13.8% · EBITDA מדווח 2026 2.4M ₪ · בסיס... | Quality C+, WACC 13.8%, EBITDA מדווח 2026 2.4M ₪, בסיס מכ... | text
sub-retail_unified-d2c                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.1M ₪ · נוכחי 2.4M ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 2.1M ₪, נוכחי 2.4M ₪, תחזית (+5.0%) 2... | text
sub-retail_unified-retail-fashion           | keyFindings       | Quality C+ · WACC 13.2% · EBITDA מדווח 2026 320K ₪ · בסיס... | Quality C+, WACC 13.2%, EBITDA מדווח 2026 320K ₪, בסיס מכ... | text
sub-retail_unified-retail-fashion           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 286K ₪ · נוכחי 320K ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 286K ₪, נוכחי 320K ₪, תחזית (+5.0%) 3... | text
sub-retail_unified-marketplace              | keyFindings       | Quality C+ · WACC 10.5% · EBITDA מדווח 2026 720K ₪ · בסיס... | Quality C+, WACC 10.5%, EBITDA מדווח 2026 720K ₪, בסיס מכ... | text
sub-retail_unified-marketplace              | ebitdaBlendedNote | שקלול 30/50/20 · עבר 643K ₪ · נוכחי 720K ₪ · תחזית (+5.0%... | שקלול 30/50/20, עבר 643K ₪, נוכחי 720K ₪, תחזית (+5.0%) 7... | text
sub-retail_unified-specialty                | keyFindings       | Quality C+ · WACC 14.1% · EBITDA מדווח 2026 64K ₪ · בסיס ... | Quality C+, WACC 14.1%, EBITDA מדווח 2026 64K ₪, בסיס מכפ... | text
sub-retail_unified-specialty                | ebitdaBlendedNote | שקלול 30/50/20 · עבר 57K ₪ · נוכחי 64K ₪ · תחזית (+5.0%) ... | שקלול 30/50/20, עבר 57K ₪, נוכחי 64K ₪, תחזית (+5.0%) 67K... | text
sub-food_service-restaurant                 | keyFindings       | Quality B− · WACC 11.0% · EBITDA מדווח 2026 26.6M ₪ · בסי... | Quality B−, WACC 11.0%, EBITDA מדווח 2026 26.6M ₪, בסיס מ... | text
sub-food_service-restaurant                 | ebitdaBlendedNote | שקלול 30/50/20 · עבר 24.2M ₪ · נוכחי 26.6M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 24.2M ₪, נוכחי 26.6M ₪, תחזית (+6.0%)... | text
sub-food_service-cafe                       | keyFindings       | Quality C+ · WACC 14.3% · EBITDA מדווח 2026 84K ₪ · בסיס ... | Quality C+, WACC 14.3%, EBITDA מדווח 2026 84K ₪, בסיס מכפ... | text
sub-food_service-cafe                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 76K ₪ · נוכחי 84K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 76K ₪, נוכחי 84K ₪, תחזית (+6.0%) 89K... | text
sub-food_service-catering                   | keyFindings       | Quality C+ · WACC 14.4% · EBITDA מדווח 2026 252K ₪ · בסיס... | Quality C+, WACC 14.4%, EBITDA מדווח 2026 252K ₪, בסיס מכ... | text
sub-food_service-catering                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 229K ₪ · נוכחי 252K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 229K ₪, נוכחי 252K ₪, תחזית (+6.0%) 2... | text
sub-food_service-franchise                  | keyFindings       | Quality B− · WACC 11.3% · EBITDA מדווח 2026 35.0M ₪ · בסי... | Quality B−, WACC 11.3%, EBITDA מדווח 2026 35.0M ₪, בסיס מ... | text
sub-food_service-franchise                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 31.8M ₪ · נוכחי 35.0M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 31.8M ₪, נוכחי 35.0M ₪, תחזית (+6.0%)... | text
sub-food_service-delivery                   | keyFindings       | Quality C+ · WACC 14.3% · EBITDA מדווח 2026 448K ₪ · בסיס... | Quality C+, WACC 14.3%, EBITDA מדווח 2026 448K ₪, בסיס מכ... | text
sub-food_service-delivery                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 408K ₪ · נוכחי 448K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 408K ₪, נוכחי 448K ₪, תחזית (+6.0%) 4... | text
sub-energy-solar                            | keyFindings       | Quality B+ · WACC 12.5% · EBITDA מדווח 2026 26.3M ₪ · בסי... | Quality B+, WACC 12.5%, EBITDA מדווח 2026 26.3M ₪, בסיס מ... | text
sub-energy-solar                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 17.6M ₪ · נוכחי 19.4M ₪ · תחזית (+10... | שקלול 30/50/20, עבר 17.6M ₪, נוכחי 19.4M ₪, תחזית (+10.0%... | text
sub-energy-storage                          | keyFindings       | Quality B+ · WACC 11.7% · EBITDA מדווח 2026 105.0M ₪ · בס... | Quality B+, WACC 11.7%, EBITDA מדווח 2026 105.0M ₪, בסיס ... | text
sub-energy-storage                          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 70.2M ₪ · נוכחי 77.7M ₪ · תחזית (+10... | שקלול 30/50/20, עבר 70.2M ₪, נוכחי 77.7M ₪, תחזית (+10.0%... | text
sub-energy-wind                             | keyFindings       | Quality B+ · WACC 14.1% · EBITDA מדווח 2026 7.7M ₪ · בסיס... | Quality B+, WACC 14.1%, EBITDA מדווח 2026 7.7M ₪, בסיס מכ... | text
sub-energy-wind                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר 5.2M ₪ · נוכחי 5.7M ₪ · תחזית (+10.0... | שקלול 30/50/20, עבר 5.2M ₪, נוכחי 5.7M ₪, תחזית (+10.0%) ... | text
sub-energy-services_energy                  | keyFindings       | Quality B+ · WACC 11.8% · EBITDA מדווח 2026 35.0M ₪ · בסי... | Quality B+, WACC 11.8%, EBITDA מדווח 2026 35.0M ₪, בסיס מ... | text
sub-energy-services_energy                  | ebitdaBlendedNote | שקלול 30/50/20 · עבר 23.4M ₪ · נוכחי 25.9M ₪ · תחזית (+10... | שקלול 30/50/20, עבר 23.4M ₪, נוכחי 25.9M ₪, תחזית (+10.0%... | text
sub-defense_aerospace-defense_manufacturing | keyFindings       | Quality B+ · WACC 9.9% · EBITDA מדווח 2026 252.0M ₪ · בסי... | Quality B+, WACC 9.9%, EBITDA מדווח 2026 252.0M ₪, בסיס מ... | text
sub-defense_aerospace-defense_manufacturing | ebitdaBlendedNote | שקלול 30/50/20 · עבר 222.9M ₪ · נוכחי 252.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 222.9M ₪, נוכחי 252.0M ₪, תחזית (+9.0... | text
sub-defense_aerospace-aviation_space        | keyFindings       | Quality B+ · WACC 12.8% · EBITDA מדווח 2026 4.2M ₪ · בסיס... | Quality B+, WACC 12.8%, EBITDA מדווח 2026 4.2M ₪, בסיס מכ... | text
sub-defense_aerospace-aviation_space        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 3.7M ₪ · נוכחי 4.2M ₪ · תחזית (+9.0%... | שקלול 30/50/20, עבר 3.7M ₪, נוכחי 4.2M ₪, תחזית (+9.0%) 4... | text
sub-defense_aerospace-defense_tech          | keyFindings       | Quality B+ · WACC 9.9% · EBITDA מדווח 2026 19.6M ₪ · בסיס... | Quality B+, WACC 9.9%, EBITDA מדווח 2026 19.6M ₪, בסיס מכ... | text
sub-defense_aerospace-defense_tech          | ebitdaBlendedNote | שקלול 30/50/20 · עבר 17.3M ₪ · נוכחי 19.6M ₪ · תחזית (+9.... | שקלול 30/50/20, עבר 17.3M ₪, נוכחי 19.6M ₪, תחזית (+9.0%)... | text
sub-real_estate-re_development              | keyFindings       | Quality B · WACC 13.5% · EBITDA מדווח 2026 1.6M ₪ · בסיס ... | Quality B, WACC 13.5%, EBITDA מדווח 2026 1.6M ₪, בסיס מכפ... | text
sub-real_estate-re_development              | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.5M ₪ · נוכחי 1.6M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.5M ₪, נוכחי 1.6M ₪, תחזית (+6.0%) 1... | text
sub-real_estate-re_income                   | keyFindings       | Quality B · WACC 11.0% · EBITDA מדווח 2026 7.2M ₪ · בסיס ... | Quality B, WACC 11.0%, EBITDA מדווח 2026 7.2M ₪, בסיס מכפ... | text
sub-real_estate-re_income                   | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.6M ₪ · נוכחי 7.2M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.6M ₪, נוכחי 7.2M ₪, תחזית (+6.0%) 7... | text
sub-real_estate-construction_contracting    | keyFindings       | Quality B · WACC 10.2% · EBITDA מדווח 2026 34.2M ₪ · בסיס... | Quality B, WACC 10.2%, EBITDA מדווח 2026 34.2M ₪, בסיס מכ... | text
sub-real_estate-construction_contracting    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 31.4M ₪ · נוכחי 34.2M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 31.4M ₪, נוכחי 34.2M ₪, תחזית (+6.0%)... | text
sub-real_estate-proptech                    | keyFindings       | Quality B · WACC 13.8% · EBITDA מדווח 2026 2.2M ₪ · בסיס ... | Quality B, WACC 13.8%, EBITDA מדווח 2026 2.2M ₪, בסיס מכפ... | text
sub-real_estate-proptech                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.0M ₪ · נוכחי 2.2M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.0M ₪, נוכחי 2.2M ₪, תחזית (+6.0%) 2... | text
sub-other-general                           | keyFindings       | Quality B− · WACC 13.4% · EBITDA מדווח 2026 6.6M ₪ · בסיס... | Quality B−, WACC 13.4%, EBITDA מדווח 2026 6.6M ₪, בסיס מכ... | text
sub-other-general                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.0M ₪ · נוכחי 6.6M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.0M ₪, נוכחי 6.6M ₪, תחזית (+6.0%) 7... | text
edge-loss-all-years                         | keyFindings       | Quality B+ · WACC 16.3% · EBITDA מדווח 2026 -500K ₪ · בסי... | Quality B+, WACC 16.3%, EBITDA מדווח 2026 -500K ₪, בסיס מ... | text
edge-loss-all-years                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר -700K ₪ · נוכחי -500K ₪ · תחזית (+12... | שקלול 30/50/20, עבר -700K ₪, נוכחי -500K ₪, תחזית (+12.0%... | text
edge-thin-margin                            | keyFindings       | Quality B · WACC 11.2% · EBITDA מדווח 2026 400K ₪ · בסיס ... | Quality B, WACC 11.2%, EBITDA מדווח 2026 400K ₪, בסיס מכפ... | text
edge-thin-margin                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 420K ₪ · נוכחי 400K ₪ · תחזית (+4.0%... | שקלול 30/50/20, עבר 420K ₪, נוכחי 400K ₪, תחזית (+4.0%) 4... | text
edge-neg-to-pos                             | keyFindings       | Quality B+ · WACC 17.8% · EBITDA מדווח 2026 900K ₪ · בסיס... | Quality B+, WACC 17.8%, EBITDA מדווח 2026 900K ₪, בסיס מכ... | text
edge-neg-to-pos                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר -200K ₪ · נוכחי 900K ₪ · תחזית (+30.... | שקלול 30/50/20, עבר -200K ₪, נוכחי 900K ₪, תחזית (+30.0%)... | text
edge-big-backlog                            | keyFindings       | Quality B+ · WACC 11.2% · EBITDA מדווח 2026 7.3M ₪ · בסיס... | Quality B+, WACC 11.2%, EBITDA מדווח 2026 7.3M ₪, בסיס מכ... | text
edge-big-backlog                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.1M ₪ · נוכחי 7.3M ₪ · תחזית (+12.0... | שקלול 30/50/20, עבר 6.1M ₪, נוכחי 7.3M ₪, תחזית (+12.0%) ... | text
edge-net-cash                               | keyFindings       | Quality B+ · WACC 15.6% · EBITDA מדווח 2026 5.0M ₪ · בסיס... | Quality B+, WACC 15.6%, EBITDA מדווח 2026 5.0M ₪, בסיס מכ... | text
edge-net-cash                               | ebitdaBlendedNote | שקלול 30/50/20 · עבר 3.5M ₪ · נוכחי 5.0M ₪ · תחזית (+22.0... | שקלול 30/50/20, עבר 3.5M ₪, נוכחי 5.0M ₪, תחזית (+22.0%) ... | text
edge-debt-over-ev                           | keyFindings       | Quality B · WACC 6.0% · EBITDA מדווח 2026 1.6M ₪ · בסיס מ... | Quality B, WACC 6.0%, EBITDA מדווח 2026 1.6M ₪, בסיס מכפי... | text
edge-debt-over-ev                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.6M ₪ · נוכחי 1.6M ₪ · תחזית (+3.0%... | שקלול 30/50/20, עבר 1.6M ₪, נוכחי 1.6M ₪, תחזית (+3.0%) 1... | text
edge-usd                                    | keyFindings       | Quality B+ · WACC 16.1% · EBITDA מדווח 2026 $1.4M · בסיס ... | Quality B+, WACC 16.1%, EBITDA מדווח 2026 $1.4M, בסיס מכפ... | text
edge-usd                                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר $780K · נוכחי $1.4M · תחזית (+28.0%)... | שקלול 30/50/20, עבר $780K, נוכחי $1.4M, תחזית (+28.0%) $1... | text
edge-eur                                    | keyFindings       | Quality B · WACC 13.6% · EBITDA מדווח 2026 €1.1M · בסיס מ... | Quality B, WACC 13.6%, EBITDA מדווח 2026 €1.1M, בסיס מכפי... | text
edge-eur                                    | ebitdaBlendedNote | שקלול 30/50/20 · עבר €1.1M · נוכחי €1.1M · תחזית (+5.0%) ... | שקלול 30/50/20, עבר €1.1M, נוכחי €1.1M, תחזית (+5.0%) €1.... | text
edge-manual-multiple                        | keyFindings       | Quality B · WACC 14.6% · EBITDA מדווח 2026 3.0M ₪ · בסיס ... | Quality B, WACC 14.6%, EBITDA מדווח 2026 3.0M ₪, בסיס מכפ... | text
edge-manual-multiple                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
edge-no-owner-no-history                    | keyFindings       | Quality B− · WACC 15.5% · EBITDA מדווח 2026 800K ₪ · בסיס... | Quality B−, WACC 15.5%, EBITDA מדווח 2026 800K ₪, בסיס מכ... | text
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
ladder-services-118800                      | keyFindings       | Quality B · WACC 11.0% · EBITDA מדווח 2026 17.8M ₪ · בסיס... | Quality B, WACC 11.0%, EBITDA מדווח 2026 17.8M ₪, בסיס מכ... | text
ladder-services-118800                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.3M ₪ · נוכחי 17.8M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.3M ₪, נוכחי 17.8M ₪, תחזית (+6.0%)... | text
ladder-services-121200                      | keyFindings       | Quality B · WACC 11.0% · EBITDA מדווח 2026 18.2M ₪ · בסיס... | Quality B, WACC 11.0%, EBITDA מדווח 2026 18.2M ₪, בסיס מכ... | text
ladder-services-121200                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.6M ₪ · נוכחי 18.2M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.6M ₪, נוכחי 18.2M ₪, תחזית (+6.0%)... | text
ladder-services-200000                      | keyFindings       | Quality B · WACC 11.0% · EBITDA מדווח 2026 30.0M ₪ · בסיס... | Quality B, WACC 11.0%, EBITDA מדווח 2026 30.0M ₪, בסיס מכ... | text
ladder-services-200000                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 27.4M ₪ · נוכחי 30.0M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 27.4M ₪, נוכחי 30.0M ₪, תחזית (+6.0%)... | text
ladder-services-1000000                     | keyFindings       | Quality B · WACC 11.0% · EBITDA מדווח 2026 150.0M ₪ · בסי... | Quality B, WACC 11.0%, EBITDA מדווח 2026 150.0M ₪, בסיס מ... | text
ladder-services-1000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 136.8M ₪ · נוכחי 150.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 136.8M ₪, נוכחי 150.0M ₪, תחזית (+6.0... | text
ladder-services-5000000                     | keyFindings       | Quality B · WACC 11.0% · EBITDA מדווח 2026 750.0M ₪ · בסי... | Quality B, WACC 11.0%, EBITDA מדווח 2026 750.0M ₪, בסיס מ... | text
ladder-services-5000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 684.0M ₪ · נוכחי 750.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 684.0M ₪, נוכחי 750.0M ₪, תחזית (+6.0... | text
ladder-industry-300                         | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 45K ₪ · בסיס ... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 45K ₪, בסיס מכפ... | text
ladder-industry-300                         | ebitdaBlendedNote | שקלול 30/50/20 · עבר 41K ₪ · נוכחי 45K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 41K ₪, נוכחי 45K ₪, תחזית (+6.0%) 48K... | text
ladder-industry-2000                        | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 300K ₪ · בסיס... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 300K ₪, בסיס מכ... | text
ladder-industry-2000                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 274K ₪ · נוכחי 300K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 274K ₪, נוכחי 300K ₪, תחזית (+6.0%) 3... | text
ladder-industry-4950                        | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 743K ₪ · בסיס... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 743K ₪, בסיס מכ... | text
ladder-industry-4950                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 677K ₪ · נוכחי 743K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 677K ₪, נוכחי 743K ₪, תחזית (+6.0%) 7... | text
ladder-industry-5050                        | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 758K ₪ · בסיס... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 758K ₪, בסיס מכ... | text
ladder-industry-5050                        | ebitdaBlendedNote | שקלול 30/50/20 · עבר 691K ₪ · נוכחי 758K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 691K ₪, נוכחי 758K ₪, תחזית (+6.0%) 8... | text
ladder-industry-10000                       | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 1.5M ₪ · בסיס... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 1.5M ₪, בסיס מכ... | text
ladder-industry-10000                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.4M ₪ · נוכחי 1.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.4M ₪, נוכחי 1.5M ₪, תחזית (+6.0%) 1... | text
ladder-industry-19800                       | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-industry-19800                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-industry-20200                       | keyFindings       | Quality B− · WACC 14.9% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B−, WACC 14.9%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-industry-20200                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-industry-50000                       | keyFindings       | Quality B− · WACC 14.0% · EBITDA מדווח 2026 7.5M ₪ · בסיס... | Quality B−, WACC 14.0%, EBITDA מדווח 2026 7.5M ₪, בסיס מכ... | text
ladder-industry-50000                       | ebitdaBlendedNote | שקלול 30/50/20 · עבר 6.8M ₪ · נוכחי 7.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 6.8M ₪, נוכחי 7.5M ₪, תחזית (+6.0%) 8... | text
ladder-industry-118800                      | keyFindings       | Quality B− · WACC 11.6% · EBITDA מדווח 2026 17.8M ₪ · בסי... | Quality B−, WACC 11.6%, EBITDA מדווח 2026 17.8M ₪, בסיס מ... | text
ladder-industry-118800                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.3M ₪ · נוכחי 17.8M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.3M ₪, נוכחי 17.8M ₪, תחזית (+6.0%)... | text
ladder-industry-121200                      | keyFindings       | Quality B− · WACC 11.6% · EBITDA מדווח 2026 18.2M ₪ · בסי... | Quality B−, WACC 11.6%, EBITDA מדווח 2026 18.2M ₪, בסיס מ... | text
ladder-industry-121200                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 16.6M ₪ · נוכחי 18.2M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 16.6M ₪, נוכחי 18.2M ₪, תחזית (+6.0%)... | text
ladder-industry-200000                      | keyFindings       | Quality B− · WACC 11.6% · EBITDA מדווח 2026 30.0M ₪ · בסי... | Quality B−, WACC 11.6%, EBITDA מדווח 2026 30.0M ₪, בסיס מ... | text
ladder-industry-200000                      | ebitdaBlendedNote | שקלול 30/50/20 · עבר 27.4M ₪ · נוכחי 30.0M ₪ · תחזית (+6.... | שקלול 30/50/20, עבר 27.4M ₪, נוכחי 30.0M ₪, תחזית (+6.0%)... | text
ladder-industry-1000000                     | keyFindings       | Quality B− · WACC 11.6% · EBITDA מדווח 2026 150.0M ₪ · בס... | Quality B−, WACC 11.6%, EBITDA מדווח 2026 150.0M ₪, בסיס ... | text
ladder-industry-1000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 136.8M ₪ · נוכחי 150.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 136.8M ₪, נוכחי 150.0M ₪, תחזית (+6.0... | text
ladder-industry-5000000                     | keyFindings       | Quality B− · WACC 11.6% · EBITDA מדווח 2026 750.0M ₪ · בס... | Quality B−, WACC 11.6%, EBITDA מדווח 2026 750.0M ₪, בסיס ... | text
ladder-industry-5000000                     | ebitdaBlendedNote | שקלול 30/50/20 · עבר 684.0M ₪ · נוכחי 750.0M ₪ · תחזית (+... | שקלול 30/50/20, עבר 684.0M ₪, נוכחי 750.0M ₪, תחזית (+6.0... | text
ladder-saas-300                             | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 45K ₪ · בסיס ... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 45K ₪, בסיס מכפ... | text
ladder-saas-300                             | ebitdaBlendedNote | שקלול 30/50/20 · עבר 41K ₪ · נוכחי 45K ₪ · תחזית (+6.0%) ... | שקלול 30/50/20, עבר 41K ₪, נוכחי 45K ₪, תחזית (+6.0%) 48K... | text
ladder-saas-2000                            | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 300K ₪ · בסיס... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 300K ₪, בסיס מכ... | text
ladder-saas-2000                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 274K ₪ · נוכחי 300K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 274K ₪, נוכחי 300K ₪, תחזית (+6.0%) 3... | text
ladder-saas-4950                            | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 743K ₪ · בסיס... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 743K ₪, בסיס מכ... | text
ladder-saas-4950                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 677K ₪ · נוכחי 743K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 677K ₪, נוכחי 743K ₪, תחזית (+6.0%) 7... | text
ladder-saas-5050                            | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 758K ₪ · בסיס... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 758K ₪, בסיס מכ... | text
ladder-saas-5050                            | ebitdaBlendedNote | שקלול 30/50/20 · עבר 691K ₪ · נוכחי 758K ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 691K ₪, נוכחי 758K ₪, תחזית (+6.0%) 8... | text
ladder-saas-10000                           | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 1.5M ₪ · בסיס... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 1.5M ₪, בסיס מכ... | text
ladder-saas-10000                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 1.4M ₪ · נוכחי 1.5M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 1.4M ₪, נוכחי 1.5M ₪, תחזית (+6.0%) 1... | text
ladder-saas-19800                           | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-saas-19800                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.7M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.7M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
ladder-saas-20200                           | keyFindings       | Quality B+ · WACC 15.4% · EBITDA מדווח 2026 3.0M ₪ · בסיס... | Quality B+, WACC 15.4%, EBITDA מדווח 2026 3.0M ₪, בסיס מכ... | text
ladder-saas-20200                           | ebitdaBlendedNote | שקלול 30/50/20 · עבר 2.8M ₪ · נוכחי 3.0M ₪ · תחזית (+6.0%... | שקלול 30/50/20, עבר 2.8M ₪, נוכחי 3.0M ₪, תחזית (+6.0%) 3... | text
... and 570 more rows
```

