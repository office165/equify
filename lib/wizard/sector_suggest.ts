import type { EquifySectorKey } from '../valuation';
import {
  INDUSTRY_CONFIG,
  getSubSectorLabel,
  type SubSectorOption,
} from '../constants/industry_config';

export interface SectorSuggestHit {
  sector: EquifySectorKey;
  subSector: string;
  labelHe: string;
  labelEn: string;
  score: number;
  /** Optional Hebrew one-liner from LLM (or omitted on keyword fallback). */
  reason?: string;
}

/** Fold Hebrew for lenient search: strip nikud, collapse spaces, lowercase. */
export function foldSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

const KEYWORDS: Record<string, string[]> = {
  boutique_hotel: ['בוטיק', 'מלון בוטיק', 'boutique', 'hotel', 'אירוח קטן'],
  hotel_chain: ['רשת מלונות', 'מלון', 'hotel chain', 'רשת'],
  vacation: ['נופש', 'אירועים', 'צימר', 'vacation', 'events'],
  airbnb_mgmt: ['airbnb', 'השכרה לטווח קצר', 'ניהול נכסי אירוח', 'short term'],
  b2b_saas: ['saas', 'תוכנה', 'b2b', 'ענן', 'מנוי'],
  b2c_saas: ['b2c', 'צרכן', 'אפליקציה', 'consumer'],
  devtools: ['devtools', 'infra', 'תשתיות תוכנה', 'developer'],
  marketplace: ['מרקטפלייס', 'זירה', 'marketplace', 'פלטפורמה'],
  payments: ['תשלומים', 'סליקה', 'payments', 'פינטק תשלום'],
  lending: ['הלוואות', 'אשראי', 'lending', 'p2p'],
  insurtech: ['ביטוח', 'insurtech', 'פוליסה'],
  wealth: ['ניהול הון', 'wealth', 'השקעות לקוחות'],
  enterprise: ['אבטחת מידע', 'enterprise security', 'סייבר ארגוני'],
  cloud: ['zero trust', 'ענן אבטחה', 'cloud security'],
  ot: ['ot', 'ics', 'תעשייתי', 'scada'],
  services_cyber: ['שירותי סייבר', 'soc', 'ייעוץ אבטחה'],
  medtech: ['medtech', 'מכשור רפואי', 'device'],
  biotech: ['biotech', 'פארמה', 'תרופות'],
  digital_health: ['digital health', 'בריאות דיגיטלית', 'telehealth'],
  services_health: ['שירותי בריאות', 'מרפאה', 'clinic'],
  consulting: ['ייעוץ', 'consulting', 'ייעוץ ניהולי'],
  legal: ['משפטים', 'משרד עורכי דין', 'law'],
  accounting: ['ראיית חשבון', 'רואה חשבון', 'accounting', 'hok'],
  marketing: ['שיווק', 'מדיה', 'פרסום', 'agency'],
  manufacturing: ['ייצור', 'מפעל', 'manufacturing'],
  distribution: ['הפצה', 'לוגיסטיקה', 'distribution'],
  food_bev: ['מזון ומשקאות', 'משקאות', 'beverage'],
  traditional: ['תעשייה מסורתית', 'מתכת', 'פלסטיק'],
  d2c: ['d2c', 'מסחר ישיר', 'חנות אונליין'],
  specialty: ['קמעונאות נישתית', 'specialty', 'חנות מתמחה'],
  'retail-supermarkets': ['סופר', 'מכולת', 'קמעונאות מזון', 'grocery'],
  'retail-fashion': ['אופנה', 'בוטיק אופנה', 'fashion', 'פופאפ'],
  restaurant: ['מסעדה', 'מסעדנות', 'restaurant', 'אוכל'],
  cafe: ['בית קפה', 'קפה', 'cafe'],
  catering: ['קייטרינג', 'catering', 'אירוע אוכל'],
  franchise: ['זיכיון', 'franchise', 'רשת מזון'],
  delivery: ['משלוחים', 'delivery', 'אוכל מהיר'],
  solar: ['סולארי', 'pv', 'פאנלים'],
  storage: ['אגירת אנרגיה', 'סוללה', 'storage'],
  wind: ['רוח', 'טורבינה', 'wind'],
  services_energy: ['שירותי אנרגיה', 'חשמל', 'מיזוג'],
  defense_manufacturing: ['ביטחון ייצור', 'defense manufacturing'],
  aviation_space: ['תעופה', 'חלל', 'aviation'],
  defense_tech: ['טכנולוגיה ביטחונית', 'defense tech'],
  re_development: ['יזמות נדלן', 'נדלן', 'development', 'מגורים'],
  re_income: ['נכס מניב', 'השכרה', 'income property'],
  construction_contracting: ['קבלנות', 'ביצוע', 'תשתיות בנייה'],
  proptech: ['proptech', 'ניהול נכסים דיגיטלי'],
  general: ['כללי', 'אחר', 'other'],
};

