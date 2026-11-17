# סבב 2: PDF לפני ואחרי

נוצר על ידי `npx tsx scripts/round-2/pdf-diff.ts --images`. השוואת פיקסלים של ה PNG ב 110 dpi. פיקסל שונה: הפרש של יותר מ 24 באחד הערוצים. בכל תמונה: **אחרי משמאל, לפני מימין**.

1. מתודולוגיה 1 (הדגל כבוי): `pdf-before` (קומיט 789b2f3, לפני חלק ב) מול `pdf-after`, 13 תיקים.
2. מתודולוגיה 2: `pdf-after/<id>.pdf` (כבוי) מול `pdf-after/<id>-v2.pdf` (דלוק), 4 תיקים: מסעדה, מפעל צעיר, SaaS, וחברה של 1B (golden-large-industrial).
3. שינוי של פחות מ 0.05% מהפיקסלים, בלי שינוי בטקסט (נבדק בעין בתמונות), הוא רעש רינדור של גופן (החלקת קצוות), ולא נחשב שינוי.
4. עמוד שלא היה אמור להשתנות ושונה מעבר לרעש הוא כשל.

## מתודולוגיה 1: לפני חלק ב מול אחרי

| תיק | ע 1 | ע 2 | ע 3 | ע 4 | ע 5 | ע 6 | ע 7 | ע 8 |
|---|---|---|---|---|---|---|---|---|
| anchor-1-restaurant | רעש (0%) | 0.3% | 4.63% | 3.04% | 3.96% | רעש (0.01%) | 5.51% | רעש (0.04%) |
| anchor-2-saas | זהה | 0.29% | 4.56% | 5.52% | 3.33% | זהה | 5.77% | רעש (0%) |
| anchor-3-contractor | זהה | 0.85% | 4.48% | 5.72% | 3.9% | זהה | 5.51% | 2.16% |
| anchor-4-accounting | זהה | 0.3% | 4.68% | 5.53% | 3.42% | זהה | 5.52% | זהה |
| anchor-5-young-factory | זהה | 4.53% | 4.19% | 6.31% | 4.36% | זהה | 5.52% | 0.1% |
| anchor-6-loss-factory | זהה | 4.55% | 4.2% | 5.9% | 4.29% | זהה | 5.56% | 0.09% |
| anchor-7-thin-factory | זהה | 0.98% | 4.21% | 6.3% | 4.36% | זהה | 5.5% | 0.16% |
| golden-b2b-saas | זהה | 0.83% | 4.66% | 5.52% | 3.33% | זהה | 6.05% | 0.08% |
| golden-boutique-hotel | זהה | 0.75% | 4.61% | 5.6% | 3.86% | זהה | 5.76% | 0.11% |
| golden-income-re | זהה | 0.29% | 4.61% | 6.09% | 3.95% | זהה | 5.7% | זהה |
| golden-large-industrial | זהה | 0.32% | 4.79% | 5.66% | 4.07% | זהה | 6.17% | זהה |
| golden-manufacturing | זהה | 0.76% | 4.63% | 5.6% | 4.06% | זהה | 5.78% | 0.11% |
| golden-restaurant | זהה | 0.76% | 4.63% | 3% | 3.95% | זהה | 5.55% | 0.07% |

### עמוד 1: שער

לא אמור להשתנות, ולא השתנה (מעבר לרעש רינדור).

### עמוד 2: תקציר מנהלים

למה: חלק ב: משקלות בספרה אחת אחרי הנקודה, הערת המתודולוגיה מציגה את משקלות המנוע (במפעלים היא הציגה 45/14/42 מול טבלה של 48.5/22.7/28.8), רגל אפס מסומנת "לא רלוונטית בגלל EBITDA שלילי", ו "Big-4" יצא מהערת ה EBITDA המנורמל.

anchor-1-restaurant (0.3% מהפיקסלים, שורות 20% עד 85% מגובה העמוד)

![anchor-1-restaurant עמוד 2](pdf-compare/anchor-1-restaurant-p2.png)

anchor-2-saas (0.29% מהפיקסלים, שורות 84% עד 85% מגובה העמוד)

![anchor-2-saas עמוד 2](pdf-compare/anchor-2-saas-p2.png)

anchor-3-contractor (0.85% מהפיקסלים, שורות 18% עד 85% מגובה העמוד)

