/**
 * Landing copy — aligned with lib/valuation, valuation_forecast, multiples_panel_data.
 * DCF+WACC, Israeli multiples (EV/EBITDA, EV/Sales, EV/EBITA, P/E), blended composite.
 */

export interface MethodologyCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: 'dcf' | 'ebitda' | 'revenue' | 'multiples' | 'composite';
}

export const METHODOLOGY_CARDS: MethodologyCard[] = [
  {
    id: 'dcf-wacc',
    title: 'DCF + WACC',
    subtitle: 'תזרים מוזל',
    description:
      'תחזית FCFF ל-5 שנים, WACC מותאם סיכון (ריכוז לקוחות, תחרות, שלב חיים) וערך סופי לפי גידול קבוע.',
    icon: 'dcf',
  },
  {
    id: 'ev-ebitda',
    title: 'מכפיל EBITDA',
    subtitle: 'EV/EBITDA',
    description:
      'מכפילי שוק ישראלי 2026 לפי ענף ושלב חיים, עם EBITDA מנורמל ופרמיית אי-סחירות 20% לחברות פרטיות.',
    icon: 'ebitda',
  },
  {
    id: 'ev-sales',
    title: 'מכפיל הכנסות',
    subtitle: 'EV/Sales',
    description:
      'מתאים לחברות pre-profit או צמיחה גבוהה — השוואה לעמיתים ישראליים באותו מחזור ושלב.',
    icon: 'revenue',
  },
  {
    id: 'extra-multiples',
    title: 'מכפילים נוספים',
    subtitle: 'EV/EBITA · P/E',
    description:
      'בחירה דינמית לפי שלב חיים: EV/EBITA לצמיחה, P/E לחברות רווחיות — חציון קבוצת השוואה.',
    icon: 'multiples',
  },
  {
    id: 'blended',
    title: 'שווי משולב',
    subtitle: 'ממוצע DCF + מכפילים',
    description:
      'ממצא מרכזי: ממוצע אריתמטי של שווי DCF ושווי מכפילי בסיס — תמונה מאוזנת לעסקאות וגיוס.',
    icon: 'composite',
  },
];

export const HERO_SUBLINE =
  'DCF+WACC, מכפיל EBITDA, מכפיל הכנסות, מכפילים נוספים ושווי משולב — נתוני שוק ישראלי 2026';

export const HERO_HEADLINE_WORDS = ['גלה', 'כמה', 'שווה', 'העסק', 'שלך'];

export interface WizardStepCard {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: 'profile' | 'finance' | 'risk' | 'report';
}

export const WIZARD_STEPS: WizardStepCard[] = [
  {
    id: 'profile',
    number: 1,
    title: 'פרופיל וזיהוי',
    description: 'שם, חברה, ת.ז./ח.פ., טלפון ואימייל — בסיס לדוח ולגישה מאובטחת.',
    icon: 'profile',
  },
  {
    id: 'finance',
    number: 2,
    title: 'נתונים פיננסיים',
    description: 'הכנסות, EBITDA, חוב נטו ותחזיות — המנוע בונה DCF ומכפילים.',
    icon: 'finance',
  },
  {
    id: 'risk',
    number: 3,
    title: 'מאפייני סיכון ורגישות',
    description:
      'הכנסות חוזרות, ריכוז לקוחות, תחרות ותלות במייסד — מכוילים את עלות ההון והרגישות במודל.',
    icon: 'risk',
  },
  {
    id: 'report',
    number: 4,
    title: 'דוח והורדה',
    description: 'בחירת מטרת הערכה, אישור תנאים וקבלת דוח PDF עם שווי משולב.',
    icon: 'report',
  },
];
