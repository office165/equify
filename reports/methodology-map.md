# מפת מתודולוגיה לפי תת ענף

המסמך נוצר אוטומטית מהקוד (tests/methodology-doc.ts) ונעול בבדיקה (tests/snapshots/methodology-map.json).
כל שינוי במתודולוגיה של ענף יופיע ב npm test כשינוי מפורש, ויחייב npm run snapshot:update עם סיבה.

משקלות "אחרי כל השכבות" נמדדו על חברת ייחוס: הכנסות 30M ₪, מרווח EBITDA 15%, משטר רווחי.
המשקלות זזים גם עם גודל ההכנסות (scale_modifier_pipeline) ועם משטר הפסד (profitability_regime), כך שבתיק אמיתי הם יכולים להיות שונים.

מקרא עמודות: משקלות בפורמט DCF/EBITDA/הכנסות באחוזים. גבולות: גבולות המכפיל אחרי נרמול (normalize_multiple.ts), שחלים גם על מכפיל ההכנסות.
DLOM: מקדם סחירות (0.8 פירושו הנחה של 20%). בשל: הערך בשלב בשלות בחברת הייחוס. סקייל: מקדם גודל בחברת הייחוס.

## טבלה 1: אסטרטגיה ומשקלות

| ענף | תת ענף | פרופיל | אסטרטגיה | seed | early | growth | mature |
|---|---|---|---|---|---|---|---|
| hospitality | boutique_hotel | hospitality | historical_blended_ebitda | 43/57/0 | 44/56/0 | 44/56/0 | 44/56/0 |
| hospitality | hotel_chain | hospitality | historical_blended_ebitda | 43/57/0 | 44/56/0 | 44/56/0 | 44/56/0 |
| hospitality | vacation | hospitality | historical_blended_ebitda | 43/57/0 | 44/56/0 | 44/56/0 | 44/56/0 |
| hospitality | airbnb_mgmt | hospitality | historical_blended_ebitda | 41/59/0 | 42/58/0 | 42/58/0 | 42/58/0 |
| saas | b2b_saas | saas | current_run_rate_revenue | 31/0/69 | 31/0/69 | 31/0/69 | 31/0/69 |
| saas | b2c_saas | saas | current_run_rate_revenue | 26/0/74 | 26/0/74 | 26/0/74 | 26/0/74 |
| saas | devtools | saas | current_run_rate_revenue | 36/0/64 | 36/0/64 | 36/0/64 | 36/0/64 |
| saas | marketplace | saas | current_run_rate_revenue | 31/0/69 | 31/0/69 | 31/0/69 | 31/0/69 |
| fintech | payments | saas | current_run_rate_revenue | 31/0/69 | 31/0/69 | 31/0/69 | 31/0/69 |
| fintech | lending | saas | current_run_rate_revenue | 41/0/59 | 42/0/58 | 42/0/58 | 42/0/58 |
| fintech | insurtech | saas | current_run_rate_revenue | 36/0/64 | 36/0/64 | 36/0/64 | 36/0/64 |
| fintech | wealth | saas | current_run_rate_revenue | 31/0/69 | 31/0/69 | 31/0/69 | 31/0/69 |
| cyber | enterprise | saas | current_run_rate_revenue | 31/0/69 | 31/0/69 | 31/0/69 | 31/0/69 |
| cyber | cloud | saas | current_run_rate_revenue | 29/0/71 | 28/0/72 | 28/0/72 | 28/0/72 |
| cyber | ot | saas | current_run_rate_revenue | 36/0/64 | 36/0/64 | 36/0/64 | 36/0/64 |
| cyber | services_cyber | saas | current_run_rate_revenue | 26/0/74 | 26/0/74 | 26/0/74 | 26/0/74 |
| health | medtech | services | historical_blended_ebitda | 41/59/0 | 42/58/0 | 42/58/0 | 42/58/0 |
| health | biotech | services | historical_blended_ebitda | 55/45/0 | 57/43/0 | 57/43/0 | 57/43/0 |
| health | digital_health | services | historical_blended_ebitda | 34/66/0 | 34/66/0 | 34/66/0 | 34/66/0 |
| health | services_health | services | historical_blended_ebitda | 31/69/0 | 31/69/0 | 31/69/0 | 31/69/0 |
| services | consulting | services | historical_blended_ebitda | 26/74/0 | 26/74/0 | 26/74/0 | 26/74/0 |
| services | legal | services | historical_blended_ebitda | 24/76/0 | 23/77/0 | 23/77/0 | 23/77/0 |
| services | accounting | services | historical_blended_ebitda | 26/74/0 | 26/74/0 | 26/74/0 | 26/74/0 |
| services | marketing | services | historical_blended_ebitda | 29/71/0 | 28/72/0 | 28/72/0 | 28/72/0 |
| industry | manufacturing | industry | historical_blended_ebitda | 50/50/0 | 52/48/0 | 52/48/0 | 52/48/0 |
| industry | distribution | industry | historical_blended_ebitda | 46/54/0 | 47/53/0 | 47/53/0 | 47/53/0 |
| industry | food_bev | industry | historical_blended_ebitda | 41/59/0 | 42/58/0 | 42/58/0 | 42/58/0 |
| industry | traditional | industry | historical_blended_ebitda | 46/54/0 | 47/53/0 | 47/53/0 | 47/53/0 |
| retail_unified | retail-supermarkets | retail_unified | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| retail_unified | d2c | retail_unified | historical_blended_ebitda | 34/66/0 | 34/66/0 | 34/66/0 | 34/66/0 |
| retail_unified | retail-fashion | retail_unified | historical_blended_ebitda | 34/66/0 | 34/66/0 | 34/66/0 | 34/66/0 |
| retail_unified | marketplace | retail_unified | current_run_rate_revenue | 31/0/69 | 31/0/69 | 31/0/69 | 31/0/69 |
| retail_unified | specialty | retail_unified | historical_blended_ebitda | 34/66/0 | 34/66/0 | 34/66/0 | 34/66/0 |
| food_service | restaurant | food_service | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| food_service | cafe | food_service | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| food_service | catering | food_service | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| food_service | franchise | food_service | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| food_service | delivery | food_service | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| energy | solar | industry | historical_blended_ebitda | 55/45/0 | 57/43/0 | 57/43/0 | 57/43/0 |
| energy | storage | industry | historical_blended_ebitda | 50/50/0 | 52/48/0 | 52/48/0 | 52/48/0 |
| energy | wind | industry | historical_blended_ebitda | 55/45/0 | 57/43/0 | 57/43/0 | 57/43/0 |
| energy | services_energy | industry | historical_blended_ebitda | 41/59/0 | 42/58/0 | 42/58/0 | 42/58/0 |
| defense_aerospace | defense_manufacturing | industry | historical_blended_ebitda | 46/54/0 | 47/53/0 | 47/53/0 | 47/53/0 |
| defense_aerospace | aviation_space | industry | historical_blended_ebitda | 43/57/0 | 44/56/0 | 44/56/0 | 44/56/0 |
| defense_aerospace | defense_tech | industry | historical_blended_ebitda | 41/59/0 | 42/58/0 | 42/58/0 | 42/58/0 |
| real_estate | re_development | real_estate | historical_blended_ebitda | 53/47/0 | 55/45/0 | 55/45/0 | 55/45/0 |
| real_estate | re_income | real_estate | historical_blended_ebitda | 17/83/0 | 15/85/0 | 15/85/0 | 15/85/0 |
| real_estate | construction_contracting | industry | historical_blended_ebitda | 41/59/0 | 42/58/0 | 42/58/0 | 42/58/0 |
| real_estate | proptech | services | historical_blended_ebitda | 36/64/0 | 36/64/0 | 36/64/0 | 36/64/0 |
| other | general | services | historical_blended_ebitda | 50/50/0 | 52/48/0 | 52/48/0 | 52/48/0 |

