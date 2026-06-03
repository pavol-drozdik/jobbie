-- Profile view events for provider analytics; inserts only via Nest (service role). RLS on; no policies for authenticated/anon.

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_profile_views_viewed_profile_viewed_at
  on public.profile_views (viewed_profile_id, viewed_at desc);

create index if not exists idx_profile_views_viewer_viewed_profile_viewed_at
  on public.profile_views (viewer_id, viewed_profile_id, viewed_at desc);

alter table public.profile_views enable row level security;

comment on table public.profile_views is 'Profile page views; backend-only writes via service role. Used for provider dashboard metrics.';