/** Static peer traits — [he, en], not computed from the engine. */
const PEERS: Record<string, Array<[string, string]>> = {
  boutique_hotel: [
    ['תפוסה עונתית', 'Seasonal occupancy'],
    ['ADR מול שוק מקומי', 'ADR vs local market'],
    ['תלות בתיירות', 'Tourism dependence'],
  ],
  hotel_chain: [
    ['פיזור אתרים', 'Multi-site mix'],
    ['מותג ורשת הזמנות', 'Brand and booking network'],
    ['עלות תפעול קבועה', 'Fixed operating cost'],
  ],
  vacation: [
    ['עונתיות חזקה', 'Strong seasonality'],
    ['הזמנות מראש', 'Advance bookings'],
    ['רגישות לאירועים', 'Event-driven demand'],
  ],
  airbnb_mgmt: [
    ['שיעור ניהול מנכסים', 'Management take-rate'],
    ['רגולציית שכירות קצרה', 'Short-let regulation'],
    ['תפוסה דינמית', 'Dynamic occupancy'],
  ],
  b2b_saas: [
    ['הכנסות חוזרות (ARR)', 'Recurring revenue (ARR)'],
    ['שיעור נטישה', 'Churn rate'],
    ['עלות רכישת לקוח', 'Customer acquisition cost'],
  ],
  b2c_saas: [
    ['צמיחת משתמשים', 'User growth'],
    ['מונטיזציה למנוי', 'Monetization per subscriber'],
    ['שחיקת מרווח פרסום', 'Ad-margin pressure'],
  ],
  devtools: [
    ['אימוץ מפתחים', 'Developer adoption'],
    ['שימוש ב-seat', 'Seat utilization'],
    ['הרחבה לחשבון ארגוני', 'Expansion into enterprise accounts'],
  ],
  marketplace: [
    ['GMV מול עמלה', 'GMV vs take-rate'],
    ['צד היצע מול ביקוש', 'Supply vs demand sides'],
    ['אפקט רשת', 'Network effects'],
  ],
  payments: [
    ['נפח סליקה', 'Processing volume'],
    ['שיעור עמלה', 'Fee rate'],
    ['סיכון אשראי/הונאה', 'Credit / fraud risk'],
  ],
  lending: [
    ['תיק אשראי', 'Loan book'],
    ['שיעור כשל', 'Default rate'],
    ['עלות מימון', 'Funding cost'],
  ],
  insurtech: [
    ['יחס הפסדים', 'Loss ratio'],
    ['שימור פוליסות', 'Policy retention'],
    ['ערוץ הפצה', 'Distribution channel'],
  ],
  wealth: [
    ['AUM', 'AUM'],
    ['דמי ניהול', 'Management fees'],
    ['שימור לקוחות', 'Client retention'],
  ],
  enterprise: [
    ['חוזים שנתיים', 'Annual contracts'],
    ['זמן מכירה ארוך', 'Long sales cycle'],
    ['תלות במכרזים', 'Tender dependence'],
  ],
  cloud: [
    ['ARR אבטחה', 'Security ARR'],
    ['אינטגרציות ענן', 'Cloud integrations'],
    ['שימור לוגו', 'Logo retention'],
  ],
  ot: [
    ['פרויקטים תעשייתיים', 'Industrial projects'],
    ['מחזורי הטמעה ארוכים', 'Long deployment cycles'],
    ['רגולציה', 'Regulation'],
  ],
  services_cyber: [
    ['ניצולת יועצים', 'Consultant utilization'],
    ['ריטיינר מול פרויקט', 'Retainer vs project'],
    ['תלות בכוח אדם', 'People dependence'],
  ],
  medtech: [
    ['אישור רגולטורי', 'Regulatory clearance'],
    ['מחזור מכירה ארוך', 'Long sales cycle'],
    ['תלות במפיצים', 'Distributor dependence'],
  ],
  biotech: [
    ['צבר פיתוח', 'Development pipeline'],
    ['מימון מחקר', 'R&D funding'],
    ['סיכון רגולטורי', 'Regulatory risk'],
  ],
  digital_health: [
    ['רגולציית מידע רפואי', 'Health-data regulation'],
    ['ערוץ B2B2C', 'B2B2C channel'],
    ['שימור משתמשים', 'User retention'],
  ],
  services_health: [
    ['תפוסת מטופלים', 'Patient occupancy'],
    ['תלות ברופאים', 'Clinician dependence'],
    ['הסכמי קופות', 'Payer contracts'],
  ],
  consulting: [
    ['ניצולת יועצים', 'Consultant utilization'],
    ['ריכוז לקוחות', 'Client concentration'],
    ['מוניטין אישי', 'Personal reputation'],
  ],
  legal: [
    ['שעות מול ריטיינר', 'Hours vs retainer'],
    ['התמחות נישתית', 'Niche specialization'],
    ['תלות בשותפים', 'Partner dependence'],
  ],
  accounting: [
    ['בסיס לקוחות חוזר', 'Recurring client base'],
    ['עונתיות דיווח', 'Filing seasonality'],
    ['רגולציה', 'Regulation'],
  ],
  marketing: [
    ['תלות בקמפיינים', 'Campaign dependence'],
    ['שימור לקוחות', 'Client retention'],
    ['מרווח קריאייטיב', 'Creative margin'],
  ],
  manufacturing: [
    ['ניצולת קו', 'Line utilization'],
    ['מלאי חומרי גלם', 'Raw-material inventory'],
    ['חוזי אספקה', 'Supply contracts'],
  ],
  distribution: [
    ['מרווח הפצה', 'Distribution margin'],
    ['צי רכב/לוגיסטיקה', 'Fleet / logistics'],
    ['ריכוז ספקים', 'Supplier concentration'],
  ],
  food_bev: [
    ['מותג מול קמעונאי', 'Brand vs retailer'],
    ['עלויות סחורה', 'COGS'],
    ['ערוצי הפצה', 'Distribution channels'],
  ],
  traditional: [
    ['ציוד כבד', 'Heavy equipment'],
    ['מחזור השקעות', 'Capex cycle'],
    ['רגישות לסחורות', 'Commodity sensitivity'],
  ],
  d2c: [
    ['עלות רכישה דיגיטלית', 'Digital CAC'],
    ['החזרות', 'Returns'],
    ['תלות בפלטפורמות', 'Platform dependence'],
  ],
  specialty: [
    ['מיקום ונישה', 'Location and niche'],
    ['מלאי איטי', 'Slow-moving inventory'],
    ['שולי רווח גבוהים יחסית', 'Relatively high margins'],
  ],
  'retail-supermarkets': [
    ['מחזור מלאי מהיר', 'Fast inventory turns'],
    ['שולי רווח נמוכים', 'Thin margins'],
    ['תלות בספקים', 'Supplier dependence'],
  ],
  'retail-fashion': [
    ['עונתיות מלאי', 'Seasonal inventory'],
    ['הנחות סוף עונה', 'End-of-season markdowns'],
    ['תלות בטרנדים', 'Trend dependence'],
  ],
  restaurant: [
    ['תפוסת כיסאות', 'Seat occupancy'],
    ['עלות מזון ועבודה', 'Food and labor cost'],
    ['שכירות מיקום', 'Site rent'],
  ],
  cafe: [
    ['מחזור יומי', 'Daily ticket volume'],
    ['תלות במיקום', 'Location dependence'],
    ['כוח אדם', 'Staffing'],
  ],
  catering: [
    ['הזמנות אירוע', 'Event bookings'],
    ['עונתיות', 'Seasonality'],
    ['ציוד נייד', 'Mobile equipment'],
  ],
  franchise: [
    ['תמלוגים', 'Royalties'],
    ['אחידות מותג', 'Brand consistency'],
    ['תלות במזכה', 'Franchisor dependence'],
  ],
  delivery: [
    ['עמלת פלטפורמה', 'Platform commission'],
    ['רדיוס משלוח', 'Delivery radius'],
    ['זמן אספקה', 'Delivery time'],
  ],
  solar: [
    ['חוזי ייצור חשמל', 'Power-purchase contracts'],
    ['עלויות התקנה', 'Installation cost'],
    ['רגולציית חשמל', 'Electricity regulation'],
  ],
  storage: [
    ['קיבולת מותקנת', 'Installed capacity'],
    ['מחזורים יומיים', 'Daily cycles'],
    ['עלויות סוללה', 'Battery cost'],
  ],
  wind: [
    ['תפוקת MWh', 'MWh output'],
    ['תחזוקה', 'Maintenance'],
    ['מיקום אתר', 'Site location'],
  ],
  services_energy: [
    ['חוזי שירות', 'Service contracts'],
    ['ניצולת צוותים', 'Crew utilization'],
    ['פרויקטים מול ריטיינר', 'Projects vs retainer'],
  ],
  defense_manufacturing: [
    ['מכרזים ממשלתיים', 'Government tenders'],
    ['מחזורי אספקה ארוכים', 'Long supply cycles'],
    ['רישוי ייצוא', 'Export licensing'],
  ],
  aviation_space: [
    ['חוזי OEM', 'OEM contracts'],
    ['רגולציית תעופה', 'Aviation regulation'],
    ['הון ציוד', 'Equipment capital'],
  ],
  defense_tech: [
    ['מחזורי R&D', 'R&D cycles'],
    ['לקוח ממשלתי', 'Government customer'],
    ['סיווג ביטחוני', 'Security clearance'],
  ],
  re_development: [
    ['מחזור פרויקט', 'Project cycle'],
    ['מינוף קרקע', 'Land leverage'],
    ['היתרי בנייה', 'Building permits'],
  ],
  re_income: [
    ['NOI', 'NOI'],
    ['תפוסת שוכרים', 'Tenant occupancy'],
    ['מחזורי שכירות', 'Lease cycles'],
  ],
  construction_contracting: [
    ['צבר הזמנות', 'Backlog'],
    ['מרווח קבלני', 'Contractor margin'],
    ['סיכון ביצוע', 'Execution risk'],
  ],
  proptech: [
    ['SaaS לנדלן', 'Real-estate SaaS'],
    ['שימור לקוחות ניהול', 'Property-manager retention'],
    ['אינטגרציות', 'Integrations'],
  ],
  general: [
    ['פרופיל מעורב', 'Mixed profile'],
    ['התאמה ידנית', 'Manual fit'],
    ['נתוני ענף כלליים', 'General sector inputs'],
  ],
};