## טבלה 2: מכפילים

| תת ענף | מקור המכפיל | סוג | ברירת מחדל | טווח קונפיג | גבולות נרמול | מכפיל אפקטיבי (ייחוס) | מכפיל הכנסות גולמי | מכפיל הכנסות אחרי נרמול | DLOM | DLOM בשל | סקייל |
|---|---|---|---|---|---|---|---|---|---|---|---|
| boutique_hotel | engine defaults (industry_config) | EBITDA | 9.5 | 8.74 עד 10.26 | 4 עד 14 | 7.296 | 2.1 | 4 | 0.8 | 0.8075 | 0.96 |
| hotel_chain | engine defaults (industry_config) | EBITDA | 10.5 | 9.66 עד 11.34 | 4 עד 14 | 8.064 | 2.2 | 4 | 0.8 | 0.8075 | 0.96 |
| vacation | engine defaults (industry_config) | EBITDA | 9 | 8.28 עד 9.72 | 4 עד 14 | 6.912 | 2 | 4 | 0.8 | 0.8075 | 0.96 |
| airbnb_mgmt | engine defaults (industry_config) | EBITDA | 8.5 | 7.82 עד 9.18 | 4 עד 14 | 6.528 | 2 | 4 | 0.8 | 0.8075 | 0.96 |
| b2b_saas | market offline median x multAdj | EV/Revenue | 6.9 | 4 עד 8 | 3 עד 22 | 5.299 | 6.9 | 5.299 | 0.8 | 0.8075 | 0.96 |
| b2c_saas | market offline median x multAdj | EV/Revenue | 6 | 4 עד 8 | 3 עד 22 | 4.608 | 6 | 4.608 | 0.8 | 0.8075 | 0.96 |
| devtools | market offline median x multAdj | EV/Revenue | 7.2 | 4 עד 8 | 3 עד 22 | 5.53 | 7.2 | 5.53 | 0.8 | 0.8075 | 0.96 |
| marketplace | market offline median x multAdj | EV/Revenue | 5.7 | 4 עד 8 | 3 עד 22 | 4.378 | 5.7 | 4.378 | 0.8 | 0.8075 | 0.96 |
| payments | market offline median x multAdj | EV/Revenue | 8.3 | 4 עד 8 | 2.5 עד 18 | 6.374 | 8.3 | 6.374 | 0.8 | 0.8075 | 0.96 |
| lending | market offline median x multAdj | EV/Revenue | 7.1 | 4 עד 8 | 2.5 עד 18 | 5.453 | 7.1 | 5.453 | 0.8 | 0.8075 | 0.96 |
| insurtech | market offline median x multAdj | EV/Revenue | 7.5 | 4 עד 8 | 2.5 עד 18 | 5.76 | 7.5 | 5.76 | 0.8 | 0.8075 | 0.96 |
| wealth | market offline median x multAdj | EV/Revenue | 7.9 | 4 עד 8 | 2.5 עד 18 | 6.067 | 7.9 | 6.067 | 0.8 | 0.8075 | 0.96 |
| enterprise | market offline median x multAdj | EV/Revenue | 10.1 | 4 עד 8 | 4 עד 25 | 7.757 | 10.1 | 7.757 | 0.8 | 0.8075 | 0.96 |
| cloud | market offline median x multAdj | EV/Revenue | 10.4 | 4 עד 8 | 4 עד 25 | 7.987 | 10.4 | 7.987 | 0.8 | 0.8075 | 0.96 |
| ot | market offline median x multAdj | EV/Revenue | 9 | 4 עד 8 | 4 עד 25 | 6.912 | 9 | 6.912 | 0.8 | 0.8075 | 0.96 |
| services_cyber | market offline median x multAdj | EV/Revenue | 8.1 | 4 עד 8 | 4 עד 25 | 6.221 | 8.1 | 6.221 | 0.8 | 0.8075 | 0.96 |
| medtech | market offline median x multAdj | EV/EBITDA | 13 | 4 עד 6 | 3 עד 20 | 9.984 | 4.9 | 3.763 | 0.8 | 0.8075 | 0.96 |
| biotech | market offline median x multAdj | EV/EBITDA | 13.8 | 4 עד 6 | 3 עד 20 | 10.598 | 5.2 | 3.994 | 0.8 | 0.8075 | 0.96 |
| digital_health | market offline median x multAdj | EV/EBITDA | 13.2 | 4 עד 6 | 3 עד 20 | 10.138 | 5 | 3.84 | 0.8 | 0.8075 | 0.96 |
| services_health | market offline median x multAdj | EV/EBITDA | 10.6 | 4 עד 6 | 3 עד 20 | 8.141 | 4 | 3.072 | 0.8 | 0.8075 | 0.96 |
| consulting | market offline median x multAdj | EV/EBITDA | 8.5 | 4 עד 6 | 2.5 עד 12 | 6.528 | 1.5 | 2.5 | 0.8 | 0.8075 | 0.96 |
| legal | market offline median x multAdj | EV/EBITDA | 8.1 | 4 עד 6 | 2.5 עד 12 | 6.221 | 1.4 | 2.5 | 0.8 | 0.8075 | 0.96 |
| accounting | market offline median x multAdj | EV/EBITDA | 7.8 | 4 עד 6 | 2.5 עד 12 | 5.99 | 1.4 | 2.5 | 0.8 | 0.8075 | 0.96 |
| marketing | market offline median x multAdj | EV/EBITDA | 8.3 | 4 עד 6 | 2.5 עד 12 | 6.374 | 1.5 | 2.5 | 0.8 | 0.8075 | 0.96 |
| manufacturing | market offline median x multAdj | EV/EBITDA | 6.2 | 5 עד 7.5 | 2 עד 9 | 4.762 | 0.7 | 2 | 0.8 | 0.8075 | 0.96 |
| distribution | market offline median x multAdj | EV/EBITDA | 5.9 | 5 עד 7.5 | 2 עד 9 | 4.531 | 0.7 | 2 | 0.8 | 0.8075 | 0.96 |
| food_bev | market offline median x multAdj | EV/EBITDA | 6 | 5 עד 7.5 | 2 עד 9 | 4.608 | 0.7 | 2 | 0.8 | 0.8075 | 0.96 |
| traditional | market offline median x multAdj | EV/EBITDA | 5.5 | 5 עד 7.5 | 2 עד 9 | 4.224 | 0.6 | 2 | 0.8 | 0.8075 | 0.96 |
| retail-supermarkets | engine defaults (industry_config) | EBITDA | 4.5 | 4.14 עד 4.86 | 2 עד 9 | 3.456 | 0.4 | 2 | 0.8 | 0.8075 | 0.96 |
| d2c | engine defaults (industry_config) | EBITDA | 6 | 5.52 עד 6.48 | 2 עד 9 | 4.608 | 0.4 | 2 | 0.8 | 0.8075 | 0.96 |
| retail-fashion | engine defaults (industry_config) | EBITDA | 3.5 | 3.22 עד 3.78 | 2 עד 9 | 2.688 | 0.3 | 2 | 0.8 | 0.8075 | 0.96 |
| marketplace | engine defaults (industry_config) | Revenue | 0.6 | 0.55 עד 0.65 | 2 עד 9 | 2 | 0.6 | 2 | 0.8 | 0.8075 | 0.96 |
| specialty | engine defaults (industry_config) | EBITDA | 5.2 | 4.78 עד 5.62 | 2 עד 9 | 3.994 | 0.4 | 2 | 0.8 | 0.8075 | 0.96 |
| restaurant | engine defaults (industry_config) | EBITDA | 3.5 | 3.22 עד 3.78 | 2 עד 8 | 2.688 | 0.5 | 2 | 0.8 | 0.8075 | 0.96 |
| cafe | engine defaults (industry_config) | EBITDA | 4 | 3.68 עד 4.32 | 2 עד 8 | 3.072 | 0.5 | 2 | 0.8 | 0.8075 | 0.96 |
| catering | engine defaults (industry_config) | EBITDA | 4.5 | 4.14 עד 4.86 | 2 עד 8 | 3.456 | 0.5 | 2 | 0.8 | 0.8075 | 0.96 |
| franchise | engine defaults (industry_config) | EBITDA | 6.5 | 5.98 עד 7.02 | 2 עד 8 | 4.992 | 0.6 | 2 | 0.8 | 0.8075 | 0.96 |
| delivery | engine defaults (industry_config) | EBITDA | 4.2 | 3.86 עד 4.54 | 2 עד 8 | 3.226 | 0.6 | 2 | 0.8 | 0.8075 | 0.96 |
| solar | market offline median x multAdj | EV/EBITDA | 13.8 | 5 עד 7.5 | 3 עד 16 | 10.598 | 5 | 3.84 | 0.8 | 0.8075 | 0.96 |
| storage | market offline median x multAdj | EV/EBITDA | 14.4 | 5 עד 7.5 | 3 עד 16 | 11.059 | 5.2 | 3.994 | 0.8 | 0.8075 | 0.96 |
| wind | market offline median x multAdj | EV/EBITDA | 13.5 | 5 עד 7.5 | 3 עד 16 | 10.368 | 4.9 | 3.763 | 0.8 | 0.8075 | 0.96 |
| services_energy | market offline median x multAdj | EV/EBITDA | 11.9 | 5 עד 7.5 | 3 עד 16 | 9.139 | 4.3 | 3.302 | 0.8 | 0.8075 | 0.96 |
| defense_manufacturing | market offline median x multAdj | EV/EBITDA | 9.8 | 5 עד 7.5 | 3 עד 14 | 7.526 | 2 | 3 | 0.8 | 0.8075 | 0.96 |
| aviation_space | market offline median x multAdj | EV/EBITDA | 11 | 5 עד 7.5 | 3 עד 14 | 8.448 | 2.2 | 3 | 0.8 | 0.8075 | 0.96 |
| defense_tech | market offline median x multAdj | EV/EBITDA | 11.4 | 5 עד 7.5 | 3 עד 14 | 8.755 | 2.3 | 3 | 0.8 | 0.8075 | 0.96 |
| re_development | engine defaults (industry_config) | EBITDA | 6.5 | 5.98 עד 7.02 | 4 עד 20 | 4.992 | 11.6 | 8.909 | 0.8 | 0.8075 | 0.96 |
| re_income | valuation profile nav range | NAV | 1 | 0.8 עד 2 | 4 עד 20 | 4 | 10.8 | 8.294 | 0.8 | 0.8075 | 0.96 |
| construction_contracting | engine defaults (industry_config) | EBITDA | 5.5 | 5.06 עד 5.94 | 2 עד 8 | 4.224 | 10.5 | 8 | 0.8 | 0.8075 | 0.96 |
| proptech | engine defaults (industry_config) | EBITDA | 12 | 11.04 עד 12.96 | 2.5 עד 12 | 9.216 | 11.9 | 9.139 | 0.8 | 0.8075 | 0.96 |
| general | market offline median x multAdj | EV/EBITDA | 9 | 4 עד 6 | 2 עד 12 | 6.912 | 1.5 | 2 | 0.8 | 0.8075 | 0.96 |

