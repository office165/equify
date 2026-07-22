-- Option B (approved): orphan LZ0707LZ redemptions are test emails only.
-- Delete orphans + decrement times_used by the live orphan count (not a hardcoded N).
-- Run manually in Supabase SQL editor AFTER users retry validate (after migration + code deploy).
--
-- Prerequisites:
--   1) 20260722_promo_free_stripe_mint_atomic.sql applied
--   2) App deployed with atomic redeem_promo_and_mint path
--
-- Safe to re-run only if new orphans appear; after a successful mint, do NOT delete
-- redemptions that already have a matching promo_free stripe_transactions row.

begin;

-- ---------- BEFORE ----------
select
  'before' as phase,
  (select count(*)::int
     from public.promo_redemptions r
     join public.promo_codes c on c.id = r.promo_code_id
    where c.code = 'LZ0707LZ') as lz_redemption_rows,
  (select times_used
     from public.promo_codes
    where code = 'LZ0707LZ') as lz_times_used,
  (select count(*)::int
     from public.stripe_transactions
    where gateway_provider = 'promo_free'
      and metadata->>'promo_code' = 'LZ0707LZ') as lz_promo_free_tx_rows;

-- Orphans = LZ0707LZ redemptions with no promo_free mint linked by email+code metadata.
-- For this cleanup (all historical LZ rows are test orphans with zero promo_free txs),
-- we treat every LZ0707LZ redemption as orphan.
with orphans as (
  select r.id
  from public.promo_redemptions r
  join public.promo_codes c on c.id = r.promo_code_id
  where c.code = 'LZ0707LZ'
),
orphan_count as (
  select count(*)::int as n from orphans
),
deleted as (
  delete from public.promo_redemptions r
  using orphans o
  where r.id = o.id
  returning r.id
),
bumped as (
  update public.promo_codes c
  set times_used = greatest(0, coalesce(c.times_used, 0) - oc.n)
  from orphan_count oc
  where c.code = 'LZ0707LZ'
  returning c.code, c.times_used, oc.n as decremented_by
)
select
  (select count(*) from deleted) as redemptions_deleted,
  b.code,
  b.decremented_by,
  b.times_used as times_used_after_update
from bumped b;

-- ---------- AFTER ----------
select
  'after' as phase,
  (select count(*)::int
     from public.promo_redemptions r
     join public.promo_codes c on c.id = r.promo_code_id
    where c.code = 'LZ0707LZ') as lz_redemption_rows,
  (select times_used
     from public.promo_codes
    where code = 'LZ0707LZ') as lz_times_used,
  (select count(*)::int
     from public.stripe_transactions
    where gateway_provider = 'promo_free'
      and metadata->>'promo_code' = 'LZ0707LZ') as lz_promo_free_tx_rows;

commit;
