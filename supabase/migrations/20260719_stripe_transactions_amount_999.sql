-- האילוץ על סכום מדויק (999) הוסר כי הוא מתנגש עם תשלומי פרומו (1 ILS).
-- תיקוף הסכום העסקי מבוצע ב-webhook (app/api/v1/payments/paypal-webhook/route.ts).

alter table public.stripe_transactions drop constraint if exists stripe_transactions_on_demand_99_ils;
alter table public.stripe_transactions add constraint stripe_transactions_on_demand_99_ils
  check (currency = 'ILS' and amount > 0);

drop index if exists stripe_transactions_unused_99_ils_tokens;
create index stripe_transactions_unused_99_ils_tokens on public.stripe_transactions (token_jti, expires_at)
  where is_used = false and currency = 'ILS';
