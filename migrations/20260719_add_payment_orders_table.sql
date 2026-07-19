-- Payment orders table for the real PayPal payment gate.
-- This file is a migration for the user's own review/execution against Supabase;
-- it is NOT run automatically as part of this pull request.

create table if not exists public.payment_orders (
  reference_id text primary key,
  order_id text unique,
  provider text not null default 'paypal',
  status text not null default 'CREATED',
  amount numeric(12, 2) not null,
  currency text not null default 'ILS',
  wizard_payload jsonb not null,
  locale text,
  contact_email text,
  contact_phone text,
  capture_id text,
  payer_email text,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_order_id_idx on public.payment_orders (order_id);
create index if not exists payment_orders_status_idx on public.payment_orders (status);

-- Keep updated_at current on every row change.
create or replace function public.set_payment_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
  before update on public.payment_orders
  for each row execute function public.set_payment_orders_updated_at();

-- RLS: restricted to the service role ONLY from the start (this table stores
-- payment/order data and must never be reachable by the anon/public roles).
alter table public.payment_orders enable row level security;
alter table public.payment_orders force row level security;

drop policy if exists "service_role_only_access" on public.payment_orders;
create policy "service_role_only_access"
  on public.payment_orders
  for all
  to service_role
  using (true)
  with check (true);
