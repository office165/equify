"""
Builds lib/market-data/damodaran_2026.ts from Damodaran's downloaded data files.
Inputs: JSON dumps made by scripts/damodaran/xls_dump.py (see scripts/damodaran/README.md).
The downloaded files themselves stay out of git; only the generated TS file is committed.
Usage: python3 -I scripts/damodaran/build_damodaran_ts.py <dumpDir> <out.ts>
"""
import json
import sys
from datetime import date, timedelta

DUMP = sys.argv[1]
OUT = sys.argv[2]
BASE = "https://pages.stern.nyu.edu/~adamodar/pc/datasets/"
DOWNLOADED = "2026-11-17"


def excel_date(serial):
    return (date(1899, 12, 30) + timedelta(days=int(serial))).isoformat()


def load(name):
    return json.load(open(f"{DUMP}/{name}.json"))["sheets"]


def industry_table(name):
    cells = load(name)["Industry Averages"]
    rows = {}
    for r, c, v in cells:
        rows.setdefault(r, {})[c] = v
    hdr = [r for r in sorted(rows) if rows[r].get(0) == "Industry Name"][0]
    updated = excel_date(rows[0][1])
    data = {}
    for r in sorted(rows):
        if r <= hdr:
            continue
        nm = rows[r].get(0)
        if isinstance(nm, str) and nm.strip():
            data[nm.strip()] = rows[r]
    return updated, data


SOURCES = {}
TABLES = {}
for key, file, region in [
    ("betaGlobal", "betaGlobal.xls", "Global"),
    ("betaEmerging", "betaemerg.xls", "Emerging Markets"),
    ("vebitdaGlobal", "vebitdaGlobal.xls", "Global"),
    ("vebitdaEmerging", "vebitdaemerg.xls", "Emerging Markets"),
    ("psGlobal", "psGlobal.xls", "Global"),
    ("psEmerging", "psemerg.xls", "Emerging Markets"),
]:
    updated, data = industry_table(file.replace(".xls", ""))
    SOURCES[key] = {"file": file, "url": BASE + file, "dataDate": updated, "region": region}
    TABLES[key] = data

# Country risk (July 2026 update) and implied ERP (start of 2026).
ctry = {}
for r, c, v in load("ctryprem")["ERPs by country"]:
    ctry.setdefault(r, {})[c] = v
israel = [row for row in ctry.values() if row.get(0) == "Israel"][0]
crp_rating = israel[5]
total_erp = israel[4]
crp_cds = israel[8]
rating = israel[2]

hist = {}
for r, c, v in load("histimpl")["Historical Impl Premiums"]:
    hist.setdefault(r, {})[c] = v
hdr = [r for r in sorted(hist) if hist[r].get(0) == "Year"][0]
col_fcfe = [c for c, v in hist[hdr].items() if v == "Implied ERP (FCFE)"][0]
last_year_row = max((r for r in hist if isinstance(hist[r].get(0), float)), key=lambda r: hist[r][0])
implied_erp = hist[last_year_row][col_fcfe]
implied_year = int(hist[last_year_row][0])

