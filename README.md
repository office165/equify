# Valubot / Equify

Israeli SMB valuation platform (SBC). Next.js 14 + Supabase + PayPal NCP.

## Health check

```
GET /api/leads/health
```

Returns `200 ok:true` when all database schemas are correct and the leads DB
is reachable. Returns `503 ok:false` when any column expected by the
application is missing from the live Supabase database.

**Check after every manual migration** — if a column is missing the endpoint
will list it:

```json
{
  "ok": false,
  "db_schema": {
    "status": "missing_columns",
    "missing": [
      { "table": "valuations_history", "missing": ["sector"] }
    ]
  }
}
```

Tables probed: `valuations_history`, `stripe_transactions`, `promo_codes`,
`promo_redemptions`, `feature_requests`, `events`.

## Migrations

Migrations live in `supabase/migrations/`. They are **not applied
automatically** on deploy — run each file manually in the Supabase SQL Editor
and verify with `/api/leads/health` afterwards.

## Docs

- `docs/monday-mapping.md` — Monday.com CRM column mapping
- `docs/pdf-print-architecture.md` — PDF render / print architecture
- `docs/rebrand.md` — rebrand notes
