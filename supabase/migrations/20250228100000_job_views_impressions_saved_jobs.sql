-- Personalized feed: job_views (clicked), job_impressions (shown), saved_jobs.
-- No vector/embedding columns. Used for rule-based scoring only.
-- Scrolled past = has impression for user/job but no view for that user/job.

-- job_views: one row per (user_id, job_id); viewed_at updated on each view (for recency decay).
create table if not exists public.job_views (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_offers(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(user_id, job_id)
);

create index if not exists idx_job_views_user_id_job_id on public.job_views(user_id, job_id);
create index if not exists idx_job_views_user_id_viewed_at on public.job_views(user_id, viewed_at desc);

alter table public.job_views enable row level security;

create policy "Users can insert own job_views"
  on public.job_views for insert
  with check (auth.uid() = user_id);

create policy "Users can read own job_views"
  on public.job_views for select
  using (auth.uid() = user_id);

create policy "Users can update own job_views"
  on public.job_views for update
  using (auth.uid() = user_id);

-- job_impressions: jobs shown in list; one row per (user_id, job_id) per batch (optional list_session_id).
create table if not exists public.job_impressions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_offers(id) on delete cascade,
  shown_at timestamptz not null default now(),
  list_session_id uuid
);

create index if not exists idx_job_impressions_user_id_job_id on public.job_impressions(user_id, job_id);
create index if not exists idx_job_impressions_user_id_shown_at on public.job_impressions(user_id, shown_at desc);

alter table public.job_impressions enable row level security;

create policy "Users can insert own job_impressions"
  on public.job_impressions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own job_impressions"
  on public.job_impressions for select
  using (auth.uid() = user_id);

-- saved_jobs: user saved job for later.
create table if not exists public.saved_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_offers(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique(user_id, job_id)
);

create index if not exists idx_saved_jobs_user_id on public.saved_jobs(user_id);
create index if not exists idx_saved_jobs_user_id_job_id on public.saved_jobs(user_id, job_id);

alter table public.saved_jobs enable row level security;

create policy "Users can insert own saved_jobs"
  on public.saved_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own saved_jobs"
  on public.saved_jobs for select
  using (auth.uid() = user_id);

create policy "Users can delete own saved_jobs"
  on public.saved_jobs for delete
  using (auth.uid() = user_id);
