# Monday.com Lead Mapping — Board 18393484200

**Board:** לידים  
**URL:** https://smallbizclubils-team.monday.com/boards/18393484200  
**Target group:** EQUIFY LEADS VALUEBOT (`group_mm43e3aq`)  
**Introspected:** 2026-06-10 via `scripts/monday-introspect.ts`

All Valubot items are created in group `group_mm43e3aq`. Dedupe by **אימייל** (`email_mkz4g6gm`) before `create_item`.

## Column map (live board schema)

| Lead field | Hebrew title | Column ID | Type | Notes |
|------------|--------------|-----------|------|-------|
| **companyName** (item title) | Name | `name` | name | `create_item.item_name` — company is the row title |
| fullName | שם הלקוח | `text_mkz5s6tm` | text | Customer contact name |
| CRM funnel | סטטוס ליד | `color_mkz4s295` | status | חדש → נוצר קשר → כשיר → הועבר לפייפליין |
| userPhone | טלפון | `phone_mkz4zdcb` | phone | Normalized +972 |
| userEmail | אימייל | `email_mkz4g6gm` | email | Lowercase, dedupe key |
| nationalId / corporateTaxId | תז / חפ | `text_mkz5hrdn` | text | Combined ת.ז. / ח.פ. |
| valuationPurpose | מה הצורך? | `color_mkz5d1mk` | status | M&A → הון / מכירת חברה / חיפוש שותף |
| source | מקור ליד | `dropdown_mkz4myng` | dropdown | organic → **SBC** |
| category | קטגוריה | `dropdown_mkz4hn5x` | dropdown | Default **עסקי** |
| sectorLabel | ענף | `dropdown_mm46ndr1` | dropdown | Industry label (dynamic) |
| processStage | שלב בתהליך | `color_mm468x53` | status | התחיל אשף → השלים אשף → הוריד PDF → שילם |
| companyName (duplicate) | שם החברה | `text_mm46hq9d` | text | Also stored in text column |
| valuationMidpoint | שווי מוערך | `numeric_mm46k68a` | numbers | Integer ₪ |
| qualityScore | ציון איכות | `numeric_mm46w9eq` | numbers | 0–100 |
| package | חבילה | `color_mm46xm0f` | status | Flash / Pro / Enterprise |
| createdAt | תאריך יצירת ליד | `date_mkz4gfpq` | date | First create only |
| aiNotes | הערות AI | `long_text_mm463q00` | long_text | Supplemental notes |
| PDF | files | `files` | file | On PDF relay |

## סטטוס ליד labels (`color_mkz4s295`)

| Event | Mapped label |
|-------|----------------|
| wizard_step1 | חדש |
| wizard_completed | נוצר קשר |
| pdf_downloaded / whatsapp_sent | כשיר |
| payment | הועבר לפייפליין |

## שלב בתהליך labels (`color_mm468x53`)

| Event | Label |
|-------|-------|
| wizard_step1 | התחיל אשף |
| wizard_completed | השלים אשף |
| pdf_downloaded / whatsapp_sent | הוריד PDF |
| payment | שילם |

## מה הצורך? mapping (`color_mkz5d1mk`)

| Wizard `valuationPurpose` | Monday label |
|---------------------------|--------------|
| M&A_SALE | הון / מכירת חברה / חיפוש שותף |
| CAPITAL_RAISE | הלוואה |
| TAX | עודפים |
| INTERNAL_REPORT | דוח פנימי (create_labels_if_missing) |

## מקור ליד mapping (`dropdown_mkz4myng`)

| `source` | Monday label |
|----------|--------------|
| organic | SBC |
| linkedin / twitter / reddit | אחר |

## Environment variables (server-side only)

```bash
MONDAY_API_KEY=           # Required — never NEXT_PUBLIC_
MONDAY_BOARD_ID=18393484200 # Required
CRON_SECRET=                # For /api/cron/replay-pending-leads
```

Optional overrides (auto-discovery used when omitted):

```bash
# MONDAY_COLUMN_EMAIL=
# MONDAY_COLUMN_PHONE=
```

## API flow (Step 10 architecture)

1. Client → `POST /api/leads` → **DB write only** (fast response)
2. Server → `scheduleMondaySyncForLead()` (background, 3× retry)
3. Failure → `sync_status = pending_sync` → cron replay daily (Vercel Hobby); Pro can use `*/15 * * * *`
4. `GET /api/leads/health` → last 10 sync attempts **with full Monday error bodies**

## Verification

```bash
MONDAY_API_KEY=... MONDAY_BOARD_ID=18393484200 npx tsx scripts/test-monday-lead.ts
npx tsx scripts/monday-introspect.ts
```
