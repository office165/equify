# Valubot → Equify rebrand mapping

Rebrand completed June 2026. User-facing surfaces now show **Equify** / **Equify by SBC**.

## Changed (user-facing)

| Area | Before | After |
|------|--------|-------|
| UI brand strings | Valubot | Equify / Equify by SBC |
| Metadata (title, OG, Twitter, PWA) | Valubot | Equify by SBC |
| PDF cover, headers, footers | VALUBOT / Valubot | EQUIFY / Equify by SBC |
| PDF download filename | `Valubot_Valuation_Report.pdf` | `Equify_Valuation_Report.pdf` |
| Legal disclaimer (HE) | פלטפורמת Valubot… | Equify by SBC — אינדיקציית שווי אלגוריתמית בלבד… |
| Email subjects & sender display names | Valubot System | Equify by SBC |
| WhatsApp message templates | Valubot ✓ | Equify ✓ |
| Console / relay log labels | Valubot relay | Equify relay |
| Marketing email header | VALUBOT | EQUIFY |

## Kept unchanged (no breaking changes)

| Item | Reason |
|------|--------|
| `package.json` `"name": "valubot"` | npm / lockfile identity |
| Env vars (`VALUBOT_BACKUP_EMAIL_FROM`, `MONDAY_API_KEY`, etc.) | Deployed secrets & config |
| Session / localStorage keys (`valubot.lastValuationMatrix`, `valubot.locale`, `valubot.lead.*`) | Existing user sessions |
| API route paths (`/api/...`) | Client contracts |
| `MOBILE_APP_ID` (`app.valubot.platform`) | iOS/Android bundle identifier |
| iOS URL scheme (`Valubot`) | Deep-link registration |
| DB table `valubot_leads`, file `.data/valubot_leads.json` | Schema / data migration avoided |
| Type & module names (`ValubotLeadRecord`, `valubot_monday_sync.ts`) | Internal code; rename is cosmetic only |
| DOM capture IDs (`valubot-report-capture`, `valubot-pdf-capturing`) | PDF pipeline selectors |
| CSS utility aliases (`valubot-pdf-capture`, `valubot-mono-figure`) | Internal styling hooks |
| JWT `issuer` / `audience` (`valubot`, `valubot-auth`) | Token validation |
| HTTP headers `X-Valubot-*` | Internal API metadata |
| Email domains in `FROM` addresses (`@valubot.co.il`) until DNS cutover | Deliverability |

## Ambient background

`components/ambient/AmbientBackground.tsx` is mounted on:

- Landing (`components/landing/LandingPage.tsx`)
- Wizard (`ValuationWizard.tsx`)
- Results (`app/results/page.tsx`)
- Dashboard (`ValuationDashboard.tsx`)
