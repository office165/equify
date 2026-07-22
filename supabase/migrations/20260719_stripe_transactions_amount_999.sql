-- האילוץ על סכום מדויק (999) הוסר כי הוא מתנגש עם תשלומי פרומו וקופון חינם (amount=0).
-- תיקוף הסכום העסקי מבוצע ב-webhook / promo validate (app/api/v1/...).

alter table public.stripe_transactions drop constraint if exists stripe_transactions_amount_positive;
alter table public.stripe_transactions drop constraint if exists stripe_transactions_on_demand_99_ils;
alter table public.stripe_transactions add constraint stripe_transactions_on_demand_99_ils
  check (currency = 'ILS' and amount >= 0);

drop index if exists stripe_transactions_unused_99_ils_tokens;
create index stripe_transactions_unused_99_ils_tokens on public.stripe_transactions (token_jti, expires_at)
  where is_used = false and currency = 'ILS';
