-- Public landing feedback box. RLS: service_role only
-- (same pattern as valuations_history / promo_codes).
-- Apply manually in Supabase SQL Editor — not auto-run on deploy.

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  contact_email text,
  user_agent text,
  created_at timestamptz default now()
);

comment on table public.feature_requests is
  'Anonymous product suggestions from the landing footer. Insert via service_role only.';

alter table public.feature_requests enable row level security;

drop policy if exists "service_role_only_access" on public.feature_requests;
create policy "service_role_only_access"
  on public.feature_requests
  for all
  to service_role
  using (true)
  with check (true);
