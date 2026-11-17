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

