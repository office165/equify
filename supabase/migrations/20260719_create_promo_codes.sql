-- Premium promo codes (₪1 / discounted NCP checkout) + redemption ledger.
-- RLS: service_role only (same pattern as valuations_history).

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  max_uses integer,
  times_used integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid references public.promo_codes(id),
  user_email citext not null,
  redeemed_at timestamptz not null default now(),
  payment_matched boolean not null default false
);

create index if not exists promo_codes_code_idx
  on public.promo_codes (code);

create index if not exists promo_redemptions_email_redeemed_idx
  on public.promo_redemptions (user_email, redeemed_at desc);

create index if not exists promo_redemptions_unmatched_idx
  on public.promo_redemptions (user_email, redeemed_at desc)
  where payment_matched = false;

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists "service_role_only_access" on public.promo_codes;
create policy "service_role_only_access"
  on public.promo_codes
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role_only_access" on public.promo_redemptions;
create policy "service_role_only_access"
  on public.promo_redemptions
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.promo_codes is
  'Checkout promo codes that unlock the discounted PayPal NCP link.';
comment on table public.promo_redemptions is
  'Promo validation ledger; payment_matched set by PayPal webhook on underpayment.';