## טבלה 3: DCF, סיכון ונרמול

| תת ענף | תקרת מרווח % | תקרת צמיחה % | בטא לא ממונפת | פחת % מהכנסות | בסיס CAPEX | טבלת מכפילים | נרמול מחזורי | משטר הפסד | צבר | waccBasePct מוגדר |
|---|---|---|---|---|---|---|---|---|---|---|
| boutique_hotel | 30 | 10 | 0.88 | 5 | blended | hospitality | לא | כן | כן | 13.8 |
| hotel_chain | 30 | 10 | 0.88 | 5 | blended | hospitality | לא | כן | כן | 13.5 |
| vacation | 30 | 10 | 0.88 | 5 | blended | hospitality | לא | כן | כן | 13.8 |
| airbnb_mgmt | 30 | 10 | 0.88 | 5 | blended | hospitality | לא | כן | כן | 14 |
| b2b_saas | 35 | 60 | 1.12 | 2 | ebitda | saas | לא | כן | כן |  |
| b2c_saas | 35 | 60 | 1.12 | 2 | ebitda | saas | לא | כן | כן |  |
| devtools | 35 | 60 | 1.12 | 2 | ebitda | saas | לא | כן | כן |  |
| marketplace | 35 | 60 | 1.12 | 2 | ebitda | saas | לא | כן | כן |  |
| payments | 35 | 60 | 1.05 | 2 | ebitda | fintech | לא | כן | כן |  |
| lending | 35 | 60 | 1.05 | 2 | ebitda | fintech | לא | כן | כן |  |
| insurtech | 35 | 60 | 1.05 | 2 | ebitda | fintech | לא | כן | כן |  |
| wealth | 35 | 60 | 1.05 | 2 | ebitda | fintech | לא | כן | כן |  |
| enterprise | 35 | 60 | 1.1 | 2 | ebitda | cyber | לא | כן | כן |  |
| cloud | 35 | 60 | 1.1 | 2 | ebitda | cyber | לא | כן | כן |  |
| ot | 35 | 60 | 1.1 | 2 | ebitda | cyber | לא | כן | כן |  |
| services_cyber | 35 | 60 | 1.1 | 2 | ebitda | cyber | לא | כן | כן |  |
| medtech | 28 | 15 | 0.98 | 3 | blended | healthtech | לא | כן | כן |  |
| biotech | 28 | 15 | 0.98 | 3 | blended | healthtech | לא | כן | כן |  |
| digital_health | 28 | 15 | 0.98 | 3 | blended | healthtech | לא | כן | כן |  |
| services_health | 28 | 15 | 0.98 | 3 | blended | healthtech | לא | כן | כן |  |
| consulting | 28 | 15 | 0.92 | 2 | ebitda | professional_services | לא | כן | כן |  |
| legal | 28 | 15 | 0.92 | 2 | ebitda | professional_services | לא | כן | כן |  |
| accounting | 28 | 15 | 0.92 | 2 | ebitda | professional_services | לא | כן | כן |  |
| marketing | 28 | 15 | 0.92 | 2 | ebitda | professional_services | לא | כן | כן |  |
| manufacturing | 22 | 25 | 1.02 | 6 | revenue | manufacturing | לא | כן | כן |  |
| distribution | 22 | 25 | 1.02 | 6 | revenue | manufacturing | לא | כן | כן |  |
| food_bev | 22 | 25 | 1.02 | 6 | revenue | manufacturing | לא | כן | כן |  |
| traditional | 22 | 25 | 1.02 | 6 | revenue | manufacturing | לא | כן | כן |  |
| retail-supermarkets | 18 | 20 | 1.03 | 3 | blended | retail_unified | לא | כן | כן | 11 |
| d2c | 18 | 20 | 1.03 | 3 | blended | retail_unified | לא | כן | כן | 14 |
| retail-fashion | 18 | 20 | 1.03 | 3 | blended | retail_unified | לא | כן | כן | 14.5 |
| marketplace | 18 | 20 | 1.03 | 3 | blended | retail_unified | לא | כן | כן | 14.5 |
| specialty | 18 | 20 | 1.03 | 3 | blended | retail_unified | לא | כן | כן | 14.8 |
| restaurant | 22 | 25 | 0.95 | 4 | blended | food_service | לא | כן | כן | 15.5 |
| cafe | 22 | 25 | 0.95 | 4 | blended | food_service | לא | כן | כן | 15 |
| catering | 22 | 25 | 0.95 | 4 | blended | food_service | לא | כן | כן | 14.5 |
| franchise | 22 | 25 | 0.95 | 4 | blended | food_service | לא | כן | כן | 14 |
| delivery | 22 | 25 | 0.95 | 4 | blended | food_service | לא | כן | כן | 15.5 |
| solar | 22 | 25 | 0.86 | 7 | revenue | energy | לא | כן | כן |  |
| storage | 22 | 25 | 0.86 | 7 | revenue | energy | לא | כן | כן |  |
| wind | 22 | 25 | 0.86 | 7 | revenue | energy | לא | כן | כן |  |
| services_energy | 22 | 25 | 0.86 | 7 | revenue | energy | לא | כן | כן |  |
| defense_manufacturing | 22 | 25 | 0.82 | 4 | blended | defense | לא | כן | כן |  |
| aviation_space | 22 | 25 | 0.82 | 4 | blended | defense | לא | כן | כן |  |
| defense_tech | 22 | 25 | 0.82 | 4 | blended | defense | לא | כן | כן |  |
| re_development | 40 | 10 | 0.78 | 5 | revenue | realestate | כן | כן | כן | 12 |
| re_income | 40 | 10 | 0.78 | 5 | revenue | realestate | לא | כן | כן |  |
| construction_contracting | 22 | 25 | 0.78 | 6 | revenue | construction | כן | כן | כן | 9.5 |
| proptech | 28 | 15 | 0.78 | 2 | ebitda | professional_services | לא | כן | כן | 8.5 |
| general | 28 | 15 | 1 | 4 | blended | other | לא | כן | כן |  |