![anchor-3-contractor עמוד 2](pdf-compare/anchor-3-contractor-p2.png)

anchor-4-accounting (0.3% מהפיקסלים, שורות 84% עד 85% מגובה העמוד)

![anchor-4-accounting עמוד 2](pdf-compare/anchor-4-accounting-p2.png)

anchor-5-young-factory (4.53% מהפיקסלים, שורות 20% עד 85% מגובה העמוד)

![anchor-5-young-factory עמוד 2](pdf-compare/anchor-5-young-factory-p2.png)

anchor-6-loss-factory (4.55% מהפיקסלים, שורות 20% עד 85% מגובה העמוד)

![anchor-6-loss-factory עמוד 2](pdf-compare/anchor-6-loss-factory-p2.png)

anchor-7-thin-factory (0.98% מהפיקסלים, שורות 20% עד 85% מגובה העמוד)

![anchor-7-thin-factory עמוד 2](pdf-compare/anchor-7-thin-factory-p2.png)

golden-b2b-saas (0.83% מהפיקסלים, שורות 20% עד 85% מגובה העמוד)

![golden-b2b-saas עמוד 2](pdf-compare/golden-b2b-saas-p2.png)

golden-boutique-hotel (0.75% מהפיקסלים, שורות 18% עד 85% מגובה העמוד)

![golden-boutique-hotel עמוד 2](pdf-compare/golden-boutique-hotel-p2.png)

golden-income-re (0.29% מהפיקסלים, שורות 84% עד 85% מגובה העמוד)

![golden-income-re עמוד 2](pdf-compare/golden-income-re-p2.png)

golden-large-industrial (0.32% מהפיקסלים, שורות 84% עד 85% מגובה העמוד)

![golden-large-industrial עמוד 2](pdf-compare/golden-large-industrial-p2.png)

golden-manufacturing (0.76% מהפיקסלים, שורות 18% עד 85% מגובה העמוד)

![golden-manufacturing עמוד 2](pdf-compare/golden-manufacturing-p2.png)

golden-restaurant (0.76% מהפיקסלים, שורות 20% עד 85% מגובה העמוד)

![golden-restaurant עמוד 2](pdf-compare/golden-restaurant-p2.png)

### עמוד 3: נתונים פיננסיים

למה: חלק ב (ממצא 15): שני בסיסי ה EBITDA מוצגים כל אחד בשם שלו ועם המשקלות שהמנוע השתמש בהם.

anchor-1-restaurant (4.63% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-1-restaurant עמוד 3](pdf-compare/anchor-1-restaurant-p3.png)

anchor-2-saas (4.56% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-2-saas עמוד 3](pdf-compare/anchor-2-saas-p3.png)

anchor-3-contractor (4.48% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-3-contractor עמוד 3](pdf-compare/anchor-3-contractor-p3.png)

anchor-4-accounting (4.68% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-4-accounting עמוד 3](pdf-compare/anchor-4-accounting-p3.png)

anchor-5-young-factory (4.19% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-5-young-factory עמוד 3](pdf-compare/anchor-5-young-factory-p3.png)

anchor-6-loss-factory (4.2% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-6-loss-factory עמוד 3](pdf-compare/anchor-6-loss-factory-p3.png)

