-- Round 12 (CONTENT_HUB): the guides and articles of equify.co.il, in the structure of site_posts on the SBC site
-- (sbc-site/lib/posts.ts). SBC's journalist agent writes here with the service role; the site reads with the anon key.
-- RLS: anon and authenticated can read only rows with status = 'published'; only service_role writes.
-- Apply manually in the Supabase SQL Editor of equify's project. Not needed while CONTENT_HUB is off (the site shows the bundle).

-- up
create table if not exists public.equify_posts (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null,
  content_html text not null,
  excerpt text not null default '',
  featured_image_url text,
  featured_image_alt text not null default '',
  meta_title text,
  meta_description text,
  desk text not null default 'valuation' check (desk in ('guide', 'valuation', 'deals', 'finance', 'market')),
  published_at timestamptz not null default now(),
  updated_at timestamptz,
  author_name text not null default 'מערכת equify',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  summary text,
  faq jsonb check (faq is null or jsonb_typeof(faq) = 'array'),
  seo_title text,
  -- Round 13: the post's language. /en/guides and /en/articles show only 'en' rows.
  lang text not null default 'he' check (lang ~ '^[a-z]{2}$')
);

comment on table public.equify_posts is
  'equify guides and articles (round 12). Written by the SBC journalist agent (service_role). Public read of published rows only.';

create index if not exists equify_posts_published_idx on public.equify_posts (status, published_at desc);

alter table public.equify_posts enable row level security;

drop policy if exists "public_read_published" on public.equify_posts;
create policy "public_read_published"
  on public.equify_posts
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "service_role_all" on public.equify_posts;
create policy "service_role_all"
  on public.equify_posts
  for all
  to service_role
  using (true)
  with check (true);

-- down (run only to remove the feature)
-- drop policy if exists "service_role_all" on public.equify_posts;
-- drop policy if exists "public_read_published" on public.equify_posts;
-- drop index if exists public.equify_posts_published_idx;
-- drop table if exists public.equify_posts;
