-- Round 7 (OPUS_NARRATIVE): one stored narrative per report, by the hash of the engine facts,
-- so the PDF download and the email show the same text. RLS: service_role only.
-- Apply manually in the Supabase SQL Editor. Not needed while OPUS_NARRATIVE is off.

-- up
create table if not exists public.report_narratives (
  facts_hash text primary key,
  narrative jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.report_narratives is
  'Opus narrative per report (round 7). Key: sha256 of the engine facts sent to the model. No client identifiers.';

alter table public.report_narratives enable row level security;

drop policy if exists "service_role_only_access" on public.report_narratives;
create policy "service_role_only_access"
  on public.report_narratives
  for all
  to service_role
  using (true)
  with check (true);

-- down (run only to remove the feature)
-- drop policy if exists "service_role_only_access" on public.report_narratives;
-- drop table if exists public.report_narratives;
