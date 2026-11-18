-- Round 9 (UPAY and GREEN_INVOICE, both off): upay orders, the upay IPN log, and one invoice per
-- payment. RLS: service_role only. Apply manually in the Supabase SQL Editor before turning the flags on.

-- up
create table if not exists public.upay_orders (
  id uuid primary key,
  email text not null,
  amount numeric(12,2) not null,
  currency text not null check (currency in ('ILS','USD')),
  status text not null check (status in ('created','redirected','paid','failed','cancelled')),
  cashier_id text,
  released_at timestamptz,
  dispatch_token text,
  created_at timestamptz not null default now()
);
create index if not exists upay_orders_cashier_id_idx on public.upay_orders (cashier_id);

create table if not exists public.upay_ipn_log (
  id bigserial primary key,
  order_id uuid,
  ip text,
  query jsonb,
  body text,
  outcome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_documents (
  order_key text primary key,
  status text not null check (status in ('pending','issued','failed')),
  provider_document_id text,
  document_number integer,
  error text,
  created_at timestamptz not null default now()
);

alter table public.upay_orders enable row level security;
alter table public.upay_ipn_log enable row level security;
alter table public.invoice_documents enable row level security;

drop policy if exists "service_role_only_access" on public.upay_orders;
create policy "service_role_only_access" on public.upay_orders for all to service_role using (true) with check (true);
drop policy if exists "service_role_only_access" on public.upay_ipn_log;
create policy "service_role_only_access" on public.upay_ipn_log for all to service_role using (true) with check (true);
drop policy if exists "service_role_only_access" on public.invoice_documents;
create policy "service_role_only_access" on public.invoice_documents for all to service_role using (true) with check (true);

-- down (run only to remove the feature)
-- drop table if exists public.invoice_documents;
-- drop table if exists public.upay_ipn_log;
-- drop table if exists public.upay_orders;