function allSubSectors(): Array<{
  sector: EquifySectorKey;
  sub: SubSectorOption;
}> {
  const keys = Object.keys(INDUSTRY_CONFIG) as EquifySectorKey[];
  const rows: Array<{ sector: EquifySectorKey; sub: SubSectorOption }> = [];
  for (const sector of keys) {
    for (const sub of INDUSTRY_CONFIG[sector].subSectors) {
      rows.push({ sector, sub });
    }
  }
  return rows;
}

export function filterSectorsByQuery(
  query: string,
): Array<{ sector: EquifySectorKey; subSectorIds: string[] }> | null {
  const folded = foldSearchText(query);
  if (!folded) return null;

  const hits = new Map<EquifySectorKey, Set<string>>();
  for (const { sector, sub } of allSubSectors()) {
    const hay = [
      INDUSTRY_CONFIG[sector].chipLabelHe,
      INDUSTRY_CONFIG[sector].chipLabelEn,
      sub.labelHe,
      sub.labelEn,
      sub.id,
      ...(KEYWORDS[sub.id] ?? []),
    ]
      .map(foldSearchText)
      .join('');
    if (hay.includes(folded)) {
      const set = hits.get(sector) ?? new Set<string>();
      set.add(sub.id);
      hits.set(sector, set);
    }
  }

  return [...hits.entries()].map(([sector, ids]) => ({
    sector,
    subSectorIds: [...ids],
  }));
}

