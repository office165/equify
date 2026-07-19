-- =============================================================================
-- Documented 19.07.2026: manual fix applied in Supabase SQL Editor in response
-- to PII exposure (roles={public} on valuations_history, which holds email,
-- phone, national_id, corporate_tax_id).
--
-- This migration records that work in-repo for idempotent re-apply / audit.
-- Do not treat as "pending" — already applied manually in production.
-- =============================================================================

alter table public.valuations_history add column if not exists sector text;

drop policy if exists "Allow internal service role access" on public.valuations_history;
drop policy if exists "service_role_only_access" on public.valuations_history;

create policy "service_role_only_access"
  on public.valuations_history
  for all
  to service_role
  using (true)
  with check (true);