## חריגות מול ענפים דומים (רק רישום, בלי שינוי)

1. re_income (נדל"ן מניב): פרופיל השווי הוא NAV, וברירת המחדל היא 1.0 (מכפיל P/B או NAV). הערך הזה נכנס לרגל מכפיל EBITDA, נחתך לגבול התחתון של realestate (4.0), ומקבל משקל של כ 85%. בפועל זה מכפיל EBITDA של 4 שאין לו מקור, ולא שיטת נכסים.
2. waccBasePct מוגדר ב 15 תתי ענפים (מלונאות, קמעונאות, מזון, נדל"ן) ומועבר ל sectorConfig, אבל computeCapmWacc לא קורא אותו. הערכים (8.5% עד 15.5%) לא משפיעים על שום מספר.
3. מכפיל הכנסות עובר דרך גבולות מכפיל EBITDA (ממצא 5). בכל הענפים המסורתיים המכפיל הגולמי נמוך מהגבול התחתון וקופץ: ייצור והפצה 0.7 ל 2.0, קמעונאות 0.3 עד 0.4 ל 2.0, מזון 0.5 עד 0.6 ל 2.0, שירותים 1.4 עד 1.5 ל 2.5. זה פועל רק כשיש משקל להכנסות, כלומר במשטר הפסד או רווח דק, ולכן חברה מפסידה יכולה להיות שווה יותר מחברה רווחית.
4. retail_unified/marketplace: אסטרטגיית הכנסות עם מכפיל 0.6 שנחתך ל 2.0 (פי 3.3), ומשקל הכנסות של כ 69%. בתיק sub-retail_unified-marketplace (הכנסות 9M, מרווח 8%) השווי לבעלים יוצא 12.7M, פי 1.4 מההכנסות.
5. נדל"ן: מכפילי הכנסות גולמיים של 10.5 עד 11.9 (טבלת realestate ו construction). בקבלן ביצוע (construction_contracting) מכפיל הכנסות של 8 אחרי נרמול. המשקל להכנסות הוא 0 במשטר רווחי, אבל קבלן בהפסד יקבל משקל הכנסות ומכפיל 8 על המחזור.
6. בריאות (health) ו"אחר" ממופים לפרופיל services: תקרת מרווח 28%, תקרת צמיחה 15%. מדטק וביוטק מקבלים מכפיל EBITDA של 13 עד 14 אבל את תקרות הצמיחה של משרד שירותים.
7. אנרגיה וביטחון ממופים לפרופיל industry (תקרת מרווח 22%). בסולארי ורוח מרווח EBITDA של 35% עד 60% הוא רגיל, והוא נחתך ל 22% בנרמול ההיסטורי (applySectorMarginGuardrails).
8. פינטק וסייבר ממופים לפרופיל saas: אסטרטגיית הכנסות ומשקל EBITDA אפס גם לחברת סייבר רווחית ובשלה. lending (אשראי) מוערך לפי מכפיל הכנסות 7.1, לא לפי P/B או הון.
9. proptech: מכפיל EBITDA 12, בדיוק על הגבול העליון של professional_services, ובסיס CAPEX של שירותים מקצועיים.
10. שלב החיים כמעט לא משנה משקלות בחברת ייחוס של 30M: early, growth ו mature זהים, ורק seed שונה מעט. השורה mature ב SCALE_MODIFIER_MATRIX (יעד DCF של 65%) לא נכנסת לחישוב המשקלות בכלל (ראו test-scale-modifier-pipeline).
11. DLOM אחיד (0.8) בכל הענפים ובכל השלבים, חוץ מתוספת קטנה לחברה בשלה לפי גודל. אין הבדל בין עסק בעלים קטן לחברה של מאות מיליונים בשלב growth.
12. בטא לא ממונפת נקבעת לפי ענף בלבד, לא לפי תת ענף: מלון בוטיק ורשת מלונות, או ייצור ומזון, מקבלים אותה בטא.
13. בסיס ה CAPEX שונה בין ענפים: בתוכנה, פינטק, סייבר ושירותים מקצועיים CAPEX מחושב כאחוז מ EBITDA ומוגבל ל 15% ממנו, למרות שהאשף שואל על אחוז מההכנסות.
14. נרמול מחזורי (ממוצע 3 שנים לרגל המכפיל) פועל רק ב re_development וב construction_contracting. ענפים מחזוריים אחרים (תעשייה מסורתית, הפצה) לא מקבלים אותו.