anchor-7-thin-factory (4.21% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![anchor-7-thin-factory עמוד 3](pdf-compare/anchor-7-thin-factory-p3.png)

golden-b2b-saas (4.66% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![golden-b2b-saas עמוד 3](pdf-compare/golden-b2b-saas-p3.png)

golden-boutique-hotel (4.61% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![golden-boutique-hotel עמוד 3](pdf-compare/golden-boutique-hotel-p3.png)

golden-income-re (4.61% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![golden-income-re עמוד 3](pdf-compare/golden-income-re-p3.png)

golden-large-industrial (4.79% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![golden-large-industrial עמוד 3](pdf-compare/golden-large-industrial-p3.png)

golden-manufacturing (4.63% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![golden-manufacturing עמוד 3](pdf-compare/golden-manufacturing-p3.png)

golden-restaurant (4.63% מהפיקסלים, שורות 15% עד 64% מגובה העמוד)

![golden-restaurant עמוד 3](pdf-compare/golden-restaurant-p3.png)

### עמוד 4: DCF ו WACC

למה: חלק ב: טבלת WACC אחת עם Kd ומשקלות, גרף שמסתכם ל WACC (ה 1.6 יצא), והמשפט על תקרת 42%. סבב 2ב (ממצא 28): טבלת ה DCF היא התחזית שהמנוע העריך ומסתכמת לרגל. במפעל הצעיר ובמפעל הדק התזרים ברמת ה CAPEX שלהם הוא 0, ולכן הטבלה מציגה את התחזית בלי CAPEX שממנה השווי נגזר, עם משפט שמסביר.

anchor-1-restaurant (3.04% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![anchor-1-restaurant עמוד 4](pdf-compare/anchor-1-restaurant-p4.png)

anchor-2-saas (5.52% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![anchor-2-saas עמוד 4](pdf-compare/anchor-2-saas-p4.png)

anchor-3-contractor (5.72% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![anchor-3-contractor עמוד 4](pdf-compare/anchor-3-contractor-p4.png)

anchor-4-accounting (5.53% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![anchor-4-accounting עמוד 4](pdf-compare/anchor-4-accounting-p4.png)

anchor-5-young-factory (6.31% מהפיקסלים, שורות 15% עד 91% מגובה העמוד)

![anchor-5-young-factory עמוד 4](pdf-compare/anchor-5-young-factory-p4.png)

anchor-6-loss-factory (5.9% מהפיקסלים, שורות 15% עד 91% מגובה העמוד)

![anchor-6-loss-factory עמוד 4](pdf-compare/anchor-6-loss-factory-p4.png)

anchor-7-thin-factory (6.3% מהפיקסלים, שורות 15% עד 91% מגובה העמוד)

![anchor-7-thin-factory עמוד 4](pdf-compare/anchor-7-thin-factory-p4.png)

golden-b2b-saas (5.52% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![golden-b2b-saas עמוד 4](pdf-compare/golden-b2b-saas-p4.png)

golden-boutique-hotel (5.6% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![golden-boutique-hotel עמוד 4](pdf-compare/golden-boutique-hotel-p4.png)

golden-income-re (6.09% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![golden-income-re עמוד 4](pdf-compare/golden-income-re-p4.png)

golden-large-industrial (5.66% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![golden-large-industrial עמוד 4](pdf-compare/golden-large-industrial-p4.png)

golden-manufacturing (5.6% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![golden-manufacturing עמוד 4](pdf-compare/golden-manufacturing-p4.png)

golden-restaurant (3% מהפיקסלים, שורות 15% עד 90% מגובה העמוד)

![golden-restaurant עמוד 4](pdf-compare/golden-restaurant-p4.png)

### עמוד 5: מכפילי שוק

למה: חלק ב (ממצא 7): טווחי Damodaran לענף עם מקור ותאריך במקום "חציון שוק" שנגזר מהחברה, וסמן החברה במכפיל שהדוח משתמש בו.

anchor-1-restaurant (3.96% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-1-restaurant עמוד 5](pdf-compare/anchor-1-restaurant-p5.png)

anchor-2-saas (3.33% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-2-saas עמוד 5](pdf-compare/anchor-2-saas-p5.png)

anchor-3-contractor (3.9% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-3-contractor עמוד 5](pdf-compare/anchor-3-contractor-p5.png)

anchor-4-accounting (3.42% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-4-accounting עמוד 5](pdf-compare/anchor-4-accounting-p5.png)

anchor-5-young-factory (4.36% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-5-young-factory עמוד 5](pdf-compare/anchor-5-young-factory-p5.png)

anchor-6-loss-factory (4.29% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-6-loss-factory עמוד 5](pdf-compare/anchor-6-loss-factory-p5.png)

anchor-7-thin-factory (4.36% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![anchor-7-thin-factory עמוד 5](pdf-compare/anchor-7-thin-factory-p5.png)

golden-b2b-saas (3.33% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![golden-b2b-saas עמוד 5](pdf-compare/golden-b2b-saas-p5.png)

golden-boutique-hotel (3.86% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![golden-boutique-hotel עמוד 5](pdf-compare/golden-boutique-hotel-p5.png)

golden-income-re (3.95% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![golden-income-re עמוד 5](pdf-compare/golden-income-re-p5.png)

golden-large-industrial (4.07% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![golden-large-industrial עמוד 5](pdf-compare/golden-large-industrial-p5.png)

golden-manufacturing (4.06% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![golden-manufacturing עמוד 5](pdf-compare/golden-manufacturing-p5.png)

golden-restaurant (3.95% מהפיקסלים, שורות 12% עד 91% מגובה העמוד)

![golden-restaurant עמוד 5](pdf-compare/golden-restaurant-p5.png)

### עמוד 6: תרחישים

לא אמור להשתנות, ולא השתנה (מעבר לרעש רינדור).

### עמוד 7: איכות ורגישות

למה: חלק ב (ממצא 6): כל תא ברגישות הוא הרצה מלאה של המנוע, צמיחה טרמינלית 1.5% עד 3.5% וצעד WACC של נקודה.

anchor-1-restaurant (5.51% מהפיקסלים, שורות 15% עד 92% מגובה העמוד)

![anchor-1-restaurant עמוד 7](pdf-compare/anchor-1-restaurant-p7.png)

anchor-2-saas (5.77% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![anchor-2-saas עמוד 7](pdf-compare/anchor-2-saas-p7.png)

anchor-3-contractor (5.51% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![anchor-3-contractor עמוד 7](pdf-compare/anchor-3-contractor-p7.png)

anchor-4-accounting (5.52% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![anchor-4-accounting עמוד 7](pdf-compare/anchor-4-accounting-p7.png)

anchor-5-young-factory (5.52% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![anchor-5-young-factory עמוד 7](pdf-compare/anchor-5-young-factory-p7.png)

anchor-6-loss-factory (5.56% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![anchor-6-loss-factory עמוד 7](pdf-compare/anchor-6-loss-factory-p7.png)

anchor-7-thin-factory (5.5% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![anchor-7-thin-factory עמוד 7](pdf-compare/anchor-7-thin-factory-p7.png)

golden-b2b-saas (6.05% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![golden-b2b-saas עמוד 7](pdf-compare/golden-b2b-saas-p7.png)

golden-boutique-hotel (5.76% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![golden-boutique-hotel עמוד 7](pdf-compare/golden-boutique-hotel-p7.png)

golden-income-re (5.7% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![golden-income-re עמוד 7](pdf-compare/golden-income-re-p7.png)

golden-large-industrial (6.17% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![golden-large-industrial עמוד 7](pdf-compare/golden-large-industrial-p7.png)

golden-manufacturing (5.78% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![golden-manufacturing עמוד 7](pdf-compare/golden-manufacturing-p7.png)

golden-restaurant (5.55% מהפיקסלים, שורות 42% עד 92% מגובה העמוד)

![golden-restaurant עמוד 7](pdf-compare/golden-restaurant-p7.png)

### עמוד 8: שווי משולב

למה: חלק ב (ממצא 19): משקלות בפס השקלול בספרה אחת אחרי הנקודה, תווית שנחתכה תוקנה, ובקבלן תוספת הצבר כבר לא מצוירת בפס כרגל "REV 100%".

anchor-3-contractor (2.16% מהפיקסלים, שורות 32% עד 37% מגובה העמוד)

![anchor-3-contractor עמוד 8](pdf-compare/anchor-3-contractor-p8.png)

anchor-5-young-factory (0.1% מהפיקסלים, שורות 33% עד 36% מגובה העמוד)

![anchor-5-young-factory עמוד 8](pdf-compare/anchor-5-young-factory-p8.png)

anchor-6-loss-factory (0.09% מהפיקסלים, שורות 32% עד 37% מגובה העמוד)

![anchor-6-loss-factory עמוד 8](pdf-compare/anchor-6-loss-factory-p8.png)

anchor-7-thin-factory (0.16% מהפיקסלים, שורות 32% עד 37% מגובה העמוד)

![anchor-7-thin-factory עמוד 8](pdf-compare/anchor-7-thin-factory-p8.png)

golden-b2b-saas (0.08% מהפיקסלים, שורות 32% עד 37% מגובה העמוד)

![golden-b2b-saas עמוד 8](pdf-compare/golden-b2b-saas-p8.png)

golden-boutique-hotel (0.11% מהפיקסלים, שורות 32% עד 37% מגובה העמוד)

![golden-boutique-hotel עמוד 8](pdf-compare/golden-boutique-hotel-p8.png)

golden-manufacturing (0.11% מהפיקסלים, שורות 32% עד 37% מגובה העמוד)

![golden-manufacturing עמוד 8](pdf-compare/golden-manufacturing-p8.png)

golden-restaurant (0.07% מהפיקסלים, שורות 33% עד 36% מגובה העמוד)

![golden-restaurant עמוד 8](pdf-compare/golden-restaurant-p8.png)

## מתודולוגיה 2 מול מתודולוגיה 1

| תיק | ע 1 | ע 2 | ע 3 | ע 4 | ע 5 | ע 6 | ע 7 | ע 8 |
|---|---|---|---|---|---|---|---|---|
| anchor-1-restaurant-v2 | 0.13% | 0.32% | זהה | 5.38% | רעש (0.04%) | 0.08% | 0.35% | 0.15% |
| anchor-2-saas-v2 | 0.28% | 0.55% | זהה | 5.29% | 0.21% | 0.15% | 0.75% | 0.39% |
| anchor-5-young-factory-v2 | 0.66% | 7.85% | זהה | 6.01% | 0.19% | 0.27% | 0.65% | 1.54% |
| golden-large-industrial-v2 | 0.24% | 0.82% | זהה | 5.32% | רעש (0.04%) | 0.14% | 0.87% | 0.63% |

### עמוד 1: שער

למה: השווי לבעלים, ה EV והטווח בשער הם של מתודולוגיה 2.

anchor-1-restaurant-v2 (0.13% מהפיקסלים, שורות 35% עד 78% מגובה העמוד)

![anchor-1-restaurant-v2 עמוד 1](pdf-compare/anchor-1-restaurant-v2-p1.png)

anchor-2-saas-v2 (0.28% מהפיקסלים, שורות 36% עד 78% מגובה העמוד)

![anchor-2-saas-v2 עמוד 1](pdf-compare/anchor-2-saas-v2-p1.png)

anchor-5-young-factory-v2 (0.66% מהפיקסלים, שורות 35% עד 78% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 1](pdf-compare/anchor-5-young-factory-v2-p1.png)

golden-large-industrial-v2 (0.24% מהפיקסלים, שורות 36% עד 78% מגובה העמוד)

![golden-large-industrial-v2 עמוד 1](pdf-compare/golden-large-industrial-v2-p1.png)

### עמוד 2: תקציר מנהלים

למה: מספרי התקציר והערת המתודולוגיה (משקלות אחרי העברת משקל מרגל אפס). במפעל הצעיר השווי לבעלים 0 והתקציר משתנה בהתאם.

anchor-1-restaurant-v2 (0.32% מהפיקסלים, שורות 20% עד 80% מגובה העמוד)

![anchor-1-restaurant-v2 עמוד 2](pdf-compare/anchor-1-restaurant-v2-p2.png)

anchor-2-saas-v2 (0.55% מהפיקסלים, שורות 20% עד 80% מגובה העמוד)

![anchor-2-saas-v2 עמוד 2](pdf-compare/anchor-2-saas-v2-p2.png)

anchor-5-young-factory-v2 (7.85% מהפיקסלים, שורות 20% עד 80% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 2](pdf-compare/anchor-5-young-factory-v2-p2.png)

golden-large-industrial-v2 (0.82% מהפיקסלים, שורות 18% עד 80% מגובה העמוד)

![golden-large-industrial-v2 עמוד 2](pdf-compare/golden-large-industrial-v2-p2.png)

### עמוד 3: נתונים פיננסיים

לא אמור להשתנות, ולא השתנה (מעבר לרעש רינדור).

### עמוד 4: DCF ו WACC

למה: W1: שורת CRP, Rf 4.24%, ERP 4.23%, בטא ומשקלות לפי D/E של הענף, והערת מקורות עם תאריכים. T1: טבלת DCF בלי תקרה, שנבנית מהתחזית שהמנוע העריך ולכן מסתכמת לרגל (ממצא 28), ומשפט T1 עם שורת הבדיקה הצולבת במקום משפט ה 42%. במפעל הצעיר התזרים החופשי 0 בכל השנים, והטבלה מראה 0.

anchor-1-restaurant-v2 (5.38% מהפיקסלים, שורות 27% עד 93% מגובה העמוד)

![anchor-1-restaurant-v2 עמוד 4](pdf-compare/anchor-1-restaurant-v2-p4.png)

anchor-2-saas-v2 (5.29% מהפיקסלים, שורות 27% עד 93% מגובה העמוד)

![anchor-2-saas-v2 עמוד 4](pdf-compare/anchor-2-saas-v2-p4.png)

anchor-5-young-factory-v2 (6.01% מהפיקסלים, שורות 27% עד 96% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 4](pdf-compare/anchor-5-young-factory-v2-p4.png)

golden-large-industrial-v2 (5.32% מהפיקסלים, שורות 27% עד 93% מגובה העמוד)

![golden-large-industrial-v2 עמוד 4](pdf-compare/golden-large-industrial-v2-p4.png)

### עמוד 5: מכפילי שוק

למה: סמן החברה: מכפיל ההכנסות של R1 ומכפיל ה EBITDA עם מקדם הגודל הרציף.

anchor-2-saas-v2 (0.21% מהפיקסלים, שורות 29% עד 87% מגובה העמוד)

![anchor-2-saas-v2 עמוד 5](pdf-compare/anchor-2-saas-v2-p5.png)

anchor-5-young-factory-v2 (0.19% מהפיקסלים, שורות 27% עד 88% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 5](pdf-compare/anchor-5-young-factory-v2-p5.png)

### עמוד 6: תרחישים

למה: ערכי התרחישים נגזרים מהשווי החדש.

anchor-1-restaurant-v2 (0.08% מהפיקסלים, שורות 28% עד 45% מגובה העמוד)

![anchor-1-restaurant-v2 עמוד 6](pdf-compare/anchor-1-restaurant-v2-p6.png)

anchor-2-saas-v2 (0.15% מהפיקסלים, שורות 28% עד 45% מגובה העמוד)

![anchor-2-saas-v2 עמוד 6](pdf-compare/anchor-2-saas-v2-p6.png)

anchor-5-young-factory-v2 (0.27% מהפיקסלים, שורות 28% עד 45% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 6](pdf-compare/anchor-5-young-factory-v2-p6.png)

golden-large-industrial-v2 (0.14% מהפיקסלים, שורות 28% עד 45% מגובה העמוד)

![golden-large-industrial-v2 עמוד 6](pdf-compare/golden-large-industrial-v2-p6.png)

### עמוד 7: איכות ורגישות

למה: תאי הרגישות הם הרצות של מתודולוגיה 2 (בלי תקרה, ולכן השורות של הצמיחה הטרמינלית כבר לא כמעט זהות).

anchor-1-restaurant-v2 (0.35% מהפיקסלים, שורות 48% עד 88% מגובה העמוד)

![anchor-1-restaurant-v2 עמוד 7](pdf-compare/anchor-1-restaurant-v2-p7.png)

anchor-2-saas-v2 (0.75% מהפיקסלים, שורות 48% עד 88% מגובה העמוד)

![anchor-2-saas-v2 עמוד 7](pdf-compare/anchor-2-saas-v2-p7.png)

anchor-5-young-factory-v2 (0.65% מהפיקסלים, שורות 48% עד 88% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 7](pdf-compare/anchor-5-young-factory-v2-p7.png)

golden-large-industrial-v2 (0.87% מהפיקסלים, שורות 48% עד 88% מגובה העמוד)

![golden-large-industrial-v2 עמוד 7](pdf-compare/golden-large-industrial-v2-p7.png)

### עמוד 8: שווי משולב

למה: שווי הרגליים והמשקלות של מתודולוגיה 2.

anchor-1-restaurant-v2 (0.15% מהפיקסלים, שורות 41% עד 62% מגובה העמוד)

![anchor-1-restaurant-v2 עמוד 8](pdf-compare/anchor-1-restaurant-v2-p8.png)

anchor-2-saas-v2 (0.39% מהפיקסלים, שורות 41% עד 62% מגובה העמוד)

![anchor-2-saas-v2 עמוד 8](pdf-compare/anchor-2-saas-v2-p8.png)

anchor-5-young-factory-v2 (1.54% מהפיקסלים, שורות 32% עד 62% מגובה העמוד)

![anchor-5-young-factory-v2 עמוד 8](pdf-compare/anchor-5-young-factory-v2-p8.png)

golden-large-industrial-v2 (0.63% מהפיקסלים, שורות 32% עד 62% מגובה העמוד)

![golden-large-industrial-v2 עמוד 8](pdf-compare/golden-large-industrial-v2-p8.png)

## תוצאה

אין עמוד שהשתנה בלי סיבה. כל 17 ה PDF הם 8 עמודים, ובדיקת הפריסה עוברת בכולם.