# Sub-sector mapping: wizard sector:subSector -> Damodaran industry, with a one-line reason.
MAP = [
    ("hospitality", "boutique_hotel", "Hotel/Gaming", "מלון בוטיק הוא לינה ואירוח, הענף של מלונות אצל Damodaran"),
    ("hospitality", "hotel_chain", "Hotel/Gaming", "רשת מלונות, אותו ענף כמו מלון בודד"),
    ("hospitality", "vacation", "Hotel/Gaming", "נופש ואתרי לינה, הכנסה מאירוח"),
    ("hospitality", "airbnb_mgmt", "Real Estate (Operations & Services)", "ניהול נכסים להשכרה קצרה, שירות על נדל\"ן של אחרים ולא בעלות על מלון"),
    ("saas", "b2b_saas", "Software (System & Application)", "תוכנה עסקית במנוי"),
    ("saas", "b2c_saas", "Software (Internet)", "תוכנה לצרכן שנמכרת ברשת"),
    ("saas", "devtools", "Software (System & Application)", "כלי פיתוח ותשתית תוכנה"),
    ("saas", "marketplace", "Software (Internet)", "פלטפורמת מסחר מקוונת שמרוויחה מעמלות"),
    ("fintech", "payments", "Information Services", "עיבוד תשלומים הוא שירות מידע ותוכנה, בלי מאזן אשראי של בנק"),
    ("fintech", "lending", "Financial Svcs. (Non-bank & Insurance)", "אשראי חוץ בנקאי"),
    ("fintech", "insurtech", "Insurance (General)", "חברת ביטוח מבוססת טכנולוגיה"),
    ("fintech", "wealth", "Investments & Asset Management", "ניהול הון והשקעות"),
    ("cyber", "enterprise", "Software (System & Application)", "תוכנת אבטחה לארגונים"),
    ("cyber", "cloud", "Software (System & Application)", "אבטחת ענן היא תוכנה במנוי"),
    ("cyber", "ot", "Software (System & Application)", "אבטחת מערכות תעשייתיות, בעיקר תוכנה"),
    ("cyber", "services_cyber", "Computer Services", "שירותי אבטחה ויישום, שירותי מחשוב"),
    ("health", "medtech", "Healthcare Products", "מכשור רפואי"),
    ("health", "biotech", "Drugs (Biotechnology)", "פיתוח תרופות ביולוגיות"),
    ("health", "digital_health", "Heathcare Information and Technology", "תוכנה ומידע רפואי"),
    ("health", "services_health", "Healthcare Support Services", "מתן שירותי בריאות ותמיכה"),
    ("services", "consulting", "Business & Consumer Services", "שירותים מקצועיים לעסקים"),
    ("services", "legal", "Business & Consumer Services", "משרד עורכי דין, שירות מקצועי לעסקים"),
    ("services", "accounting", "Business & Consumer Services", "משרד רואי חשבון, שירות מקצועי לעסקים"),
    ("services", "marketing", "Advertising", "שיווק ומדיה, הענף של משרדי פרסום"),
    ("industry", "manufacturing", "Machinery", "ייצור תעשייתי כללי, הענף התעשייתי הרחב והקרוב"),
    ("industry", "distribution", "Retail (Distributors)", "הפצה וסיטונאות"),
    ("industry", "food_bev", "Food Processing", "ייצור מזון ומשקאות"),
    ("industry", "traditional", "Building Materials", "תעשייה מסורתית עתירת הון (מתכת, פלסטיק, בנייה), הקירוב הקרוב ביותר"),
    ("retail_unified", "retail-supermarkets", "Retail (Grocery and Food)", "קמעונאות מזון"),
    ("retail_unified", "d2c", "Retail (General)", "מכירה ישירה לצרכן, קמעונאות כללית"),
    ("retail_unified", "retail-fashion", "Retail (Special Lines)", "חנויות אופנה, קמעונאות ייעודית"),
    ("retail_unified", "marketplace", "Software (Internet)", "מרקטפלייס מקוון, פלטפורמה ולא מלאי"),
    ("retail_unified", "specialty", "Retail (Special Lines)", "קמעונאות ייעודית"),
    ("food_service", "restaurant", "Restaurant/Dining", "מסעדה"),
    ("food_service", "cafe", "Restaurant/Dining", "בית קפה, מסעדנות"),
    ("food_service", "catering", "Restaurant/Dining", "קייטרינג, מסעדנות"),
    ("food_service", "franchise", "Restaurant/Dining", "רשת זכיינות מזון"),
    ("food_service", "delivery", "Restaurant/Dining", "משלוחי מזון ומטבחים, מסעדנות"),
    ("energy", "solar", "Green & Renewable Energy", "ייצור חשמל סולארי"),
    ("energy", "storage", "Green & Renewable Energy", "אגירת אנרגיה מתחדשת"),
    ("energy", "wind", "Green & Renewable Energy", "ייצור חשמל מרוח"),
    ("energy", "services_energy", "Engineering/Construction", "הקמה ותחזוקה של מתקני אנרגיה, עבודות הנדסה"),
    ("defense_aerospace", "defense_manufacturing", "Aerospace/Defense", "ייצור ביטחוני"),
    ("defense_aerospace", "aviation_space", "Aerospace/Defense", "תעופה וחלל"),
    ("defense_aerospace", "defense_tech", "Aerospace/Defense", "טכנולוגיה ביטחונית"),
    ("real_estate", "re_development", "Real Estate (Development)", "ייזום נדל\"ן"),
    ("real_estate", "re_income", "R.E.I.T.", "נדל\"ן מניב, הכנסה משכירות כמו בקרנות ריט"),
    ("real_estate", "construction_contracting", "Engineering/Construction", "קבלנות ביצוע"),
    ("real_estate", "proptech", "Real Estate (Operations & Services)", "שירותי נדל\"ן מבוססי טכנולוגיה"),
    ("other", "general", "Total Market (without financials)", "אין ענף ספציפי, ממוצע השוק בלי פיננסים"),
]

needed = sorted({m[2] for m in MAP})