export function suggestSectorsFromDescription(
  description: string,
  limit = 3,
): SectorSuggestHit[] {
  const tokens = description
    .split(/[^\p{L}\p{N}]+/u)
    .map(foldSearchText)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const scored: SectorSuggestHit[] = [];
  for (const { sector, sub } of allSubSectors()) {
    const bag = [
      INDUSTRY_CONFIG[sector].chipLabelHe,
      INDUSTRY_CONFIG[sector].chipLabelEn,
      sub.labelHe,
      sub.labelEn,
      ...(KEYWORDS[sub.id] ?? []),
    ].map(foldSearchText);
    let score = 0;
    for (const token of tokens) {
      if (bag.some((b) => b.includes(token) || token.includes(b))) {
        score += token.length >= 4 ? 2 : 1;
      }
    }
    if (score > 0) {
      scored.push({
        sector,
        subSector: sub.id,
        labelHe: getSubSectorLabel(sector, sub.id, 'he') ?? sub.labelHe,
        labelEn: getSubSectorLabel(sector, sub.id, 'en') ?? sub.labelEn,
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.labelHe.localeCompare(b.labelHe, 'he'));
  const unique: SectorSuggestHit[] = [];
  for (const hit of scored) {
    if (unique.some((u) => u.sector === hit.sector && u.subSector === hit.subSector)) {
      continue;
    }
    unique.push(hit);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function getSubSectorPeerTraits(
  subSectorId: string,
  locale: 'he' | 'en' = 'he',
): string[] {
  const rows = PEERS[subSectorId] ?? PEERS.general ?? [];
  return rows.map((row) => (locale === 'en' ? row[1] : row[0]));
}
