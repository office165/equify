-- Align on-demand token amount lock with Equify Pro price (999 ILS).
-- Required so PayPal webhook inserts (amount=999) satisfy stripe_transactions_on_demand_99_ils.
alter table public.stripe_transactions
  drop constraint if exists stripe_transactions_on_demand_99_ils;

alter table public.stripe_transactions
  add constraint stripe_transactions_on_demand_99_ils
  check (amount = 999.00 and currency = 'ILS');

drop index if exists stripe_transactions_unused_99_ils_tokens;

create index stripe_transactions_unused_99_ils_tokens
  on public.stripe_transactions (token_jti, expires_at)
  where is_used = false
    and amount = 999.00
    and currency = 'ILS';