def num(row, col):
    v = row.get(col)
    return float(v) if isinstance(v, (int, float)) else None


def industry_values(name, region):
    sfx = "Global" if region == "global" else "Emerging"
    b = TABLES["beta" + sfx].get(name)
    e = TABLES["vebitda" + sfx].get(name)
    p = TABLES["ps" + sfx].get(name)
    if not (b and e and p):
        raise SystemExit(f"missing industry {name} in {region}")
    return {
        "firms": num(b, 1),
        "beta": num(b, 2),
        "deRatio": num(b, 3),
        "effectiveTax": num(b, 4),
        "unleveredBeta": num(b, 5),
        "unleveredBetaCash": num(b, 7),
        "evEbitdaPositive": num(e, 3),
        "evEbitdaAll": num(e, 7),
        "evSales": num(p, 4),
        "_src": {"beta": "beta" + sfx, "ev": "vebitda" + sfx, "ps": "ps" + sfx},
    }


def fmt(v):
    return "null" if v is None else repr(round(v, 6))


lines = []
w = lines.append
w("/**")
w(" * Damodaran market data with source (round 2, part A). GENERATED, do not edit by hand.")
w(" * Built by scripts/damodaran/build_damodaran_ts.py from files downloaded on " + DOWNLOADED + ".")
w(" * The downloaded files are not in git. Every value carries its source key, which names the")
w(" * file, URL, data date and region in DAMODARAN_SOURCES.")
w(" * Used by methodology 2 (METHOD_V2) and by the report's sector-multiple footnote.")
w(" */")
w("")
w("export type DamodaranSourceKey =")
for i, k in enumerate(list(SOURCES) + ["ctryprem", "histimpl", "boiZeroCurve"]):
    w(f"  | '{k}'" + (";" if i == len(SOURCES) + 2 else ""))
w("")
w("export interface DamodaranSource {")
w("  file: string;")
w("  url: string;")
w("  /** Date the source states for its data (ISO). */")
w("  dataDate: string;")
w("  region: string;")
w("  downloaded: string;")
w("}")
w("")
w("export const DAMODARAN_SOURCES: Record<DamodaranSourceKey, DamodaranSource> = {")
for k, s in SOURCES.items():
    w(f"  {k}: {{ file: '{s['file']}', url: '{s['url']}', dataDate: '{s['dataDate']}', region: '{s['region']}', downloaded: '{DOWNLOADED}' }},")
w(f"  ctryprem: {{ file: 'ctrypremJuly26.xlsx', url: '{BASE}ctrypremJuly26.xlsx', dataDate: '2026-07-01', region: 'Israel', downloaded: '{DOWNLOADED}' }},")
w(f"  histimpl: {{ file: 'histimpl.xls', url: '{BASE}histimpl.xls', dataDate: '{implied_year + 1}-01-01', region: 'US (S&P 500, mature market)', downloaded: '{DOWNLOADED}' }},")
w(f"  boiZeroCurve: {{ file: 'BOI.STATISTICS/ZCM ZC_TSB_ZND_10Y_MA', url: 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0/ZC_TSB_ZND_10Y_MA', dataDate: '2026-10-31', region: 'Israel', downloaded: '{DOWNLOADED}' }},")
w("};")
w("")
w("export interface Sourced {")
w("  value: number;")
w("  source: DamodaranSourceKey;")
w("}")
w("")
w("export interface DamodaranIndustryValues {")
w("  /** Damodaran industry name, exactly as in the source file. */")
w("  industry: string;")
w("  region: 'Global' | 'Emerging Markets';")
w("  firms: number;")
w("  beta: Sourced;")
w("  deRatio: Sourced;")
w("  effectiveTax: Sourced;")
w("  unleveredBeta: Sourced;")
w("  unleveredBetaCash: Sourced;")
w("  /** EV/EBITDA, only firms with positive EBITDA. */")
w("  evEbitda: Sourced;")
w("  /** EV/EBITDA, all firms. Null where Damodaran reports no value. */")
w("  evEbitdaAll: Sourced | null;")
w("  evSales: Sourced;")
w("}")
w("")
w("export const DAMODARAN_INDUSTRIES: Record<string, { global: DamodaranIndustryValues; emerging: DamodaranIndustryValues }> = {")
for name in needed:
    w(f"  {json.dumps(name)}: {{")
    for region, label in [("global", "Global"), ("emerging", "Emerging Markets")]:
        v = industry_values(name, region)
        s = v["_src"]
        w(f"    {region}: {{")
        w(f"      industry: {json.dumps(name)}, region: '{label}', firms: {int(v['firms'])},")
        w(f"      beta: {{ value: {fmt(v['beta'])}, source: '{s['beta']}' }},")
        w(f"      deRatio: {{ value: {fmt(v['deRatio'])}, source: '{s['beta']}' }},")
        w(f"      effectiveTax: {{ value: {fmt(v['effectiveTax'])}, source: '{s['beta']}' }},")
        w(f"      unleveredBeta: {{ value: {fmt(v['unleveredBeta'])}, source: '{s['beta']}' }},")
        w(f"      unleveredBetaCash: {{ value: {fmt(v['unleveredBetaCash'])}, source: '{s['beta']}' }},")
        w(f"      evEbitda: {{ value: {fmt(v['evEbitdaPositive'])}, source: '{s['ev']}' }},")
        if v['evEbitdaAll'] is None:
            w("      evEbitdaAll: null, // not reported by Damodaran (aggregate EBITDA not positive)")
        else:
            w(f"      evEbitdaAll: {{ value: {fmt(v['evEbitdaAll'])}, source: '{s['ev']}' }},")
        w(f"      evSales: {{ value: {fmt(v['evSales'])}, source: '{s['ps']}' }},")
        w("    },")
    w("  },")
