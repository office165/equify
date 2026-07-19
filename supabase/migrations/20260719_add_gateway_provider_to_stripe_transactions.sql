-- Distinguish PayPal vs Grow/PayMe on stripe_transactions (legacy table name retained).
alter table public.stripe_transactions
  add column if not exists gateway_provider text;

comment on column public.stripe_transactions.gateway_provider is
  'Payment provider: paypal | grow | payme | israeli_gateway. Null = legacy rows.';
