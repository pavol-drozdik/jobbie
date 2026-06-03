-- Bookmarks for company profiles (not company_ads). user saves profiles.id of a company.

create table if not exists public.saved_companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);

create index if not exists idx_saved_companies_user_id on public.saved_companies(user_id);
create index if not exists idx_saved_companies_user_company on public.saved_companies(user_id, company_id);

alter table public.saved_companies enable row level security;

create policy "Users can insert own saved_companies"
  on public.saved_companies for insert
  with check (auth.uid() = user_id);

create policy "Users can read own saved_companies"
  on public.saved_companies for select
  using (auth.uid() = user_id);

create policy "Users can delete own saved_companies"
  on public.saved_companies for delete
  using (auth.uid() = user_id);

comment on table public.saved_companies is 'User bookmarks of company profiles (profiles.id where role=company), not company ads.';

grant select, insert, update, delete on public.saved_companies to anon, authenticated, service_role;
