-- Product analytics events for real landing/admin metrics (vs client-side counters).
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  event_type text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists events_event_type_created_at_idx
  on public.events (event_type, created_at desc);

create index if not exists events_created_at_idx
  on public.events (created_at desc);

create index if not exists events_user_id_idx
  on public.events (user_id)
  where user_id is not null;

-- Admin metrics gate: users.role = 'admin' (did not exist previously).
alter table public.users
  add column if not exists role text not null default 'member';

comment on column public.users.role is
  'Platform role for admin APIs. Use admin for /api/v1/admin/* access. Distinct from organization_members.role.';

comment on table public.events is
  'Funnel events: wizard_completed, checkout_opened, payment_succeeded, report_created, pdf_downloaded.';
