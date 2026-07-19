-- PayPal captures whose payer email does not match users.email (manual follow-up).
create table if not exists public.unmatched_payments (
  id uuid primary key default gen_random_uuid(),
  payer_email text,
  amount numeric(12, 2),
  currency text default 'ILS',
  gateway_provider text not null default 'paypal',
  gateway_transaction_id text,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists unmatched_payments_payer_email_idx
  on public.unmatched_payments (payer_email);

create index if not exists unmatched_payments_created_at_idx
  on public.unmatched_payments (created_at desc);
