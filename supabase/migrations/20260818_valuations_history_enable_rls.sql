-- Harden valuations_history before customer-report archive writes.
-- Policy `service_role_only_access` already exists (20260719). ENABLE RLS was
-- missing from that migration — without it the policy does not apply.
-- Apply manually in Supabase SQL Editor if not auto-run on deploy.

alter table public.valuations_history enable row level security;

drop policy if exists "service_role_only_access" on public.valuations_history;

create policy "service_role_only_access"
  on public.valuations_history
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.valuations_history from public;
revoke all on public.valuations_history from anon;
revoke all on public.valuations_history from authenticated;
grant all on public.valuations_history to service_role;