w("};")
w("")
w("/** Israel country risk and market inputs. */")
w("export const DAMODARAN_ISRAEL = {")
w(f"  /** Moody's sovereign rating used by Damodaran. */")
w(f"  rating: '{rating}',")
w(f"  /** Country risk premium, rating-based (decimal). */")
w(f"  crp: {{ value: {fmt(crp_rating)}, source: 'ctryprem' }} as Sourced,")
w(f"  /** Country risk premium from the sovereign CDS, net of the Swiss CDS (decimal). For comparison. */")
w(f"  crpCds: {{ value: {fmt(crp_cds)}, source: 'ctryprem' }} as Sourced,")
w(f"  /** Total equity risk premium for Israel (mature ERP plus CRP, decimal). */")
w(f"  totalErp: {{ value: {fmt(total_erp)}, source: 'ctryprem' }} as Sourced,")
w(f"  /** Implied ERP for the S&P 500 at the end of {implied_year} (FCFE model, decimal). */")
w(f"  impliedErp: {{ value: {fmt(implied_erp)}, source: 'histimpl' }} as Sourced,")
w("} as const;")
w("")
w("/**")
w(" * Risk-free rate: Bank of Israel nominal zero-coupon government yield, 10 years, monthly average.")
w(" * Verified 2026-11-17 (October 2026 average). Methodology 1 keeps 4.5% (capm_wacc.ts).")
w(" */")
w("export const ISRAEL_RISK_FREE = { value: 0.042379, source: 'boiZeroCurve' as DamodaranSourceKey, verified: true, asOf: '2026-10' } as const;")
w("")
w("export interface SubSectorMapping {")
w("  sector: string;")
w("  subSector: string;")
w("  industry: string;")
w("  reason: string;")
w("}")
w("")
w("/** Each of the 50 wizard sub-sectors mapped to one Damodaran industry, with a one-line reason. */")
w("export const DAMODARAN_SUBSECTOR_MAP: SubSectorMapping[] = [")
for sec, sub, ind, why in MAP:
    w(f"  {{ sector: '{sec}', subSector: '{sub}', industry: {json.dumps(ind)}, reason: {json.dumps(why, ensure_ascii=False)} }},")
w("];")
w("")
w("export function damodaranMappingFor(sector: string, subSector: string): SubSectorMapping | undefined {")
w("  return DAMODARAN_SUBSECTOR_MAP.find((m) => m.sector === sector && m.subSector === subSector);")
w("}")
w("")
w("/** Industry values for a wizard sub-sector, or undefined when it is not mapped. */")
w("export function damodaranIndustryFor(sector: string, subSector: string) {")
w("  const m = damodaranMappingFor(sector, subSector);")
w("  return m ? DAMODARAN_INDUSTRIES[m.industry] : undefined;")
w("}")
w("")
w("/** Low and high of a multiple across the Global and Emerging Markets values. */")
w("export function damodaranRange(sector: string, subSector: string, field: 'evEbitda' | 'evSales'): { low: number; high: number } | undefined {")
w("  const v = damodaranIndustryFor(sector, subSector);")
w("  if (!v) return undefined;")
w("  const a = v.global[field].value;")
w("  const b = v.emerging[field].value;")
w("  return { low: Math.min(a, b), high: Math.max(a, b) };")
w("}")
open(OUT, "w").write("\n".join(lines) + "\n")
print("industries", len(needed), "crp", crp_rating, "implied erp", implied_erp, implied_year)
