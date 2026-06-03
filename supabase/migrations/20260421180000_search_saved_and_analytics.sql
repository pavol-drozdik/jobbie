-- Saved searches, email alerts metadata, and search query analytics (backend uses service role).

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  query_json jsonb not null default '{}'::jsonb,
  notify_email boolean not null default false,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_searches_user_id on public.saved_searches (user_id);
create index if not exists idx_saved_searches_notify on public.saved_searches (notify_email)
  where notify_email = true;

create table if not exists public.search_query_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  entity text not null default 'jobs',
  q text,
  filters jsonb,
  result_count integer not null default 0,
  source text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_query_logs_created_at on public.search_query_logs (created_at desc);
create index if not exists idx_search_query_logs_result_count on public.search_query_logs (result_count)
  where result_count = 0;

alter table public.saved_searches enable row level security;
alter table public.search_query_logs enable row level security;

create policy "Users manage own saved searches"
  on public.saved_searches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No client read/write on analytics; service role bypasses RLS.
create policy "No direct access to search_query_logs"
  on public.search_query_logs
  for all
  using (false)
  with check (false);
